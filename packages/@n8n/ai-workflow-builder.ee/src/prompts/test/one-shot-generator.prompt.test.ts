import type { NodeWithDiscriminators } from '../../utils/node-type-parser';
import { buildAvailableNodesSection } from '../one-shot-generator.prompt';

describe('one-shot-generator.prompt', () => {
	describe('buildAvailableNodesSection', () => {
		it('should format nodes without discriminators as simple list items', () => {
			const nodeIds: {
				triggers: NodeWithDiscriminators[];
				core: NodeWithDiscriminators[];
				ai: NodeWithDiscriminators[];
				other: NodeWithDiscriminators[];
			} = {
				triggers: [{ id: 'n8n-nodes-base.manualTrigger', displayName: 'Manual Trigger' }],
				core: [{ id: 'n8n-nodes-base.httpRequest', displayName: 'HTTP Request' }],
				ai: [],
				other: [],
			};

			const result = buildAvailableNodesSection(nodeIds);

			expect(result).toContain('n8n-nodes-base.manualTrigger');
			expect(result).toContain('n8n-nodes-base.httpRequest');
		});

		it('should include resource/operation discriminators in output', () => {
			const nodeIds: {
				triggers: NodeWithDiscriminators[];
				core: NodeWithDiscriminators[];
				ai: NodeWithDiscriminators[];
				other: NodeWithDiscriminators[];
			} = {
				triggers: [],
				core: [],
				ai: [],
				other: [
					{
						id: 'n8n-nodes-base.freshservice',
						displayName: 'Freshservice',
						discriminators: {
							type: 'resource_operation',
							resources: [
								{ value: 'ticket', operations: ['get', 'create', 'delete'] },
								{ value: 'agent', operations: ['get', 'list'] },
							],
						},
					},
				],
			};

			const result = buildAvailableNodesSection(nodeIds);

			// Should include node ID
			expect(result).toContain('n8n-nodes-base.freshservice');

			// Should include discriminator section
			expect(result).toMatch(/resource.*ticket/i);
			expect(result).toMatch(/resource.*agent/i);

			// Should show operations
			expect(result).toContain('get');
			expect(result).toContain('create');
			expect(result).toContain('delete');
			expect(result).toContain('list');

			// Should include usage hint for get_nodes
			expect(result).toContain('get_nodes');
		});

		it('should include mode discriminators in output', () => {
			const nodeIds: {
				triggers: NodeWithDiscriminators[];
				core: NodeWithDiscriminators[];
				ai: NodeWithDiscriminators[];
				other: NodeWithDiscriminators[];
			} = {
				triggers: [],
				core: [
					{
						id: 'n8n-nodes-base.code',
						displayName: 'Code',
						discriminators: {
							type: 'mode',
							modes: ['runOnceForAllItems', 'runOnceForEachItem'],
						},
					},
				],
				ai: [],
				other: [],
			};

			const result = buildAvailableNodesSection(nodeIds);

			// Should include node ID
			expect(result).toContain('n8n-nodes-base.code');

			// Should include mode discriminator
			expect(result).toContain('mode');
			expect(result).toContain('runOnceForAllItems');
			expect(result).toContain('runOnceForEachItem');

			// Should include usage hint
			expect(result).toContain('get_nodes');
		});

		it('should mix nodes with and without discriminators', () => {
			const nodeIds: {
				triggers: NodeWithDiscriminators[];
				core: NodeWithDiscriminators[];
				ai: NodeWithDiscriminators[];
				other: NodeWithDiscriminators[];
			} = {
				triggers: [{ id: 'n8n-nodes-base.manualTrigger', displayName: 'Manual Trigger' }],
				core: [
					{ id: 'n8n-nodes-base.httpRequest', displayName: 'HTTP Request' },
					{
						id: 'n8n-nodes-base.code',
						displayName: 'Code',
						discriminators: {
							type: 'mode',
							modes: ['runOnceForAllItems', 'runOnceForEachItem'],
						},
					},
				],
				ai: [],
				other: [
					{
						id: 'n8n-nodes-base.freshservice',
						displayName: 'Freshservice',
						discriminators: {
							type: 'resource_operation',
							resources: [{ value: 'ticket', operations: ['get', 'create'] }],
						},
					},
				],
			};

			const result = buildAvailableNodesSection(nodeIds);

			// All nodes should be present
			expect(result).toContain('n8n-nodes-base.manualTrigger');
			expect(result).toContain('n8n-nodes-base.httpRequest');
			expect(result).toContain('n8n-nodes-base.code');
			expect(result).toContain('n8n-nodes-base.freshservice');

			// Discriminators should be present for nodes that have them
			expect(result).toContain('runOnceForAllItems');
			expect(result).toContain('ticket');
		});

		it('should limit triggers to first 20 and other to first 50', () => {
			// Create more than 20 triggers and 50 other nodes
			const triggers: NodeWithDiscriminators[] = Array.from({ length: 25 }, (_, i) => ({
				id: `n8n-nodes-base.trigger${i}`,
				displayName: `Trigger ${i}`,
			}));
			const other: NodeWithDiscriminators[] = Array.from({ length: 60 }, (_, i) => ({
				id: `n8n-nodes-base.node${i}`,
				displayName: `Node ${i}`,
			}));

			const result = buildAvailableNodesSection({
				triggers,
				core: [],
				ai: [],
				other,
			});

			// Should have first 20 triggers, not all 25
			expect(result).toContain('n8n-nodes-base.trigger0');
			expect(result).toContain('n8n-nodes-base.trigger19');
			expect(result).not.toContain('n8n-nodes-base.trigger24');

			// Should have first 50 other nodes, not all 60
			expect(result).toContain('n8n-nodes-base.node0');
			expect(result).toContain('n8n-nodes-base.node49');
			expect(result).not.toContain('n8n-nodes-base.node59');

			// Should indicate more nodes exist
			expect(result).toContain('more integration nodes');
		});
	});
});
