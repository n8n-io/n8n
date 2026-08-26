import {
	deriveInstanceAiSetupState,
	INSTANCE_AI_SEARCH_CREDENTIAL_TYPES,
	type InstanceAiAdminSettingsResponse,
	type InstanceAiComponentSource,
	type InstanceAiWebSearchSource,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { InstanceAiConfig, DeploymentConfig } from '@n8n/config';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { TELEMETRY_EVENT, type InferTelemetryProps } from '@n8n/telemetry';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import { InstanceCredentialBroker } from '@/credentials/instance-credential-broker';
import type { InstanceCredentialUse } from '@/credentials/instance-credential-broker';
import { EventService } from '@/events/event.service';
import { Telemetry } from '@/telemetry';

import {
	CREDENTIAL_TO_MODEL_PROVIDER,
	INSTANCE_AI_MODEL_CREDENTIAL_POLICY,
	INSTANCE_AI_SEARCH_CREDENTIAL_POLICY,
	InstanceAiSettingsService,
	type AdminCredentialSelection,
} from './instance-ai-settings.service';

/** Never cleared — the one-time claim guarding the "AI Assistant setup completed" telemetry. */
const SETUP_COMPLETED_KEY = 'instanceAi.setupCompletedAt';

type SetupSnapshot = InferTelemetryProps<
	typeof TELEMETRY_EVENT.INSTANCE_AI.AI_ASSISTANT_SETUP_COMPLETED
>;

const CREDENTIAL_TO_SEARCH_PROVIDER: Record<string, 'brave' | 'searxng'> = {
	braveSearchApi: 'brave',
	searXngApi: 'searxng',
} satisfies Record<(typeof INSTANCE_AI_SEARCH_CREDENTIAL_TYPES)[number], 'brave' | 'searxng'>;

function extractModelName(model: string): string {
	const slash = model.indexOf('/');
	return slash >= 0 ? model.slice(slash + 1) : model;
}

/**
 * Reports the AI Assistant setup funnel: which components an admin configured
 * through the UI, and the once-per-instance setup completion. Listens to
 * `instance-ai-settings-updated` so the settings service stays free of
 * telemetry concerns; saves that carry no credential selections (e.g.
 * multi-main reloads) are ignored. Never throws into its callers: telemetry
 * must not fail a settings save or module init.
 */
@Service()
export class InstanceAiSetupTelemetryService {
	private readonly config: InstanceAiConfig;

	private readonly deploymentConfig: DeploymentConfig;

	/** In-memory fast path once the persisted setup-completed claim is settled. */
	private setupCompletionRecorded = false;

	constructor(
		private readonly logger: Logger,
		globalConfig: GlobalConfig,
		eventService: EventService,
		private readonly telemetry: Telemetry,
		private readonly settingsRepository: SettingsRepository,
		private readonly instanceCredentialBroker: InstanceCredentialBroker,
		private readonly settingsService: InstanceAiSettingsService,
	) {
		this.logger = this.logger.scoped('instance-ai');
		this.config = globalConfig.instanceAi;
		this.deploymentConfig = globalConfig.deployment;

		eventService.on('instance-ai-settings-updated', ({ credentialSelections }) => {
			if (!credentialSelections) return;
			void this.reportSetupChanges(
				credentialSelections.previous,
				credentialSelections.next,
				credentialSelections.connectionsUpdated,
			);
		});
	}

	/** Managed deployments (cloud, proxy) have nothing to set up, so they never report. */
	private isDirectSelfManaged(): boolean {
		return this.deploymentConfig.type !== 'cloud' && !this.settingsService.isProxyEnabled();
	}

	private async providerForCredential(
		policy: InstanceCredentialUse,
		providerByType: Record<string, string>,
		credentialId: string | null,
	): Promise<string | null> {
		if (!credentialId) return null;
		const credentials = await this.instanceCredentialBroker.listForUse(policy);
		const type = credentials.find((credential) => credential.id === credentialId)?.type;
		return type ? (providerByType[type] ?? null) : null;
	}

	private async modelProviderForCredential(credentialId: string | null): Promise<string | null> {
		return await this.providerForCredential(
			INSTANCE_AI_MODEL_CREDENTIAL_POLICY,
			CREDENTIAL_TO_MODEL_PROVIDER,
			credentialId,
		);
	}

	private async searchProviderForCredential(
		credentialId: string | null,
	): Promise<'brave' | 'searxng' | null> {
		const provider = await this.providerForCredential(
			INSTANCE_AI_SEARCH_CREDENTIAL_POLICY,
			CREDENTIAL_TO_SEARCH_PROVIDER,
			credentialId,
		);
		return provider === 'brave' || provider === 'searxng' ? provider : null;
	}

	private sandboxTypeOf(selection: AdminCredentialSelection): 'daytona' | 'n8n-sandbox' | null {
		if (selection.daytonaCredentialId) return 'daytona';
		if (selection.n8nSandboxCredentialId) return 'n8n-sandbox';
		return null;
	}

	private async modelSnapshot(
		response: InstanceAiAdminSettingsResponse,
		source: InstanceAiComponentSource,
	): Promise<Pick<SetupSnapshot, 'model_source' | 'model_provider' | 'model_name'>> {
		if (source === 'env') {
			return {
				model_source: 'env',
				model_provider: this.config.model.split('/', 1)[0] || null,
				model_name: extractModelName(this.config.model) || null,
			};
		}
		if (source === 'ui') {
			return {
				model_source: 'ui',
				model_provider: await this.modelProviderForCredential(response.modelCredentialId),
				model_name: response.modelName,
			};
		}
		return { model_source: 'none', model_provider: null, model_name: null };
	}

	private async searchSnapshot(
		response: InstanceAiAdminSettingsResponse,
		source: InstanceAiWebSearchSource,
	): Promise<Pick<SetupSnapshot, 'web_search_source' | 'web_search_provider'>> {
		if (source === 'ui') {
			return {
				web_search_source: 'ui',
				web_search_provider: await this.searchProviderForCredential(response.searchCredentialId),
			};
		}
		if (source === 'env') {
			const provider = this.config.braveSearchApiKey.trim()
				? 'brave'
				: this.config.searxngUrl.trim()
					? 'searxng'
					: null;
			return { web_search_source: 'env', web_search_provider: provider };
		}
		return { web_search_source: source, web_search_provider: null };
	}

	/**
	 * Configuration state of each setup component, shared by the setup telemetry
	 * events. Sources come from `deriveInstanceAiSetupState` — the same
	 * derivation the setup gate and the frontend use — enriched with provider
	 * names the response deliberately does not carry.
	 */
	async buildSetupSnapshot(): Promise<SetupSnapshot> {
		const response = await this.settingsService.getAdminSettings();
		const state = deriveInstanceAiSetupState(response);
		return {
			...(await this.modelSnapshot(response, state.modelSource)),
			sandbox_source: state.sandboxSource,
			sandbox_type: state.sandboxType,
			...(await this.searchSnapshot(response, state.webSearchSource)),
		};
	}

	private async emitModelConfigured(
		previous: AdminCredentialSelection,
		next: AdminCredentialSelection,
		connectionUpdated: boolean,
	): Promise<void> {
		const changed =
			connectionUpdated ||
			previous.modelCredentialId !== next.modelCredentialId ||
			previous.modelName !== next.modelName;
		if (!changed || !next.modelCredentialId || !next.modelName) return;
		const [provider, previousProvider] = await Promise.all([
			this.modelProviderForCredential(next.modelCredentialId),
			this.modelProviderForCredential(previous.modelCredentialId),
		]);
		const hadModel = Boolean(previous.modelCredentialId && previous.modelName);
		this.telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_CONFIGURED_AI_ASSISTANT_MODEL, {
			provider: provider ?? 'unknown',
			model: next.modelName,
			...(hadModel && previousProvider ? { previous_provider: previousProvider } : {}),
			...(hadModel && previous.modelName ? { previous_model: previous.modelName } : {}),
		});
	}

	private emitSandboxConfigured(
		previous: AdminCredentialSelection,
		next: AdminCredentialSelection,
		connectionUpdated: boolean,
	): void {
		const changed =
			connectionUpdated ||
			previous.daytonaCredentialId !== next.daytonaCredentialId ||
			previous.n8nSandboxCredentialId !== next.n8nSandboxCredentialId;
		const nextSandboxType = this.sandboxTypeOf(next);
		if (!changed || !nextSandboxType) return;
		const previousSandboxType = this.sandboxTypeOf(previous);
		this.telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_CONFIGURED_AI_ASSISTANT_SANDBOX, {
			sandbox_type: nextSandboxType,
			...(previousSandboxType ? { previous_sandbox_type: previousSandboxType } : {}),
		});
	}

	private async emitSearchConfigured(
		previous: AdminCredentialSelection,
		next: AdminCredentialSelection,
		connectionUpdated: boolean,
	): Promise<void> {
		const changed = connectionUpdated || previous.searchCredentialId !== next.searchCredentialId;
		if (!changed || !next.searchCredentialId) return;
		const [provider, previousProvider] = await Promise.all([
			this.searchProviderForCredential(next.searchCredentialId),
			this.searchProviderForCredential(previous.searchCredentialId),
		]);
		if (!provider) return;
		this.telemetry.track(TELEMETRY_EVENT.INSTANCE_AI.USER_CONFIGURED_AI_ASSISTANT_WEB_SEARCH, {
			provider,
			...(previousProvider ? { previous_provider: previousProvider } : {}),
		});
	}

	/**
	 * Reports UI-driven setup changes after a successful settings save. Compares
	 * the credential selection before and after the save, so a save that changed
	 * nothing emits nothing.
	 */
	async reportSetupChanges(
		previous: AdminCredentialSelection,
		next: AdminCredentialSelection,
		connectionsUpdated: { model: boolean; sandbox: boolean; search: boolean } = {
			model: false,
			sandbox: false,
			search: false,
		},
	): Promise<void> {
		if (!this.isDirectSelfManaged()) return;
		try {
			await this.emitModelConfigured(previous, next, connectionsUpdated.model);
			this.emitSandboxConfigured(previous, next, connectionsUpdated.sandbox);
			await this.emitSearchConfigured(previous, next, connectionsUpdated.search);
		} catch (error) {
			this.logger.warn('Failed to report AI Assistant setup telemetry', {
				error: ensureError(error).message,
			});
		}
		await this.recordSetupCompletedIfNeeded();
	}

	/**
	 * Emits "AI Assistant setup completed" the first time the setup predicate
	 * holds, whether the last piece was saved in the UI or landed via env vars
	 * (hence also called on module init). The persisted claim makes it fire at
	 * most once per instance, across processes and multi-main setups.
	 */
	async recordSetupCompletedIfNeeded(): Promise<void> {
		if (!this.isDirectSelfManaged() || this.setupCompletionRecorded) return;
		try {
			if (!(await this.settingsService.isSetupCompleted())) return;
			const existing = await this.settingsRepository.findByKey(SETUP_COMPLETED_KEY);
			if (existing?.value) {
				this.setupCompletionRecorded = true;
				return;
			}
			const claimed = await this.settingsRepository.claimKey(
				SETUP_COMPLETED_KEY,
				new Date().toISOString(),
			);
			this.setupCompletionRecorded = true;
			if (!claimed) return;
			this.telemetry.track(
				TELEMETRY_EVENT.INSTANCE_AI.AI_ASSISTANT_SETUP_COMPLETED,
				await this.buildSetupSnapshot(),
			);
		} catch (error) {
			this.logger.warn('Failed to record AI Assistant setup completion', {
				error: ensureError(error).message,
			});
		}
	}
}
