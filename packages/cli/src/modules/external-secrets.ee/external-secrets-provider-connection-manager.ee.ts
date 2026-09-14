import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { UnexpectedError } from 'n8n-workflow';

import {
	ExternalSecretsProviderLifecycle,
	type ProviderConnectResult,
} from './provider-lifecycle.service';
import { ExternalSecretsProviderRegistry } from './provider-registry.service';
import { ExternalSecretsRetryManager } from './retry-manager.service';
import { ExternalSecretsSecretsCache } from './secrets-cache.service';
import type { SecretsProvider, SecretsProviderSettings } from './types';

export interface ProviderConnectionInput {
	providerKey: string;
	providerType: string;
	config: SecretsProviderSettings;
}

interface PreparedProviderConnection {
	completion: Promise<void>;
}

interface ReplacementCandidate {
	providerKey: string;
	providerType: string;
	provider?: SecretsProvider;
}

type ReplacementOutcome =
	| {
			kind: 'ready';
			phase: 'disconnected' | 'hydration';
			provider: SecretsProvider;
	  }
	| {
			kind: 'failed';
			phase: 'initialization';
			provider?: SecretsProvider;
			error: Error;
	  };

const COMPLETED_CONNECTION = {
	completion: Promise.resolve(),
} satisfies PreparedProviderConnection;

@Service()
export class ExternalSecretsProviderConnectionManager {
	/**
	 * While a key holds a candidate, that candidate owns the retries under that key: replacement
	 * connect and replacement hydrate share the key with no owner field.
	 */
	private readonly replacementCandidates = new Map<string, ReplacementCandidate>();

	constructor(
		private readonly logger: Logger,
		private readonly providerRegistry: ExternalSecretsProviderRegistry,
		private readonly providerLifecycle: ExternalSecretsProviderLifecycle,
		private readonly retryManager: ExternalSecretsRetryManager,
		private readonly secretsCache: ExternalSecretsSecretsCache,
	) {
		this.logger = this.logger.scoped('external-secrets');
	}

	/**
	 * Makes a provider configuration ready. For a new provider this resolves after its initial
	 * cache refresh. For a replacement it resolves once background hydration has started; the
	 * new configuration activates only when that hydration settles.
	 */
	async upsertProviderConnection(input: ProviderConnectionInput): Promise<void> {
		const { completion } = await this.prepareProviderConnection(input);
		await completion;
	}

	async upsertProviderConnections(inputs: ProviderConnectionInput[]): Promise<void> {
		const completions: Array<Promise<void>> = [];

		for (const input of inputs) {
			const { completion } = await this.prepareProviderConnection(input);
			completions.push(completion);
		}

		await Promise.all(completions);
	}

	shutdown(): void {
		const candidates = [...this.replacementCandidates.values()];
		this.replacementCandidates.clear();
		this.retryManager.cancelAll();

		// Disposed unconditionally: a candidate mid-connect or mid-hydration has no pending retry,
		// and its settle path will never run because the process is exiting.
		for (const candidate of candidates) {
			void this.disposeSupersededCandidate(candidate, 'shutdown');
		}

		void this.providerRegistry.disconnectAll();
	}

	private async prepareProviderConnection({
		providerKey,
		providerType,
		config,
	}: ProviderConnectionInput): Promise<PreparedProviderConnection> {
		if (this.providerRegistry.has(providerKey) || this.replacementCandidates.has(providerKey)) {
			// Replacement hydration is fire-and-forget: the old provider stays active until the
			// candidate settles in the background, so there is no completion left to await.
			await this.replaceProviderConnection(providerKey, providerType, config);
			return COMPLETED_CONNECTION;
		}

		return await this.addProviderConnection(providerKey, providerType, config);
	}

	async removeProviderConnection(providerKey: string): Promise<void> {
		// Runs before the registry removal below: disposal declines to disconnect the registry
		// occupant, leaving that to this method, so hoisting the removal would double disconnect.
		await this.invalidateReplacement(providerKey);

		this.logger.debug('Removing external secrets provider connection', {
			providerKey,
		});

		const existingProvider = this.providerRegistry.get(providerKey);
		this.providerRegistry.remove(providerKey);

		if (existingProvider) {
			await this.providerLifecycle.disconnect(existingProvider);
		}
	}

	private async connectProviderWithRetry(providerKey: string): Promise<ProviderConnectResult> {
		return await this.retryManager.runWithRetry(
			providerKey,
			async () => await this.connectProvider(providerKey),
		);
	}

	async disconnectProvider(providerKey: string): Promise<void> {
		await this.invalidateReplacement(providerKey);

		const provider = this.providerRegistry.get(providerKey);
		this.providerRegistry.remove(providerKey);

		if (provider) {
			await this.providerLifecycle.disconnect(provider);
		}
	}

	private async addProviderConnection(
		providerKey: string,
		providerType: string,
		config: SecretsProviderSettings,
	): Promise<PreparedProviderConnection> {
		this.logger.debug('Adding external secrets provider connection', {
			providerKey,
			providerType,
		});

		const result = await this.providerLifecycle.initialize(providerType, config);

		if (!result.success || !result.provider) {
			this.logger.error('Failed to initialize external secrets provider connection', {
				providerKey,
				providerType,
				error: result.error,
			});
			return COMPLETED_CONNECTION;
		}

		this.providerRegistry.set(providerKey, result.provider);

		if (config.connected) {
			await this.connectProviderWithRetry(providerKey);
		}

		return {
			completion: this.secretsCache.refreshProvider(providerKey, result.provider),
		};
	}

	private async replaceProviderConnection(
		providerKey: string,
		providerType: string,
		config: SecretsProviderSettings,
	): Promise<void> {
		const candidate = this.beginReplacement(providerKey, providerType);
		const initResult = await this.providerLifecycle.initialize(providerType, config);
		candidate.provider = initResult.provider;

		if (!initResult.success || !initResult.provider) {
			await this.settleReplacement(candidate, {
				kind: 'failed',
				phase: 'initialization',
				provider: initResult.provider,
				error:
					initResult.error ?? new UnexpectedError(`Failed to initialize provider ${providerKey}`),
			});
			return;
		}

		if (!config.connected) {
			await this.settleReplacement(candidate, {
				kind: 'ready',
				phase: 'disconnected',
				provider: initResult.provider,
			});
			return;
		}

		await this.runIfCurrentWithRetry(
			candidate,
			'initialization',
			async () => await this.connectReplacement(candidate),
		);
	}

	/**
	 * The currency check must stay in the same tick as runWithRetry(), which cancels this key's
	 * pending retry on entry: a superseded candidate would cancel its successor's retry.
	 */
	private async runIfCurrentWithRetry(
		candidate: ReplacementCandidate,
		phase: 'initialization' | 'hydration',
		operation: () => Promise<ProviderConnectResult>,
	): Promise<void> {
		if (!this.isCurrentReplacement(candidate)) {
			await this.disposeSupersededCandidate(candidate, phase);
			return;
		}

		await this.retryManager.runWithRetry(candidate.providerKey, operation);
	}

	private beginReplacement(providerKey: string, providerType: string): ReplacementCandidate {
		const previous = this.replacementCandidates.get(providerKey);
		const hadPendingRetry = this.retryManager.cancelRetry(providerKey);

		// A candidate is disposable while a retry is pending, and also in the window between an
		// attempt failing and its retry being armed. Only once it is past doConnect() though: a
		// provider mid-connect is 'connecting', and disposing it there races the providers that
		// re-create their abort controller inside doConnect().
		const outgoing =
			hadPendingRetry || previous?.provider?.state === 'connected' ? previous : undefined;

		// Stays synchronous with the cancel above: an await here would let an older overlapping
		// upsert resume and overwrite the candidate that superseded it.
		const candidate: ReplacementCandidate = { providerKey, providerType };
		this.replacementCandidates.set(providerKey, candidate);
		this.logger.debug('External secrets provider replacement started', {
			providerKey,
			providerType,
			phase: 'initialization',
		});

		if (outgoing) void this.disposeSupersededCandidate(outgoing, 'superseded');

		return candidate;
	}

	private async connectReplacement(
		candidate: ReplacementCandidate,
	): Promise<ProviderConnectResult> {
		const provider = candidate.provider;
		if (!provider) {
			return { success: true };
		}

		// A failed candidate is execution-visible in its error state between retries. Remove it
		// while the same mutable instance reconnects and hydrates off-registry.
		if (this.providerRegistry.get(candidate.providerKey) === provider) {
			this.providerRegistry.remove(candidate.providerKey);
		}

		const connectResult = await this.providerLifecycle.connect(provider);

		if (connectResult.success) {
			this.startReplacementHydration(candidate, provider);
			return { success: true };
		}

		const published = await this.publishRetryableFailure(
			candidate,
			connectResult.error ??
				new UnexpectedError(`Failed to connect provider ${candidate.providerKey}`),
			'connection',
		);

		return published ? connectResult : { success: true };
	}

	// Hydration is fire-and-forget: the caller's upsert resolves once hydration has started,
	// while the old provider stays active until the candidate settles in the background.
	private startReplacementHydration(
		candidate: ReplacementCandidate,
		provider: SecretsProvider,
	): void {
		// Retries hydration only, never the connection: doConnect() is not idempotent, e.g. the
		// Vault provider arms a token-refresh timer per connect that only disconnect() stops.
		void this.runIfCurrentWithRetry(
			candidate,
			'hydration',
			async () => await this.hydrateReplacement(candidate, provider),
		).catch((error: unknown) => {
			this.logger.error('Unexpected error settling external secrets provider replacement', {
				providerKey: candidate.providerKey,
				providerType: candidate.providerType,
				phase: 'hydration-settlement',
				error: ensureError(error),
			});
		});
	}

	/** Leaves an errored candidate in the slot, unlike connectReplacement(), so a later attempt
	 *  can serve from it; on a first failure it has nothing cached yet. */
	private async hydrateReplacement(
		candidate: ReplacementCandidate,
		provider: SecretsProvider,
	): Promise<ProviderConnectResult> {
		try {
			await provider.update();
		} catch (e) {
			const error = ensureError(e);
			const published = await this.publishRetryableFailure(candidate, error, 'hydration');
			return published ? { success: false, error } : { success: true };
		}

		await this.settleReplacement(candidate, {
			kind: 'ready',
			phase: 'hydration',
			provider,
		});
		return { success: true };
	}

	private async settleReplacement(
		candidate: ReplacementCandidate,
		outcome: ReplacementOutcome,
	): Promise<void> {
		// Initialization, connection and hydration all await slow calls; a newer upsert/remove may
		// have superseded this candidate in the meantime. Discard its outcome here, at the point
		// where a terminal outcome publishes to the registry.
		if (!this.isCurrentReplacement(candidate)) {
			await this.disposeSupersededCandidate(candidate, outcome.phase);
			return;
		}

		const existingProvider = this.providerRegistry.get(candidate.providerKey);
		const keepPredecessor =
			outcome.kind === 'failed' && this.isServingPredecessor(existingProvider, outcome.provider);

		// A 'disconnected' outcome deliberately evicts and disconnects a connected predecessor: the
		// operator turned the connection off, and the invariant only protects against failures.
		if (outcome.kind === 'ready') {
			// A failed earlier attempt marked this provider errored. It hydrated, so it serves
			// again — otherwise the periodic refresh would skip this slot forever.
			if (outcome.phase === 'hydration') {
				outcome.provider.setState('connected');
			}

			this.providerRegistry.set(candidate.providerKey, outcome.provider);
			this.logger.debug('External secrets provider replacement activated', {
				providerKey: candidate.providerKey,
				providerType: candidate.providerType,
				phase: outcome.phase,
			});
		} else {
			outcome.provider?.setState('error', outcome.error);

			if (keepPredecessor) {
				this.logger.error(
					'External secrets provider replacement failed; previous provider stays active',
					{
						providerKey: candidate.providerKey,
						providerType: candidate.providerType,
						phase: outcome.phase,
						error: outcome.error,
					},
				);
			} else {
				if (outcome.provider) {
					this.providerRegistry.set(candidate.providerKey, outcome.provider);
				} else {
					this.providerRegistry.remove(candidate.providerKey);
				}

				this.logger.error('External secrets provider replacement reached terminal failure', {
					providerKey: candidate.providerKey,
					providerType: candidate.providerType,
					phase: outcome.phase,
					error: outcome.error,
				});
			}
		}

		this.replacementCandidates.delete(candidate.providerKey);

		if (keepPredecessor) {
			await this.disposeSupersededCandidate(candidate, outcome.phase);
			return;
		}

		if (existingProvider && existingProvider !== outcome.provider) {
			await this.providerLifecycle.disconnect(existingProvider);
		}
	}

	/**
	 * Publishes a failed candidate to the registry so its error state is visible between retries,
	 * unless a still-connected predecessor occupies the slot — that one keeps serving secrets to
	 * executions during the retry window, so the candidate stays off-registry until it succeeds.
	 * Returns false when the candidate was superseded while in flight and was disposed instead.
	 * Callers must then report success, or runWithRetry() reschedules a retry that the superseding
	 * operation has already cancelled.
	 */
	private async publishRetryableFailure(
		candidate: ReplacementCandidate,
		error: Error,
		phase: 'connection' | 'hydration',
	): Promise<boolean> {
		if (!this.isCurrentReplacement(candidate) || !candidate.provider) {
			await this.disposeSupersededCandidate(candidate, phase);
			return false;
		}

		candidate.provider.setState('error', error);

		this.logger.error(
			phase === 'connection'
				? 'External secrets provider replacement connection attempt failed'
				: 'External secrets provider replacement hydration attempt failed',
			{
				providerKey: candidate.providerKey,
				providerType: candidate.providerType,
				phase,
				error,
			},
		);

		const existingProvider = this.providerRegistry.get(candidate.providerKey);

		if (this.isServingPredecessor(existingProvider, candidate.provider)) {
			return true;
		}

		this.providerRegistry.set(candidate.providerKey, candidate.provider);

		if (existingProvider && existingProvider !== candidate.provider) {
			await this.providerLifecycle.disconnect(existingProvider);
		}

		return true;
	}

	private async disposeSupersededCandidate(
		candidate: ReplacementCandidate,
		reason: string,
	): Promise<void> {
		const { provider, providerKey, providerType } = candidate;
		const shouldDispose =
			provider !== undefined && this.providerRegistry.get(providerKey) !== provider;

		this.logger.debug('External secrets provider replacement candidate discarded', {
			providerKey,
			providerType,
			reason,
			disposed: shouldDispose,
		});

		if (shouldDispose) {
			await this.providerLifecycle.disconnect(provider);
		}
	}

	private isCurrentReplacement(candidate: ReplacementCandidate): boolean {
		return this.replacementCandidates.get(candidate.providerKey) === candidate;
	}

	/** A predecessor still in the slot and connected is serving secrets to executions. */
	private isServingPredecessor(
		existing: SecretsProvider | undefined,
		candidateProvider: SecretsProvider | undefined,
	): boolean {
		return (
			existing !== undefined && existing !== candidateProvider && existing.state === 'connected'
		);
	}

	private async invalidateReplacement(providerKey: string): Promise<void> {
		const candidate = this.replacementCandidates.get(providerKey);
		this.replacementCandidates.delete(providerKey);

		// Retries are cancelled here because setup commonly produces several configurations before
		// settling on a valid one. A candidate waiting on a retry timer has nothing left to settle
		// it, so cancelling that timer would orphan its connected provider.
		this.retryManager.cancelRetry(providerKey);

		if (candidate) await this.disposeSupersededCandidate(candidate, 'invalidated');
	}

	private async connectProvider(providerKey: string): Promise<ProviderConnectResult> {
		const provider = this.providerRegistry.get(providerKey);
		if (!provider) {
			this.logger.warn(`Cannot connect provider ${providerKey}: not found in registry`);
			throw new Error(`Provider ${providerKey} not found in registry`);
		}

		return await this.providerLifecycle.connect(provider);
	}
}
