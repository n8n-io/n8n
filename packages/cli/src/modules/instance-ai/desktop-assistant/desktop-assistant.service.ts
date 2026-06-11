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

import {
	DESKTOP_ASSISTANT_TAG,
	PROMOTED_FROM_THREAD_ID_KEY,
	PROMOTED_WORKFLOW_ID_KEY,
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

const PROMOTE_FINALIZE_TIMEOUT_MS = 5 * 60 * 1000;

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

		const credentials = await this.credentialsFinderService.findCredentialsForUser(user, [
			'credential:read',
		]);
		const accessibleCredentialIds = new Set(credentials.map((c) => c.id));

		const lastExecutionByWorkflowId = await this.fetchLastExecutionByWorkflowId(liveWorkflowIds);

		const inputs: ClassifierInput[] = workflows.map((workflow) => {
			// Icon priority: explicit `meta.desktopAssistant.icon` wins, then any
			// leading emoji the orchestrator put on the workflow name (the
			// `desktop-assistant-promote` and recurring one-shot prompts both
			// instruct picking one), then the classifier falls back to a node-type
			// icon. The display name strips the leading emoji so the desktop card
			// shows it once, in the icon slot.
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

	// ── one-shot task ────────────────────────────────────────────────────────

	async triggerTask(
		user: User,
		body: DesktopAssistantTaskRequest,
	): Promise<DesktopAssistantTaskResponse> {
		// The DTO already enforces a non-empty trimmed prompt via Zod; no
		// redundant validation needed here.
		const threadId = randomUUID();
		const projectId = await this.resolvePersonalProjectId(user);
		await this.memoryService.ensureThread(user.id, threadId, projectId);

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
		return { threadId, runId };
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

		const originalPrompt = await this.recoverOriginalPrompt(body.threadId);
		const buildPrompt = composePromoteMessage(originalPrompt, body.name);

		const runId = this.instanceAiService.startRun(
			user,
			body.threadId,
			buildPrompt,
			undefined,
			undefined,
			undefined,
			{ promptMode: 'desktop-assistant-promote' },
		);

		// Subscribe AFTER we have the runId so the listener can scope itself to
		// the exact run we just kicked off. `subscribe` is synchronous and
		// `startRun` only registers the run; it doesn't dispatch any events on
		// the bus before this line runs.
		const cleanup = this.subscribeForBuildOutcome(user, body.threadId, runId);

		// Hard-cap the listener so a stalled run does not leak a subscription.
		setTimeout(cleanup, PROMOTE_FINALIZE_TIMEOUT_MS).unref();

		return { status: 'building', threadId: body.threadId, runId };
	}

	/**
	 * Listen for the promote run finishing, then resolve which workflow it
	 * produced.
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
	 * gate so we only finalise once.
	 */
	private subscribeForBuildOutcome(user: User, threadId: string, runId: string): () => void {
		let handled = false;
		const finalise = (workflowId: string) => {
			handled = true;
			unsubscribe();
			this.finalizePromotedWorkflow(threadId, workflowId).catch((error: unknown) => {
				this.logger.warn('Failed to finalise promoted workflow', {
					threadId,
					workflowId,
					error: error instanceof Error ? error.message : String(error),
				});
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

			void this.memoryService
				.getThreadMetadata(user.id, threadId)
				.then((metadata) => {
					if (handled) return;
					const workflowId = extractWorkflowLoopBuildOutcome(metadata, runId);
					if (!workflowId) {
						this.logger.warn('Promote run finished without a successful build outcome', {
							threadId,
							runId,
						});
						return;
					}
					finalise(workflowId);
				})
				.catch((error: unknown) => {
					this.logger.warn('Failed to read promote thread metadata at run-finish', {
						threadId,
						runId,
						error: error instanceof Error ? error.message : String(error),
					});
				});
		});
		return unsubscribe;
	}

	private async finalizePromotedWorkflow(threadId: string, workflowId: string): Promise<void> {
		await this.applyDesktopAssistantTag(workflowId);
		await this.writeDesktopAssistantMeta(workflowId, threadId);
		await this.memoryService.updateThread(threadId, {
			metadata: { [PROMOTED_WORKFLOW_ID_KEY]: workflowId },
		});
	}

	private async applyDesktopAssistantTag(workflowId: string): Promise<void> {
		const tagId = await this.getOrCreateDesktopAssistantTagId();
		const existing = await this.workflowTagMappingRepository.findOne({
			where: { workflowId, tagId },
		});
		if (existing) return;
		await this.workflowTagMappingRepository.insert({ workflowId, tagId });
	}

	private async writeDesktopAssistantMeta(workflowId: string, threadId: string): Promise<void> {
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
				[PROMOTED_FROM_THREAD_ID_KEY]: threadId,
			},
		};
		await this.workflowRepository.update(workflowId, { meta: nextMeta });
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

	private async recoverOriginalPrompt(threadId: string): Promise<string> {
		const messages = await this.memoryService.getThreadMessages('', threadId, {
			limit: 50,
			page: 0,
		});
		const firstUser = messages.messages.find((m) => m.role === 'user');
		if (!firstUser) {
			throw new BadRequestError(`Thread ${threadId} has no user message to promote`);
		}
		if (typeof firstUser.content === 'string') return firstUser.content;
		// Best-effort: flatten content parts into a single string for the build prompt.
		return JSON.stringify(firstUser.content);
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
		const liveRows = await this.workflowRepository.find({
			where: { id: In(accessibleWorkflowIds), isArchived: false },
			select: { id: true },
		});
		const liveWorkflowIds = liveRows.map((row) => row.id);
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
