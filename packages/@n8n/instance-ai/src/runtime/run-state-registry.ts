import type { InstanceAiThreadStatusResponse } from '@n8n/api-types';
import { nanoid } from 'nanoid';

import type { InstanceAiTraceContext } from '../types';

export interface ActiveRunState {
	runId: string;
	abortController: AbortController;
	messageGroupId?: string;
	tracing?: InstanceAiTraceContext;
}

export interface SuspendedRunState<TUser = unknown> extends ActiveRunState {
	mastraRunId: string;
	agent: unknown;
	threadId: string;
	user: TUser;
	toolCallId: string;
	requestId: string;
	createdAt: number;
}

export interface ConfirmationData {
	approved: boolean;
	credentialId?: string;
	credentials?: Record<string, string>;
	nodeCredentials?: Record<string, Record<string, string>>;
	autoSetup?: { credentialType: string };
	userInput?: string;
	domainAccessAction?: string;
	action?: 'apply' | 'test-trigger';
	nodeParameters?: Record<string, Record<string, unknown>>;
	testTriggerNode?: string;
	answers?: Array<{
		questionId: string;
		selectedOptions: string[];
		customText?: string;
		skipped?: boolean;
	}>;
	/** User's resource-access decision (e.g. 'allowForSession'). */
	resourceDecision?: string;
}

export interface PendingConfirmation {
	resolve: (data: ConfirmationData) => void;
	threadId: string;
	userId: string;
	createdAt: number;
}

export interface BackgroundTaskStatusSnapshot {
	taskId: string;
	role: string;
	agentId: string;
	status: 'running' | 'completed' | 'failed' | 'cancelled';
	startedAt: number;
	runId: string;
	messageGroupId?: string;
	threadId: string;
}

export interface StartRunOptions<TUser> {
	threadId: string;
	user: TUser;
	researchMode?: boolean;
	messageGroupId?: string;
}

export interface StartedRunState extends ActiveRunState {
	messageGroupId?: string;
}

export class RunStateRegistry<TUser = unknown> {
	private readonly activeRuns = new Map<string, ActiveRunState>();

	private readonly suspendedRuns = new Map<string, SuspendedRunState<TUser>>();

	private readonly pendingConfirmations = new Map<string, PendingConfirmation>();

	private readonly threadUsers = new Map<string, TUser>();

	private readonly threadResearchMode = new Map<string, boolean>();

	private readonly threadMessageGroupId = new Map<string, string>();

	private readonly runIdsByMessageGroup = new Map<string, string[]>();

	startRun(options: StartRunOptions<TUser>): StartedRunState {
		const runId = `run_${nanoid()}`;
		const abortController = new AbortController();
		const messageGroupId = options.messageGroupId ?? `mg_${nanoid()}`;

		this.activeRuns.set(options.threadId, { runId, abortController, messageGroupId });
		this.threadUsers.set(options.threadId, options.user);
		if (options.researchMode !== undefined) {
			this.threadResearchMode.set(options.threadId, options.researchMode);
		}

		// When creating a fresh message group (no reuse), clean up the previous
		// one so runIdsByMessageGroup doesn't leak entries indefinitely.
		if (!options.messageGroupId) {
			const prevGroupId = this.threadMessageGroupId.get(options.threadId);
			if (prevGroupId && prevGroupId !== messageGroupId) {
				this.runIdsByMessageGroup.delete(prevGroupId);
			}
		}

		this.threadMessageGroupId.set(options.threadId, messageGroupId);
		if (!this.runIdsByMessageGroup.has(messageGroupId)) {
			this.runIdsByMessageGroup.set(messageGroupId, []);
		}
		const groupRunIds = this.runIdsByMessageGroup.get(messageGroupId);
		if (groupRunIds) groupRunIds.push(runId);

		return { runId, abortController, messageGroupId };
	}

	getThreadStatus(
		threadId: string,
		backgroundTasks: BackgroundTaskStatusSnapshot[],
	): InstanceAiThreadStatusResponse {
		return {
			hasActiveRun: this.activeRuns.has(threadId),
			isSuspended: this.suspendedRuns.has(threadId),
			backgroundTasks: backgroundTasks
				.filter((task) => task.threadId === threadId)
				.map((task) => ({
					taskId: task.taskId,
					role: task.role,
					agentId: task.agentId,
					status: task.status,
					startedAt: task.startedAt,
					runId: task.runId,
					messageGroupId: task.messageGroupId,
				})),
		};
	}

	hasLiveRun(threadId: string): boolean {
		return this.activeRuns.has(threadId) || this.suspendedRuns.has(threadId);
	}

	hasActiveRun(threadId: string): boolean {
		return this.activeRuns.has(threadId);
	}

	hasSuspendedRun(threadId: string): boolean {
		return this.suspendedRuns.has(threadId);
	}

	getMessageGroupId(threadId: string): string | undefined {
		return this.threadMessageGroupId.get(threadId);
	}

	getLiveMessageGroupId(
		threadId: string,
		backgroundTasks: BackgroundTaskStatusSnapshot[],
	): string | undefined {
		if (this.hasLiveRun(threadId)) {
			return this.threadMessageGroupId.get(threadId);
		}

		const runningTask = backgroundTasks
			.filter((task) => task.threadId === threadId && task.status === 'running')
			.sort((a, b) => b.startedAt - a.startedAt)[0];

		return runningTask?.messageGroupId ?? this.threadMessageGroupId.get(threadId);
	}

	getRunIdsForMessageGroup(messageGroupId: string): string[] {
		return this.runIdsByMessageGroup.get(messageGroupId) ?? [];
	}

	getActiveRunId(threadId: string): string | undefined {
		return this.activeRuns.get(threadId)?.runId;
	}

	getActiveRun(threadId: string): ActiveRunState | undefined {
		return this.activeRuns.get(threadId);
	}

	getSuspendedRun(threadId: string): SuspendedRunState<TUser> | undefined {
		return this.suspendedRuns.get(threadId);
	}

	attachTracing(threadId: string, tracing: InstanceAiTraceContext): void {
		const activeRun = this.activeRuns.get(threadId);
		if (!activeRun) return;

		this.activeRuns.set(threadId, {
			...activeRun,
			tracing,
		});
	}

	clearActiveRun(threadId: string): void {
		this.activeRuns.delete(threadId);
	}

	suspendRun(threadId: string, state: SuspendedRunState<TUser>): void {
		this.activeRuns.delete(threadId);
		this.suspendedRuns.set(threadId, state);
	}

	findSuspendedByRequestId(requestId: string): SuspendedRunState<TUser> | undefined {
		for (const run of this.suspendedRuns.values()) {
			if (run.requestId === requestId) return run;
		}
		return undefined;
	}

	activateSuspendedRun(threadId: string): SuspendedRunState<TUser> | undefined {
		const suspended = this.suspendedRuns.get(threadId);
		if (!suspended) return undefined;

		this.suspendedRuns.delete(threadId);
		this.activeRuns.set(threadId, {
			runId: suspended.runId,
			abortController: suspended.abortController,
			messageGroupId: suspended.messageGroupId,
			tracing: suspended.tracing,
		});
		return suspended;
	}

	registerPendingConfirmation(requestId: string, pending: PendingConfirmation): void {
		this.pendingConfirmations.set(requestId, pending);
	}

	resolvePendingConfirmation(
		requestingUserId: string,
		requestId: string,
		data: ConfirmationData,
	): boolean {
		const pending = this.pendingConfirmations.get(requestId);
		if (!pending || pending.userId !== requestingUserId) return false;

		this.pendingConfirmations.delete(requestId);
		pending.resolve(data);
		return true;
	}

	cancelThread(
		threadId: string,
		cancelledConfirmation: ConfirmationData = { approved: false },
	): {
		active?: ActiveRunState;
		suspended?: SuspendedRunState<TUser>;
	} {
		for (const [requestId, pending] of this.pendingConfirmations) {
			if (pending.threadId !== threadId) continue;
			pending.resolve(cancelledConfirmation);
			this.pendingConfirmations.delete(requestId);
		}

		const active = this.activeRuns.get(threadId);
		const suspended = this.suspendedRuns.get(threadId);
		if (suspended) {
			this.suspendedRuns.delete(threadId);
		}

		return { ...(active ? { active } : {}), ...(suspended ? { suspended } : {}) };
	}

	getThreadUser(threadId: string): TUser | undefined {
		return this.threadUsers.get(threadId);
	}

	getThreadResearchMode(threadId: string): boolean | undefined {
		return this.threadResearchMode.get(threadId);
	}

	/**
	 * Find suspended runs and pending confirmations older than `maxAgeMs`.
	 * Returns thread IDs and request IDs that should be cancelled/rejected.
	 * Does NOT mutate state — the caller is responsible for cancelling.
	 */
	sweepTimedOut(maxAgeMs: number): {
		suspendedThreadIds: string[];
		confirmationRequestIds: string[];
	} {
		const now = Date.now();
		const suspendedThreadIds: string[] = [];
		for (const [threadId, run] of this.suspendedRuns) {
			if (now - run.createdAt >= maxAgeMs) {
				suspendedThreadIds.push(threadId);
			}
		}
		const confirmationRequestIds: string[] = [];
		for (const [reqId, pending] of this.pendingConfirmations) {
			if (now - pending.createdAt >= maxAgeMs) {
				confirmationRequestIds.push(reqId);
			}
		}
		return { suspendedThreadIds, confirmationRequestIds };
	}

	/**
	 * Auto-reject a pending confirmation by request ID.
	 * Returns true if the confirmation existed and was rejected.
	 */
	rejectPendingConfirmation(requestId: string): boolean {
		const pending = this.pendingConfirmations.get(requestId);
		if (!pending) return false;
		this.pendingConfirmations.delete(requestId);
		pending.resolve({ approved: false });
		return true;
	}

	/** Remove a message-group entry from runIdsByMessageGroup. */
	deleteMessageGroup(groupId: string): void {
		this.runIdsByMessageGroup.delete(groupId);
	}

	/**
	 * Remove all per-thread state: active/suspended runs, confirmations,
	 * user, research mode, and message-group mappings.
	 * Returns the cancelled active/suspended runs so the caller can abort them.
	 */
	clearThread(
		threadId: string,
		cancelledConfirmation: ConfirmationData = { approved: false },
	): {
		active?: ActiveRunState;
		suspended?: SuspendedRunState<TUser>;
	} {
		const { active, suspended } = this.cancelThread(threadId, cancelledConfirmation);

		if (active) this.activeRuns.delete(threadId);

		this.threadUsers.delete(threadId);
		this.threadResearchMode.delete(threadId);

		const groupId = this.threadMessageGroupId.get(threadId);
		if (groupId) this.runIdsByMessageGroup.delete(groupId);
		this.threadMessageGroupId.delete(threadId);

		return { ...(active ? { active } : {}), ...(suspended ? { suspended } : {}) };
	}

	shutdown(cancelledConfirmation: ConfirmationData = { approved: false }): {
		activeRuns: ActiveRunState[];
		suspendedRuns: Array<SuspendedRunState<TUser>>;
	} {
		const activeRuns = [...this.activeRuns.values()];
		const suspendedRuns = [...this.suspendedRuns.values()];

		for (const pending of this.pendingConfirmations.values()) {
			pending.resolve(cancelledConfirmation);
		}

		this.activeRuns.clear();
		this.suspendedRuns.clear();
		this.pendingConfirmations.clear();
		this.threadUsers.clear();
		this.threadResearchMode.clear();
		this.threadMessageGroupId.clear();
		this.runIdsByMessageGroup.clear();

		return { activeRuns, suspendedRuns };
	}
}
