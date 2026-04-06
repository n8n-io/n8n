import { GlobalConfig } from '@n8n/config';
import {
	CredentialsRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	WorkflowEntity,
	WorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { DataSource, type EntityManager } from '@n8n/typeorm';
import type {
	INode,
	INodeCredentialsDetails,
	INodeExecutionData,
	INodeParameters,
	IWorkflowExecutionDataProcess,
} from 'n8n-workflow';
import { createRunExecutionData, NodeConnectionTypes, UserError } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { ActiveExecutions } from '@/active-executions';
import { NodeTypes } from '@/node-types';
import { CacheService } from '@/services/cache/cache.service';
import { WorkflowRunner } from '@/workflow-runner';

const MANUAL_TRIGGER_NODE_NAME = 'Manual Trigger';

/** Minimal tool shape for constructing an ephemeral Manual Trigger → target node workflow. */
export type EphemeralWorkflowToolLike = {
	projectId: string;
	nodeType: string;
	nodeTypeVersion: number;
	nodeParameters: INodeParameters;
	credentials?: Record<string, INodeCredentialsDetails> | null;
};

export interface InlineNodeExecutionRequest {
	nodeType: string;
	nodeTypeVersion: number;
	nodeParameters: INodeParameters;
	/** Credential type name → credential instance display name (resolved at execution). */
	credentials?: Record<string, string>;
	/**
	 * Pre-resolved credential ids (e.g. from ToolFromNode which has { id, name } from list_credentials).
	 */
	credentialDetails?: Record<string, INodeCredentialsDetails>;
	inputData: INodeExecutionData[];
	projectId: string;
}

export interface NodeExecutionResult {
	status: 'success' | 'error';
	data: INodeExecutionData[];
	error?: string;
}

@Service()
export class EphemeralNodeExecutor {
	constructor(
		private readonly nodeTypes: NodeTypes,
		private readonly workflowRunner: WorkflowRunner,
		private readonly activeExecutions: ActiveExecutions,
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly dataSource: DataSource,
		private readonly cacheService: CacheService,
		private readonly globalConfig: GlobalConfig,
	) {}

	/**
	 * Resolve credential type + display name to IDs for workflow execution,
	 * scoped to the project's accessible credentials.
	 */
	private async resolveInlineCredentials(
		projectId: string,
		credentials?: Record<string, string>,
	): Promise<Record<string, INodeCredentialsDetails> | null> {
		if (!credentials || Object.keys(credentials).length === 0) {
			return null;
		}

		const accessible = await this.credentialsRepository.findAllCredentialsForProject(projectId);

		const resolved: Record<string, INodeCredentialsDetails> = {};

		for (const [credType, credName] of Object.entries(credentials)) {
			const matches = accessible.filter(
				(c) => c.type === credType && c.name.toLowerCase() === credName.toLowerCase(),
			);

			if (matches.length === 0) {
				throw new UserError(
					`No accessible credential found for type "${credType}" with name "${credName}"`,
					{ extra: { credType, credName } },
				);
			}

			if (matches.length > 1) {
				throw new UserError(
					`Multiple credentials match type "${credType}" with name "${credName}". Use a unique credential name.`,
					{ extra: { credType, credName } },
				);
			}

			const entity = matches[0];
			resolved[credType] = { id: entity.id, name: entity.name };
		}

		return resolved;
	}

	private async verifyCredentialDetailsForProject(
		projectId: string,
		details: Record<string, INodeCredentialsDetails>,
	): Promise<Record<string, INodeCredentialsDetails>> {
		const verified: Record<string, INodeCredentialsDetails> = {};

		for (const [credType, d] of Object.entries(details)) {
			if (!d.id) {
				throw new UserError(
					`Credential reference for "${credType}" is missing an id (required for execution).`,
					{ extra: { credType, name: d.name } },
				);
			}

			const sharedCredential = await this.sharedCredentialsRepository.findOne({
				where: { credentialsId: d.id, projectId },
				relations: { credentials: true },
			});

			if (!sharedCredential) {
				throw new UserError(`Credential "${d.name}" is not accessible or does not exist.`, {
					extra: { credType, credentialId: d.id },
				});
			}

			if (sharedCredential.credentials.type !== credType) {
				throw new UserError(
					`Credential "${sharedCredential.credentials.name}" has type "${sharedCredential.credentials.type}" but the node expects credential slot "${credType}".`,
					{
						extra: {
							credType,
							actualType: sharedCredential.credentials.type,
							credentialId: d.id,
						},
					},
				);
			}

			verified[credType] = {
				id: sharedCredential.credentials.id,
				name: sharedCredential.credentials.name,
			};
		}

		return verified;
	}

	private validateNodeForExecution(nodeType: string, typeVersion: number): void {
		const resolved = this.nodeTypes.getByNameAndVersion(nodeType, typeVersion);

		if (!resolved.description.usableAsTool) {
			throw new UserError('Node is not usable as a tool', { extra: { nodeType } });
		}

		if (resolved.description.group.includes('trigger')) {
			throw new UserError('Trigger nodes cannot be executed standalone', { extra: { nodeType } });
		}
	}

	async buildAndPersistWorkflow(
		tool: EphemeralWorkflowToolLike,
		transactionManager: EntityManager,
	): Promise<WorkflowEntity> {
		const manualTriggerNode: INode = {
			id: uuid(),
			name: MANUAL_TRIGGER_NODE_NAME,
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};

		const targetNode: INode = {
			id: uuid(),
			name: 'Target Node',
			type: tool.nodeType,
			typeVersion: tool.nodeTypeVersion,
			position: [300, 0],
			parameters: tool.nodeParameters,
			credentials: tool.credentials ?? undefined,
		};

		const workflow = new WorkflowEntity();
		workflow.name = `Ephemeral: ${tool.nodeType}`;
		workflow.active = false;
		workflow.isArchived = false;
		workflow.isEphemeral = true;
		workflow.versionId = uuid();
		workflow.activeVersionId = null;
		workflow.nodes = [manualTriggerNode, targetNode];
		workflow.connections = {
			[MANUAL_TRIGGER_NODE_NAME]: {
				main: [[{ node: 'Target Node', type: NodeConnectionTypes.Main, index: 0 }]],
			},
		};
		workflow.settings = {
			saveDataErrorExecution: 'none',
			saveDataSuccessExecution: 'none',
			saveManualExecutions: false,
			saveExecutionProgress: false,
		};

		const saved = await transactionManager.save(workflow);

		const sharedWorkflow = this.sharedWorkflowRepository.create({
			role: 'workflow:owner',
			projectId: tool.projectId,
			workflowId: saved.id,
		});
		await transactionManager.save(sharedWorkflow);

		return saved;
	}

	async deleteWorkflow(workflowId: string): Promise<void> {
		await this.workflowRepository.delete(workflowId);
		await this.cacheService.deleteFromHash('workflow-project', workflowId);
	}

	private async runEphemeralWorkflow(
		savedWorkflow: WorkflowEntity,
		inputData: INodeExecutionData[],
		projectId: string,
	): Promise<NodeExecutionResult> {
		const runData: IWorkflowExecutionDataProcess = {
			executionMode: 'ephemeral',
			workflowData: savedWorkflow,
			pinData: {
				[MANUAL_TRIGGER_NODE_NAME]: inputData,
			},
			projectId,
		};

		if (this.globalConfig.executions.mode === 'queue') {
			runData.executionData = createRunExecutionData({
				resultData: {
					pinData: runData.pinData,
					runData: null,
				},
				executionData: null,
			});
		}

		const executionId = await this.workflowRunner.run(runData, false);
		const result = await this.activeExecutions.getPostExecutePromise(executionId);

		const targetRunData = result?.data?.resultData?.runData?.['Target Node'];
		if (!targetRunData?.[0]?.data?.main?.[0]) {
			return {
				status: 'error',
				data: [],
				error: result?.data?.resultData?.error?.message,
			};
		}
		return { status: 'success', data: targetRunData[0].data.main[0] };
	}

	async executeInline(request: InlineNodeExecutionRequest): Promise<NodeExecutionResult> {
		this.validateNodeForExecution(request.nodeType, request.nodeTypeVersion);

		const fromNames =
			(await this.resolveInlineCredentials(request.projectId, request.credentials)) ?? {};

		let fromDetails: Record<string, INodeCredentialsDetails> = {};
		if (request.credentialDetails && Object.keys(request.credentialDetails).length > 0) {
			fromDetails = await this.verifyCredentialDetailsForProject(
				request.projectId,
				request.credentialDetails,
			);
		}

		const mergedCredentials =
			Object.keys(fromNames).length === 0 && Object.keys(fromDetails).length === 0
				? null
				: { ...fromNames, ...fromDetails };

		const toolLike: EphemeralWorkflowToolLike = {
			projectId: request.projectId,
			nodeType: request.nodeType,
			nodeTypeVersion: request.nodeTypeVersion,
			nodeParameters: request.nodeParameters,
			credentials: mergedCredentials,
		};

		let savedWorkflow: WorkflowEntity | undefined;

		try {
			savedWorkflow = await this.dataSource.transaction(async (transactionManager) => {
				return await this.buildAndPersistWorkflow(toolLike, transactionManager);
			});

			return await this.runEphemeralWorkflow(savedWorkflow, request.inputData, request.projectId);
		} finally {
			if (savedWorkflow) {
				await this.deleteWorkflow(savedWorkflow.id);
			}
		}
	}
}
