import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
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

	/** Whether to show a deprecation warning if the env var is missing. */
	warnIfMissing?: boolean;

	/** Whether a config value is required to trigger a deprecation warning. */
	matchConfig?: boolean;

	/** Function to run to check whether to disable this deprecation warning. */
	disableIf?: () => boolean;
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
			message:
				'Running manual executions in the main instance in scaling mode is deprecated. Manual executions will be routed to workers in a future version. Please set `OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS=true` to offload manual executions to workers and avoid potential issues in the future. Consider increasing memory available to workers and reducing memory available to main.',
			checkValue: (value?: string) => value?.toLowerCase() !== 'true' && value !== '1',
			warnIfMissing: true,
			matchConfig: this.globalConfig.executions.mode === 'queue',
			disableIf: () => this.instanceSettings.instanceType !== 'main',
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
			envVar: 'N8N_UNVERIFIED_PACKAGES_ENABLED',
			message:
				'The default for this variable will change to `false` in a future version. Set it to `true` explicitly to keep installing unverified community packages.',
			checkValue: (value?: string) => value === undefined,
		},
		{
			envVar: 'N8N_RUNNERS_TASK_TIMEOUT',
			message:
				'The default for this variable will be reduced from 300 (5 minutes) to 60 (1 minute) in a future version. Set it explicitly to keep your current task timeout.',
			checkValue: (value?: string) => value === undefined,
		},
		{
			envVar: 'N8N_COMPRESSION_NODE_MAX_DECOMPRESSED_SIZE_BYTES',
			message:
				'The default for this variable will be reduced from 2 GiB to 256 MiB in a future version. Set it explicitly to keep your current limit.',
			checkValue: (value?: string) => value === undefined,
		},
		{
			envVar: 'N8N_COMPRESSION_NODE_MAX_ZIP_ENTRIES',
			message:
				'The default for this variable will be reduced from 5000 to 1000 in a future version. Set it explicitly to keep your current limit.',
			checkValue: (value?: string) => value === undefined,
		},
		{
			envVar: 'N8N_DEFAULT_BINARY_DATA_MODE',
			message:
				'In-memory binary data storage (`default` mode) will be removed in a future version. Switch to `filesystem`, `s3`, or `database`.',
			checkValue: (value?: string) => value === 'default',
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
		private readonly globalConfig: GlobalConfig,
		private readonly instanceSettings: InstanceSettings,
	) {}

	warn() {
		this.deprecations.forEach((d) => {
			if (d.disableIf?.()) {
				this.state.set(d, { mustWarn: false });
				return;
			}

			const envValue = process.env[d.envVar];

			const matchConfig = d.matchConfig === true || d.matchConfig === undefined;
			const warnIfMissing = d.warnIfMissing !== undefined && envValue === undefined;
			const checkValue = d.checkValue ? d.checkValue(envValue) : envValue !== undefined;

			this.state.set(d, {
				mustWarn: matchConfig && (warnIfMissing || checkValue),
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
