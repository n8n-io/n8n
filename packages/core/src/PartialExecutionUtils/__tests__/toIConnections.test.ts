import { NodeConnectionType } from 'n8n-workflow';
import { createNodeData, toIConnections } from './helpers';

test('toIConnections', () => {
	const node1 = createNodeData({ name: 'Basic Node 1' });
	const node2 = createNodeData({ name: 'Basic Node 2' });

	expect(
		toIConnections([{ from: node1, to: node2, type: NodeConnectionType.Main, outputIndex: 0 }]),
	).toEqual({
		[node1.name]: {
			// output group
			main: [
				// first output
				[
					// first connection
					{
						node: node2.name,
						type: NodeConnectionType.Main,
						index: 0,
					},
				],
			],
		},
	});
});
