import type {
	DesktopAssistantApplyEditsRequest,
	DesktopAssistantApplyEditsResponse,
	DesktopAssistantDescriptionPart,
	DesktopAssistantHistoryResponse,
	DesktopAssistantPromoteRequest,
	DesktopAssistantPromoteResponse,
	DesktopAssistantRecommendationsRequest,
	DesktopAssistantRecommendationsResponse,
	DesktopAssistantTaskDetailResponse,
	DesktopAssistantTaskRequest,
	DesktopAssistantTaskResponse,
	DesktopAssistantTasksResponse,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import {
	ExecutionRepository,
	TagRepository,
	WorkflowRepository,
	WorkflowTagMappingRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import type { StoredEvent } from '@n8n/instance-ai';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';
import type { ExecutionStatus } from 'n8n-workflow';
import { OperationalError } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { CredentialTypes } from '@/credential-types';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { ExecutionService } from '@/executions/execution.service';
import { NodeTypes } from '@/node-types';
import { ProjectService } from '@/services/project.service.ee';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import { WorkflowSharingService } from '@/workflows/workflow-sharing.service';
import { WorkflowService } from '@/workflows/workflow.service';

import {
	COMPUTER_USE_NODE_TYPES,
	DESKTOP_ASSISTANT_TAG,
	DESKTOP_ASSISTANT_THREAD_SOURCE,
	DEVICE_CONNECTION_CREDENTIAL_TYPE,
	PROMOTE_RUN_ID_KEY,
	PROMOTED_FROM_THREAD_ID_KEY,
	PROMOTED_WORKFLOW_ID_KEY,
	THREAD_SOURCE_METADATA_KEY,
} from './constants';
import { classifyWorkflowsForDesktopAssistant } from './desktop-assistant.classifier';
import type { ClassifierInput } from './desktop-assistant.classifier';
import {
	clampLimit,
	composeApplyEditsMessage,
	composeOneShotMessage,
	composePromoteMessage,
	composeRecommendationsInput,
	composeTaskDescriptionInput,
	extractBuiltWorkflowId,
	extractTextContent,
	extractWorkflowLoopBuildOutcome,
	normalizeDescriptionParts,
	readCachedTaskDetail,
	readDesktopAssistantMeta,
	RECOMMENDATIONS_INSTRUCTIONS,
	splitLeadingEmoji,
	summarizeExecutionError,
	TASK_DESCRIPTION_INSTRUCTIONS,
} from './desktop-assistant.helpers';
import {
	computeMissingCredentialTypes,
	computeNodesRequiringCredentialSetup,
} from './node-credential-requirements';

import { InProcessEventBus } from '../event-bus/in-process-event-bus';
import { InstanceAiMemoryService } from '../instance-ai-memory.service';
import { InstanceAiService } from '../instance-ai.service';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

/** Upper bound on how long a build-outcome listener (promote, edit, one-shot)
 * stays subscribed, so a stalled run never leaks a subscription. */
const BUILD_FINALIZE_TIMEOUT_MS = 5 * 60 * 1000;

/** Statuses we treat as a failure worth surfacing an error message for. `canceled`
 * is excluded — a user-stopped run has no meaningful error. */
const FAILED_HISTORY_STATUSES: ReadonlySet<ExecutionStatus> = new Set(['error', 'crashed']);

/** Upper bound on failed rows we load full execution data for per page, to cap
 * the cost of parsing many large execution blobs. The default page is 20, so
 * this only bites a pathological all-failed page near the 100-row limit. */
const MAX_ERROR_ENRICHMENTS = 30;

const EMPTY_HISTORY = Object.freeze({
	results: [],
	estimated: false,
	count: 0,
} satisfies DesktopAssistantHistoryResponse);

/** Upper bound on how many task recommendations we'll ever return. */
const MAX_RECOMMENDATIONS = 5;

/** Cap on the distinct integration types fed to the model as grounding, so a
 * user with hundreds of credentials doesn't bloat the prompt. */
const MAX_RECOMMENDATION_INTEGRATIONS = 30;

const recommendationItemSchema = z.object({
	title: z.string(),
	prompt: z.string(),
	icon: z.string(),
});

/** Structured-output schema for the recommendations generation, bounded to the
 * requested count (1..MAX_RECOMMENDATIONS). */
function buildRecommendationsSchema(limit: number) {
	return z.object({
		recommendations: z.array(recommendationItemSchema).min(1).max(limit),
	});
}

/** Clamp a requested count into 1..MAX_RECOMMENDATIONS, defaulting to the max. */
function clampRecommendationsLimit(limit: number | undefined): number {
	if (!limit) return MAX_RECOMMENDATIONS;
	return Math.min(Math.max(1, Math.floor(limit)), MAX_RECOMMENDATIONS);
}

/** Structured-output schema for the task-description generation. Kept loose
 *  (no per-kind required fields) so the model can't fail validation on shape
 *  nuances; `normalizeDescriptionParts` tightens the result. */
const taskDescriptionSchema = z.object({
	parts: z
		.array(
			z.object({
				kind: z.enum(['text', 'param']),
				text: z.string().optional(),
				value: z.string().optional(),
				options: z.array(z.string()).optional(),
			}),
		)
		.min(1)
		.max(40),
});

/**
 * BFF for the n8n personal-automation desktop assistant.
 *
 * Responsibilities:
 * - Classify the user's accessible workflows into the three desktop assistant
 *   buckets (actionNeeded / upcoming / readyToRun).
 * - Trigger a one-shot Instance AI run with the desktop-assistant prompt mode.
 * - Promote an Instance AI thread into a real, editable workflow by handing
 *   the thread's original intent back to the workflow builder.
 * - Surface the execution history for desktop-assistant-tagged workflows.
 *
 * All endpoints are gated by the Instance AI feature flag at the controller
 * layer; this service assumes the gate has been checked.
 */
@Service()
export class DesktopAssistantService {
	/** Memoised id of the `desktop-assistant` tag. Null when the tag has not
	 * been created yet on this instance. Refreshed lazily on first access
	 * and after a successful promote. */
	private desktopAssistantTagId: string | null = null;

	/**
	 * Build runs that have finished but whose outcome is still being settled
	 * (outcome read + the `onWorkflowBuilt` follow-up: tag, meta, credential,
	 * `promotedWorkflowId`, activation). The client's confirming promote call
	 * races exactly this window: the run is no longer active and the workflow id
	 * is not yet on the thread, so without this marker `promoteThread` would
	 * fall through and start a duplicate build.
	 */
	private readonly finalizingBuildRunIds = new Set<string>();

	constructor(
		private readonly logger: Logger,
		private readonly instanceAiService: InstanceAiService,
		private readonly memoryService: InstanceAiMemoryService,
		private readonly eventBus: InProcessEventBus,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowSharingService: WorkflowSharingService,
		private readonly tagRepository: TagRepository,
		private readonly workflowTagMappingRepository: WorkflowTagMappingRepository,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly executionService: ExecutionService,
		private readonly executionRepository: ExecutionRepository,
		private readonly executionPersistence: ExecutionPersistence,
		private readonly projectService: ProjectService,
		private readonly nodeTypes: NodeTypes,
		private readonly credentialTypes: CredentialTypes,
		private readonly workflowService: WorkflowService,
	) {}

	// ── tasks list ───────────────────────────────────────────────────────────

	async getTasks(user: User): Promise<DesktopAssistantTasksResponse> {
		const accessibleWorkflowIds = await this.workflowSharingService.getSharedWorkflowIds(user, {
			scopes: ['workflow:read'],
		});
		if (accessibleWorkflowIds.length === 0) {
			return { actionNeeded: [], upcoming: [], readyToRun: [] };
		}

		// Filter archived workflows out of the desktop assistant view. Archive is a
		// user signal of "I'm done with this"; it should not surface in the
		// always-on assistant card. workflowFinderService doesn't filter for us,
		// so we drop archived rows after the share check.
		const sharedWorkflows = await this.workflowFinderService.findWorkflowsByIdsForUser(
			accessibleWorkflowIds,
			user,
			['workflow:read'],
		);
		const workflows = sharedWorkflows.filter((wf) => !wf.isArchived);
		const liveWorkflowIds = workflows.map((wf) => wf.id);
		if (liveWorkflowIds.length === 0) {
			return { actionNeeded: [], upcoming: [], readyToRun: [] };
		}

		// Fetch tags for each workflow in one round-trip via the join column.
		const workflowsWithTags = await this.workflowRepository.find({
			where: { id: In(liveWorkflowIds) },
			relations: { tags: true },
			select: { id: true, tags: { name: true } },
		});
		const tagsByWorkflowId = new Map<string, Array<{ name: string }>>();
		for (const wf of workflowsWithTags) {
			tagsByWorkflowId.set(
				wf.id,
				(wf.tags ?? []).map((t) => ({ name: t.name })),
			);
		}

		// Tasks are the assistant's own creations, not the user's whole instance.
		const taskWorkflows = workflows.filter((workflow) =>
			(tagsByWorkflowId.get(workflow.id) ?? []).some((tag) => tag.name === DESKTOP_ASSISTANT_TAG),
		);
		if (taskWorkflows.length === 0) {
			return { actionNeeded: [], upcoming: [], readyToRun: [] };
		}

		const credentials = await this.credentialsFinderService.findCredentialsForUser(user, [
			'credential:read',
		]);
		const accessibleCredentialIds = new Set(credentials.map((c) => c.id));

		const lastExecutionByWorkflowId = await this.fetchLastExecutionByWorkflowId(
			taskWorkflows.map((wf) => wf.id),
		);

		const inputs: ClassifierInput[] = taskWorkflows.map((workflow) => {
			// Icon priority: explicit `meta.desktopAssistant.icon` wins, then any
			// leading emoji the orchestrator put on the workflow name (the
			// `desktop-assistant-promote` prompt instructs picking one), then the
			// classifier falls back to a node-type icon. The display name strips
			// the leading emoji so the desktop card shows it once, in the icon slot.
			const metaIcon = readDesktopAssistantMeta(workflow.meta)?.icon;
			const { emoji: nameEmoji, rest: displayName } = splitLeadingEmoji(workflow.name);
			const lastExec = lastExecutionByWorkflowId.get(workflow.id);
			return {
				workflowId: workflow.id,
				name: displayName || workflow.name,
				active: workflow.active,
				nodes: workflow.nodes,
				tags: tagsByWorkflowId.get(workflow.id) ?? [],
				settings: { timezone: workflow.settings?.timezone },
				lastExecution: lastExec
					? {
							id: lastExec.id,
							status: lastExec.status,
							startedAt: lastExec.startedAt,
						}
					: undefined,
				emojiIcon: metaIcon ?? nameEmoji,
				accessibleCredentialIds,
				nodesRequiringCredentialSetup: computeNodesRequiringCredentialSetup(
					workflow.nodes,
					this.nodeTypes,
				),
			};
		});

		const response = classifyWorkflowsForDesktopAssistant(inputs);
		this.attachNodeIcons(response);
		return response;
	}

	/**
	 * Resolve node-typed icons so the desktop client can render the real node icon
	 * instead of a text fallback: file icons become a URL, font-awesome/built-in
	 * icons become a name + palette color. Emoji icons and unresolvable nodes are
	 * left untouched (the client falls back to the workflow name's initial).
	 */
	private attachNodeIcons(response: DesktopAssistantTasksResponse): void {
		const cards = [...response.actionNeeded, ...response.upcoming, ...response.readyToRun];
		for (const card of cards) {
			if (card.icon.type !== 'node') continue;
			Object.assign(card.icon, this.resolveNodeIcon(card.icon.nodeType));
		}
	}

	/**
	 * Resolve a node type's icon into the fields the desktop client renders,
	 * mirroring the editor's `getNodeIconSource`:
	 * - a file icon (`iconUrl`, themed) → a served URL (dark variant preferred);
	 * - a `node:` ref → the full ref (the client's node-icon set is keyed by it);
	 * - a `fa:`/`icon:` built-in icon → the bare name;
	 * both `node:`/`fa:`/`icon:` carry the node's palette `iconColor`. Unknown nodes
	 * (or anything else) → empty, and the client falls back to the name's initial.
	 */
	resolveNodeIcon(nodeType: string): { iconUrl?: string; iconName?: string; iconColor?: string } {
		try {
			const { icon, iconUrl, iconColor } = this.nodeTypes.getByNameAndVersion(nodeType).description;
			const url = typeof iconUrl === 'string' ? iconUrl : (iconUrl?.dark ?? iconUrl?.light);
			if (url) return { iconUrl: url };
			if (typeof icon === 'string') {
				const [kind, name] = icon.split(':');
				if (kind === 'node') return { iconName: icon, iconColor };
				if ((kind === 'fa' || kind === 'icon') && name) return { iconName: name, iconColor };
			}
			return {};
		} catch {
			return {};
		}
	}

	private async fetchLastExecutionByWorkflowId(
		workflowIds: string[],
	): Promise<Map<string, { id: string; status: ExecutionStatus; startedAt: string }>> {
		const map = new Map<string, { id: string; status: ExecutionStatus; startedAt: string }>();
		if (workflowIds.length === 0) return map;

		// Pull the latest execution per workflow with a single bounded query.
		// We over-fetch (20 per workflow) and reduce; sufficient for the BFF
		// surface, avoids one query per workflow.
		const rows = await this.executionRepository.find({
			where: { workflowId: In(workflowIds) },
			order: { startedAt: 'DESC' },
			take: workflowIds.length * 5,
			select: { id: true, workflowId: true, status: true, startedAt: true },
		});

		for (const row of rows) {
			if (!row.startedAt) continue;
			if (map.has(row.workflowId)) continue;
			map.set(row.workflowId, {
				id: row.id,
				status: row.status,
				startedAt: row.startedAt.toISOString(),
			});
		}
		return map;
	}

	// ── chat ─────────────────────────────────────────────────────────────────

	/**
	 * Ensure a fresh chat thread exists in the user's personal project and return
	 * its id. The desktop chat view opens this thread before the first message,
	 * so its message-snapshot fetch resolves instead of 404-ing on an unborn
	 * thread. Tagged desktop-originated like every other desktop-assistant thread.
	 */
	async createChatThread(user: User, threadId?: string): Promise<{ threadId: string }> {
		const id = threadId ?? randomUUID();
		const projectId = await this.resolvePersonalProjectId(user);
		await this.memoryService.ensureThread(user.id, id, projectId, {
			[THREAD_SOURCE_METADATA_KEY]: DESKTOP_ASSISTANT_THREAD_SOURCE,
		});
		return { threadId: id };
	}

	// ── one-shot task ────────────────────────────────────────────────────────

	async triggerTask(
		user: User,
		body: DesktopAssistantTaskRequest,
	): Promise<DesktopAssistantTaskResponse> {
		// The DTO already enforces a non-empty trimmed prompt via Zod; no
		// redundant validation needed here.
		const threadId = randomUUID();
		const projectId = await this.resolvePersonalProjectId(user);
		// Mark the thread as desktop-originated at creation so the chat UI's
		// thread list can filter it out.
		await this.memoryService.ensureThread(user.id, threadId, projectId, {
			[THREAD_SOURCE_METADATA_KEY]: DESKTOP_ASSISTANT_THREAD_SOURCE,
		});

		const composedMessage = composeOneShotMessage(body);
		const runId = this.instanceAiService.startRun(
			user,
			threadId,
			composedMessage,
			body.context?.attachments,
			undefined,
			undefined,
			{ promptMode: 'desktop-assistant-one-shot' },
		);

		// A one-shot task may build a scheduled/recurring workflow (the prompt
		// implies one). When it does, publish it so it runs on its own — same
		// runnable guard as promote. Most one-shots are ad-hoc and build nothing,
		// in which case the listener simply unsubscribes. Subscribe AFTER startRun
		// so the listener scopes itself to this run.
		const cleanup = this.subscribeForBuildOutcome(user, threadId, runId, (workflowId) => {
			this.activateWorkflowIfRunnable(user, workflowId).catch((error: unknown) => {
				this.logger.debug('One-shot workflow not auto-published', {
					threadId,
					workflowId,
					error: error instanceof Error ? error.message : String(error),
				});
			});
		});
		setTimeout(cleanup, BUILD_FINALIZE_TIMEOUT_MS).unref();

		return { threadId, runId };
	}

	// ── recommendations ──────────────────────────────────────────────────────

	/**
	 * Generate a few one-shot task suggestions for the desktop assistant's empty
	 * state, grounded in what the user is looking at (optional context) and the
	 * integrations they already have connected.
	 *
	 * Uses a synchronous structured-output Instance AI call — NOT the streaming
	 * `startRun` orchestrator — so the client gets a plain JSON list it can render
	 * as cards. Only integration *types* are sent to the model as grounding; no
	 * credential secrets ever leave this service.
	 */
	async getRecommendations(
		user: User,
		body: DesktopAssistantRecommendationsRequest,
	): Promise<DesktopAssistantRecommendationsResponse> {
		const credentials = await this.credentialsFinderService.findCredentialsForUser(user, [
			'credential:read',
		]);
		const connectedIntegrations = [...new Set(credentials.map((c) => c.type))]
			.filter((type): type is string => typeof type === 'string' && type.length > 0)
			.slice(0, MAX_RECOMMENDATION_INTEGRATIONS);

		const limit = clampRecommendationsLimit(body.limit);
		const input = composeRecommendationsInput(body.context, connectedIntegrations, limit);

		const { recommendations } = await this.instanceAiService.generateStructured(user, {
			name: 'desktop-assistant-recommendations',
			instructions: RECOMMENDATIONS_INSTRUCTIONS,
			input,
			schema: buildRecommendationsSchema(limit),
		});

		return { recommendations: recommendations.slice(0, limit) };
	}

	// ── task detail ──────────────────────────────────────────────────────────

	/**
	 * Build the task detail view's payload: a natural-language description of the
	 * workflow, segmented into static text and editable params, plus the
	 * credential types still missing for it to run.
	 *
	 * The description is LLM-generated (structured output, like recommendations)
	 * and cached in `workflow_entity.meta.desktopAssistant.detail`, keyed by the
	 * workflow's `versionId` — edits through the editor or the apply-edits run
	 * bump the version and naturally invalidate the cache. Meta-only writes (the
	 * cache itself) do not touch `versionId`, so caching never self-invalidates.
	 */
	async getTaskDetail(user: User, workflowId: string): Promise<DesktopAssistantTaskDetailResponse> {
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:read',
		]);
		if (!workflow || workflow.isArchived) {
			throw new NotFoundError(`Workflow ${workflowId} not found`);
		}

		const connectionsNeeded = computeMissingCredentialTypes(workflow.nodes, this.nodeTypes).map(
			(credentialType) => ({
				credentialType,
				displayName: this.resolveCredentialDisplayName(credentialType),
			}),
		);

		const cachedParts = readCachedTaskDetail(workflow.meta, workflow.versionId);
		if (cachedParts) {
			return { workflowId, versionId: workflow.versionId, parts: cachedParts, connectionsNeeded };
		}

		const credentials = await this.credentialsFinderService.findCredentialsForUser(user, [
			'credential:read',
		]);
		const connectedIntegrations = [...new Set(credentials.map((c) => c.type))]
			.filter((type): type is string => typeof type === 'string' && type.length > 0)
			.slice(0, MAX_RECOMMENDATION_INTEGRATIONS);

		const { rest: displayName } = splitLeadingEmoji(workflow.name);
		const { parts: rawParts } = await this.instanceAiService.generateStructured(user, {
			name: 'desktop-assistant-task-description',
			instructions: TASK_DESCRIPTION_INSTRUCTIONS,
			input: composeTaskDescriptionInput(
				displayName || workflow.name,
				workflow.nodes,
				workflow.connections,
				connectedIntegrations,
			),
			schema: taskDescriptionSchema,
		});
		const parts = normalizeDescriptionParts(rawParts);
		if (parts.length === 0) {
			// All parts were empty/whitespace — caching this would render a blank
			// sentence and brick apply-edits for the version; treat as a failed
			// generation so the client shows its error + retry state.
			throw new OperationalError('Task description generation returned no usable description');
		}

		await this.writeTaskDetailCache(workflowId, workflow.versionId, parts);
		return { workflowId, versionId: workflow.versionId, parts, connectionsNeeded };
	}

	private resolveCredentialDisplayName(credentialType: string): string {
		try {
			return this.credentialTypes.getByName(credentialType).displayName;
		} catch {
			return credentialType;
		}
	}

	/** Merge the generated description into the workflow's meta. Re-reads the
	 *  row's meta right before writing: the caller's copy predates a seconds-long
	 *  LLM call, and writing it back would clobber anything (editor saves, other
	 *  meta writers) that landed in between. */
	private async writeTaskDetailCache(
		workflowId: string,
		versionId: string,
		parts: DesktopAssistantDescriptionPart[],
	): Promise<void> {
		const workflow = await this.workflowRepository.findOne({
			where: { id: workflowId },
			select: ['id', 'meta'],
		});
		if (!workflow) return;
		const existing = readDesktopAssistantMeta(workflow.meta) ?? {};
		const nextMeta = {
			...(workflow.meta ?? {}),
			desktopAssistant: {
				...existing,
				detail: { versionId, parts },
			},
		};
		await this.workflowRepository.update(workflowId, { meta: nextMeta });
	}

	// ── apply edits ──────────────────────────────────────────────────────────

	/**
	 * Apply the user's chip edits from the task detail view to the real workflow:
	 * kick off an Instance AI run in the `desktop-assistant-edit` prompt mode,
	 * grounded on the displayed description sentence and the exact from→to value
	 * changes. The client follows the run via the thread's SSE stream and
	 * refetches the detail when it finishes (the builder's update bumps the
	 * workflow's `versionId`, invalidating the cached description).
	 */
	async applyTaskEdits(
		user: User,
		workflowId: string,
		body: DesktopAssistantApplyEditsRequest,
	): Promise<DesktopAssistantApplyEditsResponse> {
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:update',
		]);
		if (!workflow || workflow.isArchived) {
			throw new NotFoundError(`Workflow ${workflowId} not found`);
		}

		// Ground the instruction on the description the user was actually looking
		// at; without it the from→to pairs lose their sentence context.
		const parts = readCachedTaskDetail(workflow.meta, workflow.versionId);
		if (!parts) {
			throw new BadRequestError(
				'No current task description for this workflow — reload the task detail and retry',
			);
		}

		// Every change must reference a param of the displayed description with its
		// current value. This keeps the endpoint a chip-edit applier rather than a
		// free-text instruction channel, and rejects edits against a stale view.
		const paramsById = new Map(
			parts.flatMap((part) => (part.kind === 'param' ? [[part.id, part] as const] : [])),
		);
		const seenParamIds = new Set<string>();
		for (const change of body.changes) {
			const param = paramsById.get(change.paramId);
			if (!param || param.value !== change.from || seenParamIds.has(change.paramId)) {
				throw new BadRequestError(
					'Edits do not match the current task description — reload the task detail and retry',
				);
			}
			seenParamIds.add(change.paramId);
		}

		// Only a workflow that is already published has a running version the edit
		// must catch up to. Inactive and manual-trigger workflows run their current
		// draft on the next execution, so the edit already takes effect for them.
		const wasActive = Boolean(workflow.activeVersionId);

		const threadId = randomUUID();
		const projectId = await this.resolvePersonalProjectId(user);
		await this.memoryService.ensureThread(user.id, threadId, projectId);

		const message = composeApplyEditsMessage(workflowId, workflow.name, parts, body.changes);
		const runId = this.instanceAiService.startRun(
			user,
			threadId,
			message,
			undefined,
			undefined,
			undefined,
			{ promptMode: 'desktop-assistant-edit' },
		);

		if (wasActive) {
			// Subscribe AFTER we have the runId so the listener scopes itself to this
			// exact run. When it finishes, re-publish so the running schedule/webhook
			// picks up the edited version instead of the stale one.
			const cleanup = this.subscribeForEditPublish(user, threadId, runId, workflowId);
			setTimeout(cleanup, BUILD_FINALIZE_TIMEOUT_MS).unref();
		}

		return { threadId, runId };
	}

	/**
	 * Listen for an edit run finishing and re-point the workflow's published
	 * version at the freshly-saved draft, so an already-active workflow runs the
	 * edited version rather than the one pinned before the edit. Best-effort: the
	 * promise is fire-and-forget and failures (e.g. a now-invalid workflow) are
	 * logged, not surfaced — the edit itself already succeeded.
	 */
	private subscribeForEditPublish(
		user: User,
		threadId: string,
		runId: string,
		workflowId: string,
	): () => void {
		let handled = false;
		const unsubscribe = this.eventBus.subscribe(threadId, (storedEvent: StoredEvent) => {
			if (handled) return;
			const ev = storedEvent.event;
			if (ev.type !== 'run-finish') return;
			if (ev.runId !== runId) return;
			handled = true;
			unsubscribe();
			this.republishEditedWorkflow(user, workflowId).catch((error: unknown) => {
				this.logger.debug('Edited workflow not re-published', {
					workflowId,
					reason: error instanceof Error ? error.message : String(error),
				});
			});
		});
		return unsubscribe;
	}

	private async republishEditedWorkflow(user: User, workflowId: string): Promise<void> {
		const updated = await this.workflowRepository.findOne({
			where: { id: workflowId },
			select: ['id', 'versionId'],
		});
		if (!updated) return;
		// Re-point activeVersionId at the current draft. No-op-safe if the agent
		// made no change (the version is unchanged and already active).
		await this.workflowService.activateWorkflow(user, workflowId, {
			versionId: updated.versionId,
			source: 'n8n-ai',
		});
	}

	// ── promote thread ──────────────────────────────────────────────────────

	async promoteThread(
		user: User,
		body: DesktopAssistantPromoteRequest,
	): Promise<DesktopAssistantPromoteResponse> {
		const ownership = await this.memoryService.checkThreadOwnership(user.id, body.threadId);
		if (ownership === 'not_found') {
			throw new NotFoundError(`Thread ${body.threadId} not found`);
		}
		if (ownership === 'other_user') {
			throw new ForbiddenError('Not authorized for this thread');
		}

		// Idempotency: if a previous promote completed and produced a workflow
		// the caller can still access, return the done envelope.
		const existing = await this.readPromotedWorkflowId(user.id, body.threadId);
		if (existing) {
			const accessible = await this.workflowSharingService.getSharedWorkflowIds(user, {
				scopes: ['workflow:read'],
			});
			if (accessible.includes(existing)) {
				return {
					status: 'done',
					threadId: body.threadId,
					workflowId: existing,
				};
			}
			// The previously-promoted workflow is gone or not accessible — fall
			// through and rebuild.
		}

		// In-flight guard: the client re-sends this request to confirm completion
		// after watching the build run (and a thread can be re-kept); while the
		// recorded run is still active — or finished but still being finalised —
		// return it instead of starting another.
		const inFlightRunId = await this.readPromoteRunId(user.id, body.threadId);
		if (
			inFlightRunId &&
			(this.instanceAiService.getActiveRunId(body.threadId) === inFlightRunId ||
				this.finalizingBuildRunIds.has(inFlightRunId))
		) {
			return { status: 'building', threadId: body.threadId, runId: inFlightRunId };
		}

		const originalPrompt = await this.recoverOriginalPrompt(body.threadId);
		const buildPrompt = composePromoteMessage(originalPrompt, body.name);

		const runId = this.instanceAiService.startRun(
			user,
			body.threadId,
			buildPrompt,
			undefined,
			undefined,
			undefined,
			{
				promptMode: 'desktop-assistant-promote',
			},
		);
		// Subscribe AFTER we have the runId so the listener can scope itself to
		// the exact run we just kicked off, and BEFORE the first await so the
		// run can't finish (or anything below fail) without a listener in place
		// to finalise the built workflow. `subscribe` is synchronous and
		// `startRun` only registers the run; it doesn't dispatch any events on
		// the bus before this line runs.
		const cleanup = this.subscribeForBuildOutcome(
			user,
			body.threadId,
			runId,
			async (workflowId) => {
				try {
					await this.finalizePromotedWorkflow(user, body.threadId, workflowId, body.icon);
				} catch (error) {
					this.logger.warn('Failed to finalise promoted workflow', {
						threadId: body.threadId,
						workflowId,
						error: error instanceof Error ? error.message : String(error),
					});
				}
			},
		);

		// Hard-cap the listener so a stalled run does not leak a subscription.
		setTimeout(cleanup, BUILD_FINALIZE_TIMEOUT_MS).unref();

		// Record the run for the confirming call's in-flight guard. Best-effort:
		// the run is already underway and subscribed for finalisation, so failing
		// the request here would only push the client into a retry that starts a
		// duplicate build.
		try {
			await this.memoryService.updateThread(body.threadId, {
				metadata: { [PROMOTE_RUN_ID_KEY]: runId },
			});
		} catch (error) {
			this.logger.warn('Failed to record promote run id on thread', {
				threadId: body.threadId,
				runId,
				error: error instanceof Error ? error.message : String(error),
			});
		}

		return { status: 'building', threadId: body.threadId, runId };
	}

	/**
	 * Listen for a build run finishing, resolve which workflow it produced, and
	 * hand that workflowId to `onWorkflowBuilt`. Used by both promote (to tag +
	 * activate the new workflow) and the one-shot path (to activate a workflow the
	 * task happened to build). The callback fires at most once.
	 *
	 * We watch two signals because the orchestrator has more than one build
	 * path:
	 *  1. The `instanceAiWorkflowLoop` (newer) persists its outcome to
	 *     `thread.metadata.instanceAiWorkflowLoop[*].lastBuildOutcome` and
	 *     emits a plain `run-finish` event — no per-build planItem on the
	 *     parent thread. We read the persisted outcome at run-finish.
	 *  2. The older planned-task path (still used by some builds) emits
	 *     `tasks-update` with a `kind: 'build-workflow'` planItem completing.
	 *     This is the legacy `extractBuiltWorkflowId` heuristic; kept as a
	 *     fallback so we cover whichever path the orchestrator picks.
	 *
	 * Whichever signal fires first wins; both go through the same `handled`
	 * gate so we only act once. A run that finishes without building a workflow
	 * (common for ad-hoc one-shot tasks) just unsubscribes without calling back.
	 */
	private subscribeForBuildOutcome(
		user: User,
		threadId: string,
		runId: string,
		onWorkflowBuilt: (workflowId: string) => void | Promise<void>,
	): () => void {
		let handled = false;
		const finalise = (workflowId: string) => {
			handled = true;
			unsubscribe();
			// Hold the run in `finalizingBuildRunIds` until the callback's follow-up
			// work settles: once it has, the outcome (e.g. `promotedWorkflowId`) is on
			// the thread — or the follow-up failed and a rebuild is allowed.
			this.finalizingBuildRunIds.add(runId);
			Promise.resolve()
				.then(async () => await onWorkflowBuilt(workflowId))
				.catch((error: unknown) => {
					// Call sites own their error handling; this is a safety net.
					this.logger.warn('Build outcome callback failed', {
						threadId,
						workflowId,
						error: error instanceof Error ? error.message : String(error),
					});
				})
				.finally(() => {
					this.finalizingBuildRunIds.delete(runId);
				});
		};

		const unsubscribe = this.eventBus.subscribe(threadId, (storedEvent: StoredEvent) => {
			if (handled) return;

			// Fallback: legacy planned-task build emits its outcome inline.
			const plannedTaskBuilt = extractBuiltWorkflowId(storedEvent);
			if (plannedTaskBuilt) {
				finalise(plannedTaskBuilt);
				return;
			}

			// Primary: workflow-loop builds only surface via thread metadata at
			// run-finish. Match on the runId we kicked off so we don't react to
			// unrelated runs that happen to share the thread.
			const ev = storedEvent.event;
			if (ev.type !== 'run-finish') return;
			if (ev.runId !== runId) return;

			// Marked synchronously with the run-finish dispatch, so a confirming
			// promote call can never observe "run gone, no workflow yet" and rebuild.
			// `finalise` takes over the marker; the non-finalising exits release it.
			this.finalizingBuildRunIds.add(runId);
			void this.memoryService
				.getThreadMetadata(user.id, threadId)
				.then((metadata) => {
					if (handled) return;
					const workflowId = extractWorkflowLoopBuildOutcome(metadata, runId);
					if (!workflowId) {
						// No workflow built (ad-hoc task, or a failed/ambiguous build). The
						// run is over, so stop listening rather than wait out the timeout.
						handled = true;
						unsubscribe();
						this.finalizingBuildRunIds.delete(runId);
						this.logger.debug('Build run finished without a workflow', { threadId, runId });
						return;
					}
					finalise(workflowId);
				})
				.catch((error: unknown) => {
					this.finalizingBuildRunIds.delete(runId);
					this.logger.warn('Failed to read build thread metadata at run-finish', {
						threadId,
						runId,
						error: error instanceof Error ? error.message : String(error),
					});
				});
		});
		return unsubscribe;
	}

	private async finalizePromotedWorkflow(
		user: User,
		threadId: string,
		workflowId: string,
		icon?: string,
	): Promise<void> {
		await this.applyDesktopAssistantTag(workflowId);
		await this.writeDesktopAssistantMeta(workflowId, threadId, icon);
		await this.applyDeviceCredential(user, workflowId);
		await this.memoryService.updateThread(threadId, {
			metadata: { [PROMOTED_WORKFLOW_ID_KEY]: workflowId },
		});
		await this.activateWorkflowIfRunnable(user, workflowId);
	}

	/**
	 * Publish a freshly-built workflow so it starts running immediately — but only
	 * when it's actually runnable: every required credential is already connected.
	 * A workflow missing a credential is left as a draft so it surfaces in
	 * "Action needed" instead of failing on every scheduled run.
	 *
	 * Activation itself rejects manual-trigger-only workflows ("no node to start"),
	 * so those stay as ready-to-run drafts. All failures are best-effort: the build
	 * already succeeded, so we log and move on rather than surface an error. Shared
	 * by the promote and one-shot build paths.
	 */
	private async activateWorkflowIfRunnable(user: User, workflowId: string): Promise<void> {
		const workflow = await this.workflowRepository.findOne({
			where: { id: workflowId },
			select: ['id', 'nodes'],
		});
		if (!workflow) return;
		if (computeNodesRequiringCredentialSetup(workflow.nodes ?? [], this.nodeTypes).size > 0) {
			return;
		}
		try {
			await this.workflowService.activateWorkflow(user, workflowId, { source: 'n8n-ai' });
		} catch (error) {
			this.logger.debug('Built workflow not auto-published', {
				workflowId,
				reason: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Fill the Device Connection credential on Computer Use nodes the build left
	 * unset, so a freshly promoted task is runnable without a manual setup trip.
	 * Deterministic post-processing: the model never handles credential ids, and
	 * only the promoting user's own device credential is ever applied.
	 */
	private async applyDeviceCredential(user: User, workflowId: string): Promise<void> {
		const credential = await this.instanceAiService.findOwnDeviceCredential(user);
		if (!credential) return; // surfaces in the actionNeeded bucket instead

		const workflow = await this.workflowRepository.findOne({
			where: { id: workflowId },
			select: ['id', 'nodes'],
		});
		if (!workflow) return;

		let changed = false;
		const nodes = workflow.nodes.map((node) => {
			if (!COMPUTER_USE_NODE_TYPES.has(node.type)) return node;
			if (node.credentials?.[DEVICE_CONNECTION_CREDENTIAL_TYPE]) return node;
			changed = true;
			return {
				...node,
				credentials: {
					...(node.credentials ?? {}),
					[DEVICE_CONNECTION_CREDENTIAL_TYPE]: { id: credential.id, name: credential.name },
				},
			};
		});
		if (changed) await this.workflowRepository.update(workflowId, { nodes });
	}

	private async applyDesktopAssistantTag(workflowId: string): Promise<void> {
		const tagId = await this.getOrCreateDesktopAssistantTagId();
		const existing = await this.workflowTagMappingRepository.findOne({
			where: { workflowId, tagId },
		});
		if (existing) return;
		await this.workflowTagMappingRepository.insert({ workflowId, tagId });
	}

	/**
	 * Write provenance + icon onto `meta.desktopAssistant`. If the build produced
	 * an emoji-led name despite the prompt, the leading emoji is moved out of the
	 * name and doubles as the icon fallback, so workflow names stay plain text.
	 */
	private async writeDesktopAssistantMeta(
		workflowId: string,
		threadId: string,
		icon?: string,
	): Promise<void> {
		const workflow = await this.workflowRepository.findOne({
			where: { id: workflowId },
			select: ['id', 'name', 'meta'],
		});
		if (!workflow) return;
		const existing = readDesktopAssistantMeta(workflow.meta) ?? {};
		const { emoji: nameEmoji, rest: cleanName } = splitLeadingEmoji(workflow.name ?? '');
		const resolvedIcon = icon ?? existing.icon ?? nameEmoji;
		const nextMeta = {
			...(workflow.meta ?? {}),
			desktopAssistant: {
				...existing,
				...(resolvedIcon ? { icon: resolvedIcon } : {}),
				[PROMOTED_FROM_THREAD_ID_KEY]: threadId,
			},
		};
		await this.workflowRepository.update(workflowId, {
			meta: nextMeta,
			...(nameEmoji && cleanName ? { name: cleanName } : {}),
		});
	}

	private async getOrCreateDesktopAssistantTagId(): Promise<string> {
		if (this.desktopAssistantTagId) return this.desktopAssistantTagId;
		const existing = await this.tagRepository.findOne({
			where: { name: DESKTOP_ASSISTANT_TAG },
		});
		if (existing) {
			this.desktopAssistantTagId = existing.id;
			return existing.id;
		}
		const created = this.tagRepository.create({ name: DESKTOP_ASSISTANT_TAG });
		const saved = await this.tagRepository.save(created);
		this.desktopAssistantTagId = saved.id;
		return saved.id;
	}

	private async readPromotedWorkflowId(
		userId: string,
		threadId: string,
	): Promise<string | undefined> {
		const metadata = await this.memoryService.getThreadMetadata(userId, threadId);
		const v = metadata?.[PROMOTED_WORKFLOW_ID_KEY];
		return typeof v === 'string' ? v : undefined;
	}

	private async readPromoteRunId(userId: string, threadId: string): Promise<string | undefined> {
		const metadata = await this.memoryService.getThreadMetadata(userId, threadId);
		const v = metadata?.[PROMOTE_RUN_ID_KEY];
		return typeof v === 'string' ? v : undefined;
	}

	private async recoverOriginalPrompt(threadId: string): Promise<string> {
		const messages = await this.memoryService.getThreadMessages('', threadId, {
			limit: 50,
			page: 0,
		});
		const firstUser = messages.messages.find((m) => m.role === 'user');
		if (!firstUser) {
			throw new BadRequestError(`Thread ${threadId} has no user message to promote`);
		}
		// Keep only text parts: stringified attachments would embed base64 payloads
		// into the build prompt and blow the model's context window.
		const text = extractTextContent(firstUser.content);
		if (!text) {
			throw new BadRequestError(`Thread ${threadId} has no text prompt to promote`);
		}
		return text;
	}

	private async resolvePersonalProjectId(user: User): Promise<string> {
		// `ensureThread` requires a projectId; the desktop assistant always runs
		// in the user's personal project.
		const project = await this.projectService.getPersonalProject(user);
		if (!project) {
			throw new BadRequestError('No personal project available for this user');
		}
		return project.id;
	}

	// ── history ─────────────────────────────────────────────────────────────

	async getHistory(
		user: User,
		query: { limit?: number; firstId?: string; lastId?: string },
	): Promise<DesktopAssistantHistoryResponse> {
		const accessibleWorkflowIds = await this.workflowSharingService.getSharedWorkflowIds(user, {
			scopes: ['workflow:read'],
		});
		if (accessibleWorkflowIds.length === 0) return EMPTY_HISTORY;

		// Skip executions of archived workflows. Archive is a user signal of
		// "I'm done with this"; their runs should drop out of the history view.
		// Mirrors the tasks list: only desktop-assistant-tagged workflows count.
		const liveRows = await this.workflowRepository.find({
			where: { id: In(accessibleWorkflowIds), isArchived: false },
			relations: { tags: true },
			select: { id: true, tags: { name: true } },
		});
		const liveWorkflowIds = liveRows
			.filter((row) => (row.tags ?? []).some((tag) => tag.name === DESKTOP_ASSISTANT_TAG))
			.map((row) => row.id);
		if (liveWorkflowIds.length === 0) return EMPTY_HISTORY;

		const sharingOptions = await this.executionService.buildSharingOptions('workflow:read');
		const { results, count, estimated } = await this.executionService.findRangeWithCount({
			kind: 'range',
			user,
			sharingOptions,
			workflowId: liveWorkflowIds,
			range: {
				limit: clampLimit(query.limit),
				firstId: query.firstId,
				lastId: query.lastId,
			},
			order: { startedAt: 'DESC' },
		});

		// Project the internal execution summary down to the narrow shape the
		// desktop client renders. The leading emoji is stripped from the workflow
		// name so the History row reads cleanly, matching the Tasks classifier.
		// `ExecutionSummary` types its dates as `Date`, but the range query already
		// normalises them to ISO strings (`toSummary`); some drivers still hand
		// back `Date`, so coerce defensively either way.
		const toIso = (value: Date | string | null | undefined): string | null => {
			if (!value) return null;
			return value instanceof Date ? value.toISOString() : value;
		};
		const entries: DesktopAssistantHistoryResponse['results'] = results.map((execution) => ({
			id: execution.id,
			workflowId: execution.workflowId,
			workflowName: splitLeadingEmoji(execution.workflowName ?? '').rest,
			status: execution.status,
			startedAt: toIso(execution.startedAt),
			createdAt: toIso(execution.createdAt) ?? '',
		}));

		await this.attachErrorMessages(entries, liveWorkflowIds);

		return { results: entries, count, estimated };
	}

	/**
	 * Enrich failed rows in-place with a short error one-liner. The history list
	 * query only carries `status`; the real error lives in the execution data
	 * blob, so we batch-load the data for the failed rows in this page and derive
	 * a message from `data.resultData.error`. Bounded by `MAX_ERROR_ENRICHMENTS`.
	 */
	private async attachErrorMessages(
		entries: DesktopAssistantHistoryResponse['results'],
		liveWorkflowIds: string[],
	): Promise<void> {
		const failed = entries.filter((entry) => FAILED_HISTORY_STATUSES.has(entry.status));
		if (failed.length === 0) return;

		const toEnrich = failed.slice(0, MAX_ERROR_ENRICHMENTS);
		if (failed.length > toEnrich.length) {
			this.logger.debug('Skipping error enrichment for some failed history rows', {
				failed: failed.length,
				enriched: toEnrich.length,
			});
		}

		const failedIds = toEnrich.map((entry) => entry.id);
		const executions = await this.executionPersistence.findMultipleExecutions(
			{ where: { id: In(failedIds), workflowId: In(liveWorkflowIds) } },
			{ includeData: true, unflattenData: true },
		);

		const summaryByExecutionId = new Map<string, ReturnType<typeof summarizeExecutionError>>();
		for (const execution of executions) {
			summaryByExecutionId.set(execution.id, summarizeExecutionError(execution.data));
		}

		for (const entry of toEnrich) {
			const summary = summaryByExecutionId.get(entry.id);
			if (!summary?.message) continue;
			entry.errorMessage = summary.message;
			entry.failedNode = summary.node;
		}
	}
}
