import { Container } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import { ModulesConfig } from '../modules.config';

describe('ModulesConfig', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		process.env = {};
		Container.reset();
	});

	it('should initialize with empty modules if no environment variable is set', () => {
		const config = Container.get(ModulesConfig);
		expect(config.modules).toEqual([]);
	});

	it('should parse valid module names from environment variable', () => {
		process.env.N8N_ENABLED_MODULES = 'insights';
		const config = Container.get(ModulesConfig);
		expect(config.modules).toEqual(['insights']);
	});

	it('should throw UnexpectedError for invalid module names', () => {
		process.env.N8N_ENABLED_MODULES = 'invalidModule';
		expect(() => Container.get(ModulesConfig)).toThrow(UnexpectedError);
	});

	it('should throw UnexpectedError if any module name is invalid', () => {
		process.env.N8N_ENABLED_MODULES = 'insights,invalidModule';
		expect(() => Container.get(ModulesConfig)).toThrow(UnexpectedError);
	});
});
