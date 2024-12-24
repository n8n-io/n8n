import { Service } from 'typedi';
import { LICENSE_FEATURES, UNLIMITED_LICENSE_QUOTA } from './constants';
import type { BooleanLicenseFeature, NumericLicenseFeature } from './interfaces';
import type { Logger } from 'n8n-workflow';
import type { InstanceSettings } from 'n8n-core';
import type { GlobalConfig } from '@n8n/config';

export type FeatureReturnType = Partial<
	{
		planName: string;
	} & { [K in NumericLicenseFeature]: number } & { [K in BooleanLicenseFeature]: boolean }
>;

type MainPlan = {
	id: string;
	name: string;
	productId: string;
	productMetadata: Record<string, any>;
	features: Record<string, any>;
	featureOverrides: Record<string, any>;
	validFrom: Date;
	validTo: Date;
	isFloatable: boolean;
};

type Entitlements = {
	planId: string;
	planName: string;
};

@Service()
export class License {
	constructor(
		_logger: Logger,
		_instanceSettings: InstanceSettings,
		_licenseManager: any,
		_eventBus: any,
		_config: GlobalConfig,
	) {}

	async init() {
		// No initialization needed
		return;
	}

	getFeatures(): FeatureReturnType {
		return {
			planName: 'Enterprise',
			[LICENSE_FEATURES.SHARING]: true,
			[LICENSE_FEATURES.LDAP]: true,
			[LICENSE_FEATURES.SAML]: true,
			[LICENSE_FEATURES.LOG_STREAMING]: true,
			[LICENSE_FEATURES.ADVANCED_EXECUTION_FILTERS]: true,
			[LICENSE_FEATURES.VARIABLES]: true,
			[LICENSE_FEATURES.SOURCE_CONTROL]: true,
			[LICENSE_FEATURES.EXTERNAL_SECRETS]: true,
			[LICENSE_FEATURES.SHOW_NON_PROD_BANNER]: false,
			[LICENSE_FEATURES.WORKFLOW_HISTORY]: true,
			[LICENSE_FEATURES.DEBUG_IN_EDITOR]: true,
			[LICENSE_FEATURES.BINARY_DATA_S3]: true,
			[LICENSE_FEATURES.MULTIPLE_MAIN_INSTANCES]: true,
			[LICENSE_FEATURES.WORKER_VIEW]: true,
			[LICENSE_FEATURES.ADVANCED_PERMISSIONS]: true,
			[LICENSE_FEATURES.PROJECT_ROLE_ADMIN]: true,
			[LICENSE_FEATURES.PROJECT_ROLE_EDITOR]: true,
			[LICENSE_FEATURES.PROJECT_ROLE_VIEWER]: true,
			[LICENSE_FEATURES.AI_ASSISTANT]: true,
			[LICENSE_FEATURES.ASK_AI]: true,
			[LICENSE_FEATURES.COMMUNITY_NODES_CUSTOM_REGISTRY]: true,
		};
	}

	isFeatureEnabled(feature: string): boolean {
		return this.getFeatures()[feature as keyof FeatureReturnType] as boolean;
	}

	isAPIDisabled(): boolean {
		return false;
	}

	isBinaryDataS3Enabled(): boolean {
		return true;
	}

	isBinaryDataS3Licensed(): boolean {
		return true;
	}

	isLdapEnabled(): boolean {
		return true;
	}

	isSamlEnabled(): boolean {
		return true;
	}

	isLogStreamingEnabled(): boolean {
		return true;
	}

	isVariablesEnabled(): boolean {
		return true;
	}

	isSourceControlEnabled(): boolean {
		return true;
	}

	isSourceControlLicensed(): boolean {
		return true;
	}

	isExternalSecretsEnabled(): boolean {
		return true;
	}

	isWorkflowHistoryEnabled(): boolean {
		return true;
	}

	isWorkflowHistoryLicensed(): boolean {
		return true;
	}

	isDebugInEditorEnabled(): boolean {
		return true;
	}

	isDebugInEditorLicensed(): boolean {
		return true;
	}

	isMultipleMainInstancesEnabled(): boolean {
		return true;
	}

	isProjectRoleAdminLicensed(): boolean {
		return true;
	}

	isProjectRoleEditorLicensed(): boolean {
		return true;
	}

	isProjectRoleViewerLicensed(): boolean {
		return true;
	}

	isAiEnabled(): boolean {
		return true;
	}

	isAiNodesEnabled(): boolean {
		return true;
	}

	isAdvancedPermissionsEnabled(): boolean {
		return true;
	}

	isAdvancedPermissionsLicensed(): boolean {
		return true;
	}

	isWorkerViewEnabled(): boolean {
		return true;
	}

	isWorkerViewLicensed(): boolean {
		return true;
	}

	isAiAssistantEnabled(): boolean {
		return true;
	}

	isAskAiEnabled(): boolean {
		return true;
	}

	isSharingEnabled(): boolean {
		return true;
	}

	isAdvancedExecutionFiltersEnabled(): boolean {
		return true;
	}

	getQuota(): number {
		return UNLIMITED_LICENSE_QUOTA;
	}

	getTriggerLimit(): number {
		return UNLIMITED_LICENSE_QUOTA;
	}

	getVariablesLimit(): number {
		return UNLIMITED_LICENSE_QUOTA;
	}

	getUsersLimit(): number {
		return UNLIMITED_LICENSE_QUOTA;
	}

	getWorkflowHistoryPruneLimit(): number {
		return UNLIMITED_LICENSE_QUOTA;
	}

	getTeamProjectLimit(): number {
		return UNLIMITED_LICENSE_QUOTA;
	}

	isWithinUsersLimit(): boolean {
		return true;
	}

	async loadCertStr(): Promise<string> {
		return '';
	}

	async activate(
		_activationKey: string,
		_options?: { instanceType?: string; tenantId?: number },
	): Promise<void> {
		return;
	}

	async shutdown(): Promise<void> {
		return;
	}

	getInfo(): string {
		return 'Enterprise License';
	}

	async reload(): Promise<void> {
		return;
	}

	isCustomNpmRegistryEnabled(): boolean {
		return true;
	}

	async reinit(): Promise<void> {
		return this.init();
	}

	async refresh(): Promise<void> {
		return;
	}

	isMultipleMainInstancesLicensed(): boolean {
		return true;
	}

	getFeatureValue(feature: string): string | boolean | number | undefined {
		const features = this.getFeatures();
		return features[feature as keyof FeatureReturnType];
	}

	async renew(): Promise<void> {
		return;
	}

	getCurrentEntitlements(): Entitlements {
		return {
			planId: '1',
			planName: 'Enterprise',
		};
	}

	getMainPlan(): MainPlan {
		return {
			id: '1',
			name: 'Enterprise',
			productId: '',
			productMetadata: {},
			features: {},
			featureOverrides: {},
			validFrom: new Date(),
			validTo: new Date(),
			isFloatable: false,
		};
	}

	getPlanName(): string {
		return 'Enterprise';
	}

	getConsumerId(): string {
		return 'enterprise-user';
	}

	getManagementJwt(): string {
		return 'dummy-jwt-token';
	}
}
