import type { Workspace } from '@mastra/core/workspace';
import { nanoid } from 'nanoid';

import type { BuilderWorkspace } from '../workspace/builder-sandbox-factory';

interface BuilderSandboxSessionInternal {
	sessionId: string;
	threadId: string;
	workflowId?: string;
	workItemId: string;
	builderThreadId: string;
	builderResourceId: string;
	workspace: Workspace;
	root: string;
	cleanup: () => Promise<void>;
	busy: boolean;
	createdAt: number;
	updatedAt: number;
	expiresAt: number;
	cleanupTimer?: ReturnType<typeof setTimeout>;
}

export interface BuilderSandboxSession {
	sessionId: string;
	threadId: string;
	workflowId?: string;
	workItemId: string;
	builderThreadId: string;
	builderResourceId: string;
	workspace: Workspace;
	root: string;
	busy: boolean;
	createdAt: number;
	updatedAt: number;
	expiresAt: number;
}

export interface CreateBuilderSandboxSessionInput {
	threadId: string;
	workflowId?: string;
	workItemId: string;
	builderThreadId: string;
	builderResourceId: string;
	builderWorkspace: BuilderWorkspace;
	root: string;
}

function sessionKey(threadId: string, value: string): string {
	return `${threadId}:${value}`;
}

function logBuilderSessionDebug(event: string, metadata: Record<string, unknown>): void {
	// TEMP DEBUG: remove after workflow-builder warm-session tuning.
	// eslint-disable-next-line no-console
	console.log(`[InstanceAI][workflow-builder-session] ${event}`, metadata);
}

function toPublicSession(session: BuilderSandboxSessionInternal): BuilderSandboxSession {
	return {
		sessionId: session.sessionId,
		threadId: session.threadId,
		workflowId: session.workflowId,
		workItemId: session.workItemId,
		builderThreadId: session.builderThreadId,
		builderResourceId: session.builderResourceId,
		workspace: session.workspace,
		root: session.root,
		busy: session.busy,
		createdAt: session.createdAt,
		updatedAt: session.updatedAt,
		expiresAt: session.expiresAt,
	};
}

export class BuilderSandboxSessionRegistry {
	private readonly sessions = new Map<string, BuilderSandboxSessionInternal>();

	private readonly byThreadWorkflowId = new Map<string, string>();

	private readonly byThreadWorkItemId = new Map<string, string>();

	constructor(private readonly ttlMs: number) {}

	get enabled(): boolean {
		return this.ttlMs > 0;
	}

	acquireByWorkflowId(threadId: string, workflowId: string): BuilderSandboxSession | undefined {
		if (!this.enabled) {
			logBuilderSessionDebug('session-miss', {
				threadId,
				workflowId,
				reason: 'disabled',
				ttlMs: this.ttlMs,
			});
			return undefined;
		}

		const sessionId = this.byThreadWorkflowId.get(sessionKey(threadId, workflowId));
		if (!sessionId) {
			logBuilderSessionDebug('session-miss', {
				threadId,
				workflowId,
				reason: 'not_found',
				ttlMs: this.ttlMs,
			});
			return undefined;
		}

		return this.acquire(sessionId, { workflowId });
	}

	create(input: CreateBuilderSandboxSessionInput): BuilderSandboxSession | undefined {
		if (!this.enabled) return undefined;

		const now = Date.now();
		const session: BuilderSandboxSessionInternal = {
			sessionId: `builder-session-${nanoid(8)}`,
			threadId: input.threadId,
			workflowId: input.workflowId,
			workItemId: input.workItemId,
			builderThreadId: input.builderThreadId,
			builderResourceId: input.builderResourceId,
			workspace: input.builderWorkspace.workspace,
			root: input.root,
			cleanup: input.builderWorkspace.cleanup,
			busy: true,
			createdAt: now,
			updatedAt: now,
			expiresAt: now + this.ttlMs,
		};

		this.sessions.set(session.sessionId, session);
		this.byThreadWorkItemId.set(
			sessionKey(session.threadId, session.workItemId),
			session.sessionId,
		);
		if (session.workflowId) {
			this.byThreadWorkflowId.set(
				sessionKey(session.threadId, session.workflowId),
				session.sessionId,
			);
		}

		logBuilderSessionDebug('session-created', this.debugMetadata(session, 'created'));
		return toPublicSession(session);
	}

	aliasWorkflowId(sessionId: string, workflowId: string): void {
		const session = this.sessions.get(sessionId);
		if (!session) return;

		if (session.workflowId && session.workflowId !== workflowId) {
			this.byThreadWorkflowId.delete(sessionKey(session.threadId, session.workflowId));
		}

		session.workflowId = workflowId;
		session.updatedAt = Date.now();
		this.byThreadWorkflowId.set(sessionKey(session.threadId, workflowId), session.sessionId);

		logBuilderSessionDebug('session-aliased', this.debugMetadata(session, 'workflow_id_alias'));
	}

	async release(sessionId: string, options: { keep: boolean; reason: string }): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (!session) return;

		session.busy = false;
		session.updatedAt = Date.now();

		if (!this.enabled || !options.keep) {
			await this.cleanupSession(session.sessionId, options.reason);
			return;
		}

		session.expiresAt = Date.now() + this.ttlMs;
		this.scheduleExpiry(session);
		logBuilderSessionDebug('session-release', this.debugMetadata(session, options.reason));
	}

	async cleanupThread(threadId: string, reason = 'thread_cleanup'): Promise<void> {
		const cleanupIds = [...this.sessions.values()]
			.filter((session) => session.threadId === threadId)
			.map((session) => session.sessionId);

		await Promise.allSettled(
			cleanupIds.map(async (sessionId) => await this.cleanupSession(sessionId, reason)),
		);
	}

	async cleanupAll(reason = 'service_cleanup'): Promise<void> {
		const cleanupIds = [...this.sessions.keys()];
		await Promise.allSettled(
			cleanupIds.map(async (sessionId) => await this.cleanupSession(sessionId, reason)),
		);
	}

	private acquire(
		sessionId: string,
		input: { workflowId?: string },
	): BuilderSandboxSession | undefined {
		const session = this.sessions.get(sessionId);
		if (!session) {
			logBuilderSessionDebug('session-miss', {
				workflowId: input.workflowId,
				sessionId,
				reason: 'stale_index',
				ttlMs: this.ttlMs,
			});
			return undefined;
		}

		if (session.busy) {
			logBuilderSessionDebug('session-miss', this.debugMetadata(session, 'busy'));
			return undefined;
		}

		if (session.expiresAt <= Date.now()) {
			logBuilderSessionDebug('session-miss', this.debugMetadata(session, 'expired'));
			void this.cleanupSession(session.sessionId, 'expired_on_acquire');
			return undefined;
		}

		if (session.cleanupTimer) {
			clearTimeout(session.cleanupTimer);
			session.cleanupTimer = undefined;
		}

		session.busy = true;
		session.updatedAt = Date.now();
		logBuilderSessionDebug('session-reused', this.debugMetadata(session, 'acquired'));
		return toPublicSession(session);
	}

	private scheduleExpiry(session: BuilderSandboxSessionInternal): void {
		if (session.cleanupTimer) {
			clearTimeout(session.cleanupTimer);
		}

		const delay = Math.max(0, session.expiresAt - Date.now());
		session.cleanupTimer = setTimeout(() => {
			logBuilderSessionDebug('session-expired', this.debugMetadata(session, 'ttl_expired'));
			void this.cleanupSession(session.sessionId, 'ttl_expired');
		}, delay);
		session.cleanupTimer.unref();
	}

	private async cleanupSession(sessionId: string, reason: string): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (!session) return;

		this.sessions.delete(session.sessionId);
		this.byThreadWorkItemId.delete(sessionKey(session.threadId, session.workItemId));
		if (session.workflowId) {
			this.byThreadWorkflowId.delete(sessionKey(session.threadId, session.workflowId));
		}

		if (session.cleanupTimer) {
			clearTimeout(session.cleanupTimer);
			session.cleanupTimer = undefined;
		}

		logBuilderSessionDebug('session-cleanup', this.debugMetadata(session, reason));

		try {
			await session.cleanup();
		} catch (error) {
			logBuilderSessionDebug('session-cleanup-error', {
				...this.debugMetadata(session, reason),
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private debugMetadata(
		session: BuilderSandboxSessionInternal,
		reason: string,
	): Record<string, unknown> {
		return {
			threadId: session.threadId,
			workflowId: session.workflowId,
			workItemId: session.workItemId,
			sessionId: session.sessionId,
			builderThreadId: session.builderThreadId,
			builderResourceId: session.builderResourceId,
			ttlMs: this.ttlMs,
			expiresAt: new Date(session.expiresAt).toISOString(),
			busy: session.busy,
			workspaceRoot: session.root,
			reason,
		};
	}
}
