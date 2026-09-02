import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

export const INSTANCE_TELEMETRY = defineTelemetryEvents({
	INSTANCE_STARTED: {
		name: 'Instance started',
		description:
			'Instance finished booting, reported once per main process start with a snapshot of its configuration.',
		properties: z.object({
			version_cli: z.string(),
			db_type: z.enum(['sqlite', 'postgresdb']),
			db_version: z
				.string()
				.nullable()
				.describe(
					'Postgres server version, or SQLite library version. Null when it could not be determined, which for `postgresdb` means the query failed rather than that the instance runs SQLite.',
				),
			n8n_version_notifications_enabled: z.boolean(),
			n8n_disable_production_main_process: z.boolean(),
			system_info: z.object({
				os: z.object({
					type: z.string(),
					version: z.string(),
				}),
				memory: z.number().describe('Total system memory in KiB'),
				cpus: z.object({
					count: z.number(),
					model: z.string(),
					speed: z.number().describe('Clock speed in MHz'),
				}),
				is_docker: z.boolean(),
			}),
			execution_variables: z.object({
				executions_mode: z.enum(['regular', 'queue']),
				executions_timeout: z.number().describe('Seconds, -1 for unlimited'),
				executions_timeout_max: z.number().describe('Seconds'),
				executions_data_save_on_error: z.enum(['all', 'none']),
				executions_data_save_on_success: z.enum(['all', 'none']),
				executions_data_save_on_progress: z.boolean(),
				executions_data_save_manual_executions: z.boolean(),
				executions_data_prune: z.boolean(),
				executions_data_max_age: z.number().describe('Hours'),
			}),
			workflow_history: z.object({
				compaction_optimizing_time_window_hours: z.number(),
				compaction_trim_on_start_up: z.boolean(),
				compaction_trimming_time_window_days: z.number(),
			}),
			n8n_deployment_type: z.string(),
			n8n_binary_data_mode: z.enum(['default', 'filesystem', 's3', 'azure', 'database']),
			smtp_set_up: z.boolean(),
			ldap_allowed: z.boolean(),
			saml_enabled: z.boolean(),
			license_plan_name: z.string(),
			license_tenant_id: z.number(),
			binary_data_s3: z
				.boolean()
				.describe('S3 binary data is selected, available and licensed, all three'),
			multi_main_setup_enabled: z.boolean(),
			instance_ai: z
				.object({
					sandbox_enabled: z.boolean(),
					sandbox_provider: z.string(),
					search_brave_set: z.boolean(),
					search_searxng_set: z.boolean(),
				})
				.describe('Which sandbox and search providers are configured, never key values'),
			metrics: z.object({
				metrics_enabled: z.boolean(),
				metrics_category_default: z.boolean(),
				metrics_category_routes: z.boolean(),
				metrics_category_cache: z.boolean(),
				metrics_category_logs: z.boolean(),
				metrics_category_queue: z.boolean(),
				metrics_category_execution_data: z.boolean(),
				metrics_category_webhooks: z.boolean(),
				metrics_category_forms: z.boolean(),
				metrics_category_workflow_info: z.boolean(),
			}),
			earliest_workflow_created: z
				// `unknown` because this is emitted as a Date, which zod cannot represent in
				// JSON Schema. It reaches the warehouse as an ISO timestamp via JSON.stringify.
				.unknown()
				.describe('Date of the oldest workflow, absent when the instance has none'),
			otel: z.object({
				enabled: z.boolean(),
				include_node_spans: z.boolean(),
			}),
			settings_managed_by_env_vars: z.object({
				owner_managed_by_env: z.boolean(),
				sso_managed_by_env: z.boolean(),
				security_policy_managed_by_env: z.boolean(),
				log_streaming_managed_by_env: z.boolean(),
				mcp_managed_by_env: z.boolean(),
				community_packages_managed_by_env: z.boolean(),
			}),
		}),
	},
});
