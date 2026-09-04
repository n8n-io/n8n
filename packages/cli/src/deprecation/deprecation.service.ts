import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

type EnvVarName = string;

type Deprecation = {
	/** Name of the deprecated env var. */
	envVar: EnvVarName;

	/** Message to display when the deprecated env var is currently in use. */
	message: string;

	/** Function to identify the specific value in the env var that is deprecated. */
	checkValue?: (value?: string) => boolean;
};

const SAFE_TO_REMOVE = 'Remove this environment variable; it is no longer needed.';

/** Responsible for warning about deprecations related to env vars. */
@Service()
export class DeprecationService {
	private readonly deprecations: Deprecation[] = [
		{
			envVar: 'N8N_BINARY_DATA_STORAGE_PATH',
			message: 'Use N8N_STORAGE_PATH instead.',
		},
		{ envVar: 'N8N_BINARY_DATA_TTL', message: SAFE_TO_REMOVE },
		{ envVar: 'N8N_PERSISTED_BINARY_DATA_TTL', message: SAFE_TO_REMOVE },
		{ envVar: 'EXECUTIONS_DATA_PRUNE_TIMEOUT', message: SAFE_TO_REMOVE },
		{ envVar: 'N8N_AVAILABLE_BINARY_DATA_MODES', message: SAFE_TO_REMOVE },
		{ envVar: 'N8N_CONFIG_FILES', message: 'Please use .env files or *_FILE env vars instead.' },
		{ envVar: 'N8N_RUNNERS_ENABLED', message: SAFE_TO_REMOVE },
		{
			envVar: 'N8N_SKIP_WEBHOOK_DEREGISTRATION_SHUTDOWN',
			message: `n8n no longer deregisters webhooks at startup and shutdown. ${SAFE_TO_REMOVE}`,
		},
		{
			envVar: 'OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS',
			message: `In queue mode, manual executions are always routed to workers. ${SAFE_TO_REMOVE}`,
		},
		{
			envVar: 'N8N_EXPRESSION_EVALUATOR',
			message: `n8n has replaced \`tmpl\` with \`tournament\` as expression evaluator. ${SAFE_TO_REMOVE}`,
		},
		{
			envVar: 'N8N_EXPRESSION_REPORT_DIFFERENCE',
			message: `n8n has replaced \`tmpl\` with \`tournament\` as expression evaluator. ${SAFE_TO_REMOVE}`,
		},
		{
			envVar: 'WEBHOOK_URL',
			message:
				'Use N8N_WEBHOOK_URL instead, which sets the base URL for both test and production webhooks.',
		},
		{
			envVar: 'N8N_EXPRESSION_ENGINE',
			message:
				'The `legacy` expression engine runs expressions without isolation, is no longer considered secure, and will be removed in a future version. Remove this environment variable to use the default `vm` engine.',
			checkValue: (value?: string) => value === 'legacy',
		},
		{
			envVar: 'N8N_DEFAULT_BINARY_DATA_MODE',
			message:
				'In-memory binary data storage (`default` mode) has been removed. This value is now ignored and n8n falls back to `filesystem` mode (`database` in scaling mode). Remove this environment variable or set it to `filesystem`, `s3`, or `database`.',
			checkValue: (value?: string) => value === 'default',
		},
		{
			envVar: 'N8N_WORKFLOW_TAGS_DISABLED',
			message:
				'Disabling workflow tags is deprecated. Tags will always be enabled in a future version and this environment variable will be removed, so the tags feature will become visible again after upgrading.',
			checkValue: (value?: string) =>
				value !== undefined && ['true', '1'].includes(value.toLowerCase()),
		},
		{
			envVar: 'N8N_OUTBOUND_PROXY_MODE',
			message:
				'This variable exists only for backward compatibility and will be removed in a future version. Remove it and list every internal endpoint that must be reached directly in NO_PROXY. Until that is in place, `main-only` keeps the historical behavior where only the main process routes its default outbound HTTP through the proxy environment variables (HTTP_PROXY, HTTPS_PROXY, ALL_PROXY, NO_PROXY).',
			checkValue: (value?: string) => value === 'main-only',
		},
		{
			envVar: 'EXECUTIONS_PROCESS',
			message: SAFE_TO_REMOVE,
			checkValue: (value: string | undefined) => value !== undefined && value !== 'own',
		},
		{
			envVar: 'EXECUTIONS_PROCESS',
			message:
				'n8n does not support `own` mode since May 2023. Please remove this environment variable to allow n8n to start. If you need the isolation and performance gains, please consider queue mode: https://docs.n8n.io/hosting/scaling/queue-mode/',
			checkValue: (value: string | undefined): value is 'own' => value === 'own',
		},
	];

	/** Runtime state of deprecation-related env vars. */
	private readonly state: Map<Deprecation, { mustWarn: boolean }> = new Map();

	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
	) {}

	warn() {
		this.deprecations.forEach((d) => {
			const envValue = process.env[d.envVar];

			this.state.set(d, {
				mustWarn: d.checkValue ? d.checkValue(envValue) : envValue !== undefined,
			});
		});

		const mustWarn: string[] = [];
		for (const [deprecation, metadata] of this.state.entries()) {
			if (!metadata.mustWarn) {
				continue;
			}

			mustWarn.push(` - ${deprecation.envVar} -> ${deprecation.message}\n`);
		}

		if (!this.instanceSettings.isDocker) {
			mustWarn.push(
				' - Running n8n outside a container is deprecated. Future versions will require running n8n via the official Docker image. See https://docs.n8n.io/deploy/host-n8n/install-options/install-with-docker\n',
			);
		}

		if (mustWarn.length === 0) return;

		const header = `There ${
			mustWarn.length === 1 ? 'is a deprecation' : 'are deprecations'
		} related to your n8n setup. Please take the recommended actions to update your configuration`;

		this.logger.warn(`\n${header}:\n${mustWarn.join('')}`);
	}
}
