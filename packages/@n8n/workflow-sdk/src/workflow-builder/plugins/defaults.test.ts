import { registerDefaultPlugins } from './defaults';
import { PluginRegistry } from './registry';

describe('Default Plugins', () => {
	let registry: PluginRegistry;

	beforeEach(() => {
		registry = new PluginRegistry();
	});

	it('registerDefaultPlugins registers core validators', () => {
		registerDefaultPlugins(registry);
		const validators = registry.getValidators();

		// Should have registered at least some validators
		expect(validators.length).toBeGreaterThan(0);

		// Check for specific core validators
		const validatorIds = validators.map((v) => v.id);
		expect(validatorIds).toContain('core:disconnected-node');
		expect(validatorIds).toContain('core:agent');
		expect(validatorIds).toContain('core:http-request');
	});

	it('registerDefaultPlugins registers core composite handlers', () => {
		registerDefaultPlugins(registry);
		const handlers = registry.getCompositeHandlers();

		// Should have registered composite handlers
		expect(handlers.length).toBeGreaterThan(0);

		// Check for specific core handlers
		const handlerIds = handlers.map((h) => h.id);
		expect(handlerIds).toContain('core:if-else');
		expect(handlerIds).toContain('core:switch-case');
		expect(handlerIds).toContain('core:split-in-batches');
	});

	it('registerDefaultPlugins registers core serializers', () => {
		registerDefaultPlugins(registry);

		// Should have registered json serializer
		const jsonSerializer = registry.getSerializer('json');
		expect(jsonSerializer).toBeDefined();
		expect(jsonSerializer?.id).toBe('core:json');
	});

	it('registerDefaultPlugins can be called multiple times safely', () => {
		// First registration should work
		registerDefaultPlugins(registry);
		const initialValidatorCount = registry.getValidators().length;

		// Second registration should not throw (idempotent)
		expect(() => registerDefaultPlugins(registry)).not.toThrow();

		// Should have the same number of validators (no duplicates)
		expect(registry.getValidators().length).toBe(initialValidatorCount);
	});
});
