import { Logger } from '@n8n/backend-common';
import { TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { AsyncLocalStorage } from 'node:async_hooks';
import { setTimeout as delay } from 'node:timers/promises';
import { UnexpectedError } from 'n8n-workflow';

import {
	AgentConversationLeaseLostError,
	AgentConversationLeaseTimeoutError,
	CONVERSATION_LEASE_RENEW_MS,
	type AgentConversationLeaseHandle,
} from './agent-conversation-lease.types';
import { AgentConversationLeaseRepository } from './repositories/agent-conversation-lease.repository';

export type AgentConversationOwner = Readonly<{
	lease: AgentConversationLeaseHandle;
	signal: AbortSignal;
	lose: (error: unknown) => void;
}>;

type ActiveLease = {
	owner: AgentConversationOwner;
	signal: AbortSignal;
	release: () => Promise<void>;
};

// Carry the immutable owner through stream creation, consumption, and cleanup.
// Fenced writes use this context so cached runtimes do not retain ownership tokens.
const executionOwner = new AsyncLocalStorage<AgentConversationOwner>();

@Service()
export class AgentConversationLeaseService {
	constructor(
		private readonly repository: AgentConversationLeaseRepository,
		private readonly transactionRunner: TransactionRunner,
		private readonly logger: Logger,
	) {}

	currentOwner(): AgentConversationOwner | undefined {
		return executionOwner.getStore();
	}

	requireOwner(threadId: string, agentId?: string): AgentConversationOwner {
		const owner = this.currentOwner();
		if (
			!owner ||
			owner.lease.threadId !== threadId ||
			(agentId !== undefined && owner.lease.agentId !== agentId)
		) {
			throw new UnexpectedError('Agent conversation execution has no matching owner');
		}
		return owner;
	}

	async write<T>(
		owner: AgentConversationOwner,
		write: (ctx: OperationContext) => Promise<T>,
	): Promise<T> {
		if (owner.signal.aborted) throw new AgentConversationLeaseLostError(owner.lease.threadId);
		try {
			return await this.transactionRunner.run({}, async (ctx) => {
				await this.repository.assertOwner(owner.lease, ctx);
				return await write(ctx);
			});
		} catch (error) {
			if (error instanceof AgentConversationLeaseLostError) owner.lose(error);
			throw error;
		}
	}

	async isHeld(threadId: string): Promise<boolean> {
		return await this.repository.isHeld(threadId);
	}

	async withLease<T>(
		agentId: string,
		threadId: string,
		run: (signal: AbortSignal) => Promise<T>,
		options: { signal?: AbortSignal; waitTimeoutMs?: number } = {},
	): Promise<T> {
		const active = await this.acquire(agentId, threadId, options);
		try {
			return await executionOwner.run(active.owner, async () => await run(active.signal));
		} finally {
			await active.release();
		}
	}

	stream<T>(
		agentId: string,
		threadId: string | (() => Promise<string>),
		create: (signal: AbortSignal) => AsyncGenerator<T>,
		options: { signal?: AbortSignal } = {},
	): AsyncGenerator<T> {
		const current = this.currentOwner();
		return this.consumeStream(agentId, threadId, create, options, current);
	}

	private async *consumeStream<T>(
		agentId: string,
		conversation: string | (() => Promise<string>),
		create: (signal: AbortSignal) => AsyncGenerator<T>,
		options: { signal?: AbortSignal },
		current: AgentConversationOwner | undefined,
	): AsyncGenerator<T> {
		const threadId = typeof conversation === 'string' ? conversation : await conversation();
		let acquired: ActiveLease | undefined;
		let owner: AgentConversationOwner;
		if (current?.lease.threadId === threadId && current.lease.agentId === agentId) {
			owner = current;
		} else {
			acquired = await this.acquire(agentId, threadId, options);
			owner = acquired.owner;
		}
		const signal = options.signal ? AbortSignal.any([owner.signal, options.signal]) : owner.signal;
		let iterator: AsyncGenerator<T> | undefined;
		try {
			await this.write(owner, async () => undefined);
			signal.throwIfAborted();
			iterator = executionOwner.run(owner, () => create(signal));
			while (true) {
				// The caller can request the next chunk from a different async context.
				const next = await executionOwner.run(owner, async () => await iterator!.next());
				if (next.done) return;
				yield next.value;
			}
		} finally {
			try {
				await executionOwner.run(owner, async () => await iterator?.return(undefined));
			} finally {
				await acquired?.release();
			}
		}
	}

	outsideConversation<T>(run: () => T): T {
		return executionOwner.exit(run);
	}

	private async acquire(
		agentId: string,
		threadId: string,
		options: { signal?: AbortSignal; waitTimeoutMs?: number },
	): Promise<ActiveLease> {
		const handle = await this.waitForLease(agentId, threadId, options);
		return this.startLease(handle, options.signal);
	}

	private async waitForLease(
		agentId: string,
		threadId: string,
		options: { signal?: AbortSignal; waitTimeoutMs?: number },
	): Promise<AgentConversationLeaseHandle> {
		const started = performance.now();
		while (true) {
			options.signal?.throwIfAborted();
			const handle = await this.repository.acquire(agentId, threadId);
			if (handle) return handle;
			const remaining = (options.waitTimeoutMs ?? Infinity) - (performance.now() - started);
			if (remaining <= 0) throw new AgentConversationLeaseTimeoutError(threadId);
			await delay(Math.min(250, remaining), undefined, { signal: options.signal });
		}
	}

	private startLease(handle: AgentConversationLeaseHandle, signal?: AbortSignal): ActiveLease {
		const { threadId } = handle;
		const controller = new AbortController();
		const owner: AgentConversationOwner = {
			lease: handle,
			signal: controller.signal,
			lose: (error) => controller.abort(error),
		};
		let renewing: Promise<void> | undefined;
		const timer = setInterval(() => {
			if (renewing || controller.signal.aborted) return;
			renewing = this.repository
				.renew(owner.lease)
				.then((renewed) => {
					if (!renewed) owner.lose(new AgentConversationLeaseLostError(threadId));
				})
				.catch((error: unknown) => {
					owner.lose(error);
					this.logger.warn('Agent conversation lease renewal failed', { threadId, error });
				})
				.finally(() => {
					renewing = undefined;
				});
		}, CONVERSATION_LEASE_RENEW_MS);
		timer.unref();
		controller.signal.addEventListener('abort', () => clearInterval(timer), { once: true });
		return {
			owner,
			signal: signal ? AbortSignal.any([controller.signal, signal]) : controller.signal,
			release: async () => {
				clearInterval(timer);
				await renewing;
				if (controller.signal.aborted) return;
				owner.lose(new AgentConversationLeaseLostError(threadId));
				try {
					await this.repository.release(owner.lease);
				} catch (error) {
					this.logger.warn('Failed to release agent conversation ownership', { threadId, error });
				}
			},
		};
	}
}
