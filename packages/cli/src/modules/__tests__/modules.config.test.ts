import { Container } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import { ModulesConfig } from '../modules.config';

describe('ModulesConfig', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		process.env = {};
		Container.reset();
	});

	it('should initialize with insights modules if no environment variable is set', () => {
		const config = Container.get(ModulesConfig);
		expect(config.modules).toEqual(['insights']);
	});

	it('should parse valid module names from environment variable', () => {
		process.env.N8N_ENABLED_MODULES = 'insights';
		const config = Container.get(ModulesConfig);
		expect(config.modules).toEqual(['insights']);
	});

	it('should disable valid module names from environment variable', () => {
		process.env.N8N_DISABLED_MODULES = 'insights';
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
