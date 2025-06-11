import { ExecutionRepository } from '@n8n/db';
import type { IExecutionResponse, Project } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { ExecuteContext } from 'n8n-core';
import type {
	IBinaryKeyData,
	INodeExecutionData,
	IWorkflowExecutionDataProcess,
} from 'n8n-workflow';
import { Workflow, BINARY_ENCODING } from 'n8n-workflow';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';
import { WorkflowRunner } from '@/workflow-runner';

import type { ChatMessage } from './chat-service.types';
import { NodeTypes } from '../node-types';
import { OwnershipService } from '../services/ownership.service';

@Service()
export class ChatExecutionManager {
	constructor(private readonly executionRepository: ExecutionRepository) {}

	async runWorkflow(execution: IExecutionResponse, message: ChatMessage) {
		await Container.get(WorkflowRunner).run(
			await this.getRunData(execution, message),
			true,
			true,
			execution.id,
		);
	}

	async cancelExecution(executionId: string) {
		const execution = await this.executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});

		if (!execution) return;

		if (['running', 'waiting', 'unknown'].includes(execution.status)) {
			await this.executionRepository.update({ id: executionId }, { status: 'canceled' });
		}
	}

	async findExecution(executionId: string) {
		return await this.executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});
	}

	private getWorkflow(execution: IExecutionResponse) {
		const { workflowData } = execution;
		return new Workflow({
			id: workflowData.id,
			name: workflowData.name,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: workflowData.active,
			nodeTypes: Container.get(NodeTypes),
			staticData: workflowData.staticData,
			settings: workflowData.settings,
		});
	}

	private async runNode(execution: IExecutionResponse, message: ChatMessage) {
		const workflow = this.getWorkflow(execution);
		const lastNodeExecuted = execution.data.resultData.lastNodeExecuted as string;
		const node = workflow.getNode(lastNodeExecuted);
		const additionalData = await WorkflowExecuteAdditionalData.getBase();
		const executionData = execution.data.executionData?.nodeExecutionStack[0];

		if (node && executionData) {
			const inputData = executionData.data;
			const connectionInputData = executionData.data.main[0];
			const nodeType = workflow.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
			const context = new ExecuteContext(
				workflow,
				node,
				additionalData,
				'manual',
				execution.data,
				0,
				connectionInputData ?? [],
				inputData,
				executionData,
				[],
			);

			const { sessionId, action, chatInput, files } = message;
			const binary: IBinaryKeyData = {};

			if (files) {
				for (const [index, file] of files.entries()) {
					const base64 = file.data;
					const buffer = Buffer.from(base64, BINARY_ENCODING);
					const binaryData = await context.helpers.prepareBinaryData(buffer, file.name, file.type);

					binary[`data_${index}`] = binaryData;
				}
			}

			const nodeExecutionData: INodeExecutionData = { json: { sessionId, action, chatInput } };
			if (Object.keys(binary).length > 0) {
				nodeExecutionData.binary = binary;
			}

			if (nodeType.onMessage) {
				return await nodeType.onMessage(context, nodeExecutionData);
			}

			return [[nodeExecutionData]];
		}

		return null;
	}

	private async getRunData(execution: IExecutionResponse, message: ChatMessage) {
		const { workflowData, mode: executionMode, data: runExecutionData } = execution;

		runExecutionData.executionData!.nodeExecutionStack[0].data.main = (await this.runNode(
			execution,
			message,
		)) ?? [[{ json: message }]];

		let project: Project | undefined = undefined;
		try {
			project = await Container.get(OwnershipService).getWorkflowProjectCached(workflowData.id);
		} catch (error) {
			throw new NotFoundError('Cannot find workflow');
		}

		const runData: IWorkflowExecutionDataProcess = {
			executionMode,
			executionData: runExecutionData,
			pushRef: runExecutionData.pushRef,
			workflowData,
			pinData: runExecutionData.resultData.pinData,
			projectId: project?.id,
		};

		return runData;
	}
}
