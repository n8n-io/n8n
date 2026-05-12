import { EXECUTION_CALLER_METADATA_KEYS } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { IExecutionResponse, User } from '@n8n/db';
import {
	ExecutionRepository,
	ProjectRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { createHash } from 'crypto';
import {
	createRunExecutionData,
	MANUAL_TRIGGER_NODE_TYPE,
	UnexpectedError,
	type INode,
	type INodeCredentialDescription,
	type INodeParameters,
	type INodeProperties,
	type IRun,
	type IWorkflowBase,
	type IWorkflowExecutionDataProcess,
} from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { ActiveExecutions } from '@/active-executions';
import { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NodeTypes } from '@/node-types';
import { ExecutionMetadataService } from '@/services/execution-metadata.service';
import { WorkflowRunner } from '@/workflow-runner';

export type ExecuteNodeCaller = {
	kind: 'mcp' | 'sdk' | 'cli';
	name: string;
	clientId?: string;
};

export type ExecuteNodeRequest = {
	user: User;
	nodeType: string;
	nodeVersion?: number;
	parameters: INodeParameters;
	credentialId?: string;
	dryRun?: boolean;
	caller?: ExecuteNodeCaller;
};

export type ExecuteNodeStatus = 'success' | 'error' | 'dry_run';

export type ExecuteNodeResult = {
	executionId: string;
	status: ExecuteNodeStatus;
	output?: unknown[];
	error?: { message: string; stack?: string };
	wouldExecute?: { node: INode };
	executionUrl?: string;
};

type CredentialSummary = {
	id?: string;
	name?: string;
	type?: string;
};

/**
 * Marker prefix for the placeholder workflows backing single-node executions.
 * Used to filter them out of the user-facing workflows list (see
 * `workflow.service.ts:getMany`).
 */
const HUB_ACTION_WORKFLOW_PREFIX = '__n8n-hub-action::';

/**
 * Compute a deterministic UUID-formatted workflow id from an action id, so
 * repeated executions of the same action (e.g. `slack.message.send`) reuse the
 * same `workflow_entity` row. First-call creates the row; subsequent calls
 * find it. Pure function of `actionId` — no DB read needed to look up.
 */
function deterministicWorkflowIdForAction(actionId: string): string {
	const hash = createHash('sha256').update(`n8n-hub-action:${actionId}`).digest('hex');
	return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

/**
 * Compose the canonical action id from a node-type and its parameters.
 * Examples:
 *   - `n8n-nodes-base.slack` + `{resource: 'message', operation: 'send', ...}` → `n8n-nodes-base.slack.message.send`
 *   - `n8n-nodes-base.httpRequest` + `{}` → `n8n-nodes-base.httpRequest`
 *   - `n8n-nodes-base.set` + `{operation: 'json'}` → `n8n-nodes-base.set.json`
 */
function buildActionId(nodeType: string, parameters: INodeParameters): string {
	const resource = typeof parameters.resource === 'string' ? parameters.resource : undefined;
	const operation = typeof parameters.operation === 'string' ? parameters.operation : undefined;
	const parts = [nodeType];
	if (resource) parts.push(resource);
	if (operation) parts.push(operation);
	return parts.join('.');
}

/**
 * Resolve a human-friendly label for an action call. We compose:
 *   - the node's `displayName` (e.g. "Slack")
 *   - the operation's label from `description.properties[name=operation]`,
 *     preferring `action` ("Send a message") over `name` ("Send"). The
 *     `action` field is the descriptive copy n8n shows in its node search
 *     and action-picker UI — it reads naturally in the executions list.
 *   - Filtered by the matching `resource` discriminator if present.
 *
 * Returns:
 *   - `"Slack - Send a message"` when the operation has an `action`
 *   - `"Slack - Send"` when only `name` is available
 *   - `"Slack - post"` (raw value) as a last resort
 *   - `"Slack"` when the node has no operation discriminator at all
 */
function resolveActionDisplayName(
	description: { displayName?: string; name?: string; properties?: INodeProperties[] },
	parameters: INodeParameters,
): string {
	const nodeLabel = description.displayName ?? description.name ?? 'Node';
	const resource = typeof parameters.resource === 'string' ? parameters.resource : undefined;
	const operation = typeof parameters.operation === 'string' ? parameters.operation : undefined;
	if (!operation) return nodeLabel;

	const properties = description.properties ?? [];
	for (const prop of properties) {
		if (prop.name !== 'operation' || prop.type !== 'options') continue;

		// If the operation property is scoped to a specific resource via
		// `displayOptions.show.resource`, skip it when the call's resource
		// doesn't match.
		const showResource = prop.displayOptions?.show?.resource;
		if (resource !== undefined && showResource !== undefined) {
			const matches = Array.isArray(showResource)
				? showResource.some((v) => v === resource)
				: showResource === resource;
			if (!matches) continue;
		}

		for (const opt of prop.options ?? []) {
			if (
				typeof opt !== 'object' ||
				opt === null ||
				!('value' in opt) ||
				(opt as { value: unknown }).value !== operation
			) {
				continue;
			}

			// Prefer `action` (the descriptive copy) over `name` (the short label).
			const action = (opt as { action?: unknown }).action;
			if (typeof action === 'string' && action.length > 0) {
				return `${nodeLabel} - ${action}`;
			}
			const name = (opt as { name?: unknown }).name;
			if (typeof name === 'string' && name.length > 0) {
				return `${nodeLabel} - ${name}`;
			}
		}
	}

	// Fallback: raw value if we couldn't find a display name option.
	return `${nodeLabel} - ${operation}`;
}

function isCredentialSummary(value: unknown): value is CredentialSummary {
	if (typeof value !== 'object' || value === null) return false;
	const record: Record<string, unknown> = { ...value };
	return (
		(record.id === undefined || typeof record.id === 'string') &&
		(record.name === undefined || typeof record.name === 'string') &&
		(record.type === undefined || typeof record.type === 'string')
	);
}

@Service()
export class ExecuteNodeService {
	/**
	 * Memoize one in-flight `Promise<void>` per action id so concurrent calls to
	 * `ensureActionWorkflow(actionId)` don't race on the workflow row creation.
	 */
	private readonly actionWorkflowEnsured = new Map<string, Promise<void>>();

	constructor(
		private readonly nodeTypes: NodeTypes,
		private readonly credentialsService: CredentialsService,
		private readonly workflowRunner: WorkflowRunner,
		private readonly activeExecutions: ActiveExecutions,
		private readonly executionMetadataService: ExecutionMetadataService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly executionRepository: ExecutionRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly logger: Logger,
	) {}

	/**
	 * Ensure a placeholder workflow row + sharing row exist for the given action.
	 *
	 * We create one workflow per `<nodeType>.<resource>.<operation>` tuple so the
	 * executions UI groups all calls of the same action under a single workflow
	 * (instead of a single shared placeholder swallowing every single-node call).
	 * The workflow id is deterministic from the action id, so the same action
	 * always reuses the same row.
	 *
	 * The first caller's personal project gets to "own" the placeholder.
	 * Subsequent callers reuse it. The caller's identity for credential access
	 * is still validated separately in `execute()` step 2 — this shared row is
	 * purely a data-model formality.
	 *
	 * Memoized per action id so repeated calls don't hit the DB.
	 */
	private async ensureActionWorkflow(actionId: string, callingUserId: string): Promise<string> {
		const workflowId = deterministicWorkflowIdForAction(actionId);

		// Cache-hit fast path. The cache stores a `Promise<void>` that resolved
		// once when we successfully created (or found) the placeholder. But the
		// row can be deleted out-of-band — DB cleanups, manual SQL, history
		// pruning — and on the next call we'd hand back a workflowId whose
		// `workflow_entity` row no longer exists, causing the FK on the
		// execution insert to fail. Re-verify on cache hit and self-heal.
		const cached = this.actionWorkflowEnsured.get(actionId);
		if (cached) {
			await cached;
			const stillThere = await this.workflowRepository.findOne({ where: { id: workflowId } });
			if (stillThere) return workflowId;
			// Row vanished — evict the poisoned cache entry and fall through to recreate.
			this.actionWorkflowEnsured.delete(actionId);
			this.logger.warn(
				`[n8n Hub] Action workflow "${actionId}" (${workflowId}) was deleted out-of-band; recreating.`,
			);
		}

		const ensure = (async () => {
			const existing = await this.workflowRepository.findOne({ where: { id: workflowId } });
			if (!existing) {
				try {
					await this.workflowRepository.insert({
						id: workflowId,
						name: `${HUB_ACTION_WORKFLOW_PREFIX}${actionId}`,
						active: false,
						isArchived: false,
						nodes: [],
						connections: {},
						settings: {},
						staticData: {},
						versionId: '',
					});
				} catch (error) {
					// Race-condition guard: another concurrent invocation for the same
					// action id may have just inserted the row. Re-check; if it now
					// exists, we're fine.
					const reExisting = await this.workflowRepository.findOne({ where: { id: workflowId } });
					if (!reExisting) {
						this.actionWorkflowEnsured.delete(actionId); // allow retry
						throw error;
					}
				}
			}

			// Ensure a SharedWorkflow row exists. Bind the placeholder to the
			// calling user's personal project if it's not already shared.
			const existingShare = await this.sharedWorkflowRepository.findOne({
				where: { workflowId, role: 'workflow:owner' },
			});
			if (existingShare) return;

			const personalProject = await this.projectRepository.getPersonalProjectForUser(callingUserId);
			if (!personalProject) {
				this.actionWorkflowEnsured.delete(actionId);
				throw new UnexpectedError(
					`Cannot initialize action placeholder for "${actionId}": user "${callingUserId}" has no personal project.`,
				);
			}

			try {
				await this.sharedWorkflowRepository.insert({
					workflowId,
					projectId: personalProject.id,
					role: 'workflow:owner',
				});
			} catch (error) {
				const reShare = await this.sharedWorkflowRepository.findOne({
					where: { workflowId, role: 'workflow:owner' },
				});
				if (!reShare) {
					this.actionWorkflowEnsured.delete(actionId);
					throw error;
				}
			}
		})();

		this.actionWorkflowEnsured.set(actionId, ensure);
		try {
			await ensure;
		} catch (error) {
			// On hard failure, evict the cache entry so the next call can retry
			// from scratch instead of awaiting an already-rejected promise.
			this.actionWorkflowEnsured.delete(actionId);
			throw error;
		}
		return workflowId;
	}

	async execute(req: ExecuteNodeRequest): Promise<ExecuteNodeResult> {
		// 1. Resolve the action node type. Throws if unknown.
		const nodeTypeInstance = this.nodeTypes.getByNameAndVersion(req.nodeType, req.nodeVersion);
		const description = nodeTypeInstance.description;

		// 2. Credential type validation, if a credential is provided.
		let credentialBinding: { type: string; name: string; id: string } | undefined;
		if (req.credentialId) {
			const fetched = await this.credentialsService.getOne(req.user, req.credentialId, false);
			if (!isCredentialSummary(fetched) || !fetched.type || !fetched.id) {
				throw new BadRequestError(
					`Credential "${req.credentialId}" is missing required fields (type, id).`,
				);
			}

			const allowedCredentialDescs: INodeCredentialDescription[] = description.credentials ?? [];
			const allowedTypes = allowedCredentialDescs.map((c) => c.name);

			if (allowedTypes.length === 0) {
				throw new BadRequestError(
					`Node "${req.nodeType}" does not accept credentials, but credentialId "${req.credentialId}" was provided.`,
				);
			}

			if (!allowedTypes.includes(fetched.type)) {
				throw new BadRequestError(
					`Invalid credential type for node "${req.nodeType}". Expected one of [${allowedTypes.join(
						', ',
					)}], but got "${fetched.type}".`,
				);
			}

			credentialBinding = {
				type: fetched.type,
				id: fetched.id,
				name: fetched.name ?? fetched.id,
			};
		}

		// 3. Build the action node spec (used by both dry-run and live execution).
		const actionTypeVersion =
			req.nodeVersion ??
			(typeof description.defaultVersion === 'number'
				? description.defaultVersion
				: typeof description.version === 'number'
					? description.version
					: 1);

		const actionNode: INode = {
			id: uuid(),
			name: 'Action',
			type: req.nodeType,
			typeVersion: actionTypeVersion,
			parameters: req.parameters,
			position: [200, 0],
			...(credentialBinding
				? {
						credentials: {
							[credentialBinding.type]: {
								id: credentialBinding.id,
								name: credentialBinding.name,
							},
						},
					}
				: {}),
		};

		// 4. Dry-run short-circuit: do NOT touch the engine.
		if (req.dryRun) {
			return {
				executionId: '',
				status: 'dry_run',
				wouldExecute: { node: actionNode },
			};
		}

		// 5. Build the trigger and the workflow envelope.
		const triggerNode: INode = {
			id: uuid(),
			name: 'Trigger',
			type: MANUAL_TRIGGER_NODE_TYPE,
			typeVersion: 1,
			parameters: {},
			position: [0, 0],
		};

		// The execution row's FK to workflow_entity needs a real row, and many
		// downstream lookups (variables, telemetry, credential checks) require a
		// SharedWorkflow ownership row. We create one workflow per action id so
		// the executions UI groups runs of the same action together (instead of
		// piling every single-node call under one global placeholder).
		const actionId = buildActionId(req.nodeType, req.parameters);
		const workflowId = await this.ensureActionWorkflow(actionId, req.user.id);

		const workflowData: IWorkflowBase = {
			id: workflowId,
			name: `${HUB_ACTION_WORKFLOW_PREFIX}${actionId}`,
			nodes: [triggerNode, actionNode],
			connections: {
				Trigger: { main: [[{ node: 'Action', type: 'main', index: 0 }]] },
			},
			active: false,
			isArchived: false,
			activeVersionId: null,
			pinData: {},
			settings: {},
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const triggerPinData = [{ json: {} }];

		const runData: IWorkflowExecutionDataProcess = {
			executionMode: 'single-node',
			workflowData,
			userId: req.user.id,
			startNodes: [{ name: 'Trigger', sourceData: null }],
			pinData: { Trigger: triggerPinData },
			executionData: createRunExecutionData({
				startData: {},
				resultData: {
					pinData: { Trigger: triggerPinData },
					runData: {},
				},
				executionData: {
					contextData: {},
					metadata: {},
					nodeExecutionStack: [
						{
							node: triggerNode,
							data: {
								main: [triggerPinData],
							},
							source: null,
						},
					],
					waitingExecution: {},
					waitingExecutionSource: {},
				},
			}),
		};

		// 6. Dispatch and wait for completion.
		// `workflowRunner.run()` awaits `runMainProcess` to completion for
		// single-node (interactive) executions, which means by the time it
		// returns the execution has already resolved and `activeExecutions`
		// has auto-deleted the entry via its `.finally(() => delete)` hook.
		// So we cannot rely on `getPostExecutePromise` here — we fetch the
		// stored execution from the repository instead. We still try the
		// in-memory promise first in case timing shifts in future versions.
		const executionId = await this.workflowRunner.run(runData);

		let runResult: IRun | undefined;
		if (this.activeExecutions.has(executionId)) {
			runResult = await this.activeExecutions.getPostExecutePromise(executionId);
		} else {
			const stored = await this.executionRepository.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
			});
			if (stored) {
				runResult = this.runFromStoredExecution(stored);
			}
		}

		if (runResult === undefined) {
			throw new UnexpectedError(
				`Execution ${executionId} for node "${req.nodeType}" did not return any data (it may have been cancelled).`,
			);
		}

		const { status, output, error } = this.extractRunResult(runResult);

		// Persist caller / node identity into ExecutionMetadata so n8n Hub
		// observability (and the executions DTO) can attribute single-node runs
		// back to the MCP / SDK / CLI invocation. Failures here must not bubble
		// up — the execution itself already succeeded and we don't want metadata
		// loss to look like an execution failure to the caller.
		await this.persistCallerMetadata(executionId, req, description);

		return {
			executionId,
			status,
			...(output !== undefined ? { output } : {}),
			...(error !== undefined ? { error } : {}),
		};
	}

	private async persistCallerMetadata(
		executionId: string,
		req: ExecuteNodeRequest,
		description: { displayName?: string; name?: string; properties?: INodeProperties[] },
	): Promise<void> {
		const metadata: Record<string, string> = {
			[EXECUTION_CALLER_METADATA_KEYS.nodeType]: req.nodeType,
			// Full operation id so the UI can show "slack.message.send" instead of
			// just "n8n-nodes-base.slack" for nodes with resource/operation
			// discriminators. Plain nodes (no discriminator) get the same value
			// as `nodeType` here, which is fine.
			[EXECUTION_CALLER_METADATA_KEYS.actionId]: buildActionId(req.nodeType, req.parameters),
			// Human-friendly label for the executions list, e.g. "Slack - Post Message".
			[EXECUTION_CALLER_METADATA_KEYS.actionDisplayName]: resolveActionDisplayName(
				description,
				req.parameters,
			),
		};

		if (req.caller) {
			metadata[EXECUTION_CALLER_METADATA_KEYS.kind] = req.caller.kind;
			metadata[EXECUTION_CALLER_METADATA_KEYS.name] = req.caller.name;
			if (req.caller.clientId !== undefined) {
				metadata[EXECUTION_CALLER_METADATA_KEYS.clientId] = req.caller.clientId;
			}
		}

		if (req.credentialId !== undefined) {
			metadata[EXECUTION_CALLER_METADATA_KEYS.credentialId] = req.credentialId;
		}

		try {
			await this.executionMetadataService.save(executionId, metadata);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.warn(
				`Failed to persist caller metadata for execution "${executionId}": ${message}`,
				{ executionId, nodeType: req.nodeType },
			);
		}
	}

	/**
	 * Shape a stored `IExecutionResponse` (post-completion DB record) into the
	 * `IRun` form `extractRunResult` expects. Used when the in-memory
	 * activeExecutions entry has already been auto-deleted (because the
	 * execution resolved before our code could grab the promise).
	 */
	private runFromStoredExecution(stored: IExecutionResponse): IRun {
		const resultError = stored.data?.resultData?.error;
		const status =
			stored.status === 'error' || resultError ? 'error' : (stored.status as IRun['status']);

		return {
			data: stored.data,
			finished: stored.finished,
			mode: stored.mode,
			startedAt: stored.startedAt,
			...(stored.stoppedAt ? { stoppedAt: stored.stoppedAt } : {}),
			status,
		} as IRun;
	}

	private extractRunResult(run: IRun): {
		status: 'success' | 'error';
		output?: unknown[];
		error?: { message: string; stack?: string };
	} {
		const resultData = run.data?.resultData;
		const resultError = resultData?.error;
		const hasError = run.status === 'error' || Boolean(resultError);

		const actionTaskData = resultData?.runData?.Action?.[0];
		const actionMain = actionTaskData?.data?.main?.[0];
		const output = Array.isArray(actionMain) ? actionMain.map((item) => item?.json) : undefined;

		if (hasError) {
			const message = resultError?.message ?? 'Single-node execution completed with errors';
			const stack = resultError?.stack;
			return {
				status: 'error',
				...(output !== undefined ? { output } : {}),
				error: stack ? { message, stack } : { message },
			};
		}

		return {
			status: 'success',
			...(output !== undefined ? { output } : {}),
		};
	}
}
