import {
	validateNodeConfig,
	loadSchema,
	setSchemaBasePath,
	getSchemaBasePath,
} from '../validation/schema-validator';

describe('schema-validator', () => {
	// Store original path to restore after tests
	let originalBasePath: string;

	beforeAll(() => {
		originalBasePath = getSchemaBasePath();
	});

	afterAll(() => {
		setSchemaBasePath(originalBasePath);
	});

	describe('loadSchema', () => {
		it('returns null when schema file does not exist', () => {
			const schema = loadSchema('non-existent.node', 1);
			expect(schema).toBeNull();
		});

		it('loads schema for flat version structure (e.g., set v2)', () => {
			// Uses generated schemas at ~/.n8n/generated-types/
			// SetV2ConfigSchema in nodes/n8n-nodes-base/set/v2.schema.ts
			const schema = loadSchema('n8n-nodes-base.set', 2);
			expect(schema).not.toBeNull();
		});

		it('loads schema for version with decimal (e.g., httpRequest v4.2)', () => {
			// HttpRequestV42ConfigSchema in nodes/n8n-nodes-base/httpRequest/v42.schema.ts
			const schema = loadSchema('n8n-nodes-base.httpRequest', 4.2);
			expect(schema).not.toBeNull();
		});

		it('loads schema for langchain nodes with @n8n prefix', () => {
			// LcAgentV1ConfigSchema in nodes/n8n-nodes-langchain/agent/v1.schema.ts
			const schema = loadSchema('@n8n/n8n-nodes-langchain.agent', 1);
			expect(schema).not.toBeNull();
		});

		it('caches schema after first load', () => {
			// First load
			const schema1 = loadSchema('n8n-nodes-base.set', 2);
			// Second load should return same cached instance
			const schema2 = loadSchema('n8n-nodes-base.set', 2);
			// Should be the exact same object reference (cached)
			expect(schema1).toBe(schema2);
		});
	});

	describe('validateNodeConfig', () => {
		it('returns valid:true when no schema exists (graceful fallback)', () => {
			const result = validateNodeConfig('non-existent.node', 1, { parameters: {} });
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it('returns valid:true for valid config with correct parameter types', () => {
			// Set v2 has keepOnlySet: boolean
			const result = validateNodeConfig('n8n-nodes-base.set', 2, {
				parameters: { keepOnlySet: true },
			});
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it('accepts expressions as valid parameter values', () => {
			// Expressions like ={{ $json.value }} are always valid
			const result = validateNodeConfig('n8n-nodes-base.set', 2, {
				parameters: { keepOnlySet: '={{ $json.flag }}' },
			});
			expect(result.valid).toBe(true);
		});

		it('returns errors for invalid parameter type', () => {
			// keepOnlySet should be boolean or expression, not a plain string
			const result = validateNodeConfig('n8n-nodes-base.set', 2, {
				parameters: { keepOnlySet: 'not-a-boolean' },
			});
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0].path).toContain('keepOnlySet');
		});

		it('validates AI node with valid subnode config', () => {
			// The schema requires text, binaryPropertyName, and input - all string fields
			// These are conditionally shown based on agent type, but the Zod schema doesn't
			// model conditional visibility, so we provide all required fields
			const result = validateNodeConfig('@n8n/n8n-nodes-langchain.agent', 1, {
				parameters: {
					text: 'Hello',
					binaryPropertyName: 'data',
					input: 'test',
				},
				subnodes: {
					model: { type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1 },
				},
			});
			expect(result.valid).toBe(true);
		});

		it('validates AI node subnode config with array of tools', () => {
			const result = validateNodeConfig('@n8n/n8n-nodes-langchain.agent', 1, {
				parameters: {
					text: 'Hello',
					binaryPropertyName: 'data',
					input: 'test',
				},
				subnodes: {
					model: { type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1 },
					tools: [
						{ type: '@n8n/n8n-nodes-langchain.toolCode', version: 1 },
						{ type: '@n8n/n8n-nodes-langchain.toolCalculator', version: 1 },
					],
				},
			});
			expect(result.valid).toBe(true);
		});

		it('accepts undefined parameters (optional)', () => {
			// Config with no parameters should be valid (parameters is optional in schema)
			const result = validateNodeConfig('n8n-nodes-base.set', 2, {});
			expect(result.valid).toBe(true);
		});

		it('accepts empty parameters object', () => {
			const result = validateNodeConfig('n8n-nodes-base.set', 2, {
				parameters: {},
			});
			expect(result.valid).toBe(true);
		});
	});

	describe('setSchemaBasePath', () => {
		it('allows setting a custom schema base path', () => {
			const customPath = '/custom/path/to/schemas';
			setSchemaBasePath(customPath);
			expect(getSchemaBasePath()).toBe(customPath);
		});

		it('affects schema loading behavior', () => {
			// Set to a non-existent path
			setSchemaBasePath('/nonexistent/path');

			// Schema that would normally be found should now be null
			const schema = loadSchema('n8n-nodes-base.set', 2);
			expect(schema).toBeNull();

			// Restore for other tests
			setSchemaBasePath(originalBasePath);
		});
	});
});
