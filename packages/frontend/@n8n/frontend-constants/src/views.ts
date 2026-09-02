/**
 * Router view identifiers, shared across the frontend.
 *
 * Declared as a plain `enum` (not a `const enum`) so this package's emitted
 * `dist` declarations contain a regular `declare enum` backed by a real runtime
 * object. A `const enum` would emit an *ambient* const enum, which downstream
 * packages compiled with `isolatedModules: true` cannot read (TS2748) — and being
 * consumed from `dist` across the package boundary is this package's entire
 * purpose. A plain `enum` also preserves the nominal enum-member types the rest of
 * the frontend relies on, so relocating `VIEWS` here is behavior-preserving.
 *
 * The repo's default lint bans raw enums in favor of `const enum` for runtime
 * overhead; that guidance is inverted here because `const enum` is precisely what
 * breaks dist consumption. The `no-restricted-syntax` rule (and the camelCase
 * naming-convention rule, since view identifiers are UPPER_CASE by convention)
 * are relaxed for this file in `eslint.config.mjs`.
 *
 * `editor-ui` re-exports this from `@/app/constants` for existing importers.
 */
export enum VIEWS {
	HOMEPAGE = 'Homepage',
	COLLECTION = 'TemplatesCollectionView',
	EXECUTIONS = 'Executions',
	EXECUTION_PREVIEW = 'ExecutionPreview',
	EXECUTION_DEBUG = 'ExecutionDebug',
	EXECUTION_HOME = 'ExecutionsLandingPage',
	TEMPLATE = 'TemplatesWorkflowView',
	TEMPLATE_SETUP = 'TemplatesWorkflowSetupView',
	TEMPLATES = 'TemplatesSearchView',
	CREDENTIALS = 'CredentialsView',
	NEW_WORKFLOW = 'NodeViewNew',
	WORKFLOW = 'NodeViewExisting',
	DEMO = 'WorkflowDemo',
	DEMO_DIFF = 'WorkflowDemoDiff',
	TEMPLATE_IMPORT = 'WorkflowTemplate',
	WORKFLOW_ONBOARDING = 'WorkflowOnboarding',
	SIGNIN = 'SigninView',
	SIGNUP = 'SignupView',
	SIGNOUT = 'SignoutView',
	SETUP = 'SetupView',
	FORGOT_PASSWORD = 'ForgotMyPasswordView',
	CHANGE_PASSWORD = 'ChangePasswordView',
	SETTINGS = 'Settings',
	USERS_SETTINGS = 'UsersSettings',
	LDAP_SETTINGS = 'LdapSettings',
	PERSONAL_SETTINGS = 'PersonalSettings',
	SECURITY_SETTINGS = 'SecuritySettings',
	API_SETTINGS = 'APISettings',
	NOT_FOUND = 'NotFoundView',
	COMMUNITY_NODES = 'CommunityNodes',
	WORKFLOWS = 'WorkflowsView',
	WORKFLOW_EXECUTIONS = 'WorkflowExecutions',
	EVALUATION = 'Evaluation',
	EVALUATION_EDIT = 'EvaluationEdit',
	EVALUATION_RUNS_DETAIL = 'EvaluationRunsDetail',
	EVALUATION_COLLECTION_COMPARE = 'EvaluationCollectionCompare',
	USAGE = 'Usage',
	LOG_STREAMING_SETTINGS = 'LogStreamingSettingsView',
	OPENTELEMETRY_SETTINGS = 'SettingsOpenTelemetryView',
	SSO_SETTINGS = 'SSoSettings',
	ENCRYPTION_KEYS_SETTINGS = 'EncryptionKeysSettings',
	EXTERNAL_SECRETS_SETTINGS = 'ExternalSecretsSettings',
	SAML_ONBOARDING = 'SamlOnboarding',
	SOURCE_CONTROL = 'SourceControl',
	MFA_VIEW = 'MfaView',
	WORKFLOW_HISTORY = 'WorkflowHistory',
	WORKER_VIEW = 'WorkerView',
	PROJECTS = 'Projects',
	PROJECT_DETAILS = 'ProjectDetails',
	PROJECTS_WORKFLOWS = 'ProjectsWorkflows',
	PROJECTS_CREDENTIALS = 'ProjectsCredentials',
	PROJECT_SETTINGS = 'ProjectSettings',
	PROJECTS_EXECUTIONS = 'ProjectsExecutions',
	ROLES_SETTINGS = 'RolesSettingsView',
	PROJECT_ROLES_SETTINGS = 'ProjectRolesSettingsView',
	PROJECT_ROLE_SETTINGS = 'ProjectRoleSettingsView',
	PROJECT_NEW_ROLE = 'ProjectNewRoleView',
	PROJECT_ROLE_VIEW = 'ProjectRoleViewView',
	INSTANCE_NEW_ROLE = 'InstanceNewRoleView',
	INSTANCE_ROLE_SETTINGS = 'InstanceRoleSettingsView',
	INSTANCE_ROLE_VIEW = 'InstanceRoleViewView',
	PROJECTS_VARIABLES = 'ProjectsVariables',
	HOME_VARIABLES = 'HomeVariables',
	FOLDERS = 'Folders',
	PROJECTS_FOLDERS = 'ProjectsFolders',
	INSIGHTS = 'Insights',
	SHARED_WITH_ME = 'SharedWithMe',
	SHARED_WORKFLOWS = 'SharedWorkflows',
	SHARED_CREDENTIALS = 'SharedCredentials',
	ENTITY_NOT_FOUND = 'EntityNotFound',
	ENTITY_UNAUTHORIZED = 'EntityUnAuthorized',
	PRE_BUILT_AGENT_TEMPLATES = 'PreBuiltAgentTemplates',
	AI_SETTINGS = 'AISettingsView',
	AI_GATEWAY_SETTINGS = 'AIGatewaySettingsView',
	OAUTH_CONSENT = 'OAuthConsent',
	MIGRATION_REPORT = 'MigrationReport',
	MIGRATION_RULE_REPORT = 'MigrationRuleReport',
	RESOLVERS = 'Resolvers',
	RESOURCE_CENTER = 'ResourceCenter',
}
