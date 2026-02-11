import { PluginRegistry, pluginRegistry } from './registry';
import type { ValidatorPlugin, CompositeHandlerPlugin, SerializerPlugin } from './types';

// Helper to create mock validators
function createMockValidator(id: string, nodeTypes: string[] = [], priority = 0): ValidatorPlugin {
	return {
		id,
		name: `Mock Validator ${id}`,
		nodeTypes,
		priority,
		validateNode: jest.fn().mockReturnValue([]),
	};
}

// Helper to create mock composite handlers
function createMockCompositeHandler(
	id: string,
	canHandleFn: (x: unknown) => boolean = () => false,
	priority = 0,
): CompositeHandlerPlugin {
	return {
		id,
		name: `Mock Handler ${id}`,
		priority,
		canHandle: canHandleFn as (input: unknown) => input is unknown,
		addNodes: jest.fn().mockReturnValue('mock-node'),
	};
}

// Helper to create mock serializers
function createMockSerializer(id: string, format: string): SerializerPlugin {
	return {
		id,
		name: `Mock Serializer ${id}`,
		format,
		serialize: jest.fn().mockReturnValue({}),
	};
}

describe('PluginRegistry', () => {
	let registry: PluginRegistry;

	beforeEach(() => {
		// Create a fresh registry for each test
		registry = new PluginRegistry();
	});

	describe('Validator Registration', () => {
		it('registerValidator adds validator to registry', () => {
			const validator = createMockValidator('test:v1');
			registry.registerValidator(validator);
			expect(registry.getValidators()).toContain(validator);
		});

		it('registerValidator throws on duplicate id', () => {
			const validator = createMockValidator('test:v1');
			registry.registerValidator(validator);
			expect(() => registry.registerValidator(validator)).toThrow(
				"Validator 'test:v1' is already registered",
			);
		});

		it('getValidatorsForNodeType returns validators matching nodeType', () => {
			const agentValidator = createMockValidator('test:agent', ['@n8n/n8n-nodes-langchain.agent']);
			const allValidator = createMockValidator('test:all', []);
			registry.registerValidator(agentValidator);
			registry.registerValidator(allValidator);

			const result = registry.getValidatorsForNodeType('@n8n/n8n-nodes-langchain.agent');
			expect(result).toContain(agentValidator);
			expect(result).toContain(allValidator);
		});

		it('getValidatorsForNodeType excludes validators for other nodeTypes', () => {
			const agentValidator = createMockValidator('test:agent', ['@n8n/n8n-nodes-langchain.agent']);
			const httpValidator = createMockValidator('test:http', ['n8n-nodes-base.httpRequest']);
			registry.registerValidator(agentValidator);
			registry.registerValidator(httpValidator);

			const result = registry.getValidatorsForNodeType('n8n-nodes-base.httpRequest');
			expect(result).toContain(httpValidator);
			expect(result).not.toContain(agentValidator);
		});

		it('getValidators returns validators sorted by priority (high first)', () => {
			const low = createMockValidator('test:low', [], 10);
			const high = createMockValidator('test:high', [], 100);
			const medium = createMockValidator('test:medium', [], 50);
			registry.registerValidator(low);
			registry.registerValidator(high);
			registry.registerValidator(medium);

			const result = registry.getValidators();
			expect(result[0]).toBe(high);
			expect(result[1]).toBe(medium);
			expect(result[2]).toBe(low);
		});

		it('unregisterValidator removes validator from registry', () => {
			const validator = createMockValidator('test:v1');
			registry.registerValidator(validator);
			registry.unregisterValidator('test:v1');
			expect(registry.getValidators()).not.toContain(validator);
		});

		it('unregisterValidator does nothing for unknown id', () => {
			expect(() => registry.unregisterValidator('unknown:id')).not.toThrow();
		});
	});

	describe('Composite Handler Registration', () => {
		it('registerCompositeHandler adds handler to registry', () => {
			const handler = createMockCompositeHandler('test:h1');
			registry.registerCompositeHandler(handler);
			expect(registry.getCompositeHandlers()).toContain(handler);
		});

		it('registerCompositeHandler throws on duplicate id', () => {
			const handler = createMockCompositeHandler('test:h1');
			registry.registerCompositeHandler(handler);
			expect(() => registry.registerCompositeHandler(handler)).toThrow(
				"Composite handler 'test:h1' is already registered",
			);
		});

		it('findCompositeHandler returns first handler where canHandle returns true', () => {
			const handler1 = createMockCompositeHandler('test:h1', (x) => x === 'match1');
			const handler2 = createMockCompositeHandler('test:h2', (x) => x === 'match2');
			registry.registerCompositeHandler(handler1);
			registry.registerCompositeHandler(handler2);

			expect(registry.findCompositeHandler('match2')).toBe(handler2);
		});

		it('findCompositeHandler returns undefined when no handler matches', () => {
			const handler = createMockCompositeHandler('test:h1', () => false);
			registry.registerCompositeHandler(handler);

			expect(registry.findCompositeHandler('no-match')).toBeUndefined();
		});

		it('findCompositeHandler checks handlers in priority order (high first)', () => {
			const lowPriority = createMockCompositeHandler('test:low', () => true, 10);
			const highPriority = createMockCompositeHandler('test:high', () => true, 100);
			registry.registerCompositeHandler(lowPriority);
			registry.registerCompositeHandler(highPriority);

			expect(registry.findCompositeHandler('anything')).toBe(highPriority);
		});

		it('unregisterCompositeHandler removes handler from registry', () => {
			const handler = createMockCompositeHandler('test:h1');
			registry.registerCompositeHandler(handler);
			registry.unregisterCompositeHandler('test:h1');
			expect(registry.getCompositeHandlers()).not.toContain(handler);
		});
	});

	describe('Serializer Registration', () => {
		it('registerSerializer adds serializer to registry', () => {
			const serializer = createMockSerializer('test:json', 'json');
			registry.registerSerializer(serializer);
			expect(registry.getSerializer('json')).toBe(serializer);
		});

		it('registerSerializer throws on duplicate id', () => {
			const serializer = createMockSerializer('test:json', 'json');
			registry.registerSerializer(serializer);
			expect(() => registry.registerSerializer(serializer)).toThrow(
				"Serializer 'test:json' is already registered",
			);
		});

		it('registerSerializer throws on duplicate format', () => {
			const serializer1 = createMockSerializer('test:json1', 'json');
			const serializer2 = createMockSerializer('test:json2', 'json');
			registry.registerSerializer(serializer1);
			expect(() => registry.registerSerializer(serializer2)).toThrow(
				"Serializer for format 'json' is already registered",
			);
		});

		it('getSerializer returns serializer by format', () => {
			const serializer = createMockSerializer('test:json', 'json');
			registry.registerSerializer(serializer);
			expect(registry.getSerializer('json')).toBe(serializer);
		});

		it('getSerializer returns undefined for unknown format', () => {
			expect(registry.getSerializer('unknown')).toBeUndefined();
		});

		it('unregisterSerializer removes serializer from registry', () => {
			const serializer = createMockSerializer('test:json', 'json');
			registry.registerSerializer(serializer);
			registry.unregisterSerializer('test:json');
			expect(registry.getSerializer('json')).toBeUndefined();
		});
	});

	describe('Clear All', () => {
		it('clearAll removes all registered plugins', () => {
			registry.registerValidator(createMockValidator('test:v1'));
			registry.registerCompositeHandler(createMockCompositeHandler('test:h1'));
			registry.registerSerializer(createMockSerializer('test:s1', 'format1'));

			registry.clearAll();

			expect(registry.getValidators()).toHaveLength(0);
			expect(registry.getCompositeHandlers()).toHaveLength(0);
			expect(registry.getSerializer('format1')).toBeUndefined();
		});
	});
});

describe('pluginRegistry singleton', () => {
	it('exports a singleton instance', () => {
		expect(pluginRegistry).toBeInstanceOf(PluginRegistry);
	});

	it('returns the same instance on multiple imports', () => {
		// Import again to verify singleton - intentionally using require() to test module-level singleton
		// eslint-disable-next-line @typescript-eslint/no-require-imports -- Testing CommonJS singleton behavior
		const { pluginRegistry: anotherRegistry } = require('./registry') as {
			pluginRegistry: PluginRegistry;
		};
		expect(anotherRegistry).toBe(pluginRegistry);
	});
});
