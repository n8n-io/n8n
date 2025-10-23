import type { EnterpriseEditionFeatureKey, EnterpriseEditionFeatureValue } from '@/Interface';

export const EnterpriseEditionFeature: Record<
	EnterpriseEditionFeatureKey,
	EnterpriseEditionFeatureValue
> = {
	AdvancedExecutionFilters: 'advancedExecutionFilters',
	Sharing: 'sharing',
	Ldap: 'ldap',
	LogStreaming: 'logStreaming',
	Variables: 'variables',
	Saml: 'saml',
	Oidc: 'oidc',
	EnforceMFA: 'mfaEnforcement',
	SourceControl: 'sourceControl',
	ExternalSecrets: 'externalSecrets',
	AuditLogs: 'auditLogs',
	DebugInEditor: 'debugInEditor',
	WorkflowHistory: 'workflowHistory',
	WorkerView: 'workerView',
	AdvancedPermissions: 'advancedPermissions',
	ApiKeyScopes: 'apiKeyScopes',
	Provisioning: 'provisioning',
};
