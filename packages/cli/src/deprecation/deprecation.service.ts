import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import config from '@/config';

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
		{ envVar: 'N8N_BINARY_DATA_TTL', message: SAFE_TO_REMOVE },
		{ envVar: 'N8N_PERSISTED_BINARY_DATA_TTL', message: SAFE_TO_REMOVE },
		{ envVar: 'EXECUTIONS_DATA_PRUNE_TIMEOUT', message: SAFE_TO_REMOVE },
		{
			envVar: 'N8N_BINARY_DATA_MODE',
			message: '`default` is deprecated. Please switch to `filesystem` mode.',
			checkValue: (value: string) => value === 'default',
		},
		{ envVar: 'N8N_CONFIG_FILES', message: 'Please use .env files or *_FILE env vars instead.' },
		{
			envVar: 'DB_TYPE',
			message: 'MySQL and MariaDB are deprecated. Please migrate to PostgreSQL.',
			checkValue: (value: string) => ['mysqldb', 'mariadb'].includes(value),
		},
		{
			envVar: 'DB_SQLITE_POOL_SIZE',
			message:
				'Running SQLite without a pool of read connections is deprecated. Please set `DB_SQLITE_POOL_SIZE` to a value higher than zero. See: https://docs.n8n.io/hosting/configuration/environment-variables/database/#sqlite',
			checkValue: (_: string) => this.globalConfig.database.isLegacySqlite,
		},
		{
			envVar: 'N8N_SKIP_WEBHOOK_DEREGISTRATION_SHUTDOWN',
			message: `n8n no longer deregisters webhooks at startup and shutdown. ${SAFE_TO_REMOVE}`,
		},
		{
			envVar: 'N8N_RUNNERS_ENABLED',
			message:
				'Running n8n without task runners is deprecated. Task runners will be turned on by default in a future version. Please set `N8N_RUNNERS_ENABLED=true` to enable task runners now and avoid potential issues in the future. Learn more: https://docs.n8n.io/hosting/configuration/task-runners/',
			checkValue: (value?: string) => value?.toLowerCase() !== 'true' && value !== '1',
			warnIfMissing: true,
			disableIf: () => this.globalConfig.nodes.exclude.includes('n8n-nodes-base.code'),
		},
		{
			envVar: 'OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS',
			message:
				'Running manual executions in the main instance in scaling mode is deprecated. Manual executions will be routed to workers in a future version. Please set `OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS=true` to offload manual executions to workers and avoid potential issues in the future. Consider increasing memory available to workers and reducing memory available to main.',
			checkValue: (value?: string) => value?.toLowerCase() !== 'true' && value !== '1',
			warnIfMissing: true,
			matchConfig: config.getEnv('executions.mode') === 'queue',
			disableIf: () => this.instanceSettings.instanceType !== 'main',
		},
		{
			envVar: 'N8N_PARTIAL_EXECUTION_VERSION_DEFAULT',
			checkValue: (value: string) => value === '1',
			message:
				'Version 1 of partial executions is deprecated and will be removed as early as v1.85.0',
		},
		{
			envVar: 'N8N_PARTIAL_EXECUTION_VERSION_DEFAULT',
			message: 'This environment variable is internal and should not be set.',
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
			envVar: 'EXECUTIONS_PROCESS',
			message: SAFE_TO_REMOVE,
			checkValue: (value: string | undefined) => value !== undefined && value !== 'own',
		},
		{
			envVar: 'EXECUTIONS_PROCESS',
			message:
				'n8n does not support `own` mode since May 2023. Please remove this environment variable to allow n8n to start. If you need the isolation and performance gains, please consider queue mode: https://docs.n8n.io/hosting/scaling/queue-mode/',
			checkValue: (value: string) => value === 'own',
		},
		{
			envVar: 'N8N_BLOCK_ENV_ACCESS_IN_NODE',
			message:
				'The default value of N8N_BLOCK_ENV_ACCESS_IN_NODE will be changed from false to true in a future version. If you need to access environment variables from the Code Node or from expressions, please set N8N_BLOCK_ENV_ACCESS_IN_NODE=false. Learn more: https://docs.n8n.io/hosting/configuration/environment-variables/security/',
			checkValue: (value: string | undefined) => value === undefined || value === '',
		},
		{
			envVar: 'N8N_GIT_NODE_DISABLE_BARE_REPOS',
			message:
				'Support for bare repositories in the Git Node will be removed in a future version due to security concerns. If you are not using bare repositories in the Git Node, please set N8N_GIT_NODE_DISABLE_BARE_REPOS=true. Learn more: https://docs.n8n.io/hosting/configuration/environment-variables/security/',
			checkValue: (value: string | undefined) => value === undefined || value === '',
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

		const mustWarn: Deprecation[] = [];
		for (const [deprecation, metadata] of this.state.entries()) {
			if (!metadata.mustWarn) {
				continue;
			}

			mustWarn.push(deprecation);
		}

		if (mustWarn.length === 0) return;

		const header = `There ${
			mustWarn.length === 1 ? 'is a deprecation' : 'are deprecations'
		} related to your environment variables. Please take the recommended actions to update your configuration`;
		const deprecations = mustWarn
			.map(({ envVar, message }) => ` - ${envVar} -> ${message}\n`)
			.join('');

		this.logger.warn(`\n${header}:\n${deprecations}`);
	}
}
