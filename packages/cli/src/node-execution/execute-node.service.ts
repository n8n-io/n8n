import { Logger } from '@n8n/backend-common';
import {
	ProjectRepository,
	SharedWorkflow,
	SharedWorkflowRepository,
	withTransaction,
	WorkflowEntity,
	WorkflowRepository,
} from '@n8n/db';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { createRunExecutionData, NodeError, TimeoutExecutionCancelledError } from 'n8n-workflow';
import type {
	IDataObject,
	INode,
	INodeCredentials,
	INodeExecutionData,
	INodeParameters,
	INodeType,
} from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { ActiveExecutions } from '@/active-executions';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { NodeTypes } from '@/node-types';
import { WorkflowRunner } from '@/workflow-runner';

export const DEFAULT_EXECUTE_NODE_TIMEOUT_MS = 30_000;
export const MAX_EXECUTE_NODE_TIMEOUT_MS = 60_000;

const NODE_NAME = 'Node';

/** Mirrors a workflow-sdk node (`{ type, version, config }`) so callers can
 *  pass a node they are building verbatim. */
export interface ExecuteNodeRequest {
	type: string;
	version: number;
	config: {
		parameters: INodeParameters;
		credentials?: INodeCredentials;
	};
	input?: Array<{ json: IDataObject }>;
	timeoutMs?: number;
}

export interface ExecuteNodeOutputItem {
	json: IDataObject;
	binary?: Record<string, { fileName?: string; mimeType?: string; fileSize?: string }>;
}

export interface ExecuteNodeError {
	message: string;
	description?: string;
	nodeErrorType?: string;
}

export type ExecuteNodeResult =
	| { status: 'success'; output: ExecuteNodeOutputItem[][] }
	| { status: 'error'; error: ExecuteNodeError };

/**
 * Executes a single node standalone, with real credentials and caller-supplied
 * parameters and input items.
 *
 * The node runs through `WorkflowRunner` — the same path as any other
 * execution — so the instance's configured isolation applies (queue mode
 * dispatches to a worker; `OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS` is honored
 * for the manual mode used here). Node code must never run in a process the
 * engine would not run it in: task runners only isolate Code-node scripts, so
 * the worker process boundary is the only crash isolation arbitrary node code
 * gets. `WorkflowRunner` requires a persisted workflow row (hard FK on
 * `execution_entity.workflowId`), so an archived single-node workflow is
 * created per run — the pattern chat-hub uses — and deleted afterwards, which
 * cascades away the execution row.
 *
 * Authorization: `findCredentialForUser` (per-user `credential:read`) is the
 * caller-facing gate; the engine's project-level credential check runs again
 * at execution start against the temp workflow's project (the user's personal
 * project). A credential the user can read only through a team project
 * therefore fails at run start — a conservative failure.
 *
 * Known limitations: expressions referencing other nodes cannot resolve (the
 * workflow really has one node); binary output is returned as metadata only.
 */
@Service()
export class ExecuteNodeService {
	constructor(
		private readonly nodeTypes: NodeTypes,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly logger: Logger,
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly workflowRunner: WorkflowRunner,
		private readonly activeExecutions: ActiveExecutions,
		private readonly executionPersistence: ExecutionPersistence,
	) {}

	async run(user: User, request: ExecuteNodeRequest): Promise<ExecuteNodeResult> {
		const nodeType = this.resolveNodeType(request.type, request.version);
		this.assertExecutable(nodeType, request.type);

		const credentials = request.config.credentials
			? this.normalizeCredentials(request.config.credentials)
			: undefined;
		await this.checkCredentialAccess(user, credentials);

		const node = this.buildNode(request, credentials);
		const timeoutMs = Math.min(
			request.timeoutMs ?? DEFAULT_EXECUTE_NODE_TIMEOUT_MS,
			MAX_EXECUTE_NODE_TIMEOUT_MS,
		);
		const inputItems: INodeExecutionData[] = request.input ?? [{ json: {} }];

		const workflow = await this.createTemporaryWorkflow(user, node, timeoutMs);
		try {
			return await this.execute(user, workflow, node, inputItems, timeoutMs);
		} catch (error) {
			return { status: 'error', error: this.toErrorResponse(error) };
		} finally {
			await this.deleteTemporaryWorkflow(workflow.id);
		}
	}

	private resolveNodeType(type: string, version: number): INodeType {
		try {
			return this.nodeTypes.getByNameAndVersion(type, version);
		} catch (error) {
			throw new BadRequestError(
				`Unknown node type "${type}" (version ${version})`,
				undefined,
				undefined,
				error,
			);
		}
	}

	/**
	 * A node is runnable if it has an `execute` method or is declarative
	 * (routable — the engine handles those itself). Trigger-only and
	 * webhook-only nodes have neither and are rejected with a clear message
	 * instead of failing deep inside execution.
	 */
	private assertExecutable(nodeType: INodeType, type: string) {
		if (nodeType.execute) return;
		if (nodeType.description.requestDefaults !== undefined) return;

		throw new BadRequestError(
			`Node type "${type}" has no execute method and no routing support (e.g. it is trigger/webhook-only)`,
		);
	}

	/**
	 * Managed credentials (e.g. the AI Gateway) are minted per execution and
	 * carry no stored row — force `id: null` regardless of what the caller sent,
	 * so a stale or foreign id can never reach the node.
	 */
	private normalizeCredentials(credentials: INodeCredentials): INodeCredentials {
		const normalized: INodeCredentials = {};
		for (const [credentialType, credential] of Object.entries(credentials)) {
			normalized[credentialType] = credential.__aiGatewayManaged
				? { id: null, name: credential.name, __aiGatewayManaged: true }
				: credential;
		}
		return normalized;
	}

	private async checkCredentialAccess(user: User, credentials?: INodeCredentials) {
		for (const [credentialType, credential] of Object.entries(credentials ?? {})) {
			// Managed credentials (e.g. the AI Gateway) have no stored row to check
			// access against — the engine's own credential checks skip them too.
			if (credential.__aiGatewayManaged) continue;

			if (!credential.id) {
				throw new BadRequestError(`Credential reference for "${credentialType}" is missing an id`);
			}

			const accessible = await this.credentialsFinderService.findCredentialForUser(
				credential.id,
				user,
				['credential:read'],
			);
			if (!accessible) {
				throw new ForbiddenError(
					`You do not have access to the "${credentialType}" credential used by this node`,
				);
			}
		}
	}

	private buildNode(request: ExecuteNodeRequest, credentials?: INodeCredentials): INode {
		return {
			id: uuid(),
			name: NODE_NAME,
			type: request.type,
			typeVersion: request.version,
			position: [0, 0],
			parameters: request.config.parameters,
			credentials,
		};
	}

	private async createTemporaryWorkflow(
		user: User,
		node: INode,
		timeoutMs: number,
	): Promise<WorkflowEntity> {
		const personalProject = await this.projectRepository.getPersonalProjectForUserOrFail(user.id);

		return await withTransaction(this.workflowRepository.manager, undefined, async (em) => {
			const newWorkflow = new WorkflowEntity();
			newWorkflow.isArchived = true;
			newWorkflow.versionId = uuid();
			newWorkflow.name = `Execute node ${node.type}`;
			newWorkflow.active = false;
			newWorkflow.activeVersionId = null;
			newWorkflow.nodes = [node];
			newWorkflow.connections = {};
			newWorkflow.settings = {
				executionOrder: 'v1',
				// Force-save so the result can be read back from the execution row —
				// the only channel that works in queue mode too.
				saveManualExecutions: true,
				saveDataSuccessExecution: 'all',
				saveDataErrorExecution: 'all',
				// Engine-side bound, enforced on main and worker alike.
				executionTimeout: Math.ceil(timeoutMs / 1000),
			};

			const workflow = await em.save<WorkflowEntity>(newWorkflow);
			await em.save<SharedWorkflow>(
				this.sharedWorkflowRepository.create({
					role: 'workflow:owner',
					projectId: personalProject.id,
					workflow,
				}),
			);
			return workflow;
		});
	}

	/** Cascade also removes the execution row, so read the result first. */
	private async deleteTemporaryWorkflow(workflowId: string) {
		try {
			await this.workflowRepository.delete(workflowId);
		} catch (error) {
			this.logger.warn('Failed to delete temporary execute-node workflow', {
				workflowId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private async execute(
		user: User,
		workflowData: WorkflowEntity,
		node: INode,
		inputItems: INodeExecutionData[],
		timeoutMs: number,
	): Promise<ExecuteNodeResult> {
		const executionData = createRunExecutionData({
			startData: {},
			resultData: { runData: {} },
			executionData: {
				contextData: {},
				metadata: {},
				nodeExecutionStack: [{ node, data: { main: [inputItems] }, source: null }],
				waitingExecution: {},
				waitingExecutionSource: {},
			},
			// Top-level runData fields don't survive queue serialization — the
			// worker reads the user id from here.
			manualData: { userId: user.id },
		});

		const executionId = await this.workflowRunner.run({
			executionMode: 'manual',
			workflowData,
			executionData,
			userId: user.id,
		});

		const timedOut = await this.waitForCompletion(executionId, timeoutMs);
		if (timedOut) {
			return {
				status: 'error',
				error: { message: `Execution timed out after ${timeoutMs}ms and was cancelled` },
			};
		}

		return await this.extractResult(executionId, node.type);
	}

	/** Returns true when the execution was cancelled because of the fallback timeout. */
	private async waitForCompletion(executionId: string, timeoutMs: number): Promise<boolean> {
		if (!this.activeExecutions.has(executionId)) return false;

		let timeoutId: NodeJS.Timeout | undefined;
		// The engine's own executionTimeout (set on the temp workflow) is the
		// primary bound; this race only catches an execution that never settles.
		const timeout = new Promise<never>((_, reject) => {
			timeoutId = setTimeout(
				() => reject(new TimeoutExecutionCancelledError(executionId)),
				timeoutMs + 1_000,
			);
		});

		try {
			await Promise.race([this.activeExecutions.getPostExecutePromise(executionId), timeout]);
			return false;
		} catch (error) {
			if (error instanceof TimeoutExecutionCancelledError) {
				try {
					this.activeExecutions.stopExecution(executionId, error);
				} catch {
					// Execution may have completed between timeout and cancel
				}
				return true;
			}
			throw error;
		} finally {
			clearTimeout(timeoutId);
		}
	}

	private async extractResult(
		executionId: string,
		nodeTypeName: string,
	): Promise<ExecuteNodeResult> {
		const execution = await this.executionPersistence.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});

		const executionError = execution?.data?.resultData?.error;
		if (executionError) {
			return { status: 'error', error: this.toErrorResponse(executionError) };
		}

		const nodeRuns = execution?.data?.resultData?.runData?.[NODE_NAME];
		const lastRun = nodeRuns?.[nodeRuns.length - 1];
		if (lastRun?.error) {
			return { status: 'error', error: this.toErrorResponse(lastRun.error) };
		}

		const branches = lastRun?.data?.main;
		if (!branches) {
			return {
				status: 'error',
				error: { message: `Node type "${nodeTypeName}" produced no output` },
			};
		}

		return { status: 'success', output: this.toOutput(branches) };
	}

	private toOutput(branches: Array<INodeExecutionData[] | null>): ExecuteNodeOutputItem[][] {
		return branches.map((branch) => (branch ?? []).map((item) => this.toOutputItem(item)));
	}

	private toOutputItem(item: INodeExecutionData): ExecuteNodeOutputItem {
		if (!item.binary) return { json: item.json };

		const binary: ExecuteNodeOutputItem['binary'] = {};
		for (const [key, value] of Object.entries(item.binary)) {
			binary[key] = {
				fileName: value.fileName,
				mimeType: value.mimeType,
				fileSize: value.fileSize,
			};
		}
		return { json: item.json, binary };
	}

	private toErrorResponse(error: unknown): ExecuteNodeError {
		if (error instanceof NodeError) {
			return {
				message: error.message,
				description: error.description ?? undefined,
				nodeErrorType: error.constructor.name,
			};
		}
		if (error instanceof Error) {
			this.logger.debug('Execute node failed', { error: error.message });
			return { message: error.message };
		}
		// Errors read back from a persisted execution are revived as plain
		// objects, not Error instances.
		if (typeof error === 'object' && error !== null && 'message' in error) {
			const revived = error as { message: string; description?: string | null; name?: string };
			return {
				message: revived.message,
				description: revived.description ?? undefined,
				nodeErrorType: revived.name,
			};
		}
		return { message: 'Unknown error' };
	}
}
