import { Container } from '@n8n/di';

import { ModulesConfig } from '../modules.config';

describe('ModulesConfig', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		process.env = {};
		Container.reset();
	});

	it('should allow enabling a valid module name', () => {
		process.env.N8N_ENABLED_MODULES = 'insights';
		const config = Container.get(ModulesConfig);
		expect(config.enabled).toEqual(['insights']);
	});

	it('should allow disabling a valid module name', () => {
		process.env.N8N_DISABLED_MODULES = 'insights';
		const config = Container.get(ModulesConfig);
		expect(config.disabled).toEqual(['insights']);
	});

	it('should warn when enabling an invalid module name', () => {
		process.env.N8N_ENABLED_MODULES = 'invalidModule';
		const consoleWarnMock = jest.spyOn(console, 'warn').mockImplementation();
		Container.get(ModulesConfig);

		expect(consoleWarnMock).toHaveBeenCalledWith(
			expect.stringContaining('Invalid value for N8N_ENABLED_MODULES'),
		);

		consoleWarnMock.mockRestore();
	});
});
