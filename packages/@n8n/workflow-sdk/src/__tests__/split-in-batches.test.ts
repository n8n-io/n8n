import { splitInBatches } from '../split-in-batches';
import { workflow } from '../workflow-builder';
import { node, trigger } from '../node-builder';

describe('Split In Batches', () => {
	describe('splitInBatches()', () => {
		it('should create a split in batches builder', () => {
			const sib = splitInBatches({
				parameters: { batchSize: 10 },
			});
			expect(sib).toBeDefined();
		});

		it('should support .done() for completed processing', () => {
			const sib = splitInBatches({
				parameters: { batchSize: 10 },
			});
			const doneChain = sib.done();
			expect(doneChain).toBeDefined();
		});

		it('should support .each() for batch processing', () => {
			const sib = splitInBatches({
				parameters: { batchSize: 10 },
			});
			const eachChain = sib.each();
			expect(eachChain).toBeDefined();
		});

		it('should support explicit version', () => {
			const sib = splitInBatches({
				version: 2,
				parameters: { batchSize: 5 },
			});
			expect(sib.sibNode.version).toBe('2');
		});

		it('should default to version 3', () => {
			const sib = splitInBatches({
				parameters: { batchSize: 10 },
			});
			expect(sib.sibNode.version).toBe('3');
		});
	});

	describe('workflow integration', () => {
		it('should integrate splitInBatches with workflow builder', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const generateItems = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Generate Items' },
			});
			const processNode = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'Process Batch' },
			});
			const finalizeNode = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Finalize' },
			});

			const wf = workflow('test-id', 'Test')
				.add(t)
				.then(generateItems)
				.then(
					splitInBatches({ parameters: { batchSize: 10 } })
						.done()
						.then(finalizeNode)
						.each()
						.then(processNode)
						.loop(),
				);

			const json = wf.toJSON();

			// Should have: trigger, generateItems, splitInBatches, processNode, finalizeNode
			expect(json.nodes.length).toBeGreaterThanOrEqual(4);

			// Find split in batches node
			const sibNode = json.nodes.find((n) => n.type === 'n8n-nodes-base.splitInBatches');
			expect(sibNode).toBeDefined();
			expect(sibNode!.parameters.batchSize).toBe(10);

			// Check split in batches has two outputs
			const sibConnections = json.connections[sibNode!.name];
			expect(sibConnections).toBeDefined();
			expect(sibConnections.main).toHaveLength(2);

			// Output 0 should connect to finalize
			expect(sibConnections.main[0]).toHaveLength(1);
			expect(sibConnections.main[0][0].node).toBe('Finalize');

			// Output 1 should connect to process
			expect(sibConnections.main[1]).toHaveLength(1);
			expect(sibConnections.main[1][0].node).toBe('Process Batch');

			// Process should loop back to split in batches
			const processConnections = json.connections['Process Batch'];
			expect(processConnections).toBeDefined();
			expect(processConnections.main[0][0].node).toBe(sibNode!.name);
		});
	});
});
