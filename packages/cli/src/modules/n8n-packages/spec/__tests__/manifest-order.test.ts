import { sortManifest } from '../manifest-order';
import type { PackageManifest } from '../manifest.schema';

const entry = (id: string, target = `things/thing-${id}`) => ({ id, name: `Name ${id}`, target });

const manifest: PackageManifest = {
	packageFormatVersion: '1',
	sourceN8nVersion: '1.0.0',
	sourceId: 'source',
	agents: [entry('a2'), entry('a1')],
	skills: [entry('s2'), entry('s1')],
	projects: [entry('p2', 'projects/b-p2'), entry('p1', 'projects/a-p1')],
	workflows: [
		{ ...entry('w3'), isArchived: false },
		{ ...entry('w1'), isArchived: true },
		{ ...entry('w2'), isArchived: false },
	],
	credentials: [entry('c2'), entry('c1')],
	dataTables: [entry('d2'), entry('d1')],
	variables: [entry('v2'), entry('v1')],
	tags: [entry('t2'), entry('t1')],
	requirements: {
		credentials: [
			{
				id: 'c2',
				name: 'Two',
				type: 'httpBasicAuth',
				usedBy: [
					{ kind: 'workflow', id: 'w2' },
					{ kind: 'workflow', id: 'w1' },
				],
			},
			{ id: 'c1', name: 'One', type: 'httpBasicAuth', usedBy: [{ kind: 'workflow', id: 'w1' }] },
		],
		variables: [
			{ name: 'B', usedBy: [{ kind: 'workflow', id: 'w1' }] },
			{ name: 'A', usedBy: [{ kind: 'workflow', id: 'w1' }] },
		],
		nodeTypes: [
			{ type: 'n8n-nodes-base.set', typeVersion: 3, usedBy: [{ kind: 'workflow', id: 'w1' }] },
			{ type: 'n8n-nodes-base.set', typeVersion: 2, usedBy: [{ kind: 'workflow', id: 'w1' }] },
			{ type: 'n8n-nodes-base.http', typeVersion: 1, usedBy: [{ kind: 'workflow', id: 'w1' }] },
		],
	},
};

const ids = (rows: Array<{ id: string }> | undefined) => rows?.map(({ id }) => id);

describe('sortManifest', () => {
	it('orders the entry lists by id', () => {
		const sorted = sortManifest(manifest);

		expect(ids(sorted.agents)).toEqual(['a2', 'a1']);
		expect(ids(sorted.skills)).toEqual(['s2', 's1']);
		expect(ids(sorted.projects)).toEqual(['p1', 'p2']);
		expect(ids(sorted.workflows)).toEqual(['w1', 'w2', 'w3']);
		expect(ids(sorted.credentials)).toEqual(['c1', 'c2']);
		expect(ids(sorted.dataTables)).toEqual(['d1', 'd2']);
		expect(ids(sorted.variables)).toEqual(['v1', 'v2']);
		expect(ids(sorted.tags)).toEqual(['t1', 't2']);
	});

	it('keeps a parent folder before the folders in it', () => {
		const sorted = sortManifest({
			...manifest,
			folders: [
				entry('a', 'projects/p/folders/z/y/x'),
				entry('b', 'projects/p/folders/z/y'),
				entry('c', 'projects/p/folders/z'),
				entry('d', 'projects/p/folders/a'),
			],
		});

		expect(ids(sorted.folders)).toEqual(['c', 'd', 'b', 'a']);
	});

	it('orders the requirements and their consumers', () => {
		const { requirements } = sortManifest(manifest);

		expect(ids(requirements?.credentials)).toEqual(['c1', 'c2']);
		expect(requirements?.credentials?.[1].usedBy).toEqual([
			{ kind: 'workflow', id: 'w1' },
			{ kind: 'workflow', id: 'w2' },
		]);
		expect(requirements?.variables?.map(({ name }) => name)).toEqual(['A', 'B']);
		expect(
			requirements?.nodeTypes?.map(({ type, typeVersion }) => `${type}@${typeVersion}`),
		).toEqual(['n8n-nodes-base.http@1', 'n8n-nodes-base.set@2', 'n8n-nodes-base.set@3']);
	});

	it('gives the same result for any input order', () => {
		const reversed: PackageManifest = {
			...manifest,
			workflows: manifest.workflows?.toReversed(),
			credentials: manifest.credentials?.toReversed(),
			requirements: manifest.requirements && {
				...manifest.requirements,
				credentials: manifest.requirements.credentials?.toReversed(),
			},
		};

		expect(JSON.stringify(sortManifest(reversed))).toBe(JSON.stringify(sortManifest(manifest)));
	});

	it('does not change the input', () => {
		const before = JSON.stringify(manifest);

		sortManifest(manifest);

		expect(JSON.stringify(manifest)).toBe(before);
	});

	it('leaves out lists that the manifest does not have', () => {
		const minimal = { packageFormatVersion: '1', sourceN8nVersion: '1', sourceId: 's' } as const;

		expect(JSON.stringify(sortManifest(minimal))).toBe(JSON.stringify(minimal));
	});

	it('compares ids by code point, not by locale', () => {
		const sorted = sortManifest({
			...manifest,
			workflows: ['b', 'B', 'a', 'A'].map((id) => ({ ...entry(id), isArchived: false })),
		});

		expect(ids(sorted.workflows)).toEqual(['A', 'B', 'a', 'b']);
	});
});
