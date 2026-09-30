import { Container } from '@n8n/di';

import { UnknownModuleError } from '../errors/unknown-module.error';
import { MODULE_NAMES, ModulesConfig } from '../modules.config';

beforeEach(() => {
	vi.resetAllMocks();
	process.env = {};
	Container.reset();
});

it('should throw `UnknownModuleError` if any enabled module name is invalid', () => {
	process.env.N8N_ENABLED_MODULES = 'insights,invalidModule';
	expect(() => Container.get(ModulesConfig)).toThrowError(UnknownModuleError);
});

it('should throw `UnknownModuleError` if any disabled module name is invalid', () => {
	process.env.N8N_DISABLED_MODULES = 'insights,invalidModule';
	expect(() => Container.get(ModulesConfig)).toThrowError(UnknownModuleError);
});

// Modules initialize in list order, and consumers of the inbound-auth contracts must find a
// binding when they are constructed, so the module that binds them has to initialize first.
it('lists inbound-auth-core first so its contracts are bound before any consumer initializes', () => {
	expect(MODULE_NAMES[0]).toBe('inbound-auth-core');
});
