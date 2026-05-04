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

	constructor(private readonly ttlMs: number) {}

	get enabled(): boolean {
		return this.ttlMs > 0;
	}

	acquireByWorkflowId(threadId: string, workflowId: string): BuilderSandboxSession | undefined {
		if (!this.enabled) {
			return undefined;
		}

		const sessionId = this.byThreadWorkflowId.get(sessionKey(threadId, workflowId));
		if (!sessionId) {
			return undefined;
		}

		return this.acquire(sessionId);
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
		if (session.workflowId) {
			this.byThreadWorkflowId.set(
				sessionKey(session.threadId, session.workflowId),
				session.sessionId,
			);
		}

		return toPublicSession(session);
	}

	aliasWorkflowId(sessionId: string, workflowId: string): void {
		const session = this.sessions.get(sessionId);
		if (!session) return;

		if (session.workflowId && session.workflowId !== workflowId) {
			this.deleteWorkflowAliasForSession(session);
		}

		session.workflowId = workflowId;
		session.updatedAt = Date.now();
		this.byThreadWorkflowId.set(sessionKey(session.threadId, workflowId), session.sessionId);
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

	private acquire(sessionId: string): BuilderSandboxSession | undefined {
		const session = this.sessions.get(sessionId);
		if (!session) {
			return undefined;
		}

		if (session.busy) {
			return undefined;
		}

		if (session.expiresAt <= Date.now()) {
			void this.cleanupSession(session.sessionId, 'expired_on_acquire');
			return undefined;
		}

		if (session.cleanupTimer) {
			clearTimeout(session.cleanupTimer);
			session.cleanupTimer = undefined;
		}

		session.busy = true;
		session.updatedAt = Date.now();
		return toPublicSession(session);
	}

	private scheduleExpiry(session: BuilderSandboxSessionInternal): void {
		if (session.cleanupTimer) {
			clearTimeout(session.cleanupTimer);
		}

		const delay = Math.max(0, session.expiresAt - Date.now());
		session.cleanupTimer = setTimeout(() => {
			void this.cleanupSession(session.sessionId, 'ttl_expired');
		}, delay);
		session.cleanupTimer.unref();
	}

	private deleteWorkflowAliasForSession(session: BuilderSandboxSessionInternal): void {
		if (!session.workflowId) return;

		const key = sessionKey(session.threadId, session.workflowId);
		if (this.byThreadWorkflowId.get(key) === session.sessionId) {
			this.byThreadWorkflowId.delete(key);
		}
	}

	private async cleanupSession(sessionId: string, _reason: string): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (!session) return;

		this.sessions.delete(session.sessionId);
		this.deleteWorkflowAliasForSession(session);

		if (session.cleanupTimer) {
			clearTimeout(session.cleanupTimer);
			session.cleanupTimer = undefined;
		}

		try {
			await session.cleanup();
		} catch {
			// Best-effort cleanup
		}
	}
}
