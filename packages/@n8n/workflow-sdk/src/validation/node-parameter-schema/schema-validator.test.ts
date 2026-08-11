import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';

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

	describe('path component handling', () => {
		it.each([
			'n8n-nodes-base.foo/bar',
			'n8n-nodes-base.foo\\bar',
			'foo/bar.set',
			'n8n-nodes-base.foo\0bar',
		])('returns null for node types containing path separators (%s)', (nodeType) => {
			setSchemaBaseDirs(originalBaseDirs);
			expect(loadSchema(nodeType, 1)).toBeNull();
		});

		it.each([
			// "base..." -> nodeName "..", "base.." -> nodeName "."
			'n8n-nodes-base...',
			'n8n-nodes-base..',
		])('returns null for node types with parent/current-dir components (%s)', (nodeType) => {
			setSchemaBaseDirs(originalBaseDirs);
			expect(loadSchema(nodeType, 1)).toBeNull();
		});

		it('does not resolve a module from outside the schema base directory', () => {
			const tmpRoot = mkdtempSync(path.join(tmpdir(), 'sdk-schema-'));
			try {
				const baseDir = path.join(tmpRoot, 'base');
				mkdirSync(baseDir, { recursive: true });

				// Plant a module where a "../" walk from <baseDir>/nodes/x would land.
				writeFileSync(
					path.join(tmpRoot, 'v1.schema.js'),
					'module.exports = function () { throw new Error("EXECUTED"); };',
				);

				setSchemaBaseDirs([baseDir]);

				// Count the "../" steps needed to climb from <baseDir>/nodes/x back to tmpRoot,
				// then build the type the same way an attacker would ("x." + "../" * n).
				const relative = path.relative(path.join(baseDir, 'nodes', 'x'), tmpRoot);
				const steps = relative.split(path.sep).filter((segment) => segment === '..').length;
				const nodeType = 'x.' + '../'.repeat(steps);

				expect(loadSchema(nodeType, 1)).toBeNull();
				// The planted module must never be required or invoked.
				const result = validateNodeConfig(nodeType, 1, { parameters: {} });
				expect(result.valid).toBe(true);
				expect(result.errors).toEqual([]);
			} finally {
				rmSync(tmpRoot, { recursive: true, force: true });
				setSchemaBaseDirs(originalBaseDirs);
			}
		});

		it('does not load a module through a symlinked directory in the schema tree', () => {
			const tmpRoot = mkdtempSync(path.join(tmpdir(), 'sdk-schema-'));
			try {
				const nodesDir = path.join(tmpRoot, 'base', 'nodes');
				mkdirSync(nodesDir, { recursive: true });

				// Plant a module outside the schema tree, then point a symlinked
				// package directory inside `nodes/` at it.
				const outside = path.join(tmpRoot, 'outside', 'evil');
				mkdirSync(path.join(outside, 'set'), { recursive: true });
				writeFileSync(
					path.join(outside, 'set', 'v1.schema.js'),
					'module.exports = function () { throw new Error("EXECUTED"); };',
				);

				try {
					symlinkSync(outside, path.join(nodesDir, 'evil'), 'dir');
				} catch {
					return; // Platform doesn't permit symlink creation (e.g. Windows CI) — skip.
				}

				setSchemaBaseDirs([path.join(tmpRoot, 'base')]);

				// "evil.set" would resolve to nodes/evil/set/v1.schema — inside the tree
				// lexically, but only reachable by following the symlink out.
				expect(loadSchema('evil.set', 1)).toBeNull();
				const result = validateNodeConfig('evil.set', 1, { parameters: {} });
				expect(result.valid).toBe(true);
				expect(result.errors).toEqual([]);
			} finally {
				rmSync(tmpRoot, { recursive: true, force: true });
				setSchemaBaseDirs(originalBaseDirs);
			}
		});

		it('does not load a module through a symlinked schema file when all parent dirs are real', () => {
			const tmpRoot = mkdtempSync(path.join(tmpdir(), 'sdk-schema-leaf-'));
			try {
				// Every directory in the chain is real — mimics a legitimately installed node package.
				const nodeDir = path.join(tmpRoot, 'base', 'nodes', 'n8n-nodes-base', 'httpRequest');
				mkdirSync(nodeDir, { recursive: true });

				// Attacker-controlled file, living outside the schema tree entirely.
				const outsideFile = path.join(tmpRoot, 'outside.schema.js');
				writeFileSync(
					outsideFile,
					'module.exports = function () { throw new Error("EXECUTED-VIA-LEAF-SYMLINK"); };',
				);

				// Only the leaf FILE is a symlink — nothing above it is.
				try {
					symlinkSync(outsideFile, path.join(nodeDir, 'v1.schema.js'), 'file');
				} catch {
					return; // Platform doesn't permit symlink creation (e.g. Windows CI) — skip.
				}

				setSchemaBaseDirs([path.join(tmpRoot, 'base')]);

				expect(loadSchema('n8n-nodes-base.httpRequest', 1)).toBeNull();
				const result = validateNodeConfig('n8n-nodes-base.httpRequest', 1, { parameters: {} });
				expect(result.valid).toBe(true);
				expect(result.errors).toEqual([]);
			} finally {
				rmSync(tmpRoot, { recursive: true, force: true });
				setSchemaBaseDirs(originalBaseDirs);
			}
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
