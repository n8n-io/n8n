import { Service } from 'typedi';
import { LICENSE_FEATURES, UNLIMITED_LICENSE_QUOTA } from './constants';
import type { BooleanLicenseFeature, NumericLicenseFeature } from './interfaces';

export type FeatureReturnType = Partial<
	{
		planName: string;
	} & { [K in NumericLicenseFeature]: number } & { [K in BooleanLicenseFeature]: boolean }
>;

@Service()
export class License {
	constructor() {}

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
		return true;
	}

	isAPIDisabled(): boolean {
		return false; // API is always enabled
	}

	isBinaryDataS3Enabled(): boolean {
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

	isExternalSecretsEnabled(): boolean {
		return true;
	}

	isWorkflowHistoryEnabled(): boolean {
		return true;
	}

	isDebugInEditorEnabled(): boolean {
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

	isAdvancedPermissionsLicensed(): boolean {
		return true;
	}

	isWorkerViewEnabled(): boolean {
		return true;
	}

	isAiEnabled(): boolean {
		return true;
	}

	isAiAssistantLicensed(): boolean {
		return true;
	}

	isAskAiLicensed(): boolean {
		return true;
	}

	isCustomCommunityNodesRegistryEnabled(): boolean {
		return true;
	}

	isAdvancedExecutionFiltersEnabled(): boolean {
		return true;
	}

	isNonProductionBannerEnabled(): boolean {
		return false; // Disable non-production banner
	}

	isBinaryDataS3Licensed(): boolean {
		return true;
	}

	isAiAssistantEnabled(): boolean {
		return true;
	}

	isAskAiEnabled(): boolean {
		return true;
	}

	isAdvancedPermissionsEnabled(): boolean {
		return true;
	}

	isWorkerViewLicensed(): boolean {
		return true;
	}

	isDebugInEditorLicensed(): boolean {
		return true;
	}

	isWorkflowHistoryLicensed(): boolean {
		return true;
	}

	isSourceControlLicensed(): boolean {
		return true;
	}

	isWorkflowSharingEnabled(): boolean {
		return true;
	}

	isSharingEnabled(): boolean {
		return true;
	}

	isVersionControlLicensed(): boolean {
		return true;
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
		return true; // No user limit in enterprise
	}

	async loadCertStr(): Promise<string> {
		return ''; // No certificate needed
	}

	async activate(_activationKey: string): Promise<void> {
		// No activation needed
		return;
	}

	async shutdown(): Promise<void> {
		// No shutdown needed
		return;
	}

	getInfo(): string {
		return 'Enterprise License';
	}

	async reload(): Promise<void> {
		// No reload needed
		return;
	}

	isCustomNpmRegistryEnabled(): boolean {
		return true;
	}

	async reinit(): Promise<void> {
		return this.init();
	}

	async refresh(): Promise<void> {
		// No refresh needed
		return;
	}

	isMultipleMainInstancesLicensed(): boolean {
		return true;
	}

	getFeatureValue(feature: string): string | boolean | number | undefined {
		const features = this.getFeatures();
		return features[feature as keyof FeatureReturnType];
	}
}
