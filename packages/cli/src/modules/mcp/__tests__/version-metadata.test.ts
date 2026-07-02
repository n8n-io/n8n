import type { IConnections, INode } from 'n8n-workflow';

import {
	buildCreateVersionMetadata,
	buildUpdateVersionMetadata,
	MAX_VERSION_DESCRIPTION_LENGTH,
	MAX_VERSION_NAME_LENGTH,
	resolveVersionMetadata,
} from '../tools/workflow-builder/version-metadata';

const makeNode = (id: string, name: string, parameters: INode['parameters'] = {}): INode => ({
	id,
	name,
	type: 'n8n-nodes-base.set',
	typeVersion: 1,
	position: [0, 0],
	parameters,
});

const mainConnection = (from: string, to: string): IConnections => ({
	[from]: { main: [[{ node: to, type: 'main', index: 0 }]] },
});

describe('buildCreateVersionMetadata', () => {
	test('names the initial version and lists the nodes', () => {
		const metadata = buildCreateVersionMetadata([makeNode('1', 'Webhook'), makeNode('2', 'Set')]);

		expect(metadata.name).toBe('Initial version');
		expect(metadata.description).toBe('Created with 2 nodes: Webhook, Set');
	});

	test('uses singular form for a single node', () => {
		const metadata = buildCreateVersionMetadata([makeNode('1', 'Webhook')]);

		expect(metadata.description).toBe('Created with 1 node: Webhook');
	});

	test('collapses long node lists', () => {
		const nodes = Array.from({ length: 7 }, (_, i) => makeNode(`${i}`, `Node ${i}`));

		const metadata = buildCreateVersionMetadata(nodes);

		expect(metadata.description).toBe(
			'Created with 7 nodes: Node 0, Node 1, Node 2, Node 3, Node 4 and 2 more',
		);
	});
});

describe('buildUpdateVersionMetadata', () => {
	const webhook = makeNode('1', 'Webhook');
	const set = makeNode('2', 'Set');

	test('summarizes an added node', () => {
		const metadata = buildUpdateVersionMetadata(
			{ nodes: [webhook], connections: {} },
			{ nodes: [webhook, makeNode('2', 'Gmail')], connections: mainConnection('Webhook', 'Gmail') },
		);

		expect(metadata.name).toBe('Added Gmail');
		expect(metadata.description).toBe('Added nodes: Gmail\nConnections: 1 added, 0 removed');
	});

	test('capitalizes a removal-only change', () => {
		const metadata = buildUpdateVersionMetadata(
			{ nodes: [webhook, set], connections: {} },
			{ nodes: [webhook], connections: {} },
		);

		expect(metadata.name).toBe('Removed Set');
		expect(metadata.description).toBe('Removed nodes: Set');
	});

	test('summarizes a modified node', () => {
		const metadata = buildUpdateVersionMetadata(
			{ nodes: [webhook, set], connections: {} },
			{ nodes: [webhook, makeNode('2', 'Set', { keepOnlySet: true })], connections: {} },
		);

		expect(metadata.name).toBe('Updated Set');
		expect(metadata.description).toBe('Updated nodes: Set');
	});

	test('combines added, removed, and updated clauses', () => {
		const metadata = buildUpdateVersionMetadata(
			{ nodes: [webhook, set], connections: {} },
			{
				nodes: [makeNode('1', 'Webhook', { path: 'hook' }), makeNode('3', 'Gmail')],
				connections: {},
			},
		);

		expect(metadata.name).toBe('Added Gmail; removed Set; updated Webhook');
		expect(metadata.description).toBe(
			'Added nodes: Gmail\nRemoved nodes: Set\nUpdated nodes: Webhook',
		);
	});

	test('reports a connection-only change as rewiring', () => {
		const metadata = buildUpdateVersionMetadata(
			{ nodes: [webhook, set], connections: mainConnection('Webhook', 'Set') },
			{ nodes: [webhook, set], connections: {} },
		);

		expect(metadata.name).toBe('Rewired connections');
		expect(metadata.description).toBe('Connections: 0 added, 1 removed');
	});

	test('falls back to a generic name when nothing structural changed', () => {
		const metadata = buildUpdateVersionMetadata(
			{ nodes: [webhook], connections: {} },
			{ nodes: [webhook], connections: {} },
		);

		expect(metadata.name).toBe('Updated workflow');
		expect(metadata.description).toBe('Updated workflow');
	});

	test('caps the generated name length', () => {
		const longName = 'A very long node name that goes on and on'.repeat(3);
		const metadata = buildUpdateVersionMetadata(
			{ nodes: [webhook], connections: {} },
			{ nodes: [webhook, makeNode('2', longName)], connections: {} },
		);

		expect(metadata.name.length).toBeLessThanOrEqual(MAX_VERSION_NAME_LENGTH);
		expect(metadata.name.endsWith('…')).toBe(true);
	});
});

describe('resolveVersionMetadata', () => {
	const fallback = { name: 'Fallback name', description: 'Fallback description' };

	test('prefers client-provided values', () => {
		const metadata = resolveVersionMetadata(
			{ versionName: 'Added Slack alert', versionDescription: 'Notifies #ops on failure' },
			fallback,
		);

		expect(metadata).toEqual({
			name: 'Added Slack alert',
			description: 'Notifies #ops on failure',
		});
	});

	test('falls back per field when values are missing or blank', () => {
		const metadata = resolveVersionMetadata(
			{ versionName: '   ', versionDescription: undefined },
			fallback,
		);

		expect(metadata).toEqual(fallback);
	});

	test('truncates over-long client values', () => {
		const metadata = resolveVersionMetadata(
			{
				versionName: 'x'.repeat(MAX_VERSION_NAME_LENGTH + 10),
				versionDescription: 'y'.repeat(MAX_VERSION_DESCRIPTION_LENGTH + 10),
			},
			fallback,
		);

		expect(metadata.name.length).toBe(MAX_VERSION_NAME_LENGTH);
		expect(metadata.description.length).toBe(MAX_VERSION_DESCRIPTION_LENGTH);
	});
});
