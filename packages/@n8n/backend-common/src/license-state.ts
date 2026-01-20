import type { BooleanLicenseFeature } from '@n8n/constants';
import { UNLIMITED_LICENSE_QUOTA } from '@n8n/constants';
import { Service } from '@n8n/di';

import type { FeatureReturnType, LicenseProvider } from './types';

@Service()
export class LicenseState {
	licenseProvider: LicenseProvider | null = null;

	setLicenseProvider(provider: LicenseProvider) {
		this.licenseProvider = provider;
	}

	// --------------------
	//     core queries (UNLOCKED)
	// --------------------

	/**
	 * Always returns true - all features are licensed
	 */
	isLicensed(_feature: BooleanLicenseFeature | BooleanLicenseFeature[]) {
		return true;
	}

	/**
	 * Always returns UNLIMITED_LICENSE_QUOTA for any feature
	 */
	getValue<T extends keyof FeatureReturnType>(_feature: T): FeatureReturnType[T] {
		return UNLIMITED_LICENSE_QUOTA as FeatureReturnType[T];
	}

	// --------------------
	//      booleans
	// --------------------

	isCustomRolesLicensed() {
		return true;
	}

	isDynamicCredentialsLicensed() {
		return true;
	}

	isSharingLicensed() {
		return true;
	}

	isLogStreamingLicensed() {
		return true;
	}

	isLdapLicensed() {
		return true;
	}

	isSamlLicensed() {
		return true;
	}

	isOidcLicensed() {
		return true;
	}

	isMFAEnforcementLicensed() {
		return true;
	}

	isApiKeyScopesLicensed() {
		return true;
	}

	isAiAssistantLicensed() {
		return true;
	}

	isAskAiLicensed() {
		return true;
	}

	isAiCreditsLicensed() {
		return true;
	}

	isAdvancedExecutionFiltersLicensed() {
		return true;
	}

	isAdvancedPermissionsLicensed() {
		return true;
	}

	isDebugInEditorLicensed() {
		return true;
	}

	isBinaryDataS3Licensed() {
		return true;
	}

	isMultiMainLicensed() {
		return true;
	}

	isVariablesLicensed() {
		return true;
	}

	isSourceControlLicensed() {
		return true;
	}

	isExternalSecretsLicensed() {
		return true;
	}

	isAPIDisabled() {
		return false; // API should NOT be disabled
	}

	isWorkerViewLicensed() {
		return true;
	}

	isProjectRoleAdminLicensed() {
		return true;
	}

	isProjectRoleEditorLicensed() {
		return true;
	}

	isProjectRoleViewerLicensed() {
		return true;
	}

	isCustomNpmRegistryLicensed() {
		return true;
	}

	isFoldersLicensed() {
		return true;
	}

	isInsightsSummaryLicensed() {
		return true;
	}

	isInsightsDashboardLicensed() {
		return true;
	}

	isInsightsHourlyDataLicensed() {
		return true;
	}

	isWorkflowDiffsLicensed() {
		return true;
	}

	isProvisioningLicensed() {
		return true;
	}

	// --------------------
	//      integers
	// --------------------

	getMaxUsers() {
		return UNLIMITED_LICENSE_QUOTA;
	}

	getMaxActiveWorkflows() {
		return UNLIMITED_LICENSE_QUOTA;
	}

	getMaxVariables() {
		return UNLIMITED_LICENSE_QUOTA;
	}

	getMaxAiCredits() {
		return UNLIMITED_LICENSE_QUOTA;
	}

	getWorkflowHistoryPruneQuota() {
		return UNLIMITED_LICENSE_QUOTA;
	}

	getInsightsMaxHistory() {
		return UNLIMITED_LICENSE_QUOTA;
	}

	getInsightsRetentionMaxAge() {
		return UNLIMITED_LICENSE_QUOTA;
	}

	getInsightsRetentionPruneInterval() {
		return UNLIMITED_LICENSE_QUOTA;
	}

	getMaxTeamProjects() {
		return UNLIMITED_LICENSE_QUOTA;
	}

	getMaxWorkflowsWithEvaluations() {
		return UNLIMITED_LICENSE_QUOTA;
	}
}
