import type { InstanceAiThreadStatusResponse } from '@n8n/api-types';
import { nanoid } from 'nanoid';

import type { InstanceAiTraceContext, ModelConfig } from '../types';
import type {
	InstanceAiLivenessPolicy,
	InstanceAiLivenessSurface,
	InstanceAiLivenessTimeoutReason,
} from './liveness-policy';
import type { WorkflowBuildOutcome } from '../workflow-loop/workflow-loop-state';

export interface ActiveRunState {
	runId: string;
	threadId: string;
	abortController: AbortController;
	messageGroupId?: string;
	tracing?: InstanceAiTraceContext;
	modelId?: ModelConfig;
	startedAt?: number;
	lastActivityAt?: number;
}

export interface SuspendedRunState<TUser = unknown> extends ActiveRunState {
	agentRunId: string;
	agent: unknown;
	threadId: string;
	user: TUser;
	toolCallId: string;
	requestId: string;
	createdAt: number;
	/** Set when the suspended run was a planned-task checkpoint follow-up.
	 *  Preserved across suspend/resume so the resumed run's finalizer can
	 *  run the deadlock fallback and reschedule. */
	checkpoint?: { isCheckpointFollowUp: true; checkpointTaskId: string };
	/** Set when the suspended run was a planned build-workflow follow-up. */
	plannedBuild?: {
		isPlannedBuildFollowUp: true;
		buildTaskId: string;
		workItemId: string;
		isSupportingWorkflowTask?: boolean;
		savedOutcome?: WorkflowBuildOutcome;
	};
}

/**
 * Flat confirmation payload consumed by native tool `resumeSchema`s and sub-agent HITL.
 * The service layer constructs this from the typed `InstanceAiConfirmRequest` discriminated
 * union sent by the frontend — only one subset of fields is populated per call, matching
 * the confirmation kind that was originally requested.
 */
export interface ConfirmationData {
	approved: boolean;
	credentials?: Record<string, string>;
	nodeCredentials?: Record<string, Record<string, string>>;
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
	/** Plan-review hard denial — distinct from a feedback-driven rejection. */
	denied?: boolean;
	/** `'session'` means the user chose "always allow": the resuming tool should
	 *  persist a thread-level grant so the same action isn't re-asked. */
	scope?: 'once' | 'session';
}

export interface PendingConfirmation {
	resolve: (data: ConfirmationData) => void;
	threadId: string;
	userId: string;
	createdAt: number;
	startedAt?: number;
	lastActivityAt?: number;
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

export interface RunStateTimeoutDetails {
	reason: InstanceAiLivenessTimeoutReason;
	surface: InstanceAiLivenessSurface;
	timeoutMs: number;
	elapsedMs: number;
	idleMs: number;
}

export interface StartRunOptions<TUser> {
	threadId: string;
	user: TUser;
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

	private readonly threadMessageGroupId = new Map<string, string>();

	private readonly runIdsByMessageGroup = new Map<string, string[]>();

	/** IANA time zone captured at initial-run entry and reused by follow-up runs. */
	private readonly threadTimeZones = new Map<string, string>();

	startRun(options: StartRunOptions<TUser>): StartedRunState {
		const runId = `run_${nanoid()}`;
		const abortController = new AbortController();
		const messageGroupId = options.messageGroupId ?? `mg_${nanoid()}`;
		const now = Date.now();

		this.activeRuns.set(options.threadId, {
			runId,
			threadId: options.threadId,
			abortController,
			messageGroupId,
			startedAt: now,
			lastActivityAt: now,
		});
		this.threadUsers.set(options.threadId, options.user);

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

		return { runId, threadId: options.threadId, abortController, messageGroupId };
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

	/** Number of runs currently executing (excludes suspended/pending runs). */
	activeRunCount(): number {
		return this.activeRuns.size;
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
			threadId,
			tracing,
		});
	}

	clearActiveRun(threadId: string): void {
		this.activeRuns.delete(threadId);
	}

	cancelActiveRun(threadId: string): ActiveRunState | undefined {
		const active = this.activeRuns.get(threadId);
		if (!active) return undefined;

		this.activeRuns.delete(threadId);
		return active;
	}

	suspendRun(threadId: string, state: SuspendedRunState<TUser>): void {
		const activeRun = this.activeRuns.get(threadId);
		this.activeRuns.delete(threadId);
		state.startedAt = state.startedAt ?? activeRun?.startedAt ?? state.createdAt;
		state.lastActivityAt = state.lastActivityAt ?? state.createdAt;
		this.suspendedRuns.set(threadId, state);
	}

	findSuspendedByRequestId(requestId: string): SuspendedRunState<TUser> | undefined {
		for (const run of this.suspendedRuns.values()) {
			if (run.requestId === requestId) return run;
		}
		return undefined;
	}

	cancelSuspendedRun(threadId: string): SuspendedRunState<TUser> | undefined {
		const suspended = this.suspendedRuns.get(threadId);
		if (!suspended) return undefined;

		this.suspendedRuns.delete(threadId);
		return suspended;
	}

	activateSuspendedRun(threadId: string): SuspendedRunState<TUser> | undefined {
		const suspended = this.suspendedRuns.get(threadId);
		if (!suspended) return undefined;

		this.suspendedRuns.delete(threadId);
		const now = Date.now();
		this.activeRuns.set(threadId, {
			runId: suspended.runId,
			threadId,
			abortController: suspended.abortController,
			messageGroupId: suspended.messageGroupId,
			tracing: suspended.tracing,
			modelId: suspended.modelId,
			startedAt: suspended.startedAt ?? suspended.createdAt,
			lastActivityAt: now,
		});
		return suspended;
	}

	registerPendingConfirmation(requestId: string, pending: PendingConfirmation): void {
		this.pendingConfirmations.set(requestId, {
			...pending,
			startedAt: pending.startedAt ?? pending.createdAt,
			lastActivityAt: pending.lastActivityAt ?? pending.createdAt,
		});
	}

	getPendingConfirmation(requestId: string): PendingConfirmation | undefined {
		return this.pendingConfirmations.get(requestId);
	}

	hasPendingConfirmationForThread(threadId: string): boolean {
		for (const pending of this.pendingConfirmations.values()) {
			if (pending.threadId === threadId) return true;
		}

		return false;
	}

	touchActiveRun(threadId: string, at = Date.now()): boolean {
		const active = this.activeRuns.get(threadId);
		if (!active) return false;
		active.lastActivityAt = at;
		return true;
	}

	touchSuspendedRun(threadId: string, at = Date.now()): boolean {
		const suspended = this.suspendedRuns.get(threadId);
		if (!suspended) return false;
		suspended.lastActivityAt = at;
		return true;
	}

	touchPendingConfirmation(requestId: string, at = Date.now()): boolean {
		const pending = this.pendingConfirmations.get(requestId);
		if (!pending) return false;
		pending.lastActivityAt = at;
		return true;
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

	setTimeZone(threadId: string, timeZone: string): void {
		this.threadTimeZones.set(threadId, timeZone);
	}

	getTimeZone(threadId: string): string | undefined {
		return this.threadTimeZones.get(threadId);
	}

	/**
	 * Find active/suspended runs and pending confirmations that timed out under policy.
	 * Returns thread IDs and request IDs that should be cancelled/rejected.
	 * Does NOT mutate state — the caller is responsible for cancelling.
	 */
	sweepTimedOut(maxAgeMs: number): {
		suspendedThreadIds: string[];
		confirmationRequestIds: string[];
	};
	sweepTimedOut(
		policy: InstanceAiLivenessPolicy,
		now?: number,
	): {
		activeThreadIds: string[];
		suspendedThreadIds: string[];
		confirmationRequestIds: string[];
		activeTimeouts: Record<string, RunStateTimeoutDetails>;
		suspendedTimeouts: Record<string, RunStateTimeoutDetails>;
		confirmationTimeouts: Record<string, RunStateTimeoutDetails>;
	};
	sweepTimedOut(
		policyOrMaxAgeMs: InstanceAiLivenessPolicy | number,
		now = Date.now(),
	):
		| {
				suspendedThreadIds: string[];
				confirmationRequestIds: string[];
		  }
		| {
				activeThreadIds: string[];
				suspendedThreadIds: string[];
				confirmationRequestIds: string[];
				activeTimeouts: Record<string, RunStateTimeoutDetails>;
				suspendedTimeouts: Record<string, RunStateTimeoutDetails>;
				confirmationTimeouts: Record<string, RunStateTimeoutDetails>;
		  } {
		if (typeof policyOrMaxAgeMs === 'number') {
			const maxAgeMs = policyOrMaxAgeMs;
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

		const policy = policyOrMaxAgeMs;
		const activeThreadIds: string[] = [];
		const activeTimeouts: Record<string, RunStateTimeoutDetails> = {};
		for (const [threadId, run] of this.activeRuns) {
			if (this.hasPendingConfirmationForThread(threadId)) continue;

			const startedAt = run.startedAt ?? run.lastActivityAt ?? now;
			const lastActivityAt = run.lastActivityAt ?? startedAt;
			const decision = policy.evaluate({
				surface: 'active-run',
				startedAt,
				lastActivityAt,
				now,
			});
			if (decision.action === 'timeout') {
				activeThreadIds.push(threadId);
				activeTimeouts[threadId] = decision;
			}
		}

		const suspendedThreadIds: string[] = [];
		const suspendedTimeouts: Record<string, RunStateTimeoutDetails> = {};
		for (const [threadId, run] of this.suspendedRuns) {
			const startedAt = run.startedAt ?? run.createdAt;
			const lastActivityAt = run.lastActivityAt ?? run.createdAt;
			const decision = policy.evaluate({
				surface: 'suspended-run',
				startedAt,
				lastActivityAt,
				now,
			});
			if (decision.action === 'timeout') {
				suspendedThreadIds.push(threadId);
				suspendedTimeouts[threadId] = decision;
			}
		}
		const confirmationRequestIds: string[] = [];
		const confirmationTimeouts: Record<string, RunStateTimeoutDetails> = {};
		for (const [reqId, pending] of this.pendingConfirmations) {
			const startedAt = pending.startedAt ?? pending.createdAt;
			const lastActivityAt = pending.lastActivityAt ?? pending.createdAt;
			const decision = policy.evaluate({
				surface: 'pending-confirmation',
				startedAt,
				lastActivityAt,
				now,
			});
			if (decision.action === 'timeout') {
				confirmationRequestIds.push(reqId);
				confirmationTimeouts[reqId] = decision;
			}
		}
		return {
			activeThreadIds,
			suspendedThreadIds,
			confirmationRequestIds,
			activeTimeouts,
			suspendedTimeouts,
			confirmationTimeouts,
		};
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
	 * user, time zone, and message-group mappings.
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
		this.threadTimeZones.delete(threadId);

		const groupId = this.threadMessageGroupId.get(threadId);
		if (groupId) this.runIdsByMessageGroup.delete(groupId);
		this.threadMessageGroupId.delete(threadId);

		return { ...(active ? { active } : {}), ...(suspended ? { suspended } : {}) };
	}

	/**
	 * Process-wide teardown. Returns the in-flight runs so the service can
	 * abort them and persist terminal snapshots where appropriate.
	 *
	 * Pending confirmations are intentionally NOT resolved — auto-resolving an
	 * inline HITL (`waitForConfirmation(...)`) with `{ approved: false }`
	 * causes the awaiting agent tool to run to completion as "denied" before
	 * the process exits, which then mutates the snapshot tree mid-shutdown
	 * and clobbers the plan/ask card the user would otherwise see on reload.
	 * Letting the Promises dangle is safe: the process is exiting, the
	 * abortController for each active run is aborted next, and the
	 * `instance_ai_pending_confirmations` row survives so the user can still
	 * see the confirmation card (and get a clear "lost on restart" error if
	 * they click confirm — see `handleOrphanedConfirmation`).
	 *
	 * `pendingThreadIds` is returned so the service can skip the
	 * publish-run-finish + terminal-snapshot treatment for runs that are
	 * only sitting in `activeRuns` because they're waiting on an inline
	 * confirmation Promise.
	 */
	shutdown(): {
		activeRuns: ActiveRunState[];
		suspendedRuns: Array<SuspendedRunState<TUser>>;
		pendingThreadIds: string[];
	} {
		const activeRuns = [...this.activeRuns.values()];
		const suspendedRuns = [...this.suspendedRuns.values()];
		const pendingThreadIds = [
			...new Set([...this.pendingConfirmations.values()].map((p) => p.threadId)),
		];

		this.activeRuns.clear();
		this.suspendedRuns.clear();
		this.pendingConfirmations.clear();
		this.threadUsers.clear();
		this.threadTimeZones.clear();
		this.threadMessageGroupId.clear();
		this.runIdsByMessageGroup.clear();

		return { activeRuns, suspendedRuns, pendingThreadIds };
	}
}
