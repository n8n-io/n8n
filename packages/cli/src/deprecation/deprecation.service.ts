import { Service } from '@n8n/di';
import { Logger } from 'n8n-core';
import { ApplicationError } from 'n8n-workflow';

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
			envVar: 'N8N_SKIP_WEBHOOK_DEREGISTRATION_SHUTDOWN',
			message: `n8n no longer deregisters webhooks at startup and shutdown. ${SAFE_TO_REMOVE}`,
		},
		{
			envVar: 'N8N_RUNNERS_ENABLED',
			message:
				'Running n8n without task runners is deprecated. Task runners will be turned on by default in a future version. Please set `N8N_RUNNERS_ENABLED=true` to enable task runners now and avoid potential issues in the future. Learn more: https://docs.n8n.io/hosting/configuration/task-runners/',
			checkValue: (value?: string) => value?.toLowerCase() !== 'true' && value !== '1',
			warnIfMissing: true,
		},
	];

	/** Runtime state of deprecation-related env vars. */
	private readonly state: Record<EnvVarName, { mustWarn: boolean }> = {};

	constructor(private readonly logger: Logger) {}

	warn() {
		this.deprecations.forEach((d) => {
			const envValue = process.env[d.envVar];
			this.state[d.envVar] = {
				mustWarn:
					(d.warnIfMissing !== undefined && envValue === undefined) ||
					(d.checkValue ? d.checkValue(envValue) : envValue !== undefined),
			};
		});

		const mustWarn = Object.entries(this.state)
			.filter(([, d]) => d.mustWarn)
			.map(([envVar]) => {
				const deprecation = this.deprecations.find((d) => d.envVar === envVar);
				if (!deprecation) {
					throw new ApplicationError(`Deprecation not found for env var: ${envVar}`);
				}
				return deprecation;
			});

		if (mustWarn.length === 0) return;

		const header = `There ${
			mustWarn.length === 1 ? 'is a deprecation' : 'are deprecations'
		} related to your environment variables. Please take the recommended actions to update your configuration`;
		const deprecations = mustWarn
			.map(({ envVar, message }) => ` - ${envVar} -> ${message}\n`)
			.join('');

		this.logger.warn(`\n${header}:\n${deprecations}`);
	}

	mustWarn(envVar: string) {
		return this.state[envVar]?.mustWarn ?? false;
	}
}
