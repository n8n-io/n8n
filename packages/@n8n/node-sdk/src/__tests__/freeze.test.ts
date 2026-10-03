import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { freezeAction, GUEST_LACKS } from '../freeze';

it('GUEST_LACKS are globals of Node, besides the CommonJS names', () => {
	expect(GUEST_LACKS.filter((name) => !(name in globalThis))).toEqual(['__dirname', '__filename']);
});

const probeSource = (value: string, header = '') => `import { defineNode, t } from '@n8n/node-sdk';
const { obj, str } = t;
${header}
const probe = defineNode({ id: 'probe', displayName: 'Probe' });
export const probeAction = probe.action('probe', {
	action: 'Probe',
	summary: 'Probe the freeze check.',
	flow: { effect: 'read', cardinality: 'per-item' },
	input: {},
	output: obj({ value: str() }),
	run: async () => ({ value: String(${value}) }),
} as any);
`;

describe('freezeAction', () => {
	const dirs = { root: '' };
	const freeze = async (value: string, header?: string) => {
		const entry = path.join(dirs.root, `${Math.random().toString(36).slice(2)}.ts`);
		await writeFile(entry, probeSource(value, header));
		return await freezeAction(entry, 'probeAction');
	};

	beforeAll(async () => {
		dirs.root = await mkdtemp(path.join(tmpdir(), 'node-sdk-freeze-'));
	});

	afterAll(async () => {
		await rm(dirs.root, { recursive: true, force: true });
	});

	it.each([
		['Buffer', "Buffer.from('x').toString('base64')", '', 'the global Buffer'],
		['process', 'process.env.HOME', '', 'the global process'],
		['globalThis.process', 'globalThis.process.env.HOME', '', 'the global process'],
		['setImmediate', 'setImmediate(() => undefined)', '', 'the global setImmediate'],
		['__dirname', '__dirname', '', 'the global __dirname'],
		['Intl', "new Intl.NumberFormat('de').format(1)", '', 'the global Intl'],
		['fetch', "await fetch('https://example.com')", '', 'the global fetch'],
		['globalThis.fetch', "await globalThis.fetch('https://example.com')", '', 'the global fetch'],
		[
			'a Node module',
			"createHash('sha1')",
			"import { createHash } from 'node:crypto';",
			'the module node:crypto',
		],
		['a dynamic import', "await import('node:fs')", '', 'the module node:fs'],
		['a \\p{} regex literal', "/\\p{L}/u.test('é')", '', 'a Unicode property escape'],
		[
			'a \\p{} regex source',
			"new RegExp('\\\\p{Lu}', 'u').test('É')",
			'',
			'a Unicode property escape',
		],
	])('refuses a bundle that uses %s', async (_what, value, header, gap) => {
		await expect(freeze(value, header)).rejects.toThrow(`uses what a bundle may not use: ${gap}`);
	});

	it.each([
		['a global guarded with typeof', "typeof process === 'undefined' ? 'none' : process.env.HOME"],
		['fetch guarded with typeof', "typeof fetch === 'function' ? 'fetch' : 'none'"],
		['a local that shadows a global', '((process: string) => process)("local")'],
		['a property with the name of a global', '({ process: 1, Buffer: 2 }).process'],
		['a regex without \\p{}', "/[a-zé]+/u.test('é')"],
	])('freezes a bundle with %s', async (_what, value) => {
		await expect(freeze(value)).resolves.toMatchObject({ manifest: { id: 'probe.probe' } });
	});
});
