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
			phase: 'initialization' | 'hydration';
			provider?: SecretsProvider;
			error: Error;
	  };

const COMPLETED_CONNECTION = {
	completion: Promise.resolve(),
} satisfies PreparedProviderConnection;

@Service()
export class ExternalSecretsProviderConnectionManager {
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
		this.replacementCandidates.clear();
		this.retryManager.cancelAll();
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
		this.invalidateReplacement(providerKey);

		// Cancelling retries is needed because setup commonly produces several configurations
		// before settling on a valid one.
		this.retryManager.cancelRetry(providerKey);

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
		this.invalidateReplacement(providerKey);
		this.retryManager.cancelRetry(providerKey);

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

		// initialize() can take a while; a superseded candidate must not enter the retry loop,
		// because runWithRetry() would cancel the retries of the replacement that superseded it.
		if (!this.isCurrentReplacement(candidate)) {
			await this.disposeSupersededCandidate(candidate, 'initialization');
			return;
		}

		await this.retryManager.runWithRetry(
			providerKey,
			async () => await this.connectReplacement(candidate),
		);
	}

	private beginReplacement(providerKey: string, providerType: string): ReplacementCandidate {
		const candidate: ReplacementCandidate = { providerKey, providerType };

		this.replacementCandidates.set(providerKey, candidate);
		this.retryManager.cancelRetry(providerKey);
		this.logger.debug('External secrets provider replacement started', {
			providerKey,
			providerType,
			phase: 'initialization',
		});

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

		const published = await this.publishRetryableConnectionFailure(
			candidate,
			connectResult.error ??
				new UnexpectedError(`Failed to connect provider ${candidate.providerKey}`),
		);

		// A superseded candidate must not report failure: that would re-schedule a retry the
		// superseding operation has already cancelled.
		return published ? connectResult : { success: true };
	}

	// Hydration is fire-and-forget: the caller's upsert resolves once hydration has started,
	// while the old provider stays active until the candidate settles in the background.
	private startReplacementHydration(
		candidate: ReplacementCandidate,
		provider: SecretsProvider,
	): void {
		void this.runReplacementHydration(candidate, provider).catch((error: unknown) => {
			this.logger.error('Unexpected error settling external secrets provider replacement', {
				providerKey: candidate.providerKey,
				providerType: candidate.providerType,
				phase: 'hydration-settlement',
				error: ensureError(error),
			});
		});
	}

	private async runReplacementHydration(
		candidate: ReplacementCandidate,
		provider: SecretsProvider,
	): Promise<void> {
		try {
			await provider.update();
		} catch (error) {
			await this.settleReplacement(candidate, {
				kind: 'failed',
				phase: 'hydration',
				provider,
				error: ensureError(error),
			});
			return;
		}

		await this.settleReplacement(candidate, {
			kind: 'ready',
			phase: 'hydration',
			provider,
		});
	}

	private async settleReplacement(
		candidate: ReplacementCandidate,
		outcome: ReplacementOutcome,
	): Promise<void> {
		// Initialization, connection and hydration all await slow calls; a newer upsert/remove may
		// have superseded this candidate in the meantime. Discard its outcome here, at the single
		// point where replacements publish to the registry.
		if (!this.isCurrentReplacement(candidate)) {
			await this.disposeSupersededCandidate(candidate, outcome.phase);
			return;
		}

		const existingProvider = this.providerRegistry.get(candidate.providerKey);

		if (outcome.kind === 'ready') {
			this.providerRegistry.set(candidate.providerKey, outcome.provider);
			this.logger.debug('External secrets provider replacement activated', {
				providerKey: candidate.providerKey,
				providerType: candidate.providerType,
				phase: outcome.phase,
			});
		} else {
			outcome.provider?.setState('error', outcome.error);
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

		this.replacementCandidates.delete(candidate.providerKey);

		if (existingProvider && existingProvider !== outcome.provider) {
			await this.providerLifecycle.disconnect(existingProvider);
		}
	}

	/**
	 * Publishes a failed candidate to the registry so its error state is visible between retries,
	 * unless a still-connected predecessor occupies the slot — that one keeps serving secrets to
	 * executions during the retry window, so the candidate stays off-registry until it succeeds.
	 * Returns false when the candidate was superseded while connecting and was disposed instead.
	 */
	private async publishRetryableConnectionFailure(
		candidate: ReplacementCandidate,
		error: Error,
	): Promise<boolean> {
		if (!this.isCurrentReplacement(candidate) || !candidate.provider) {
			await this.disposeSupersededCandidate(candidate, 'connection');
			return false;
		}

		candidate.provider.setState('error', error);

		this.logger.error('External secrets provider replacement connection attempt failed', {
			providerKey: candidate.providerKey,
			providerType: candidate.providerType,
			phase: 'connection',
			error,
		});

		const existingProvider = this.providerRegistry.get(candidate.providerKey);
		const hasConnectedPredecessor =
			existingProvider !== undefined &&
			existingProvider !== candidate.provider &&
			existingProvider.state === 'connected';

		if (hasConnectedPredecessor) {
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
		phase: string,
	): Promise<void> {
		const { provider, providerKey, providerType } = candidate;
		const shouldDispose =
			provider !== undefined && this.providerRegistry.get(providerKey) !== provider;

		this.logger.debug('External secrets provider superseded replacement discarded', {
			providerKey,
			providerType,
			phase,
			disposed: shouldDispose,
		});

		if (shouldDispose) {
			await this.providerLifecycle.disconnect(provider);
		}
	}

	private isCurrentReplacement(candidate: ReplacementCandidate): boolean {
		return this.replacementCandidates.get(candidate.providerKey) === candidate;
	}

	private invalidateReplacement(providerKey: string): void {
		this.replacementCandidates.delete(providerKey);
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
