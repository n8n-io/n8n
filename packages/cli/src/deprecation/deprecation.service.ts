import { Service } from 'typedi';

import { Logger } from '@/logging/logger.service';

type Deprecation = {
	/** Deprecated env var. */
	env: string;

	/** Message to display when the deprecated env var is in use. */
	message: string;

	/** Whether the deprecated env var is currently in use. */
	inUse?: boolean;

	/** Function to identify the specific value in the env var that is deprecated. */
	checkValue?: (value: string) => boolean;
};

const SAFE_TO_REMOVE = 'Remove this environment variable; it is no longer needed.';

/** Responsible for warning about use of deprecated env vars. */
@Service()
export class DeprecationService {
	private readonly deprecations: Deprecation[] = [
		{ env: 'N8N_BINARY_DATA_TTL', message: SAFE_TO_REMOVE },
		{ env: 'N8N_PERSISTED_BINARY_DATA_TTL', message: SAFE_TO_REMOVE },
		{ env: 'EXECUTIONS_DATA_PRUNE_TIMEOUT', message: SAFE_TO_REMOVE },
		{
			env: 'N8N_BINARY_DATA_MODE',
			message: '`default` is deprecated. Please switch to `filesystem` mode.',
			checkValue: (value: string) => value === 'default',
		},
		{ env: 'N8N_CONFIG_FILES', message: 'Please use .env files or *_FILE env vars instead.' },
		{
			env: 'DB_TYPE',
			message: 'MySQL and MariaDB are deprecated. Please migrate to PostgreSQL.',
			checkValue: (value: string) => ['mysqldb', 'mariadb'].includes(value),
		},
		{ env: 'N8N_SKIP_WEBHOOK_DEREGISTRATION_SHUTDOWN', message: SAFE_TO_REMOVE },
	];

	constructor(private readonly logger: Logger) {}

	warn() {
		this.deprecations.forEach((d) => {
			const envValue = process.env[d.env];
			d.inUse = d.checkValue
				? envValue !== undefined && d.checkValue(envValue)
				: envValue !== undefined;
		});

		const inUse = this.deprecations.filter((d) => d.inUse);

		if (inUse.length === 0) return;

		const header = `The following environment variable${inUse.length === 1 ? ' is' : 's are'} deprecated and will be removed in an upcoming version of n8n. Please take the recommended actions to update your configuration:`;
		const deprecations = inUse.map(({ env, message }) => ` - ${env} -> ${message}\n`).join('');

		this.logger.warn(`\n${header}:\n${deprecations}`);
	}

	isInUse(env: string) {
		return this.deprecations.find((d) => d.env === env)?.inUse ?? false;
	}
}
