import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { getSchemaBaseDirs, setSchemaBaseDirs, validateNodeConfig } from './schema-validator';

describe('schema error batching', () => {
	let root: string;
	let originalDirs: string[];
	const valid = { mode: 'send', first: true, second: true, third: true, fourth: true, label: 'ok' };

	beforeAll(() => {
		originalDirs = getSchemaBaseDirs();
		root = mkdtempSync(join(tmpdir(), 'sdk-schema-batching-'));
		const nodeDir = join(root, 'nodes', 'custom-pkg', 'batch');
		mkdirSync(nodeDir, { recursive: true });
		writeFileSync(
			join(nodeDir, 'v1.schema.js'),
			`module.exports = ({ z }) => z.union([
  z.object({ parameters: z.object({
    mode: z.literal('send'),
    first: z.boolean(), second: z.boolean(), third: z.boolean(), fourth: z.boolean(),
    label: z.string().min(2),
  }) }),
  z.object({ parameters: z.object({ mode: z.literal('list') }) }),
]);`,
		);
		writeFileSync(
			join(nodeDir, 'v2.schema.js'),
			`module.exports = ({ z }) => z.union([
  z.object({ parameters: z.object({ mode: z.literal('send'),
    first: z.string().min(2), second: z.string().min(2), third: z.string().min(2), fourth: z.string().min(2),
  }) }),
  z.object({ parameters: z.object({ mode: z.literal('list') }) }),
]);`,
		);
		setSchemaBaseDirs([root]);
	});

	afterAll(() => {
		setSchemaBaseDirs(originalDirs);
		rmSync(root, { recursive: true, force: true });
	});

	it('reports all four type failures in the selected variant', () => {
		const result = validateNodeConfig('custom-pkg.batch', 1, {
			parameters: { ...valid, first: {}, second: {}, third: {}, fourth: {} },
		});
		expect(result.valid).toBe(false);
		const message = result.errors.map((e) => e.message).join('\n');
		for (const field of ['first', 'second', 'third', 'fourth']) {
			expect(message).toContain(`"parameters.${field}" (expected boolean, got object)`);
		}
		expect(message).not.toContain('more');
	});

	it('reports all four non-type failures in the selected variant', () => {
		const result = validateNodeConfig('custom-pkg.batch', 2, {
			parameters: { mode: 'send', first: '', second: '', third: '', fourth: '' },
		});
		expect(result.valid).toBe(false);
		const message = result.errors.map((e) => e.message).join('\n');
		for (const field of ['first', 'second', 'third', 'fourth']) {
			expect(message).toContain(`"parameters.${field}"`);
		}
	});

	it('reports other issue classes alongside a type failure', () => {
		const result = validateNodeConfig('custom-pkg.batch', 1, {
			parameters: { ...valid, first: {}, label: '' },
		});
		const message = result.errors.map((e) => e.message).join('\n');
		expect(message).toContain(
			'Field "parameters.first" has wrong type: expected boolean, got object.',
		);
		expect(message).toContain('"parameters.label"');
	});

	it('preserves the single-error wording', () => {
		const result = validateNodeConfig('custom-pkg.batch', 1, {
			parameters: { ...valid, first: {} },
		});
		expect(result.errors.map((e) => e.message)).toEqual([
			'Field "parameters.first" has wrong type: expected boolean, got object.',
		]);
	});

	it('preserves discriminator guidance without reporting incompatible variants', () => {
		const result = validateNodeConfig('custom-pkg.batch', 1, {
			parameters: { mode: 'invalid' },
		});
		expect(result.errors.map((e) => e.message)).toEqual([
			'Invalid value for "parameters.mode": got "invalid", expected one of: "send", "list".',
		]);
	});

	it('accepts the corrected configuration', () => {
		expect(validateNodeConfig('custom-pkg.batch', 1, { parameters: valid }).valid).toBe(true);
	});
});
