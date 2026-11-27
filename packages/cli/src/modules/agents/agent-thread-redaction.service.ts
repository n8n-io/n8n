import {
	ExecutionRedactionServiceProxy,
	isRedactableExecution,
	type ExecutionRedactionOptions as RedactionOptions,
	type RedactableExecution,
} from '@n8n/backend-services';
import { ExecutionRedactionQueryDtoSchema } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import {
	CredentialsRepository,
	WorkflowRepository,
	type AuthenticatedRequest,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';
import {
	EXECUTE_WORKFLOW_NODE_TYPE,
	WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE,
	type INode,
} from 'n8n-workflow';

import { ExecutionPersistence } from '@/executions/execution-persistence';

import type { AgentExecution, AgentTurnRedactionInfo } from './entities/agent-execution.entity';
import type { TimelineEvent } from './execution-recorder';

/**
 * Who reads a thread.
 *
 * - `user`: an n8n user. Turns that used redacted workflow data are redacted
 *   for this user, the same way the executions API redacts the source
 *   executions. `revealExecutionData` asks for an audited reveal.
 * - `sessionEndUserId`: the end user of a channel or app session, who reads
 *   their own conversation. The agent's replies to them are the designed
 *   output of the session, as a webhook response is for its caller.
 */
export type ThreadReader = UserThreadReader | { sessionEndUserId: string };

export interface UserThreadReader {
	user: User;
	/** Ask for an audited reveal. Throws when the user cannot reveal every source. */
	revealExecutionData?: boolean;
	/** Request details for the reveal audit event. */
	ipAddress?: string;
	userAgent?: string;
}

export interface ThreadRedactionOptions {
	/**
	 * Timeline events of the runs that each turn delegated to sub-agents, by
	 * turn id. The delegating turn receives the result of the sub-agent, so it
	 * is redacted like the sub-agent run.
	 */
	delegatedTimelines?: ReadonlyMap<string, TimelineEvent[]>;
	/**
	 * Turns whose timeline, or the timeline of a run they delegated, did not
	 * load. Their sources are unknown, so they are redacted without a reveal.
	 */
	unreadableTurnIds?: ReadonlySet<string>;
}

/**
 * The reader of a thread request. `redactExecutionData=false` in the query asks
 * for a reveal, the same as on the executions API.
 */
export function threadReaderFromRequest(
	req: Pick<AuthenticatedRequest, 'user' | 'query' | 'ip'> & {
		headers?: AuthenticatedRequest['headers'];
	},
): UserThreadReader {
	const query = ExecutionRedactionQueryDtoSchema.safeParse(req.query ?? {});
	const reveal = query.success && query.data.redactExecutionData === false;
	return {
		user: req.user,
		...(reveal ? { revealExecutionData: true } : {}),
		ipAddress: req.ip ?? '',
		userAgent: req.headers?.['user-agent'] ?? '',
	};
}

/** The sources that tools and the sandbox write. Other sources are human input. */
const GENERATED_FILE_SOURCES: readonly string[] = ['tool', 'sandbox'];

/**
 * True when a file of a thread is hidden from the reader: a tool or the
 * sandbox stored it during or after the first turn that is redacted for the
 * reader. Files from human input stay visible, like the human messages.
 */
export function isRedactedThreadFile(
	file: { source: string; createdAt: Date | string },
	redactionStart: { startedAt: Date } | undefined,
): boolean {
	if (!redactionStart || !GENERATED_FILE_SOURCES.includes(file.source)) return false;
	return new Date(file.createdAt).getTime() >= redactionStart.startedAt.getTime();
}

export function readerUserId(reader: ThreadReader): string {
	return 'user' in reader ? reader.user.id : reader.sessionEndUserId;
}

const SOURCE_UNAVAILABLE_REASON = 'source_unavailable';

const REDACTED_CACHE_TTL_MS = 60_000;
const REDACTED_CACHE_MAX_ENTRIES = 5_000;

/** How long one reveal of a thread's sources counts as audited for the same user. */
const REVEAL_AUDIT_WINDOW_MS = 5 * 60_000;
const REVEAL_AUDIT_MAX_ENTRIES = 5_000;

/**
 * Applies execution data redaction to agent turns.
 *
 * An agent turn is the caller of the workflow executions that its workflow
 * tools start. Like a parent workflow, it keeps a copy of their output, so it
 * is redacted when one of them is redacted for the reader. Conversation memory
 * carries that output into later turns, so every later turn of the thread is
 * redacted too.
 */
@Service()
export class AgentThreadRedactionService {
	constructor(
		private readonly logger: Logger,
		private readonly executionPersistence: ExecutionPersistence,
		private readonly executionRedaction: ExecutionRedactionServiceProxy,
		private readonly workflowRepository: WorkflowRepository,
		private readonly globalConfig: GlobalConfig,
		private readonly credentialsRepository: CredentialsRepository,
	) {
		this.logger = this.logger.scoped('agents');
	}

	/**
	 * Redact `turns` for `reader`. `turns` must be in thread order and start at
	 * the first turn of the thread, because a redacted turn also redacts the
	 * turns after it. Returns the turns that the reader may see, with
	 * `redaction` set on each redacted turn. Does not change the input.
	 */
	async redactForReader(
		turns: AgentExecution[],
		reader: ThreadReader,
		options: ThreadRedactionOptions = {},
	): Promise<AgentExecution[]> {
		const decisions = await this.resolveForReader(turns, reader, options);
		if (decisions.size === 0) return turns;

		return turns.map((turn) => {
			const redaction = decisions.get(turn.id);
			return redaction ? redactTurn(turn, redaction) : turn;
		});
	}

	/**
	 * The redaction of each turn that must be redacted for the reader, by turn
	 * id. Same input rules as {@link redactForReader}. Empty for the end user of
	 * a session.
	 */
	async resolveForReader(
		turns: AgentExecution[],
		reader: ThreadReader,
		options: ThreadRedactionOptions = {},
	): Promise<Map<string, AgentTurnRedactionInfo>> {
		const decisions = new Map<string, AgentTurnRedactionInfo>();
		if (!('user' in reader)) return decisions;

		const sourceIdsByTurn = new Map<string, string[]>();
		const workflowIdBySource = new Map<string, string | undefined>();
		for (const turn of turns) {
			const events = [
				...(turn.timeline ?? []),
				...(options.delegatedTimelines?.get(turn.id) ?? []),
			];
			const sources = collectSources(events);
			sourceIdsByTurn.set(
				turn.id,
				sources.map(({ executionId }) => executionId),
			);
			for (const { executionId, workflowId } of sources) {
				if (!workflowIdBySource.get(executionId)) workflowIdBySource.set(executionId, workflowId);
			}
		}
		const unreadable = options.unreadableTurnIds ?? new Set<string>();
		if (workflowIdBySource.size === 0 && !turns.some(({ id }) => unreadable.has(id))) {
			return decisions;
		}

		const sources =
			workflowIdBySource.size > 0
				? await this.resolveSources(workflowIdBySource, reader, turns[0]?.threadId)
				: new Map<string, AgentTurnRedactionInfo>();

		let carried: AgentTurnRedactionInfo | undefined;
		for (const turn of turns) {
			if (unreadable.has(turn.id)) {
				carried = mergeRedaction(carried, {
					isRedacted: true,
					reason: SOURCE_UNAVAILABLE_REASON,
					canReveal: false,
				});
			}
			for (const id of sourceIdsByTurn.get(turn.id) ?? []) {
				carried = mergeRedaction(carried, sources.get(id));
			}
			if (carried) decisions.set(turn.id, carried);
		}
		return decisions;
	}

	/**
	 * The redaction of each source execution for the reader. Absent when it is
	 * not redacted.
	 *
	 * After one reveal, a chat reads the thread again and again (refreshes,
	 * pages, files, polls). When every redacted source went through an audited
	 * reveal by the same user in the same thread within
	 * {@link REVEAL_AUDIT_WINDOW_MS}, the request is not audited again, but the
	 * redaction service still checks that the user can reveal every source.
	 * Otherwise the request takes the audited reveal path.
	 */
	private async resolveSources(
		workflowIdBySource: ReadonlyMap<string, string | undefined>,
		reader: UserThreadReader,
		threadId: string | undefined,
	): Promise<Map<string, AgentTurnRedactionInfo>> {
		const ids = [...workflowIdBySource.keys()];
		if (
			reader.revealExecutionData &&
			threadId &&
			ids.some((id) => this.isRevealAudited(reader, threadId, id))
		) {
			const { revealExecutionData: _reveal, ...withoutReveal } = reader;
			const decided = await this.decideSources(workflowIdBySource, withoutReveal, false);
			if (
				[...decided].every(
					([id, { canReveal }]) => canReveal && this.isRevealAudited(reader, threadId, id),
				)
			) {
				return new Map();
			}
		}

		const revealed: string[] = [];
		const result = await this.decideSources(
			workflowIdBySource,
			reader,
			!reader.revealExecutionData,
			revealed,
		);
		if (threadId) this.recordRevealAudit(reader, threadId, revealed);
		return result;
	}

	private async decideSources(
		workflowIdBySource: ReadonlyMap<string, string | undefined>,
		reader: UserThreadReader,
		useCache: boolean,
		/** Collects the sources that went through an audited reveal. */
		revealed: string[] = [],
	): Promise<Map<string, AgentTurnRedactionInfo>> {
		const options: RedactionOptions = {
			user: reader.user,
			...(reader.revealExecutionData ? { redactExecutionData: false } : {}),
			...(reader.ipAddress !== undefined ? { ipAddress: reader.ipAddress } : {}),
			...(reader.userAgent !== undefined ? { userAgent: reader.userAgent } : {}),
		};

		const result = new Map<string, AgentTurnRedactionInfo>();
		const toLoad: string[] = [];
		for (const id of workflowIdBySource.keys()) {
			const cached = useCache ? this.cachedRedaction(reader, id) : undefined;
			if (cached) result.set(id, cached);
			else toLoad.push(id);
		}

		const loaded = await Promise.all(
			toLoad.map(async (id) => ({ id, execution: await this.loadSource(id) })),
		);

		const missing: string[] = [];
		// Nodes of the version that ran, when the row still has them.
		const runNodesBySource = new Map<string, INode[]>();
		const redactable: Array<{ id: string; execution: RedactableExecution }> = [];
		for (const { id, execution } of loaded) {
			// A row without run data (a queued run, data above the display size, or
			// data that did not load) lacks the sub-workflow and private credential
			// details, so it is decided like a missing one.
			if (
				execution &&
				isRedactableExecution(execution) &&
				execution.data &&
				!execution.dataTooLargeToDisplay
			) {
				redactable.push({ id, execution });
			} else {
				missing.push(id);
				const runNodes = execution?.workflowData?.nodes;
				if (runNodes) runNodesBySource.set(id, runNodes);
			}
		}

		if (redactable.length > 0) {
			await this.executionRedaction.processExecutions(
				redactable.map(({ execution }) => execution),
				options,
			);
			if (options.redactExecutionData === false) revealed.push(...redactable.map(({ id }) => id));
			for (const { id, execution } of redactable) {
				const info = execution.data.redactionInfo;
				if (info?.isRedacted) {
					result.set(id, { isRedacted: true, reason: info.reason, canReveal: info.canReveal });
				}
			}
		}

		for (const id of missing) {
			const redaction = await this.resolveMissingSource(
				id,
				workflowIdBySource.get(id),
				options,
				runNodesBySource.get(id) ?? [],
				revealed,
			);
			if (redaction) result.set(id, redaction);
		}

		if (useCache) {
			for (const id of toLoad) {
				const redaction = result.get(id);
				if (redaction) this.cacheRedaction(reader, id, redaction);
			}
		}
		return result;
	}

	/**
	 * Redacted decisions of recent reads, so that chat refreshes do not load
	 * the run data of every source again. Only redacted decisions are kept: a
	 * stale entry can hide data for a short time, but never shows it.
	 */
	private readonly redactedCache = new Map<
		string,
		{ redaction: AgentTurnRedactionInfo; expiresAt: number }
	>();

	private cachedRedaction(
		reader: UserThreadReader,
		executionId: string,
	): AgentTurnRedactionInfo | undefined {
		const key = `${reader.user.id}:${executionId}`;
		const entry = this.redactedCache.get(key);
		if (!entry) return undefined;
		if (entry.expiresAt > Date.now()) return entry.redaction;
		this.redactedCache.delete(key);
		return undefined;
	}

	private cacheRedaction(
		reader: UserThreadReader,
		executionId: string,
		redaction: AgentTurnRedactionInfo,
	): void {
		if (this.redactedCache.size >= REDACTED_CACHE_MAX_ENTRIES) {
			const oldest = this.redactedCache.keys().next();
			if (!oldest.done) this.redactedCache.delete(oldest.value);
		}
		this.redactedCache.set(`${reader.user.id}:${executionId}`, {
			redaction,
			expiresAt: Date.now() + REDACTED_CACHE_TTL_MS,
		});
	}

	/** The time of the last audited reveal, by user, thread and source execution. */
	private readonly revealAudits = new Map<string, number>();

	private isRevealAudited(reader: UserThreadReader, threadId: string, id: string): boolean {
		const auditedAt = this.revealAudits.get(`${reader.user.id}:${threadId}:${id}`);
		return auditedAt !== undefined && Date.now() - auditedAt < REVEAL_AUDIT_WINDOW_MS;
	}

	private recordRevealAudit(reader: UserThreadReader, threadId: string, ids: string[]): void {
		for (const id of ids) {
			if (this.revealAudits.size >= REVEAL_AUDIT_MAX_ENTRIES) {
				const oldest = this.revealAudits.keys().next();
				if (!oldest.done) this.revealAudits.delete(oldest.value);
			}
			this.revealAudits.set(`${reader.user.id}:${threadId}:${id}`, Date.now());
		}
	}

	/**
	 * Load a source execution the way the executions API reads it for display:
	 * above the display size limit, without its run data. A read error counts
	 * as a missing source, so one broken row does not fail the whole thread.
	 */
	private async loadSource(executionId: string) {
		try {
			return await this.executionPersistence.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
				maxDataSizeBytes: this.globalConfig.executions.maxDisplaySize,
			});
		} catch (error) {
			this.logger.warn('Failed to read the source execution of an agent turn', {
				executionId,
				error: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}
	}

	/**
	 * A source execution whose run data is not available, for example after
	 * pruning. The run data held the sub-workflow and private credential
	 * details that the decision needs, so the decision fails closed:
	 *
	 * - Without the workflow, the turn is redacted and nobody can reveal it.
	 * - A workflow that uses a private credential, or calls other workflows,
	 *   may have run as one user or with stricter sub-workflow settings. The
	 *   turn is redacted and nobody can reveal it. Private credential data is
	 *   redacted with or without the data redaction license.
	 * - Otherwise the turn is redacted when the instance redacts execution
	 *   data, and the redaction service decides who can reveal it, as for a
	 *   workflow that redacts all its executions.
	 */
	private async resolveMissingSource(
		executionId: string,
		workflowId: string | undefined,
		options: RedactionOptions,
		runNodes: INode[],
		revealed: string[],
	): Promise<AgentTurnRedactionInfo | undefined> {
		const unavailable: AgentTurnRedactionInfo = {
			isRedacted: true,
			reason: SOURCE_UNAVAILABLE_REASON,
			canReveal: false,
		};
		const workflow = workflowId
			? await this.workflowRepository.findOneBy({ id: workflowId })
			: null;
		if (!workflow) {
			this.logger.debug('Source execution and workflow of an agent turn are unavailable', {
				executionId,
				workflowId,
			});
			return unavailable;
		}
		// Check the nodes that ran, when known, and the current nodes.
		const nodes = [...runNodes, ...workflow.nodes];
		if (await this.usesPrivateCredential(nodes)) return unavailable;

		const standIn = (): RedactableExecution => ({
			id: executionId,
			mode: 'integrated',
			workflowId: workflow.id,
			workflowData: {
				settings: { ...(workflow.settings ?? {}), redactionPolicy: 'all' },
				nodes: workflow.nodes,
			},
			data: { resultData: { runData: {} } },
			dataTooLargeToDisplay: true,
		});

		// First decide without a reveal: does the instance redact this data at all?
		const { redactExecutionData: _reveal, ...withoutReveal } = options;
		const probe = standIn();
		await this.executionRedaction.processExecutions([probe], withoutReveal);
		const info = probe.data.redactionInfo;
		if (!info?.isRedacted) return undefined;
		if (callsOtherWorkflows(nodes)) return unavailable;

		if (options.redactExecutionData === false) {
			// Checks the reveal right and records the reveal. Throws when it is refused.
			await this.executionRedaction.processExecutions([standIn()], options);
			revealed.push(executionId);
			return undefined;
		}
		return { isRedacted: true, reason: SOURCE_UNAVAILABLE_REASON, canReveal: info.canReveal };
	}

	/** Fails closed: an error counts as a private credential. */
	private async usesPrivateCredential(nodes: INode[]): Promise<boolean> {
		const credentialIds = new Set<string>();
		for (const node of nodes) {
			for (const credential of Object.values(node.credentials ?? {})) {
				if (credential.id) credentialIds.add(credential.id);
			}
		}
		if (credentialIds.size === 0) return false;
		try {
			return await this.credentialsRepository.hasResolvableCredential([...credentialIds]);
		} catch (error) {
			this.logger.warn('Could not check the credentials of an agent turn source', {
				error: error instanceof Error ? error.message : String(error),
			});
			return true;
		}
	}
}

/** True when the workflow can start other workflows, whose settings the decision does not see. */
function callsOtherWorkflows(nodes: INode[]): boolean {
	return nodes.some(
		({ type }) => type === EXECUTE_WORKFLOW_NODE_TYPE || type === WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE,
	);
}

/** The executions that the workflow tools in these events started, with their workflows. */
function collectSources(
	events: TimelineEvent[],
): Array<{ executionId: string; workflowId: string | undefined }> {
	const sources: Array<{ executionId: string; workflowId: string | undefined }> = [];
	for (const event of events) {
		if (event.type === 'tool-call' && event.kind === 'workflow' && event.workflowExecutionId) {
			sources.push({ executionId: event.workflowExecutionId, workflowId: event.workflowId });
		}
	}
	return sources;
}

/** The executions that the workflow tools of a turn started. */
export function collectSourceExecutionIds(timeline: TimelineEvent[] | null): string[] {
	return collectSources(timeline ?? []).map(({ executionId }) => executionId);
}

/** Combine two redactions. The result can be revealed only when both can. */
function mergeRedaction(
	a: AgentTurnRedactionInfo | undefined,
	b: AgentTurnRedactionInfo | undefined,
): AgentTurnRedactionInfo | undefined {
	if (!a) return b;
	if (!b) return a;
	return { isRedacted: true, reason: a.reason, canReveal: a.canReveal && b.canReveal };
}

/**
 * A copy of `turn` without the content that can hold workflow data: model
 * text and reasoning, tool inputs and outputs, sub-agent traces, approval
 * payloads and the error text. It keeps the turn structure, the tool names,
 * the human input and the timing.
 */
export function redactTurn(
	turn: AgentExecution,
	redaction: AgentTurnRedactionInfo,
): AgentExecution {
	return {
		...turn,
		timeline: turn.timeline?.map(redactTimelineEvent) ?? null,
		error: null,
		failureSummary: turn.failureSummary && {
			...turn.failureSummary,
			latest: { ...turn.failureSummary.latest, message: null },
		},
		redaction,
	};
}

function redactTimelineEvent(event: TimelineEvent): TimelineEvent {
	switch (event.type) {
		case 'text':
		case 'reasoning':
			return { ...event, content: '', redacted: true };
		case 'tool-call':
			return {
				...event,
				input: undefined,
				output: undefined,
				childTrace: undefined,
				traceOutput: undefined,
				redacted: true,
			};
		case 'suspension':
			return { ...event, input: undefined, suspendPayload: undefined, redacted: true };
		case 'hitl-response':
			return { ...event, response: undefined, redacted: true };
		case 'host-event':
			return { ...event, payload: undefined, redacted: true };
		case 'background-task-signal':
			// Task titles are written by the model and the files can hold tool data.
			return {
				...event,
				signal: {
					...event.signal,
					tasks: event.signal.tasks.map(({ files: _files, ...task }) => ({
						...task,
						title: '',
					})),
				},
			};
		case 'input':
		case 'guardrail':
			return event;
	}
}
