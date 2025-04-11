import { GlobalConfig } from '@n8n/config';
import { Container, Service } from '@n8n/di';
import type { TEntitlement, TFeatures, TLicenseBlock } from '@n8n_io/license-sdk';
import { LicenseManager } from '@n8n_io/license-sdk';
import { InstanceSettings, Logger } from 'n8n-core';

import config from '@/config';
import { SettingsRepository } from '@/databases/repositories/settings.repository';
import { OnShutdown } from '@/decorators/on-shutdown';
import { LicenseMetricsService } from '@/metrics/license-metrics.service';

import {
	LICENSE_FEATURES,
	LICENSE_QUOTAS,
	N8N_VERSION,
	SETTINGS_LICENSE_CERT_KEY,
	Time,
	UNLIMITED_LICENSE_QUOTA,
} from './constants';
import type { BooleanLicenseFeature, NumericLicenseFeature } from './interfaces';

const LICENSE_RENEWAL_DISABLED_WARNING =
	'Automatic license renewal is disabled. The license will not renew automatically, and access to licensed features may be lost!';

export type FeatureReturnType = Partial<
	{
		planName: string;
	} & { [K in NumericLicenseFeature]: number } & { [K in BooleanLicenseFeature]: boolean }
>;

@Service()
export class License {
	private manager: LicenseManager | undefined;

	private isShuttingDown = false;

	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly settingsRepository: SettingsRepository,
		private readonly licenseMetricsService: LicenseMetricsService,
		private readonly globalConfig: GlobalConfig,
	) {
		this.logger = this.logger.scoped('license');
	}

	async init({
		forceRecreate = false,
		isCli = false,
	}: { forceRecreate?: boolean; isCli?: boolean } = {}) {
		if (this.manager && !forceRecreate) {
			this.logger.warn('License manager already initialized or shutting down');
			return;
		}
		if (this.isShuttingDown) {
			this.logger.warn('License manager already shutting down');
			return;
		}

		const { instanceType } = this.instanceSettings;
		const isMainInstance = instanceType === 'main';
		const server = this.globalConfig.license.serverUrl;
		const offlineMode = !isMainInstance;
		const autoRenewOffset = 72 * Time.hours.toSeconds;
		const saveCertStr = isMainInstance
			? async (value: TLicenseBlock) => await this.saveCertStr(value)
			: async () => {};
		const onFeatureChange = isMainInstance
			? async (features: TFeatures) => await this.onFeatureChange(features)
			: async () => {};
		const collectUsageMetrics = isMainInstance
			? async () => await this.licenseMetricsService.collectUsageMetrics()
			: async () => [];
		const collectPassthroughData = isMainInstance
			? async () => await this.licenseMetricsService.collectPassthroughData()
			: async () => ({});

		const { isLeader } = this.instanceSettings;
		const { autoRenewalEnabled } = this.globalConfig.license;
		const eligibleToRenew = isCli || isLeader;

		const shouldRenew = eligibleToRenew && autoRenewalEnabled;

		if (eligibleToRenew && !autoRenewalEnabled) {
			this.logger.warn(LICENSE_RENEWAL_DISABLED_WARNING);
		}

		try {
			this.manager = new LicenseManager({
				server,
				tenantId: this.globalConfig.license.tenantId,
				productIdentifier: `n8n-${N8N_VERSION}`,
				autoRenewEnabled: shouldRenew,
				renewOnInit: shouldRenew,
				autoRenewOffset,
				detachFloatingOnShutdown: this.globalConfig.license.detachFloatingOnShutdown,
				offlineMode,
				logger: this.logger,
				loadCertStr: async () => await this.loadCertStr(),
				saveCertStr,
				deviceFingerprint: () => this.instanceSettings.instanceId,
				collectUsageMetrics,
				collectPassthroughData,
				onFeatureChange,
			});

			await this.manager.initialize();

			const features = this.manager.getFeatures();
			this.checkIsLicensedForMultiMain(features);

			this.logger.debug('License initialized');
		} catch (error: unknown) {
			if (error instanceof Error) {
				this.logger.error('Could not initialize license manager sdk', { error });
			}
		}
	}

	async loadCertStr(): Promise<TLicenseBlock> {
		// if we have an ephemeral license, we don't want to load it from the database
		const ephemeralLicense = this.globalConfig.license.cert;
		if (ephemeralLicense) {
			return ephemeralLicense;
		}
		const databaseSettings = await this.settingsRepository.findOne({
			where: {
				key: SETTINGS_LICENSE_CERT_KEY,
			},
		});

		return databaseSettings?.value ?? '';
	}

	async onFeatureChange(_features: TFeatures): Promise<void> {
		const { isMultiMain, isLeader } = this.instanceSettings;

		if (Object.keys(_features).length === 0) {
			this.logger.error('Empty license features recieved', { isMultiMain, isLeader });
			return;
		}

		this.logger.debug('License feature change detected', _features);

		this.checkIsLicensedForMultiMain(_features);

		if (isMultiMain && !isLeader) {
			this.logger
				.scoped(['scaling', 'multi-main-setup', 'license'])
				.debug('Instance is not leader, skipping sending of "reload-license" command...');
			return;
		}

		if (config.getEnv('executions.mode') === 'queue') {
			const { Publisher } = await import('@/scaling/pubsub/publisher.service');
			await Container.get(Publisher).publishCommand({ command: 'reload-license' });
		}
	}

	async saveCertStr(value: TLicenseBlock): Promise<void> {
		// if we have an ephemeral license, we don't want to save it to the database
		if (this.globalConfig.license.cert) return;
		await this.settingsRepository.upsert(
			{
				key: SETTINGS_LICENSE_CERT_KEY,
				value,
				loadOnStartup: false,
			},
			['key'],
		);
	}

	async activate(activationKey: string): Promise<void> {
		if (!this.manager) {
			return;
		}

		await this.manager.activate(activationKey);
		this.logger.debug('License activated');
	}

	async reload(): Promise<void> {
		if (!this.manager) {
			return;
		}
		await this.manager.reload();
		this.logger.debug('License reloaded');
	}

	async renew() {
		if (!this.manager) {
			return;
		}

		await this.manager.renew();
		this.logger.debug('License renewed');
	}

	async clear() {
		if (!this.manager) {
			return;
		}

		await this.manager.clear();
		this.logger.info('License cleared');
	}

	@OnShutdown()
	async shutdown() {
		// Shut down License manager to unclaim any floating entitlements
		// Note: While this saves a new license cert to DB, the previous entitlements are still kept in memory so that the shutdown process can complete
		this.isShuttingDown = true;

		if (!this.manager) {
			return;
		}

		await this.manager.shutdown();
		this.logger.debug('License shut down');
	}

	isFeatureEnabled(feature: BooleanLicenseFeature) {
		return this.manager?.hasFeatureEnabled(feature) ?? false;
	}

	isSharingEnabled() {
		return this.isFeatureEnabled(LICENSE_FEATURES.SHARING);
	}

	isLogStreamingEnabled() {
		return this.isFeatureEnabled(LICENSE_FEATURES.LOG_STREAMING);
	}

	isLdapEnabled() {
		return this.isFeatureEnabled(LICENSE_FEATURES.LDAP);
	}

	isSamlEnabled() {
		return this.isFeatureEnabled(LICENSE_FEATURES.SAML);
	}

	isApiKeyScopesEnabled() {
		return this.isFeatureEnabled(LICENSE_FEATURES.API_KEY_SCOPES);
	}

	isAiAssistantEnabled() {
		return this.isFeatureEnabled(LICENSE_FEATURES.AI_ASSISTANT);
	}

	isAskAiEnabled() {
		return this.isFeatureEnabled(LICENSE_FEATURES.ASK_AI);
	}

	isAiCreditsEnabled() {
		return this.isFeatureEnabled(LICENSE_FEATURES.AI_CREDITS);
	}

	isAdvancedExecutionFiltersEnabled() {
		return this.isFeatureEnabled(LICENSE_FEATURES.ADVANCED_EXECUTION_FILTERS);
	}

	isAdvancedPermissionsLicensed() {
		return this.isFeatureEnabled(LICENSE_FEATURES.ADVANCED_PERMISSIONS);
	}

	isDebugInEditorLicensed() {
		return this.isFeatureEnabled(LICENSE_FEATURES.DEBUG_IN_EDITOR);
	}

	isBinaryDataS3Licensed() {
		return this.isFeatureEnabled(LICENSE_FEATURES.BINARY_DATA_S3);
	}

	isMultiMainLicensed() {
		return this.isFeatureEnabled(LICENSE_FEATURES.MULTIPLE_MAIN_INSTANCES);
	}

	isVariablesEnabled() {
		return this.isFeatureEnabled(LICENSE_FEATURES.VARIABLES);
	}

	isSourceControlLicensed() {
		return this.isFeatureEnabled(LICENSE_FEATURES.SOURCE_CONTROL);
	}

	isExternalSecretsEnabled() {
		return this.isFeatureEnabled(LICENSE_FEATURES.EXTERNAL_SECRETS);
	}

	isWorkflowHistoryLicensed() {
		return this.isFeatureEnabled(LICENSE_FEATURES.WORKFLOW_HISTORY);
	}

	isAPIDisabled() {
		return this.isFeatureEnabled(LICENSE_FEATURES.API_DISABLED);
	}

	isWorkerViewLicensed() {
		return this.isFeatureEnabled(LICENSE_FEATURES.WORKER_VIEW);
	}

	isProjectRoleAdminLicensed() {
		return this.isFeatureEnabled(LICENSE_FEATURES.PROJECT_ROLE_ADMIN);
	}

	isProjectRoleEditorLicensed() {
		return this.isFeatureEnabled(LICENSE_FEATURES.PROJECT_ROLE_EDITOR);
	}

	isProjectRoleViewerLicensed() {
		return this.isFeatureEnabled(LICENSE_FEATURES.PROJECT_ROLE_VIEWER);
	}

	isCustomNpmRegistryEnabled() {
		return this.isFeatureEnabled(LICENSE_FEATURES.COMMUNITY_NODES_CUSTOM_REGISTRY);
	}

	isFoldersEnabled() {
		return this.isFeatureEnabled(LICENSE_FEATURES.FOLDERS);
	}

	isInsightsSummaryEnabled() {
		return this.isFeatureEnabled(LICENSE_FEATURES.INSIGHTS_VIEW_SUMMARY);
	}

	isInsightsDashboardEnabled() {
		return this.isFeatureEnabled(LICENSE_FEATURES.INSIGHTS_VIEW_DASHBOARD);
	}

	isInsightsHourlyDataEnabled() {
		return this.getFeatureValue(LICENSE_FEATURES.INSIGHTS_VIEW_HOURLY_DATA);
	}

	getCurrentEntitlements() {
		return this.manager?.getCurrentEntitlements() ?? [];
	}

	getFeatureValue<T extends keyof FeatureReturnType>(feature: T): FeatureReturnType[T] {
		return this.manager?.getFeatureValue(feature) as FeatureReturnType[T];
	}

	getManagementJwt(): string {
		if (!this.manager) {
			return '';
		}
		return this.manager.getManagementJwt();
	}

	/**
	 * Helper function to get the latest main plan for a license
	 */
	getMainPlan(): TEntitlement | undefined {
		if (!this.manager) {
			return undefined;
		}

		const entitlements = this.getCurrentEntitlements();
		if (!entitlements.length) {
			return undefined;
		}

		entitlements.sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime());

		return entitlements.find(
			(entitlement) => (entitlement.productMetadata?.terms as { isMainPlan?: boolean })?.isMainPlan,
		);
	}

	getConsumerId() {
		return this.manager?.getConsumerId() ?? 'unknown';
	}

	// Helper functions for computed data
	getUsersLimit() {
		return this.getFeatureValue(LICENSE_QUOTAS.USERS_LIMIT) ?? UNLIMITED_LICENSE_QUOTA;
	}

	getTriggerLimit() {
		return this.getFeatureValue(LICENSE_QUOTAS.TRIGGER_LIMIT) ?? UNLIMITED_LICENSE_QUOTA;
	}

	getVariablesLimit() {
		return this.getFeatureValue(LICENSE_QUOTAS.VARIABLES_LIMIT) ?? UNLIMITED_LICENSE_QUOTA;
	}

	getAiCredits() {
		return this.getFeatureValue(LICENSE_QUOTAS.AI_CREDITS) ?? 0;
	}

	getWorkflowHistoryPruneLimit() {
		return (
			this.getFeatureValue(LICENSE_QUOTAS.WORKFLOW_HISTORY_PRUNE_LIMIT) ?? UNLIMITED_LICENSE_QUOTA
		);
	}

	getInsightsMaxHistory() {
		return this.getFeatureValue(LICENSE_QUOTAS.INSIGHTS_MAX_HISTORY_DAYS) ?? 7;
	}

	getInsightsRetentionMaxAge() {
		return this.getFeatureValue(LICENSE_QUOTAS.INSIGHTS_RETENTION_MAX_AGE_DAYS) ?? 180;
	}

	getInsightsRetentionPruneInterval() {
		return this.getFeatureValue(LICENSE_QUOTAS.INSIGHTS_RETENTION_PRUNE_INTERVAL_DAYS) ?? 24;
	}

	getTeamProjectLimit() {
		return this.getFeatureValue(LICENSE_QUOTAS.TEAM_PROJECT_LIMIT) ?? 0;
	}

	getPlanName(): string {
		return this.getFeatureValue('planName') ?? 'Community';
	}

	getInfo(): string {
		if (!this.manager) {
			return 'n/a';
		}

		return this.manager.toString();
	}

	isWithinUsersLimit() {
		return this.getUsersLimit() === UNLIMITED_LICENSE_QUOTA;
	}

	/**
	 * Ensures that the instance is licensed for multi-main setup if multi-main mode is enabled
	 */
	private checkIsLicensedForMultiMain(features: TFeatures) {
		const isMultiMainEnabled =
			config.getEnv('executions.mode') === 'queue' && this.globalConfig.multiMainSetup.enabled;
		if (!isMultiMainEnabled) {
			return;
		}

		const isMultiMainLicensed =
			(features[LICENSE_FEATURES.MULTIPLE_MAIN_INSTANCES] as boolean | undefined) ?? false;

		this.instanceSettings.setMultiMainLicensed(isMultiMainLicensed);

		if (!isMultiMainLicensed) {
			this.logger
				.scoped(['scaling', 'multi-main-setup', 'license'])
				.debug(
					'License changed with no support for multi-main setup - no new followers will be allowed to init. To restore multi-main setup, please upgrade to a license that supports this feature.',
				);
		}
	}

	enableAutoRenewals() {
		this.manager?.enableAutoRenewals();
	}

	disableAutoRenewals() {
		this.manager?.disableAutoRenewals();
	}
}
