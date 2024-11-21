import { Service } from 'typedi';

import { Logger } from '@/logging/logger.service';

type Deprecation = {
	env: string;
	message: string;
	inUse?: boolean;
	checkValue?: (value: string) => boolean;
};

const SAFE_TO_REMOVE = 'This can be safely removed.';

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

		const header = `Found deprecated feature${inUse.length === 1 ? '' : 's'} in use, to be removed in an upcoming version of n8n`;
		const deprecations = inUse.map(({ env, message }) => ` - ${env} -> ${message}\n`).join('');

		this.logger.warn(`\n${header}:\n${deprecations}`);
	}

	isInUse(env: string) {
		return this.deprecations.find((d) => d.env === env)?.inUse ?? false;
	}
}
