import {
	validateNodeConfig,
	loadSchema,
	setSchemaBaseDirs,
	getSchemaBaseDirs,
} from './schema-validator';
import { setupTestSchemas, teardownTestSchemas } from './test-schema-setup';

describe('schema-validator', () => {
	// Store original dirs to restore after tests
	let originalBaseDirs: string[];

	beforeAll(async () => {
		await setupTestSchemas();
		originalBaseDirs = getSchemaBaseDirs();
	}, 120_000);

	afterAll(() => {
		teardownTestSchemas();
	});

	describe('loadSchema', () => {
		it('returns null when schema file does not exist', () => {
			const schema = loadSchema('non-existent.node', 1);
			expect(schema).toBeNull();
		});

		it('loads schema for flat version structure (e.g., set v2)', () => {
			// Uses generated schemas from configured schemaBaseDirs
			// SetV2ConfigSchema in nodes/n8n-nodes-base/set/v2.schema.js
			const schema = loadSchema('n8n-nodes-base.set', 2);
			expect(schema).not.toBeNull();
		});

		it('loads schema for version with decimal (e.g., httpRequest v4.2)', () => {
			// HttpRequestV42ConfigSchema in nodes/n8n-nodes-base/httpRequest/v42.schema.js
			const schema = loadSchema('n8n-nodes-base.httpRequest', 4.2);
			expect(schema).not.toBeNull();
		});

		it('loads schema for langchain nodes with @n8n prefix', () => {
			// LcAgentV1ConfigSchema in nodes/n8n-nodes-langchain/agent/v1.schema.js
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

		it('accepts missing discriminator when default matches a valid branch', () => {
			// Set v3 mode defaults to 'manual', so missing mode is valid
			// The schema applies the default and validates against the manual branch
			const result = validateNodeConfig('n8n-nodes-base.set', 3, {
				parameters: {
					// mode is missing but defaults to 'manual'
					fields: { values: [] },
				},
			});
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it('returns clear error when discriminator has wrong value', () => {
			// Set v3 mode must be 'manual' or 'raw'
			const result = validateNodeConfig('n8n-nodes-base.set', 3, {
				parameters: {
					mode: 'invalid-mode',
					assignments: { assignments: [] },
				},
			});
			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(0);
			// Error message should mention the wrong value and expected values
			const errorMsg = result.errors[0].message;
			expect(errorMsg).toMatch(/mode/i);
			expect(errorMsg).toMatch(/invalid-mode/i);
		});

		it('validates AI node with valid subnode config', () => {
			// The schema now models conditional visibility with displayOptions.
			// For 'conversationalAgent' (default), only certain fields are visible.
			// We provide only the fields that are visible for this agent type.
			const result = validateNodeConfig('@n8n/n8n-nodes-langchain.agent', 1, {
				parameters: {
					agent: 'conversationalAgent',
					// Note: text, binaryPropertyName, input are conditionally shown based on agent type
					// and are not visible for 'conversationalAgent'
				},
				subnodes: {
					model: { type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1 },
				},
			});
			expect(result.valid).toBe(true);
		});

		it('validates AI node subnode config with array of tools', () => {
			// Use 'conversationalAgent' which only needs the model subnode
			const result = validateNodeConfig('@n8n/n8n-nodes-langchain.agent', 1, {
				parameters: {
					agent: 'conversationalAgent',
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

	describe('setSchemaBaseDirs', () => {
		it('allows setting custom schema base dirs', () => {
			const customDirs = ['/custom/path/to/schemas'];
			setSchemaBaseDirs(customDirs);
			expect(getSchemaBaseDirs()).toEqual(customDirs);
		});

		it('affects schema loading behavior', () => {
			// Set to a non-existent path
			setSchemaBaseDirs(['/nonexistent/path']);

			// Schema that would normally be found should now be null
			const schema = loadSchema('n8n-nodes-base.set', 2);
			expect(schema).toBeNull();

			// Restore for other tests
			setSchemaBaseDirs(originalBaseDirs);
		});
	});
});
