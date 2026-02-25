import type {
	InstanceAiContext,
	InstanceAiWorkflowService,
	InstanceAiExecutionService,
	InstanceAiCredentialService,
	InstanceAiNodeService,
	WorkflowSummary,
	WorkflowDetail,
	WorkflowNode,
	ExecutionResult,
	CredentialSummary,
	CredentialDetail,
	NodeSummary,
	NodeDescription,
} from '@n8n/instance-ai';
import type { User, WorkflowEntity } from '@n8n/db';
import { ExecutionRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	type INode,
	type IConnections,
	type IWorkflowSettings,
	type IPinData,
	type IWorkflowExecutionDataProcess,
	createRunExecutionData,
} from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { CredentialsService } from '@/credentials/credentials.service';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowService } from '@/workflows/workflow.service';
import { WorkflowRunner } from '@/workflow-runner';

@Service()
export class InstanceAiAdapterService {
	constructor(
		private readonly workflowService: WorkflowService,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly executionRepository: ExecutionRepository,
		private readonly credentialsService: CredentialsService,
		private readonly activeExecutions: ActiveExecutions,
		private readonly workflowRunner: WorkflowRunner,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
	) {}

	createContext(user: User): InstanceAiContext {
		return {
			userId: user.id,
			workflowService: this.createWorkflowAdapter(user),
			executionService: this.createExecutionAdapter(user),
			credentialService: this.createCredentialAdapter(user),
			nodeService: this.createNodeAdapter(),
		};
	}

	private createWorkflowAdapter(user: User): InstanceAiWorkflowService {
		const { workflowService, workflowFinderService, workflowRepository } = this;

		return {
			async list(options) {
				const { workflows } = await workflowService.getMany(user, {
					take: options?.limit ?? 50,
					filter: {
						isArchived: false,
						...(options?.query ? { query: options.query } : {}),
					},
				});

				return workflows
					.filter((wf): wf is WorkflowEntity => 'active' in wf)
					.map(
						(wf): WorkflowSummary => ({
							id: wf.id,
							name: wf.name,
							active: wf.active,
							createdAt: wf.createdAt.toISOString(),
							updatedAt: wf.updatedAt.toISOString(),
						}),
					);
			},

			async get(workflowId: string) {
				const workflow = await workflowFinderService.findWorkflowForUser(workflowId, user, [
					'workflow:read',
				]);

				if (!workflow) {
					throw new Error(`Workflow ${workflowId} not found or not accessible`);
				}

				return toWorkflowDetail(workflow);
			},

			async create(data) {
				const newWorkflow = workflowRepository.create({
					name: data.name,
					nodes: (data.nodes ?? []) as INode[],
					connections: (data.connections ?? {}) as IConnections,
					settings: (data.settings ?? {}) as IWorkflowSettings,
					active: false,
				} as Partial<WorkflowEntity>);

				const saved = await workflowRepository.save(newWorkflow);
				return toWorkflowDetail(saved);
			},

			async update(workflowId: string, updates) {
				const updateData = workflowRepository.create({
					name: updates.name,
					nodes: updates.nodes as INode[] | undefined,
					connections: updates.connections as IConnections | undefined,
					settings: updates.settings as IWorkflowSettings | undefined,
				} as Partial<WorkflowEntity>);

				const updated = await workflowService.update(user, updateData, workflowId);
				return toWorkflowDetail(updated);
			},

			async delete(workflowId: string) {
				await workflowService.delete(user, workflowId);
			},

			async activate(workflowId: string) {
				await workflowService.activateWorkflow(user, workflowId);
			},

			async deactivate(workflowId: string) {
				await workflowService.deactivateWorkflow(user, workflowId);
			},
		};
	}

	private createExecutionAdapter(user: User): InstanceAiExecutionService {
		const { workflowFinderService, workflowRunner, activeExecutions, executionRepository } = this;

		return {
			async run(workflowId: string, inputData) {
				const workflow = await workflowFinderService.findWorkflowForUser(workflowId, user, [
					'workflow:execute',
				]);

				if (!workflow) {
					throw new Error(`Workflow ${workflowId} not found or not accessible`);
				}

				const nodes = workflow.nodes ?? [];

				// Find the first trigger node to inject input data
				const triggerNode = nodes.find(
					(n) =>
						n.type.includes('Trigger') || n.type.includes('trigger') || n.type.includes('webhook'),
				);

				const runData: IWorkflowExecutionDataProcess = {
					executionMode: 'manual',
					workflowData: workflow,
					userId: user.id,
				};

				// If we have input data and a trigger node, set up pin data
				// so the trigger node outputs the provided data
				if (inputData && triggerNode) {
					const pinData: IPinData = {
						[triggerNode.name]: [{ json: inputData as never }],
					};

					runData.startNodes = [{ name: triggerNode.name, sourceData: null }];
					runData.pinData = pinData;
					runData.executionData = createRunExecutionData({
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
						},
					});
				}

				const executionId = await workflowRunner.run(runData);

				// Wait for completion and return results directly
				if (activeExecutions.has(executionId)) {
					await activeExecutions.getPostExecutePromise(executionId);
				}
				return { executionId };
			},

			async getStatus(executionId: string) {
				const isRunning = activeExecutions.has(executionId);
				if (isRunning) {
					return { executionId, status: 'running' } satisfies ExecutionResult;
				}
				return await extractExecutionResult(executionRepository, executionId);
			},

			async getResult(executionId: string) {
				// If still running, wait for it to complete
				if (activeExecutions.has(executionId)) {
					await activeExecutions.getPostExecutePromise(executionId);
				}
				return await extractExecutionResult(executionRepository, executionId);
			},
		};
	}

	private createCredentialAdapter(user: User): InstanceAiCredentialService {
		const { credentialsService } = this;

		return {
			async list(options) {
				const credentials = await credentialsService.getMany(user, {
					listQueryOptions: {
						filter: options?.type ? { type: options.type } : undefined,
					},
				});

				return credentials.map(
					(c): CredentialSummary => ({
						id: c.id,
						name: c.name,
						type: c.type,
						createdAt: c.createdAt.toISOString(),
						updatedAt: c.updatedAt.toISOString(),
					}),
				);
			},

			async get(credentialId: string) {
				const credential = await credentialsService.getOne(user, credentialId, false);
				return {
					id: credential.id,
					name: credential.name,
					type: credential.type,
					createdAt: credential.createdAt.toISOString(),
					updatedAt: credential.updatedAt.toISOString(),
				} satisfies CredentialDetail;
			},

			async create(data) {
				const created = await credentialsService.createUnmanagedCredential(
					{ name: data.name, type: data.type, data: data.data },
					user,
				);
				return {
					id: created.id,
					name: created.name,
					type: created.type,
					createdAt: created.createdAt.toISOString(),
					updatedAt: created.updatedAt.toISOString(),
				};
			},

			async update(credentialId: string, _updates) {
				// For now, only name updates are supported through this adapter.
				// Full credential data updates require encrypted data handling.
				const existing = await credentialsService.getOne(user, credentialId, false);
				if (_updates.name) {
					(existing as { name: string }).name = _updates.name;
				}
				// CredentialsService.update expects ICredentialsDb (encrypted data).
				// Safe to cast here since we're only updating metadata.
				const updated = await credentialsService.update(credentialId, existing as never);
				if (!updated) throw new Error(`Failed to update credential ${credentialId}`);
				return {
					id: updated.id,
					name: updated.name,
					type: updated.type,
					createdAt: updated.createdAt.toISOString(),
					updatedAt: updated.updatedAt.toISOString(),
				};
			},

			async delete(credentialId: string) {
				await credentialsService.delete(user, credentialId);
			},

			async test(credentialId: string) {
				// Retrieve the credential with decrypted data for testing
				const credential = await credentialsService.getOne(user, credentialId, true);
				const credData = 'data' in credential ? credential.data : {};
				const result = await credentialsService.test(user.id, {
					id: credential.id,
					name: credential.name,
					type: credential.type,
					data: credData,
				} as never);
				return {
					success: result.status === 'OK',
					message: result.message,
				};
			},
		};
	}

	private createNodeAdapter(): InstanceAiNodeService {
		const { loadNodesAndCredentials } = this;

		return {
			async listAvailable(options) {
				const { nodes } = await loadNodesAndCredentials.collectTypes();
				let filtered = nodes;

				if (options?.query) {
					const q = options.query.toLowerCase();
					filtered = nodes.filter(
						(n) =>
							n.displayName.toLowerCase().includes(q) ||
							n.name.toLowerCase().includes(q) ||
							n.description?.toLowerCase().includes(q),
					);
				}

				return filtered.map(
					(n): NodeSummary => ({
						name: n.name,
						displayName: n.displayName,
						description: n.description ?? '',
						group: n.group ?? [],
						version: Array.isArray(n.version) ? n.version[n.version.length - 1] : n.version,
					}),
				);
			},

			async getDescription(nodeType: string) {
				const { nodes } = await loadNodesAndCredentials.collectTypes();
				const desc = nodes.find((n) => n.name === nodeType);

				if (!desc) {
					throw new Error(`Node type ${nodeType} not found`);
				}

				return {
					name: desc.name,
					displayName: desc.displayName,
					description: desc.description ?? '',
					group: desc.group ?? [],
					version: Array.isArray(desc.version)
						? desc.version[desc.version.length - 1]
						: desc.version,
					properties: desc.properties.map((p) => ({
						displayName: p.displayName,
						name: p.name,
						type: p.type,
						required: p.required,
						description: p.description,
						default: p.default,
						options: p.options
							?.filter(
								(o): o is Extract<(typeof p.options)[number], { name: string; value: unknown }> =>
									typeof o === 'object' && o !== null && 'name' in o && 'value' in o,
							)
							.map((o) => ({
								name: String(o.name),
								value: o.value,
							})),
					})),
					credentials: desc.credentials?.map((c) => ({
						name: c.name,
						required: c.required,
					})),
					inputs: Array.isArray(desc.inputs) ? desc.inputs.map(String) : [],
					outputs: Array.isArray(desc.outputs) ? desc.outputs.map(String) : [],
				} satisfies NodeDescription;
			},
		};
	}
}

async function extractExecutionResult(
	executionRepository: ExecutionRepository,
	executionId: string,
): Promise<ExecutionResult> {
	const execution = await executionRepository.findSingleExecution(executionId, {
		includeData: true,
		unflattenData: true,
	});

	if (!execution) {
		return { executionId, status: 'success' };
	}

	const status =
		execution.status === 'error' || execution.status === 'crashed'
			? 'error'
			: execution.status === 'running' || execution.status === 'new'
				? 'running'
				: execution.status === 'waiting'
					? 'waiting'
					: 'success';

	// Extract output data from the last node's execution
	const resultData: Record<string, unknown> = {};
	const runData = execution.data?.resultData?.runData;
	if (runData) {
		for (const [nodeName, nodeRuns] of Object.entries(runData)) {
			const lastRun = nodeRuns[nodeRuns.length - 1];
			if (lastRun?.data?.main) {
				const outputItems = lastRun.data.main
					.flat()
					.filter((item): item is NonNullable<typeof item> => item !== null && item !== undefined)
					.map((item) => item.json);
				if (outputItems.length > 0) {
					resultData[nodeName] = outputItems;
				}
			}
		}
	}

	// Extract error if present
	const errorMessage = execution.data?.resultData?.error?.message;

	return {
		executionId,
		status,
		data: Object.keys(resultData).length > 0 ? resultData : undefined,
		error: errorMessage,
		startedAt: execution.startedAt?.toISOString(),
		finishedAt: execution.stoppedAt?.toISOString(),
	};
}

function toWorkflowDetail(workflow: WorkflowEntity): WorkflowDetail {
	return {
		id: workflow.id,
		name: workflow.name,
		active: workflow.active,
		createdAt: workflow.createdAt.toISOString(),
		updatedAt: workflow.updatedAt.toISOString(),
		nodes: (workflow.nodes ?? []).map(
			(n): WorkflowNode => ({
				name: n.name,
				type: n.type,
				parameters: n.parameters,
				position: n.position,
			}),
		),
		connections: workflow.connections as Record<string, unknown>,
		settings: workflow.settings as Record<string, unknown> | undefined,
	};
}
