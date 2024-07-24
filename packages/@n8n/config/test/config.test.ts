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

	const defaultConfig: GlobalConfig = {
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
		eventBus: {
			checkUnsentInterval: 0,
			crashRecoveryMode: 'extensive',
			logWriter: {
				keepLogCount: 3,
				logBaseName: 'n8nEventLog',
				maxFileSizeInKB: 10240,
			},
		},
		externalSecrets: {
			preferGet: false,
			updateInterval: 300,
		},
		nodes: {
			communityPackages: {
				enabled: true,
			},
			errorTriggerType: 'n8n-nodes-base.errorTrigger',
			include: [],
			exclude: [],
		},
		publicApi: {
			disabled: false,
			path: 'api',
			swaggerUiDisabled: false,
		},
		templates: {
			enabled: true,
			host: 'https://api.n8n.io/api/',
		},
		versionNotifications: {
			enabled: true,
			endpoint: 'https://api.n8n.io/api/versions/',
			infoUrl: 'https://docs.n8n.io/hosting/installation/updating/',
		},
		externalStorage: {
			s3: {
				host: '',
				bucket: {
					name: '',
					region: '',
				},
				credentials: {
					accessKey: '',
					accessSecret: '',
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
			NODES_INCLUDE: '["n8n-nodes-base.hackerNews"]',
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
			nodes: {
				...defaultConfig.nodes,
				include: ['n8n-nodes-base.hackerNews'],
			},
		});
		expect(mockFs.readFileSync).not.toHaveBeenCalled();
	});

	it('should read values from files using _FILE env variables', () => {
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
