import type { ExpandCompositeNodeRequestDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { BadRequestError } from '@n8n/errors';
import type { CompositeNodeType, INode, INodeType } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { NodeTypes } from '@/node-types';

import { CompositeNodesController } from '../composite-nodes.controller';

const description: CompositeNodeType['description'] = {
	displayName: 'Twice',
	name: 'twice',
	group: ['transform'],
	version: 1,
	description: '',
	defaults: { name: 'Twice' },
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	properties: [{ displayName: 'Times', name: 'times', type: 'number', default: 2 }],
};

/** Runs one inner node `times` times in a row. */
const twice: CompositeNodeType = {
	description,
	composite: {
		expand: (c) => {
			const times = c.literal<number>('times');
			const done = c.exit({ output: 0 });
			let previous = c.entry;
			for (let time = 1; time <= times; time++) {
				const step = c.addNode(`step ${time}`, {
					type: 'test.step',
					typeVersion: 1,
					parameters: {},
				});
				c.connect(previous, step);
				previous = step;
			}
			c.connect(previous, done);
		},
	},
};

const plain: INodeType = { description: { ...description, name: 'plain' } };

const node = (type: string, parameters: INode['parameters'] = {}): INode => ({
	id: 'twice-id',
	name: 'Twice',
	type,
	typeVersion: 1,
	position: [0, 0],
	parameters,
});

describe('CompositeNodesController', () => {
	const nodeTypes = mock<NodeTypes>();
	nodeTypes.getByNameAndVersion.mockImplementation((type) =>
		type === 'test.twice' ? twice : plain,
	);
	const controller = new CompositeNodesController(nodeTypes);
	const req = mock<AuthenticatedRequest<{ workflowId: string }>>();
	const expand = async (expanded: INode) =>
		await controller.expand(req, undefined, { node: expanded } as ExpandCompositeNodeRequestDto);

	it('returns the inner workflow without the connection from the entry into the exit', async () => {
		const result = await expand(node('test.twice'));

		expect(result.nodes.map(({ name, type }) => [name, type])).toEqual([
			['Twice › entry', 'n8n-nodes-base.compositeEntry'],
			['Twice › step 1', 'test.step'],
			['Twice › step 2', 'test.step'],
			['Twice', 'n8n-nodes-base.compositeExit'],
		]);
		expect(result.connections).toEqual({
			'Twice › entry': { main: [[{ node: 'Twice › step 1', type: 'main', index: 0 }]] },
			'Twice › step 1': { main: [[{ node: 'Twice › step 2', type: 'main', index: 0 }]] },
			'Twice › step 2': { main: [[{ node: 'Twice', type: 'main', index: 1 }]] },
		});
	});

	it('rejects a node that is not a composite', async () => {
		const result = expand(node('test.plain'));
		await expect(result).rejects.toThrow(BadRequestError);
		await expect(result).rejects.toThrow('Node "Twice" is not a composite node.');
	});

	it('reports a value the expansion cannot use as a bad request', async () => {
		await expect(expand(node('test.twice', { times: '={{ 3 }}' }))).rejects.toThrow(
			BadRequestError,
		);
	});
});
