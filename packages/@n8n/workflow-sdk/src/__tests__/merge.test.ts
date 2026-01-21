import { merge } from '../merge';
import { workflow } from '../workflow-builder';
import { node, trigger } from '../node-builder';

describe('Merge', () => {
	describe('merge()', () => {
		it('should create a merge composite with branches', () => {
			const api1 = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: {
					name: 'API 1',
					parameters: { url: 'https://api1.example.com' },
				},
			});
			const api2 = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: {
					name: 'API 2',
					parameters: { url: 'https://api2.example.com' },
				},
			});

			const m = merge([api1, api2]);
			expect(m.mergeNode).toBeDefined();
			expect(m.branches).toHaveLength(2);
			expect(m.mode).toBe('append'); // default mode
		});

		it('should support combine mode', () => {
			const api1 = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'API 1' },
			});
			const api2 = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'API 2' },
			});

			const m = merge([api1, api2], { mode: 'combine' });
			expect(m.mode).toBe('combine');
		});

		it('should support multiplex mode', () => {
			const api1 = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'API 1' },
			});
			const api2 = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'API 2' },
			});

			const m = merge([api1, api2], { mode: 'multiplex' });
			expect(m.mode).toBe('multiplex');
		});

		it('should support chooseBranch mode', () => {
			const api1 = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'API 1' },
			});
			const api2 = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'API 2' },
			});

			const m = merge([api1, api2], { mode: 'chooseBranch' });
			expect(m.mode).toBe('chooseBranch');
		});
	});

	describe('workflow integration', () => {
		it('should integrate merge with workflow builder', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const api1 = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: {
					name: 'API 1',
					parameters: { url: 'https://api1.example.com' },
				},
			});
			const api2 = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: {
					name: 'API 2',
					parameters: { url: 'https://api2.example.com' },
				},
			});
			const processResults = node({
				type: 'n8n-nodes-base.set',
				version: 3,
				config: { name: 'Process Results' },
			});

			const wf = workflow('test-id', 'Test')
				.add(t)
				.then(merge([api1, api2], { mode: 'combine' }))
				.then(processResults);

			const json = wf.toJSON();

			// Should have: trigger, api1, api2, merge, processResults
			expect(json.nodes.length).toBeGreaterThanOrEqual(4);

			// Trigger should connect to both API nodes
			const triggerConnections = json.connections[t.name];
			expect(triggerConnections).toBeDefined();

			// Merge node should exist
			const mergeNode = json.nodes.find((n) => n.type === 'n8n-nodes-base.merge');
			expect(mergeNode).toBeDefined();

			// Merge should connect to process results
			expect(json.connections[mergeNode!.name]).toBeDefined();
		});

		it('should support three branches merging', () => {
			const t = trigger({ type: 'n8n-nodes-base.webhookTrigger', version: 1, config: {} });
			const api1 = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'API 1' },
			});
			const api2 = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'API 2' },
			});
			const api3 = node({
				type: 'n8n-nodes-base.httpRequest',
				version: 4.2,
				config: { name: 'API 3' },
			});

			const wf = workflow('test-id', 'Test')
				.add(t)
				.then(merge([api1, api2, api3]));

			const json = wf.toJSON();

			// Find merge node
			const mergeNode = json.nodes.find((n) => n.type === 'n8n-nodes-base.merge');
			expect(mergeNode).toBeDefined();

			// Merge should have 3 inputs
			// Check that all 3 API nodes connect to the merge
			let inputCount = 0;
			for (const conns of Object.values(json.connections)) {
				for (const outputs of conns.main || []) {
					for (const conn of outputs || []) {
						if (conn.node === mergeNode!.name) {
							inputCount++;
						}
					}
				}
			}
			expect(inputCount).toBe(3);
		});
	});
});
