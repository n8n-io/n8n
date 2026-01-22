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

		it('should handle splitInBatches nested in node chain (node.then(sib))', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const generateItems = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Generate Items' },
			});
			const waitNode = node({
				type: 'n8n-nodes-base.wait',
				version: 1.1,
				config: { name: 'Wait' },
			});
			const codeNode = node({
				type: 'n8n-nodes-base.code',
				version: 2,
				config: { name: 'Code' },
			});
			const finalizeNode = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Finalize' },
			});

			// Bug case: node.then(splitInBatches(...)) - nodes inside chains are lost
			const chain = t.then(generateItems).then(
				splitInBatches({ name: 'Loop', parameters: { batchSize: 5 } })
					.done()
					.then(finalizeNode)
					.each()
					.then(waitNode)
					.then(codeNode)
					.loop(),
			);

			const wf = workflow('test-id', 'Test').add(chain);
			const json = wf.toJSON();

			// Should have: trigger, generateItems, splitInBatches, waitNode, codeNode, finalizeNode
			const nodeNames = json.nodes.map((n) => n.name).sort();
			expect(nodeNames).toEqual(
				['Webhook Trigger', 'Generate Items', 'Loop', 'Wait', 'Code', 'Finalize'].sort(),
			);

			// Generate Items should connect to Loop (splitInBatches)
			const generateConnections = json.connections['Generate Items'];
			expect(generateConnections).toBeDefined();
			expect(generateConnections.main[0][0].node).toBe('Loop');

			// Loop output 0 (done) should connect to Finalize
			const loopConnections = json.connections['Loop'];
			expect(loopConnections).toBeDefined();
			expect(loopConnections.main[0][0].node).toBe('Finalize');

			// Loop output 1 (each) should connect to Wait
			expect(loopConnections.main[1][0].node).toBe('Wait');

			// Wait should connect to Code
			const waitConnections = json.connections['Wait'];
			expect(waitConnections).toBeDefined();
			expect(waitConnections.main[0][0].node).toBe('Code');

			// Code should loop back to Loop
			const codeConnections = json.connections['Code'];
			expect(codeConnections).toBeDefined();
			expect(codeConnections.main[0][0].node).toBe('Loop');
		});
	});
});
