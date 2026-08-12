/**
 * Process-local implementation of `OneOffTaskSandboxProvider` (contracts.ts):
 * an in-memory registry that lets the orchestration tool reconnect to a
 * still-alive sandbox during the credential loop via an opaque `sandboxRef`.
 *
 * The registry is also the enforcement point for the credential wait state
 * (design doc: "the wait state"): a sandbox holding decrypted credentials
 * must not sit idle. Between harness runs — which is exactly the
 * human-in-the-loop wait — a timer destroys and evicts the sandbox once the
 * wait timeout elapses. The sandbox's own hard TTL stays the backstop.
 */
import { OperationalError } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import type { Logger } from '../../logger';
import {
	ONE_OFF_TASK_CREDENTIAL_WAIT_TIMEOUT_MS,
	type OneOffTaskSandbox,
	type OneOffTaskSandboxProvider,
} from '../contracts';
import {
	createOneOffTaskSandbox,
	type CreateOneOffTaskSandboxOptions,
} from './one-off-task-sandbox-service';

export { ONE_OFF_TASK_CREDENTIAL_WAIT_TIMEOUT_MS };

/**
 * What the registry needs from a sandbox: the task-facing lifecycle plus the
 * TTL deadline, so a reattach to an already-expired sandbox fails fast.
 * `OneOffTaskSandboxService` satisfies this structurally.
 */
export interface ManagedOneOffTaskSandbox extends OneOffTaskSandbox {
	readonly expiresAt?: Date;
}

export interface ProcessLocalOneOffTaskSandboxProviderOptions {
	createSandbox: () => Promise<ManagedOneOffTaskSandbox>;
	waitTimeoutMs?: number;
	logger?: Logger;
}

interface RegistryEntry {
	sandbox: ManagedOneOffTaskSandbox;
	/** Handle returned to callers; its destroy also evicts the registry entry. */
	handle: OneOffTaskSandbox;
	waitTimer?: NodeJS.Timeout;
}

export class ProcessLocalOneOffTaskSandboxProvider implements OneOffTaskSandboxProvider {
	private readonly registry = new Map<string, RegistryEntry>();

	private readonly createSandbox: () => Promise<ManagedOneOffTaskSandbox>;

	private readonly waitTimeoutMs: number;

	private readonly logger?: Logger;

	constructor(options: ProcessLocalOneOffTaskSandboxProviderOptions) {
		this.createSandbox = options.createSandbox;
		this.waitTimeoutMs = options.waitTimeoutMs ?? ONE_OFF_TASK_CREDENTIAL_WAIT_TIMEOUT_MS;
		this.logger = options.logger;
	}

	async create(): Promise<{ sandbox: OneOffTaskSandbox; sandboxRef: string }> {
		const sandbox = await this.createSandbox();
		const sandboxRef = randomUUID();
		const entry: RegistryEntry = {
			sandbox,
			handle: this.wrapSandbox(sandboxRef, sandbox),
		};
		this.registry.set(sandboxRef, entry);
		// Armed from creation: if the caller crashes before ever running the
		// harness, the sandbox must still die on the wait timeout.
		this.armWaitTimer(sandboxRef);
		return { sandbox: entry.handle, sandboxRef };
	}

	async reattach(sandboxRef: string): Promise<OneOffTaskSandbox> {
		const entry = this.registry.get(sandboxRef);
		if (!entry) {
			throw new OperationalError(
				'One-off task sandbox is no longer available (destroyed or timed out waiting for the credential)',
			);
		}
		const expiresAt = entry.sandbox.expiresAt;
		if (expiresAt !== undefined && expiresAt.getTime() <= Date.now()) {
			await this.destroyAndEvict(sandboxRef, entry);
			throw new OperationalError('One-off task sandbox exceeded its maximum lifetime');
		}
		return entry.handle;
	}

	/**
	 * The handle keeps the wait timer honest: disarmed while a harness run is
	 * in flight (the sandbox is in use, the TTL bounds it), re-armed the moment
	 * the run settles (the wait state), and eviction rides on destroy so the
	 * registry never resurrects a dead sandbox.
	 */
	private wrapSandbox(sandboxRef: string, sandbox: ManagedOneOffTaskSandbox): OneOffTaskSandbox {
		return {
			bootstrap: async (manifest) => await sandbox.bootstrap(manifest),
			runHarness: async (options) => {
				this.disarmWaitTimer(sandboxRef);
				try {
					return await sandbox.runHarness(options);
				} finally {
					this.armWaitTimer(sandboxRef);
				}
			},
			destroy: async () => {
				// Evict first: even a failed destroy must not leave a reattachable
				// handle to a sandbox in an unknown state.
				this.evict(sandboxRef);
				await sandbox.destroy();
			},
		};
	}

	private armWaitTimer(sandboxRef: string): void {
		const entry = this.registry.get(sandboxRef);
		if (!entry) return;
		if (entry.waitTimer) clearTimeout(entry.waitTimer);
		entry.waitTimer = setTimeout(() => {
			this.logger?.warn('One-off task sandbox credential wait timed out; destroying', {
				sandboxRef,
				waitTimeoutMs: this.waitTimeoutMs,
			});
			void this.destroyAndEvict(sandboxRef, entry).catch((error: unknown) => {
				this.logger?.error('Failed to destroy one-off task sandbox after wait timeout', {
					sandboxRef,
					error: error instanceof Error ? error.message : String(error),
				});
			});
		}, this.waitTimeoutMs);
		// A pending wait timer must not keep the host process alive.
		entry.waitTimer.unref?.();
	}

	private disarmWaitTimer(sandboxRef: string): void {
		const entry = this.registry.get(sandboxRef);
		if (entry?.waitTimer) {
			clearTimeout(entry.waitTimer);
			entry.waitTimer = undefined;
		}
	}

	private evict(sandboxRef: string): void {
		this.disarmWaitTimer(sandboxRef);
		this.registry.delete(sandboxRef);
	}

	private async destroyAndEvict(sandboxRef: string, entry: RegistryEntry): Promise<void> {
		this.evict(sandboxRef);
		await entry.sandbox.destroy();
	}
}

export interface CreateOneOffTaskSandboxProviderOptions extends CreateOneOffTaskSandboxOptions {
	waitTimeoutMs?: number;
}

/** Wires the registry to the real sandbox factory (n8n sandbox service provider). */
export function createOneOffTaskSandboxProvider(
	options: CreateOneOffTaskSandboxProviderOptions,
): ProcessLocalOneOffTaskSandboxProvider {
	const { waitTimeoutMs, ...sandboxOptions } = options;
	return new ProcessLocalOneOffTaskSandboxProvider({
		createSandbox: async () => await createOneOffTaskSandbox(sandboxOptions),
		waitTimeoutMs,
		logger: options.logger,
	});
}
