import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { INode, INodeType } from 'n8n-workflow';
import { UnexpectedError } from 'n8n-workflow';

import type { CreatedWorkflow } from '../crud-adapter';
import { engineAdapter } from '../engine-adapter';
import { detectLifecycle } from '../lifecycle';

import { NodeTypes } from '@/node-types';

jest.mock('../engine-adapter', () => ({
	engineAdapter: {
		runOnce: jest.fn(),
	},
}));

const nodeTypes = mockInstance(NodeTypes);
const owner = mock<User>({ id: 'owner-123' });

const node = (overrides: Partial<INode>): INode => ({
	id: 'n',
	name: 'n',
	type: 'n8n-nodes-base.manualTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
	...overrides,
});

const wf = (name: string, nodes: INode[]): CreatedWorkflow => ({
	id: `id-${name}`,
	name,
	parsed: { name, nodes, connections: {} },
});

const trigger = (description: Partial<INodeType['description']>): INodeType =>
	mock<INodeType>({
		description: mock<INodeType['description']>(description),
	});

const stubNodeType = (type: string, description: Partial<INodeType['description']>) => {
	nodeTypes.getByNameAndVersion.mockImplementation((requested) => {
		if (requested === type) return trigger(description);
		// Default: unknown node, returns undefined-like (mock returns mock by default,
		// which would falsely look like a node type; we explicitly throw to mirror
		// real behaviour for unknown types).
		throw new Error(`Unknown node type: ${requested}`);
	});
};

beforeEach(() => {
	jest.clearAllMocks();
});

describe('detectLifecycle', () => {
	test('classifies a workflow with only manualTrigger as manual', () => {
		const workflow = wf('Manual', [node({ type: 'n8n-nodes-base.manualTrigger' })]);

		const lifecycle = detectLifecycle([workflow], owner);

		expect(lifecycle.kind).toBe('manual');
	});

	test('classifies a workflow with only the legacy start node as manual', () => {
		const workflow = wf('Legacy', [node({ type: 'n8n-nodes-base.start' })]);

		const lifecycle = detectLifecycle([workflow], owner);

		expect(lifecycle.kind).toBe('manual');
	});

	test('classifies a workflow with a schedule trigger as long-lived', () => {
		stubNodeType('n8n-nodes-base.scheduleTrigger', { group: ['trigger'] });
		const workflow = wf('Schedule', [
			node({ type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1 }),
		]);

		const lifecycle = detectLifecycle([workflow], owner);

		expect(lifecycle.kind).toBe('long-lived');
	});

	test('classifies a workflow with a webhook trigger as long-lived', () => {
		stubNodeType('n8n-nodes-base.webhook', { group: ['trigger'] });
		const workflow = wf('Webhook', [node({ type: 'n8n-nodes-base.webhook', typeVersion: 1 })]);

		const lifecycle = detectLifecycle([workflow], owner);

		expect(lifecycle.kind).toBe('long-lived');
	});

	test('mixed set: long-lived if any workflow has an ongoing trigger', () => {
		stubNodeType('n8n-nodes-base.scheduleTrigger', { group: ['trigger'] });
		const manualWf = wf('Manual', [node({ type: 'n8n-nodes-base.manualTrigger' })]);
		const scheduleWf = wf('Schedule', [
			node({ type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1 }),
		]);

		const lifecycle = detectLifecycle([manualWf, scheduleWf], owner);

		expect(lifecycle.kind).toBe('long-lived');
	});

	test('classifies as manual when a node type cannot be resolved by NodeTypes', () => {
		nodeTypes.getByNameAndVersion.mockImplementation(() => {
			throw new Error('not found');
		});
		const workflow = wf('Unknown', [node({ type: 'community.unknownNode', typeVersion: 1 })]);

		const lifecycle = detectLifecycle([workflow], owner);

		// Defensive: unknown node types should not keep the process alive forever.
		expect(lifecycle.kind).toBe('manual');
	});

	test('classifies as manual when the node type description has no trigger group', () => {
		stubNodeType('n8n-nodes-base.set', { group: ['transform'] });
		const workflow = wf('NoTrigger', [
			node({ type: 'n8n-nodes-base.manualTrigger' }),
			node({ name: 'set', type: 'n8n-nodes-base.set', typeVersion: 1 }),
		]);

		const lifecycle = detectLifecycle([workflow], owner);

		expect(lifecycle.kind).toBe('manual');
	});
});

describe('manual lifecycle run()', () => {
	test('invokes engineAdapter.runOnce for every workflow in input order', async () => {
		const a = wf('A', [node({ type: 'n8n-nodes-base.manualTrigger' })]);
		const b = wf('B', [node({ type: 'n8n-nodes-base.manualTrigger' })]);
		jest.mocked(engineAdapter.runOnce).mockResolvedValue({ status: 'success' });

		const lifecycle = detectLifecycle([a, b], owner);
		await lifecycle.run({ port: 5678, host: '127.0.0.1' });

		expect(engineAdapter.runOnce).toHaveBeenCalledTimes(2);
		expect(engineAdapter.runOnce).toHaveBeenNthCalledWith(1, owner, 'id-A');
		expect(engineAdapter.runOnce).toHaveBeenNthCalledWith(2, owner, 'id-B');
	});

	test('throws UnexpectedError naming the failed workflows when any runOnce returns an error', async () => {
		const a = wf('A', [node({ type: 'n8n-nodes-base.manualTrigger' })]);
		const b = wf('B', [node({ type: 'n8n-nodes-base.manualTrigger' })]);
		jest
			.mocked(engineAdapter.runOnce)
			.mockResolvedValueOnce({ status: 'success' })
			.mockResolvedValueOnce({ status: 'error', errorMessage: 'boom' });

		const lifecycle = detectLifecycle([a, b], owner);
		const error = await lifecycle.run({ port: 5678, host: '127.0.0.1' }).catch((e: unknown) => e);

		expect(error).toBeInstanceOf(UnexpectedError);
		expect((error as Error).message).toMatch(/workflow "B"/);
	});
});

describe('long-lived lifecycle run()', () => {
	test('throws UnexpectedError indicating Task 8 deferral', async () => {
		stubNodeType('n8n-nodes-base.scheduleTrigger', { group: ['trigger'] });
		const workflow = wf('Schedule', [
			node({ type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1 }),
		]);

		const lifecycle = detectLifecycle([workflow], owner);
		const error = await lifecycle.run({ port: 5678, host: '127.0.0.1' }).catch((e: unknown) => e);

		expect(error).toBeInstanceOf(UnexpectedError);
		expect((error as Error).message).toMatch(/Task 8/);
	});
});
