import { Container } from 'typedi';
import { GlobalConfig } from '../src/index';

describe('GlobalConfig', () => {
	beforeEach(() => {
		Container.reset();
	});

	const originalEnv = process.env;
	afterEach(() => {
		process.env = originalEnv;
	});

	const defaultConfig = {
		database: {
			logging: {
				enabled: false,
				maxQueryExecutionTime: 0,
				options: 'error',
			},
			mysqldb: {
				database: 'n8n',
				host: 'localhost',
				password: '',
				port: 3306,
				user: 'root',
			},
			postgresdb: {
				database: 'n8n',
				host: 'localhost',
				password: '',
				poolSize: 2,
				port: 5432,
				schema: 'public',
				ssl: {
					ca: '',
					cert: '',
					enabled: false,
					key: '',
					rejectUnauthorized: true,
				},
				user: 'postgres',
			},
			sqlite: {
				database: 'database.sqlite',
				enableWAL: false,
				executeVacuumOnStartup: false,
				poolSize: 0,
			},
			tablePrefix: '',
			type: 'sqlite',
		},
	};

	it('should use all default values when no env variables are defined', () => {
		process.env = {};
		const config = Container.get(GlobalConfig);
		expect(config).toEqual(defaultConfig);
	});

	it('should use values from env variables when defined', () => {
		process.env = {
			DB_POSTGRESDB_HOST: 'some-host',
			DB_POSTGRESDB_USER: 'n8n',
			DB_TABLE_PREFIX: 'test_',
		};
		const config = Container.get(GlobalConfig);
		expect(config).toEqual({
			database: {
				logging: defaultConfig.database.logging,
				mysqldb: defaultConfig.database.mysqldb,
				postgresdb: {
					...defaultConfig.database.postgresdb,
					host: 'some-host',
					user: 'n8n',
				},
				sqlite: defaultConfig.database.sqlite,
				tablePrefix: 'test_',
				type: 'sqlite',
			},
		});
	});
});
