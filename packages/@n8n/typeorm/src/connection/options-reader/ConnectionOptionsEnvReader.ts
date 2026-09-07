import { DataSourceOptions } from '../../data-source/DataSourceOptions';
import { PlatformTools } from '../../platform/PlatformTools';
import { OrmUtils } from '../../util/OrmUtils';

/**
 * Reads connection options from environment variables.
 * Environment variables can have only a single connection.
 * Its strongly required to define TYPEORM_CONNECTION env variable.
 *
 * @deprecated
 */
export class ConnectionOptionsEnvReader {
	// -------------------------------------------------------------------------
	// Public Methods
	// -------------------------------------------------------------------------

	/**
	 * Reads connection options from environment variables.
	 */
	async read(): Promise<DataSourceOptions[]> {
		return [
			{
				type:
					PlatformTools.getEnvVariable('TYPEORM_CONNECTION') ||
					(PlatformTools.getEnvVariable('TYPEORM_URL')
						? PlatformTools.getEnvVariable('TYPEORM_URL').split('://')[0]
						: undefined),
				url: PlatformTools.getEnvVariable('TYPEORM_URL'),
				host: PlatformTools.getEnvVariable('TYPEORM_HOST'),
				port: this.stringToNumber(PlatformTools.getEnvVariable('TYPEORM_PORT')),
				username: PlatformTools.getEnvVariable('TYPEORM_USERNAME'),
				password: PlatformTools.getEnvVariable('TYPEORM_PASSWORD'),
				database: PlatformTools.getEnvVariable('TYPEORM_DATABASE'),
				schema: PlatformTools.getEnvVariable('TYPEORM_SCHEMA'),
				extra: PlatformTools.getEnvVariable('TYPEORM_DRIVER_EXTRA')
					? JSON.parse(PlatformTools.getEnvVariable('TYPEORM_DRIVER_EXTRA'))
					: undefined,
				synchronize: OrmUtils.toBoolean(PlatformTools.getEnvVariable('TYPEORM_SYNCHRONIZE')),
				dropSchema: OrmUtils.toBoolean(PlatformTools.getEnvVariable('TYPEORM_DROP_SCHEMA')),
				migrationsRun: OrmUtils.toBoolean(PlatformTools.getEnvVariable('TYPEORM_MIGRATIONS_RUN')),
				entities: this.stringToArray(PlatformTools.getEnvVariable('TYPEORM_ENTITIES')),
				migrations: this.stringToArray(PlatformTools.getEnvVariable('TYPEORM_MIGRATIONS')),
				migrationsTableName: PlatformTools.getEnvVariable('TYPEORM_MIGRATIONS_TABLE_NAME'),
				metadataTableName: PlatformTools.getEnvVariable('TYPEORM_METADATA_TABLE_NAME'),
				subscribers: this.stringToArray(PlatformTools.getEnvVariable('TYPEORM_SUBSCRIBERS')),
				logging: this.transformLogging(PlatformTools.getEnvVariable('TYPEORM_LOGGING')),
				logger: PlatformTools.getEnvVariable('TYPEORM_LOGGER'),
				entityPrefix: PlatformTools.getEnvVariable('TYPEORM_ENTITY_PREFIX'),
				maxQueryExecutionTime: PlatformTools.getEnvVariable('TYPEORM_MAX_QUERY_EXECUTION_TIME'),
				cache: this.transformCaching(),
				uuidExtension: PlatformTools.getEnvVariable('TYPEORM_UUID_EXTENSION'),
			},
		];
	}

	// -------------------------------------------------------------------------
	// Protected Methods
	// -------------------------------------------------------------------------

	/**
	 * Transforms logging string into real logging value connection requires.
	 */
	protected transformLogging(logging: string): any {
		if (logging === 'true' || logging === 'TRUE' || logging === '1') return true;
		if (logging === 'all') return 'all';

		return this.stringToArray(logging);
	}

	/**
	 * Transforms caching option into real caching value option requires.
	 */
	protected transformCaching(): boolean | object | undefined {
		const caching = PlatformTools.getEnvVariable('TYPEORM_CACHE');
		if (caching === 'true' || caching === 'TRUE' || caching === '1') return true;
		if (caching === 'false' || caching === 'FALSE' || caching === '0') return false;
		if (caching === 'database')
			return {
				type: caching,
				options: PlatformTools.getEnvVariable('TYPEORM_CACHE_OPTIONS')
					? JSON.parse(PlatformTools.getEnvVariable('TYPEORM_CACHE_OPTIONS'))
					: undefined,
				alwaysEnabled: PlatformTools.getEnvVariable('TYPEORM_CACHE_ALWAYS_ENABLED'),
				duration: parseInt(PlatformTools.getEnvVariable('TYPEORM_CACHE_DURATION')),
			};

		return undefined;
	}

	/**
	 * Converts a string which contains multiple elements split by comma into a string array of strings.
	 */
	protected stringToArray(variable?: string) {
		if (!variable) return [];
		return variable.split(',').map((str) => str.trim());
	}

	/**
	 * Converts a string which contains a number into a javascript number
	 */
	private stringToNumber(value: any): number | undefined {
		if (!value) {
			return undefined;
		}

		return parseInt(value);
	}
}
