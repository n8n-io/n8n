import {
	contractHash,
	diffContracts,
	parseFixtures,
	parseManifest,
	setNodeContractRange,
	setContractVersionLoader,
	toVersionedNodeType,
	type ContractFixtures,
	type ExecutionFixture,
	type FrozenVersion,
} from '@n8n/node-sdk';
import { replayFixtures } from '@n8n/node-sdk/publish';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { IExecuteFunctions, INodeExecutionData, ITaskMetadata } from 'n8n-workflow';

import { FIXTURES_DIR } from '../../scripts/publish';
import { versionsOf } from '../registry';

const ID = 'notion.databasePage.getAll';
// Frozen by the freeze of commit 9c6637da2bf^, the last one with `emit` (`abi: 1`).
const V1_DIR = path.join(FIXTURES_DIR, 'versions', `${ID}@1.1.0`);

const v1Text = readFileSync(path.join(V1_DIR, 'manifest.json'), 'utf8');
const v1Bundle = readFileSync(path.join(V1_DIR, 'bundle.cjs'), 'utf8');
const v1: FrozenVersion = { manifest: parseManifest(v1Text), readBundle: async () => v1Bundle };
const [head] = versionsOf(ID);

const fixtures = parseFixtures(readFileSync(path.join(FIXTURES_DIR, `${ID}.json`), 'utf8'));

/** The fixture with its query result split into two pages, so the run pages. */
const paged = (fixture: ExecutionFixture): ExecutionFixture => {
	const [lookup, query] = fixture.responses;
	const results =
		typeof query === 'object' &&
		query !== null &&
		'results' in query &&
		Array.isArray(query.results)
			? query.results
			: [];
	return {
		...fixture,
		name: `${fixture.name}, paged`,
		responses: [
			lookup,
			{ results: results.slice(0, 1), has_more: true, next_cursor: 'c2' },
			{ results: results.slice(1), has_more: false, next_cursor: null },
		],
	};
};

const allFixtures: ContractFixtures = {
	executions: [...fixtures.executions, ...fixtures.executions.map(paged)],
};

/** Runs `frozen` in the n8n node of HEAD, as the registry loader does for a locked version. */
async function runInNode(frozen: FrozenVersion, fixture: ExecutionFixture) {
	if (!head) throw new Error(`${ID} has no bundled HEAD`);
	setContractVersionLoader(async () => frozen);
	const defaults = new Map(head.manifest.description.properties.map((p) => [p.name, p.default]));
	const responses = [...fixture.responses];
	const metadata: ITaskMetadata[] = [];
	const context = {
		getInputData: () => [{ json: {} }],
		getNode: () => ({ name: 'Notion', credentials: { notionApi: { id: '1', name: 'Notion' } } }),
		getNodeParameter: (name: string) => fixture.params[name] ?? defaults.get(name),
		getCredentials: async () => ({}),
		continueOnFail: () => false,
		setMetadata: (value: ITaskMetadata) => metadata.push(value),
		helpers: { httpRequestWithAuthentication: async () => responses.shift() },
	} as unknown as IExecuteFunctions;
	const NodeType = toVersionedNodeType([head]);
	const result = await new NodeType().getNodeType(1).execute?.call(context);
	const [items = []]: INodeExecutionData[][] = Array.isArray(result) ? result : [];
	return { items, metadata, left: responses.length };
}

describe('n8n:action@1 next to @2', () => {
	afterEach(() => {
		setNodeContractRange('>=1.0.0 <3.0.0');
		setContractVersionLoader(async (_context, bundled) => bundled);
	});

	it('read the abi field of the @1 manifest as its Node Contract version', () => {
		expect(JSON.parse(v1Text)).toMatchObject({ abi: 1, semver: '1.1.0' });
		expect(JSON.parse(v1Text)).not.toHaveProperty('apiVersion');
		expect(v1.manifest.nodeContract).toBe('1.0.0');
		expect(head?.manifest.nodeContract).toBe('2.1.0');
		if (!head) throw new Error(`${ID} has no bundled HEAD`);
		// HEAD declares the scopes the @1 version did not have; the rest of the contract is equal.
		expect(diffContracts(v1.manifest.contract, head.manifest.contract).kind).toBe('minor');
		const { scopes: _, ...unscoped } = head.manifest.contract;
		expect(contractHash(unscoped)).toBe(v1.manifest.contractHash);
	});

	it('replay the same fixtures with the same items', async () => {
		if (!head) throw new Error(`${ID} has no bundled HEAD`);
		const headBundle = await head.readBundle();
		expect(await replayFixtures({ manifest: v1.manifest, bundle: v1Bundle }, allFixtures)).toEqual(
			[],
		);
		expect(
			await replayFixtures({ manifest: head.manifest, bundle: headBundle }, allFixtures),
		).toEqual([]);
	});

	it('give the same items in the n8n node, and record the Node Contract version that ran', async () => {
		if (!head) throw new Error(`${ID} has no bundled HEAD`);
		// One run at a time: the version loader is one global slot.
		const runAll = async (frozen: FrozenVersion) =>
			await allFixtures.executions.reduce<Promise<Array<Awaited<ReturnType<typeof runInNode>>>>>(
				async (done, fixture) => [...(await done), await runInNode(frozen, fixture)],
				Promise.resolve([]),
			);
		const old = await runAll(v1);
		const current = await runAll(head);

		expect(old.map(({ items }) => items)).toEqual(current.map(({ items }) => items));
		expect(old.map(({ items }) => items.length)).toEqual([2, 2]);
		expect([...old, ...current].map(({ left }) => left)).toEqual([0, 0, 0, 0]);
		expect(old[0]?.metadata).toEqual([
			{
				nodeContract: {
					action: ID,
					version: '1.1.0',
					bundleHash: v1.manifest.bundleHash,
					nodeContract: '1.0.0',
				},
			},
		]);
	});

	it('refuse the @1 bundle when the host range starts at @2', async () => {
		const [fixture] = fixtures.executions;
		if (!fixture) throw new Error(`${ID} has no fixture`);
		setNodeContractRange('>=2.0.0 <3.0.0');
		await expect(runInNode(v1, fixture)).rejects.toThrow(
			`${ID}@1.1.0 needs Node Contract 1.0.0. This host runs >=2.0.0 <3.0.0`,
		);
	});
});
