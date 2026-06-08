import type {
	DesktopAssistantPromoteRequest,
	DesktopAssistantPromoteResponse,
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

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { ExecutionService } from '@/executions/execution.service';
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

import { InProcessEventBus } from '../event-bus/in-process-event-bus';
import { InstanceAiMemoryService } from '../instance-ai-memory.service';
import { InstanceAiService } from '../instance-ai.service';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

const PROMOTE_FINALIZE_TIMEOUT_MS = 5 * 60 * 1000;

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
		private readonly projectService: ProjectService,
	) {}

	// ── tasks list ───────────────────────────────────────────────────────────

	async getTasks(user: User): Promise<DesktopAssistantTasksResponse> {
		const accessibleWorkflowIds = await this.workflowSharingService.getSharedWorkflowIds(user, {
			scopes: ['workflow:read'],
		});
		if (accessibleWorkflowIds.length === 0) {
			return { actionNeeded: [], upcoming: [], readyToRun: [] };
		}

		const workflows = await this.workflowFinderService.findWorkflowsByIdsForUser(
			accessibleWorkflowIds,
			user,
			['workflow:read'],
		);

		// Fetch tags for each workflow in one round-trip via the join column.
		const workflowsWithTags = await this.workflowRepository.find({
			where: { id: In(accessibleWorkflowIds) },
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

		const lastExecutionByWorkflowId =
			await this.fetchLastExecutionByWorkflowId(accessibleWorkflowIds);

		const inputs: ClassifierInput[] = workflows.map((workflow) => {
			const emojiIcon = readDesktopAssistantMeta(workflow.meta)?.icon;
			const lastExec = lastExecutionByWorkflowId.get(workflow.id);
			return {
				workflowId: workflow.id,
				name: workflow.name,
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
				emojiIcon,
				accessibleCredentialIds,
			};
		});

		return classifyWorkflowsForDesktopAssistant(inputs);
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
		if (!body.prompt || body.prompt.trim().length === 0) {
			throw new BadRequestError('A non-empty prompt is required');
		}
		const threadId = randomUUID();
		const projectId = await this.resolvePersonalProjectId(user);
		await this.memoryService.ensureThread(user.id, threadId, projectId);

		const composedMessage = composeOneShotMessage(body);
		const runId = this.instanceAiService.startRun(
			user,
			threadId,
			composedMessage,
			undefined,
			undefined,
			undefined,
			{ promptMode: 'desktop-assistant-one-shot' },
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

		// Subscribe BEFORE starting the run so we don't miss a fast build that
		// emits its tool-result before we wire up the listener.
		const cleanup = this.subscribeForBuildOutcome(user, body.threadId);

		const runId = this.instanceAiService.startRun(
			user,
			body.threadId,
			buildPrompt,
			undefined,
			undefined,
			undefined,
			{ promptMode: 'desktop-assistant-promote' },
		);

		// Hard-cap the listener so a stalled run does not leak a subscription.
		setTimeout(cleanup, PROMOTE_FINALIZE_TIMEOUT_MS).unref();

		return { status: 'building', threadId: body.threadId, runId };
	}

	private subscribeForBuildOutcome(user: User, threadId: string): () => void {
		let handled = false;
		const unsubscribe = this.eventBus.subscribe(threadId, (storedEvent: StoredEvent) => {
			if (handled) return;
			const built = extractBuiltWorkflowId(storedEvent);
			if (!built) return;
			handled = true;
			unsubscribe();
			this.finalizePromotedWorkflow(user, threadId, built).catch((error: unknown) => {
				this.logger.warn('Failed to finalise promoted workflow', {
					threadId,
					workflowId: built,
					error: error instanceof Error ? error.message : String(error),
				});
			});
		});
		return unsubscribe;
	}

	private async finalizePromotedWorkflow(
		_user: User,
		threadId: string,
		workflowId: string,
	): Promise<void> {
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
	): Promise<Awaited<ReturnType<ExecutionService['findRangeWithCount']>>> {
		const tagId = await this.tryReadDesktopAssistantTagId();
		const accessibleWorkflowIds = await this.workflowSharingService.getSharedWorkflowIds(user, {
			scopes: ['workflow:read'],
		});
		if (accessibleWorkflowIds.length === 0 || tagId === null) {
			return { results: [], estimated: false, count: 0 };
		}

		const taggedWorkflowIds = await this.workflowTagMappingRepository
			.find({
				where: { tagId, workflowId: In(accessibleWorkflowIds) },
				select: { workflowId: true },
			})
			.then((rows) => rows.map((r) => r.workflowId));

		if (taggedWorkflowIds.length === 0) {
			return { results: [], estimated: false, count: 0 };
		}

		const sharingOptions = await this.executionService.buildSharingOptions('workflow:read');
		return await this.executionService.findRangeWithCount({
			kind: 'range',
			user,
			sharingOptions,
			workflowId: taggedWorkflowIds,
			range: {
				limit: clampLimit(query.limit),
				firstId: query.firstId,
				lastId: query.lastId,
			},
			order: { startedAt: 'DESC' },
		});
	}

	private async tryReadDesktopAssistantTagId(): Promise<string | null> {
		if (this.desktopAssistantTagId) return this.desktopAssistantTagId;
		const tag = await this.tagRepository.findOne({
			where: { name: DESKTOP_ASSISTANT_TAG },
		});
		this.desktopAssistantTagId = tag?.id ?? null;
		return this.desktopAssistantTagId;
	}
}

// ── helpers ─────────────────────────────────────────────────────────────────

function composeOneShotMessage(body: DesktopAssistantTaskRequest): string {
	const lines: string[] = [body.prompt.trim()];
	if (body.context?.appHint) {
		lines.push('', `Currently looking at: ${body.context.appHint}`);
	}
	if (body.context?.selectedText) {
		lines.push('', 'Selected text:', '```', body.context.selectedText, '```');
	}
	return lines.join('\n');
}

function composePromoteMessage(originalPrompt: string, name: string | undefined): string {
	const trimmedName = name?.trim();
	const intro = trimmedName
		? `Promote this idea into a real workflow named "${trimmedName}":`
		: 'Promote this idea into a real workflow:';
	return `${intro}\n\n${originalPrompt}`;
}

function clampLimit(limit: number | undefined): number {
	if (!limit || limit < 1) return 20;
	if (limit > 100) return 100;
	return limit;
}

interface StoredDesktopAssistantMeta {
	icon?: string;
	[PROMOTED_FROM_THREAD_ID_KEY]?: string;
}

function readDesktopAssistantMeta(meta: unknown): StoredDesktopAssistantMeta | undefined {
	if (!meta || typeof meta !== 'object') return undefined;
	const candidate = (meta as { desktopAssistant?: unknown }).desktopAssistant;
	if (!candidate || typeof candidate !== 'object') return undefined;
	return candidate as StoredDesktopAssistantMeta;
}

/**
 * Inspect a stored SSE event and return the workflow id of a completed
 * build-workflow planned task, or undefined otherwise.
 *
 * The `build-workflow` tool runs in a sub-agent / planned-task context, so
 * its `tool-result` event is published on the sub-agent's thread, NOT on the
 * parent promote thread. The signal that DOES reach the parent thread is
 * `tasks-update`: each carries `planItems[]` where the build-workflow planned
 * task has its `workflowId` populated, and the matching entry in `tasks[]`
 * moves to status `'done'`. We require BOTH — a populated `workflowId` AND
 * a `done` status — to avoid acting on an in-flight task that already has its
 * id slot allocated.
 */
function extractBuiltWorkflowId(storedEvent: StoredEvent): string | undefined {
	const ev = storedEvent.event;
	if (ev.type !== 'tasks-update') return undefined;
	const payload = ev.payload as {
		tasks?: { tasks?: Array<{ id?: unknown; status?: unknown }> };
		planItems?: Array<{ id?: unknown; kind?: unknown; workflowId?: unknown }>;
	};
	const planItems = payload.planItems;
	const taskList = payload.tasks?.tasks;
	if (!Array.isArray(planItems) || !Array.isArray(taskList)) return undefined;

	const doneTaskIds = new Set<string>();
	for (const task of taskList) {
		if (typeof task.id === 'string' && task.status === 'done') doneTaskIds.add(task.id);
	}

	for (const item of planItems) {
		if (item.kind !== 'build-workflow') continue;
		if (typeof item.workflowId !== 'string') continue;
		if (typeof item.id !== 'string') continue;
		if (!doneTaskIds.has(item.id)) continue;
		return item.workflowId;
	}
	return undefined;
}
