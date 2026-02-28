import type { User } from '@n8n/db';
import type { Cipher } from 'n8n-core';
import {
	ManualExecutionCancelledError,
	createRunExecutionData,
	type ICredentialContext,
	type IExecutionContext,
	type IWorkflowExecutionDataProcess,
} from 'n8n-workflow';

import type { ActiveExecutions } from '@/active-executions';
import type { WorkflowRunner } from '@/workflow-runner';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import {
	SUPPORTED_TRIGGERS,
	buildPinData,
	findSupportedTrigger,
	getExecutionMode,
} from './agent-workflow-runner';
import { EXECUTION_TIMEOUT_MS } from './agents.types';

export interface WorkflowExecutorDeps {
	workflowFinderService: WorkflowFinderService;
	workflowRunner: WorkflowRunner;
	activeExecutions: ActiveExecutions;
	cipher: Cipher;
}

export async function executeWorkflow(
	deps: WorkflowExecutorDeps,
	user: User,
	workflowId: string,
	agentPrompt?: string,
	callerId?: string,
	workflowCredentials?: Record<string, Record<string, string>>,
	typedInputs?: Record<string, unknown>,
): Promise<{ success: boolean; executionId: string; data?: unknown }> {
	const workflow = await deps.workflowFinderService.findWorkflowForUser(
		workflowId,
		user,
		['workflow:execute'],
		{ includeActiveVersion: true },
	);

	if (!workflow) {
		throw new Error(`Workflow ${workflowId} not found or agent lacks permission`);
	}

	const nodes = workflow.activeVersion?.nodes ?? workflow.nodes ?? [];
	const connections = workflow.activeVersion?.connections ?? workflow.connections ?? {};

	const triggerNode = findSupportedTrigger(nodes);
	if (!triggerNode) {
		throw new Error(
			`Workflow has no supported trigger. Supported: ${Object.values(SUPPORTED_TRIGGERS).join(', ')}`,
		);
	}

	const pinData = buildPinData(triggerNode, agentPrompt, typedInputs);

	let runtimeData: IExecutionContext | undefined;
	if (callerId || workflowCredentials) {
		const credentialContext: ICredentialContext = {
			version: 1,
			identity: callerId ?? 'anonymous',
			metadata: { source: 'agent-a2a', agentId: user.id, workflowCredentials },
		};
		runtimeData = {
			version: 1,
			establishedAt: Date.now(),
			source: getExecutionMode(triggerNode),
			triggerNode: { name: triggerNode.name, type: triggerNode.type },
			credentials: deps.cipher.encrypt(credentialContext),
		};
	}

	const runData: IWorkflowExecutionDataProcess = {
		executionMode: getExecutionMode(triggerNode),
		workflowData: { ...workflow, nodes, connections },
		userId: user.id,
		startNodes: [{ name: triggerNode.name, sourceData: null }],
		pinData,
		executionData: createRunExecutionData({
			startData: {},
			resultData: { pinData, runData: {} },
			executionData: {
				contextData: {},
				metadata: {},
				nodeExecutionStack: [
					{
						node: triggerNode,
						data: { main: [pinData[triggerNode.name]] },
						source: null,
					},
				],
				waitingExecution: {},
				waitingExecutionSource: {},
				runtimeData,
			},
		}),
	};

	const executionId = await deps.workflowRunner.run(runData);

	const resultPromise = deps.activeExecutions.getPostExecutePromise(executionId);
	let timeoutHandle: ReturnType<typeof setTimeout>;
	const timeoutPromise = new Promise<never>((_, reject) => {
		timeoutHandle = setTimeout(() => {
			void deps.activeExecutions.stopExecution(
				executionId,
				new ManualExecutionCancelledError(executionId),
			);
			reject(new Error('Workflow execution timed out'));
		}, EXECUTION_TIMEOUT_MS);
	});

	try {
		const data = await Promise.race([resultPromise, timeoutPromise]);

		if (data === undefined) {
			throw new Error('Workflow did not return any data');
		}

		const success = data.status !== 'error' && !data.data.resultData?.error;

		return { success, executionId, data: data.data.resultData };
	} finally {
		clearTimeout(timeoutHandle!);
	}
}
