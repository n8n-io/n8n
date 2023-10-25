import type { TEntitlement, TFeatures, TLicenseBlock } from '@n8n_io/license-sdk';
import { LicenseManager } from '@n8n_io/license-sdk';
import type { ILogger } from 'n8n-workflow';
import { getLogger } from './Logger';
import config from '@/config';
import * as Db from '@/Db';
import {
	LICENSE_FEATURES,
	LICENSE_QUOTAS,
	N8N_VERSION,
	SETTINGS_LICENSE_CERT_KEY,
	UNLIMITED_LICENSE_QUOTA,
} from './constants';
import Container, { Service } from 'typedi';
import { WorkflowRepository } from '@/databases/repositories';
import type { BooleanLicenseFeature, N8nInstanceType, NumericLicenseFeature } from './Interfaces';
import type { RedisServicePubSubPublisher } from './services/redis/RedisServicePubSubPublisher';
import { RedisService } from './services/redis.service';
import { InstanceSettings, ObjectStoreService } from 'n8n-core';

type FeatureReturnType = Partial<
	{
		planName: string;
	} & { [K in NumericLicenseFeature]: number } & { [K in BooleanLicenseFeature]: boolean }
>;

@Service()
export class License {
	private logger: ILogger;

	private manager: LicenseManager | undefined;

	private redisPublisher: RedisServicePubSubPublisher;

	constructor(private readonly instanceSettings: InstanceSettings) {
		this.logger = getLogger();
	}

	async init(instanceType: N8nInstanceType = 'main') {
		if (this.manager) {
			return;
		}

		const isMainInstance = instanceType === 'main';
		const server = config.getEnv('license.serverUrl');
		const autoRenewEnabled = isMainInstance && config.getEnv('license.autoRenewEnabled');
		const offlineMode = !isMainInstance;
		const autoRenewOffset = config.getEnv('license.autoRenewOffset');
		const saveCertStr = isMainInstance
			? async (value: TLicenseBlock) => this.saveCertStr(value)
			: async () => {};
		const onFeatureChange = isMainInstance
			? async (features: TFeatures) => this.onFeatureChange(features)
			: async () => {};
		const collectUsageMetrics = isMainInstance
			? async () => this.collectUsageMetrics()
			: async () => [];

		try {
			this.manager = new LicenseManager({
				server,
				tenantId: config.getEnv('license.tenantId'),
				productIdentifier: `n8n-${N8N_VERSION}`,
				autoRenewEnabled,
				renewOnInit: autoRenewEnabled,
				autoRenewOffset,
				offlineMode,
				logger: this.logger,
				loadCertStr: async () => this.loadCertStr(),
				saveCertStr,
				deviceFingerprint: () => this.instanceSettings.instanceId,
				collectUsageMetrics,
				onFeatureChange,
			});

			await this.manager.initialize();
		} catch (e: unknown) {
			if (e instanceof Error) {
				this.logger.error('Could not initialize license manager sdk', e);
			}
		}
	}

	async collectUsageMetrics() {
		return [
			{
				name: 'activeWorkflows',
				value: await Container.get(WorkflowRepository).count({ where: { active: true } }),
			},
		];
	}

	async loadCertStr(): Promise<TLicenseBlock> {
		// if we have an ephemeral license, we don't want to load it from the database
		const ephemeralLicense = config.get('license.cert');
		if (ephemeralLicense) {
			return ephemeralLicense;
		}
		const databaseSettings = await Db.collections.Settings.findOne({
			where: {
				key: SETTINGS_LICENSE_CERT_KEY,
			},
		});

		return databaseSettings?.value ?? '';
	}

	async onFeatureChange(_features: TFeatures): Promise<void> {
		if (config.getEnv('executions.mode') === 'queue') {
			if (!this.redisPublisher) {
				this.logger.debug('Initializing Redis publisher for License Service');
				this.redisPublisher = await Container.get(RedisService).getPubSubPublisher();
			}
			await this.redisPublisher.publishToCommandChannel({
				command: 'reloadLicense',
			});
		}

		const isS3Selected = config.getEnv('binaryDataManager.mode') === 's3';
		const isS3Available = config.getEnv('binaryDataManager.availableModes').includes('s3');
		const isS3Licensed = _features['feat:binaryDataS3'];

		if (isS3Selected && isS3Available && !isS3Licensed) {
			this.logger.debug(
				'License changed with no support for external storage - blocking writes on object store. To restore writes, please upgrade to a license that supports this feature.',
			);

			Container.get(ObjectStoreService).setReadonly(true);
		}
	}

	async saveCertStr(value: TLicenseBlock): Promise<void> {
		// if we have an ephemeral license, we don't want to save it to the database
		if (config.get('license.cert')) return;
		await Db.collections.Settings.upsert(
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
	}

	async reload(): Promise<void> {
		if (!this.manager) {
			return;
		}
		this.logger.debug('Reloading license');
		await this.manager.reload();
	}

	async renew() {
		if (!this.manager) {
			return;
		}

		await this.manager.renew();
	}

	async shutdown() {
		if (!this.manager) {
			return;
		}

		await this.manager.shutdown();
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

	isAdvancedExecutionFiltersEnabled() {
		return this.isFeatureEnabled(LICENSE_FEATURES.ADVANCED_EXECUTION_FILTERS);
	}

	isDebugInEditorLicensed() {
		return this.isFeatureEnabled(LICENSE_FEATURES.DEBUG_IN_EDITOR);
	}

	isBinaryDataS3Licensed() {
		return this.isFeatureEnabled(LICENSE_FEATURES.BINARY_DATA_S3);
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
	 * Helper function to get the main plan for a license
	 */
	getMainPlan(): TEntitlement | undefined {
		if (!this.manager) {
			return undefined;
		}

		const entitlements = this.getCurrentEntitlements();
		if (!entitlements.length) {
			return undefined;
		}

		return entitlements.find(
			(entitlement) => (entitlement.productMetadata?.terms as { isMainPlan?: boolean })?.isMainPlan,
		);
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

	getWorkflowHistoryPruneLimit() {
		return (
			this.getFeatureValue(LICENSE_QUOTAS.WORKFLOW_HISTORY_PRUNE_LIMIT) ?? UNLIMITED_LICENSE_QUOTA
		);
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
}
