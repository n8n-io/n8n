import fs from 'fs';
import { Container } from 'typedi';
import { mock } from 'jest-mock-extended';
import { GlobalConfig } from '../src/index';

jest.mock('fs');
const mockFs = mock<typeof fs>();
fs.readFileSync = mockFs.readFileSync;

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

		credentials: {
			defaultName: 'My credentials',
			overwrite: {
				data: '{}',
				endpoint: '',
			},
		},
		userManagement: {
			emails: {
				mode: 'smtp',
				smtp: {
					host: '',
					port: 465,
					secure: true,
					sender: '',
					startTLS: true,
					auth: {
						pass: '',
						user: '',
						privateKey: '',
						serviceClient: '',
					},
				},
				template: {
					credentialsShared: '',
					invite: '',
					passwordReset: '',
					workflowShared: '',
				},
			},
		},
	};

	it('should use all default values when no env variables are defined', () => {
		process.env = {};
		const config = Container.get(GlobalConfig);
		expect(config).toEqual(defaultConfig);
		expect(mockFs.readFileSync).not.toHaveBeenCalled();
	});

	it('should use values from env variables when defined', () => {
		process.env = {
			DB_POSTGRESDB_HOST: 'some-host',
			DB_POSTGRESDB_USER: 'n8n',
			DB_TABLE_PREFIX: 'test_',
		};
		const config = Container.get(GlobalConfig);
		expect(config).toEqual({
			...defaultConfig,
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
		expect(mockFs.readFileSync).not.toHaveBeenCalled();
	});

	it('should use values from env variables when defined and convert them to the correct type', () => {
		const passwordFile = '/path/to/postgres/password';
		process.env = {
			DB_POSTGRESDB_PASSWORD_FILE: passwordFile,
		};
		mockFs.readFileSync.calledWith(passwordFile, 'utf8').mockReturnValueOnce('password-from-file');

		const config = Container.get(GlobalConfig);
		expect(config).toEqual({
			...defaultConfig,
			database: {
				...defaultConfig.database,
				postgresdb: {
					...defaultConfig.database.postgresdb,
					password: 'password-from-file',
				},
			},
		});
		expect(mockFs.readFileSync).toHaveBeenCalled();
	});
});
