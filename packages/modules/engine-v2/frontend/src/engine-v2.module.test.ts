import { EngineV2Module } from './engine-v2.module';

describe('EngineV2Module', () => {
	it('keeps the id the backend module publishes in `activeModules`', () => {
		// A mismatch is silent: `isModuleActive` compares strings, so the module would
		// never report active. The twin is `packages/cli/src/modules/engine-v2`.
		expect(EngineV2Module.id).toBe('engine-v2');
	});
});
