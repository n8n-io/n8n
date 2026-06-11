import { logger } from '@n8n/computer-use/logger';
import {
	INSTANCE_RESOURCE_DECISION_KEYS,
	type AffectedResource,
	type ResourceDecision,
} from '@n8n/computer-use/tools/types';
import { randomUUID } from 'node:crypto';

import type { LocalPermissionPromptRequest } from '../shared/types';

export interface PermissionBrokerDeps {
	/** Push a new prompt to the renderer (wired to `notifyMainWindow` in index.ts). */
	pushRequested: (prompt: LocalPermissionPromptRequest) => void;
	/** Push a prompt withdrawal (resolved or cleared) to the renderer. */
	pushWithdrawn: (id: string) => void;
	/** Notification hook, fired alongside `pushRequested` (e.g. system notification when the window is hidden). */
	onPrompt?: (prompt: LocalPermissionPromptRequest) => void;
}

interface PendingPrompt {
	prompt: LocalPermissionPromptRequest;
	resolve: (decision: ResourceDecision) => void;
}

/**
 * Resolves computer-use's `client`-mode `confirmResourceAccess` callback against the
 * user: each request becomes a pending prompt pushed to the renderer, and the user's
 * decision resolves the callback's promise. Pending prompts live here in the main
 * process so they survive renderer reloads (resynced via `list`).
 */
export class PermissionBroker {
	private readonly pending = new Map<string, PendingPrompt>();

	constructor(private readonly deps: PermissionBrokerDeps) {}

	async request(resource: AffectedResource): Promise<ResourceDecision> {
		const prompt: LocalPermissionPromptRequest = {
			id: randomUUID(),
			resource,
			// The reduced instance-mode option set, so both permission modes look the same.
			options: INSTANCE_RESOURCE_DECISION_KEYS,
		};
		logger.debug('Permission prompt requested', { id: prompt.id, resource: resource.resource });
		return await new Promise<ResourceDecision>((resolve) => {
			this.pending.set(prompt.id, { prompt, resolve });
			this.deps.pushRequested(prompt);
			this.deps.onPrompt?.(prompt);
		});
	}

	/** Resolve a pending prompt with the user's decision; `false` when the id is unknown (already resolved). */
	respond(id: string, decision: ResourceDecision): boolean {
		const entry = this.pending.get(id);
		if (!entry) return false;
		this.pending.delete(id);
		logger.debug('Permission prompt resolved', { id, decision });
		entry.resolve(decision);
		this.deps.pushWithdrawn(id);
		return true;
	}

	/** Pending prompts, oldest first — the renderer's reload resync. */
	list(): LocalPermissionPromptRequest[] {
		return [...this.pending.values()].map((entry) => entry.prompt);
	}

	/** Deny and withdraw everything pending (gateway disconnected — the requesting tool calls are gone). */
	clear(): void {
		for (const id of [...this.pending.keys()]) this.respond(id, 'denyOnce');
	}
}
