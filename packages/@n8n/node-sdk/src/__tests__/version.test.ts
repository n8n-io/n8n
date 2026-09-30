import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { freezeAction } from '../freeze';
import {
	contractHash,
	defineAction,
	defineNode,
	diffContracts,
	generateNodeModule,
	obj,
	str,
	toContract,
	toVersionedNodeType,
	type FrozenVersion,
	type Shape,
	type VersionManifest,
} from '../index';
import { sha256 } from '../version';

const demo = defineNode({ id: 'demo', displayName: 'Demo', credentials: [] });

const contractOf = (input: Shape, hint = 'Text') =>
	toContract(
		defineAction({
			node: demo,
			id: 'demo.echo',
			action: 'Echo',
			summary: 'Echo the text.',
			flow: { effect: 'transform', cardinality: 'per-item', passthrough: 'replace' },
			input,
			output: obj({ text: str().hint(hint) }),
			async run() {},
		}),
	);

describe('contractHash', () => {
	it('ignores key order and changes with any field', () => {
		const contract = contractOf({ text: str() });
		const reordered = Object.fromEntries(Object.entries(contract).reverse());
		expect(contractHash({ ...contract, ...reordered })).toBe(contractHash(contract));
		expect(contractHash({ ...contract, summary: 'Other.' })).not.toBe(contractHash(contract));
	});
});

describe('diffContracts', () => {
	const base = contractOf({ text: str(), prefix: str().optional() });

	it('classifies input and hint changes', () => {
		expect(diffContracts(base, contractOf({ prefix: str().optional() }))).toEqual({
			kind: 'breaking',
			changes: ['input.text removed'],
		});
		expect(
			diffContracts(
				base,
				contractOf({ text: str(), prefix: str().optional(), n: str().optional() }),
			).kind,
		).toBe('additive');
		expect(
			diffContracts(base, contractOf({ text: str(), prefix: str().optional() }, 'Hi')).kind,
		).toBe('none');
	});
});

describe('generateNodeModule', () => {
	it('pins the action version when it is not 1', () => {
		const contract = { ...contractOf({ text: str() }), version: 2 };
		expect(generateNodeModule('demo', [{ contract, nodeType: 'demo.echo' }])).toContain(
			'contractStep("demo.echo", config, 2)',
		);
	});
});

const echoSource = (version: number) => `
import { defineAction, defineNode, obj, str } from '@n8n/node-sdk';
import { shout } from './shout';

export const echo = defineAction({
	node: defineNode({ id: 'demo', displayName: 'Demo', credentials: [] }),
	id: 'demo.echo',
	version: ${version},
	action: 'Echo',
	summary: 'Echo the text.',
	flow: { effect: 'transform', cardinality: 'per-item', passthrough: 'replace' },
	input: { text: str() },
	output: obj({ text: str() }),
	async run({ input, emit }) {
		emit({ text: shout(input.text) });
	},
});
`;

const context = {
	getInputData: () => [{ json: {} }],
	getNode: () => ({ name: 'Echo', credentials: {} }),
	getNodeParameter: () => 'hello',
	continueOnFail: () => false,
	helpers: {},
} as unknown as IExecuteFunctions;

describe('freezeAction and toVersionedNodeType', () => {
	const dirs: { root: string; out: string; entry: string; shout: string } = {
		root: '',
		out: '',
		entry: '',
		shout: '',
	};
	const frozen = (manifest: VersionManifest): FrozenVersion => ({
		manifest,
		readBundle: async () =>
			await readFile(
				path.join(dirs.out, manifest.id, String(manifest.version), 'bundle.cjs'),
				'utf8',
			),
	});
	const run = async (versions: FrozenVersion[], typeVersion: number) => {
		const NodeType = toVersionedNodeType(versions);
		const result = await new NodeType().getNodeType(typeVersion).execute?.call(context);
		const [items = []]: INodeExecutionData[][] = Array.isArray(result) ? result : [];
		return items.map((item) => item.json.text);
	};

	beforeAll(async () => {
		dirs.root = await mkdtemp(path.join(tmpdir(), 'node-sdk-freeze-'));
		dirs.out = path.join(dirs.root, 'versions');
		dirs.entry = path.join(dirs.root, 'echo.ts');
		dirs.shout = path.join(dirs.root, 'shout.ts');
	});

	afterAll(async () => {
		await rm(dirs.root, { recursive: true, force: true });
	});

	it('keeps each frozen version on the helper code it was frozen with', async () => {
		await writeFile(dirs.shout, 'export const shout = (text: string) => text.toUpperCase();\n');
		await writeFile(dirs.entry, echoSource(1));
		const v1 = await freezeAction(dirs.entry, 'echo', dirs.out);
		// Identical bytes: a no-op.
		await expect(freezeAction(dirs.entry, 'echo', dirs.out)).resolves.toEqual(v1);

		// A shared helper changes: v1 cannot take other bytes, so the change ships as v2.
		await writeFile(dirs.shout, "export const shout = (text: string) => text + '!';\n");
		await expect(freezeAction(dirs.entry, 'echo', dirs.out)).rejects.toThrow('bump the version');
		await writeFile(dirs.entry, echoSource(2));
		const v2 = await freezeAction(dirs.entry, 'echo', dirs.out);

		expect(v2.bundleHash).not.toBe(v1.bundleHash);
		expect(v2.contractHash).not.toBe(v1.contractHash);
		expect(v2.description.version).toBe(2);
		const versions = [frozen(v1), frozen(v2)];
		expect(new (toVersionedNodeType(versions))().description.defaultVersion).toBe(2);
		expect(await run(versions, 1)).toEqual(['HELLO']);
		expect(await run(versions, 2)).toEqual(['hello!']);
	});

	it('refuses a bundle that does not match its hash, and an unknown ABI', async () => {
		await writeFile(dirs.shout, 'export const shout = (text: string) => text;\n');
		await writeFile(dirs.entry, echoSource(3));
		const v3 = await freezeAction(dirs.entry, 'echo', dirs.out);
		const tampered = { ...v3, bundleHash: sha256('other bytes') };

		await expect(run([frozen(tampered)], 3)).rejects.toThrow('does not match');
		expect(() => toVersionedNodeType([frozen({ ...v3, abi: 2 })])).toThrow('needs ABI 2');
	});
});
