import { z } from 'zod';

import { AiAssistantConfig } from './configs/ai-assistant.config';
import { AiConfig } from './configs/ai.config';
import { AuthConfig } from './configs/auth.config';
import { CacheConfig } from './configs/cache.config';
import { CredentialsConfig } from './configs/credentials.config';
import { DatabaseConfig } from './configs/database.config';
import { DeploymentConfig } from './configs/deployment.config';
import { DiagnosticsConfig } from './configs/diagnostics.config';
import { EndpointsConfig } from './configs/endpoints.config';
import { EventBusConfig } from './configs/event-bus.config';
import { ExecutionsConfig } from './configs/executions.config';
import { ExternalHooksConfig } from './configs/external-hooks.config';
import { GenericConfig } from './configs/generic.config';
import { HiringBannerConfig } from './configs/hiring-banner.config';
import { LicenseConfig } from './configs/license.config';
import { LoggingConfig } from './configs/logging.config';
import { MfaConfig } from './configs/mfa.config';
import { MultiMainSetupConfig } from './configs/multi-main-setup.config';
import { NodesConfig } from './configs/nodes.config';
import { PartialExecutionsConfig } from './configs/partial-executions.config';
import { PersonalizationConfig } from './configs/personalization.config';
import { PublicApiConfig } from './configs/public-api.config';
import { RedisConfig } from './configs/redis.config';
import { TaskRunnersConfig } from './configs/runners.config';
import { ScalingModeConfig } from './configs/scaling-mode.config';
import { SecurityConfig } from './configs/security.config';
import { SentryConfig } from './configs/sentry.config';
import { SsoConfig } from './configs/sso.config';
import { TagsConfig } from './configs/tags.config';
import { TemplatesConfig } from './configs/templates.config';
import { UserManagementConfig } from './configs/user-management.config';
import { VersionNotificationsConfig } from './configs/version-notifications.config';
import { WorkflowHistoryConfig } from './configs/workflow-history.config';
import { WorkflowsConfig } from './configs/workflows.config';
import { Config, Env, Nested } from './decorators';

export { Config, Env, Nested } from './decorators';
export { DatabaseConfig } from './configs/database.config';
export { InstanceSettingsConfig } from './configs/instance-settings-config';
export { TaskRunnersConfig } from './configs/runners.config';
export { SecurityConfig } from './configs/security.config';
export { ExecutionsConfig } from './configs/executions.config';
export { LOG_SCOPES } from './configs/logging.config';
export type { LogScope } from './configs/logging.config';
export { WorkflowsConfig } from './configs/workflows.config';
export * from './custom-types';
export { DeploymentConfig } from './configs/deployment.config';
export { MfaConfig } from './configs/mfa.config';
export { HiringBannerConfig } from './configs/hiring-banner.config';
export { PersonalizationConfig } from './configs/personalization.config';
export { NodesConfig } from './configs/nodes.config';
export { CronLoggingConfig } from './configs/logging.config';

const protocolSchema = z.enum(['http', 'https']);

export type Protocol = z.infer<typeof protocolSchema>;

@Config
export class GlobalConfig {
	@Nested
	auth: AuthConfig;

	@Nested
	database: DatabaseConfig;

	@Nested
	credentials: CredentialsConfig;

	@Nested
	userManagement: UserManagementConfig;

	@Nested
	versionNotifications: VersionNotificationsConfig;

	@Nested
	publicApi: PublicApiConfig;

	@Nested
	externalHooks: ExternalHooksConfig;

	@Nested
	templates: TemplatesConfig;

	@Nested
	eventBus: EventBusConfig;

	@Nested
	nodes: NodesConfig;

	@Nested
	workflows: WorkflowsConfig;

	@Nested
	sentry: SentryConfig;

	/** Path n8n is deployed to */
	@Env('N8N_PATH')
	path: string = '/';

	/** Host name n8n can be reached */
	@Env('N8N_HOST')
	host: string = 'localhost';

	/** HTTP port n8n can be reached */
	@Env('N8N_PORT')
	port: number = 5678;

	/** IP address n8n should listen on */
	@Env('N8N_LISTEN_ADDRESS')
	listen_address: string = '::';

	/** HTTP Protocol via which n8n can be reached */
	@Env('N8N_PROTOCOL', protocolSchema)
	protocol: Protocol = 'http';

	@Nested
	endpoints: EndpointsConfig;

	@Nested
	cache: CacheConfig;

	@Nested
	queue: ScalingModeConfig;

	@Nested
	logging: LoggingConfig;

	@Nested
	taskRunners: TaskRunnersConfig;

	@Nested
	multiMainSetup: MultiMainSetupConfig;

	@Nested
	generic: GenericConfig;

	@Nested
	license: LicenseConfig;

	@Nested
	security: SecurityConfig;

	@Nested
	executions: ExecutionsConfig;

	@Nested
	diagnostics: DiagnosticsConfig;

	@Nested
	aiAssistant: AiAssistantConfig;

	@Nested
	tags: TagsConfig;

	@Nested
	partialExecutions: PartialExecutionsConfig;

	@Nested
	workflowHistory: WorkflowHistoryConfig;

	@Nested
	deployment: DeploymentConfig;

	@Nested
	mfa: MfaConfig;

	@Nested
	hiringBanner: HiringBannerConfig;

	@Nested
	personalization: PersonalizationConfig;

	@Nested
	sso: SsoConfig;

	/** Default locale for the UI. */
	@Env('N8N_DEFAULT_LOCALE')
	defaultLocale: string = 'en';

	/** Whether to hide the page that shows active workflows and executions count. */
	@Env('N8N_HIDE_USAGE_PAGE')
	hideUsagePage: boolean = false;

	/** Number of reverse proxies n8n is running behind. */
	@Env('N8N_PROXY_HOPS')
	proxy_hops: number = 0;

	/** SSL key for HTTPS protocol. */
	@Env('N8N_SSL_KEY')
	ssl_key: string = '';

	/** SSL cert for HTTPS protocol. */
	@Env('N8N_SSL_CERT')
	ssl_cert: string = '';

	/** Public URL where the editor is accessible. Also used for emails sent from n8n. */
	@Env('N8N_EDITOR_BASE_URL')
	editorBaseUrl: string = '';

	/** URLs to external frontend hooks files, separated by semicolons. */
	@Env('EXTERNAL_FRONTEND_HOOKS_URLS')
	externalFrontendHooksUrls: string = '';

	@Nested
	redis: RedisConfig;

	@Nested
	ai: AiConfig;
}
