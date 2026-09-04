import { Logger } from '@n8n/backend-common';
import { WorkflowEntity, WorkflowRepository } from '@n8n/db';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { sleep } from '@n8n/utils/sleep';
import { InstanceSettings } from 'n8n-core';
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
const MULTI_MAIN_POLL_INTERVAL_MS = 1_000;

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
	projectId: string;
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
 * Executes a single node standalone with real credentials and caller-supplied
 * input items.
 *
 * Runs through `WorkflowRunner` so the configured isolation applies — in queue
 * mode node code runs on a worker, never in a process the engine would not run
 * it in (task runners only isolate Code-node scripts). `WorkflowRunner`
 * requires a persisted workflow row (FK on `execution_entity.workflowId`), so
 * an archived single-node workflow is created per run — the chat-hub pattern —
 * and deleted afterwards.
 *
 * `findCredentialForUser` is the caller-facing authorization gate; nothing
 * downstream re-checks per user. The temp workflow is created in the caller's
 * `projectId` (the Instance AI conversation's project), and the engine's
 * project-level check runs against it, so credentials shared with that project
 * are usable while anything else fails at run start (fails closed).
 */
@Service()
export class ExecuteNodeService {
	constructor(
		private readonly nodeTypes: NodeTypes,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly logger: Logger,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowRunner: WorkflowRunner,
		private readonly activeExecutions: ActiveExecutions,
		private readonly executionPersistence: ExecutionPersistence,
		private readonly instanceSettings: InstanceSettings,
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

		const workflow = await this.createTemporaryWorkflow(request.projectId, node, timeoutMs);
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

	/** `requestDefaults` marks a declarative node, which the engine can route
	 *  without an `execute` method; trigger/webhook-only nodes have neither. */
	private assertExecutable(nodeType: INodeType, type: string) {
		if (nodeType.execute) return;
		if (nodeType.description.requestDefaults !== undefined) return;

		throw new BadRequestError(
			`Node type "${type}" has no execute method and no routing support (e.g. it is trigger/webhook-only)`,
		);
	}

	/** Managed credentials (AI Gateway) are minted per execution and carry no
	 *  stored row — force `id: null` so a stale or foreign id never reaches the node. */
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
		projectId: string,
		node: INode,
		timeoutMs: number,
	): Promise<WorkflowEntity> {
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
			// Force-save: the execution row is the only result channel that works in queue mode.
			saveManualExecutions: true,
			saveDataSuccessExecution: 'all',
			saveDataErrorExecution: 'all',
			executionTimeout: Math.ceil(timeoutMs / 1000),
		};

		return await this.workflowRepository.createWorkflowWithOwner(newWorkflow, projectId);
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
			// Top-level runData fields don't survive queue serialization; the worker reads this.
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

	private async waitForCompletion(executionId: string, timeoutMs: number): Promise<boolean> {
		if (!this.activeExecutions.has(executionId)) return false;

		const abort = new AbortController();
		let timeoutId: NodeJS.Timeout | undefined;
		// The workflow's executionTimeout is the primary bound; this race only
		// catches an execution that never settles.
		const timeout = new Promise<never>((_, reject) => {
			timeoutId = setTimeout(
				() => reject(new TimeoutExecutionCancelledError(executionId)),
				timeoutMs + 1_000,
			);
		});

		try {
			await Promise.race([this.waitForSettled(executionId, abort.signal), timeout]);
			return false;
		} catch (error) {
			if (error instanceof TimeoutExecutionCancelledError) {
				abort.abort();
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

	/** The post-execute promise does not reliably settle on multi-main (Bull's
	 *  `job.finished()` behind it), so poll the execution row there — same as
	 *  chat-hub's `waitForExecutionCompletion`. */
	private async waitForSettled(executionId: string, signal: AbortSignal): Promise<void> {
		if (!this.instanceSettings.isMultiMain) {
			await this.activeExecutions.getPostExecutePromise(executionId);
			return;
		}

		while (!signal.aborted) {
			const execution = await this.executionPersistence.findSingleExecution(executionId, {
				includeData: false,
				unflattenData: false,
			});
			const inFlight = execution?.status === 'new' || execution?.status === 'running';
			if (!inFlight) return;
			await sleep(MULTI_MAIN_POLL_INTERVAL_MS, signal);
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

		// The temp workflow is deleted after this read, so a waiting execution
		// could never be resumed — report it instead of a false success.
		if (execution?.status === 'waiting' || execution?.waitTill) {
			return {
				status: 'error',
				error: {
					message: `Node type "${nodeTypeName}" entered a wait state; standalone node execution does not support waiting or resuming (e.g. Wait nodes or send-and-wait operations)`,
				},
			};
		}

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
