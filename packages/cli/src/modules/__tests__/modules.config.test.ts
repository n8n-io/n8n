import { GlobalConfig } from '@n8n/config';
import type { DatabaseConfig } from '@n8n/config/src/configs/database.config';
import { Container } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import { ModulesConfig } from '../modules.config';

describe('ModulesConfig', () => {
	let dbConfig: DatabaseConfig;

	beforeEach(() => {
		jest.resetAllMocks();
		process.env = {};
		Container.reset();
		dbConfig = Container.get(GlobalConfig).database;
	});

	it('should initialize with empty modules if no environment variable is set', () => {
		const config = Container.get(ModulesConfig);
		expect(config.modules).toEqual([]);
	});

	it('should initialize with empty modules if database type is postgres', () => {
		dbConfig.type = 'postgresdb';
		const config = Container.get(ModulesConfig);
		expect(config.modules).toEqual([]);
	});

	it('should initialize with default modules for sqlite with pool size', () => {
		dbConfig.type = 'sqlite';
		dbConfig.sqlite.poolSize = 1;
		const config = Container.get(ModulesConfig);
		expect(config.modules).toEqual(['insights']);
	});

	it('should parse valid module names from environment variable', () => {
		dbConfig.type = 'mariadb';
		process.env.N8N_ENABLED_MODULES = 'insights';
		const config = Container.get(ModulesConfig);
		expect(config.modules).toEqual(['insights']);
	});

	it('should disable valid module names from environment variable', () => {
		dbConfig.type = 'mariadb';
		process.env.N8N_DISABLED_MODULES = 'insights';
		const config = Container.get(ModulesConfig);
		expect(config.modules).toEqual([]);
	});

	it('should force disable insights module for sqlite without pool size', () => {
		dbConfig.type = 'sqlite';
		process.env.N8N_ENABLED_MODULES = 'insights';
		const config = Container.get(ModulesConfig);
		expect(config.modules).toEqual([]);
	});

	it('should throw UnexpectedError for invalid module names', () => {
		process.env.N8N_ENABLED_MODULES = 'invalidModule';
		expect(() => Container.get(ModulesConfig)).toThrow(UnexpectedError);
	});

	it('should throw UnexpectedError if any module is both enabled and disabled', () => {
		process.env.N8N_ENABLED_MODULES = 'insights';
		process.env.N8N_DISABLED_MODULES = 'insights';
		const config = Container.get(ModulesConfig);
		expect(() => config.modules).toThrow(UnexpectedError);
	});

	it('should throw UnexpectedError if any enabled module name is invalid', () => {
		process.env.N8N_ENABLED_MODULES = 'insights,invalidModule';
		expect(() => Container.get(ModulesConfig)).toThrow(UnexpectedError);
	});

	it('should throw UnexpectedError if any disabled module name is invalid', () => {
		process.env.N8N_DISABLED_MODULES = 'insights,invalidModule';
		expect(() => Container.get(ModulesConfig)).toThrow(UnexpectedError);
	});
});
