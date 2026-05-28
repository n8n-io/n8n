/**
 * Tests for node-diff utility
 */

import { calculateNodeChanges } from '../node-diff';

describe('calculateNodeChanges', () => {
	describe('when comparing workflows', () => {
		it('should return zeros for identical workflows', () => {
			const before = {
				nodes: [
					{ name: 'Node1', type: 'n8n-nodes-base.start' },
					{ name: 'Node2', type: 'n8n-nodes-base.httpRequest' },
				],
			};
			const after = {
				nodes: [
					{ name: 'Node1', type: 'n8n-nodes-base.start' },
					{ name: 'Node2', type: 'n8n-nodes-base.httpRequest' },
				],
			};

			const result = calculateNodeChanges(before, after);

			expect(result).toEqual({
				nodes_added: 0,
				nodes_removed: 0,
				nodes_modified: 0,
			});
		});

		it('should detect added nodes', () => {
			const before = {
				nodes: [{ name: 'Node1', type: 'n8n-nodes-base.start' }],
			};
			const after = {
				nodes: [
					{ name: 'Node1', type: 'n8n-nodes-base.start' },
					{ name: 'Node2', type: 'n8n-nodes-base.httpRequest' },
					{ name: 'Node3', type: 'n8n-nodes-base.set' },
				],
			};

			const result = calculateNodeChanges(before, after);

			expect(result.nodes_added).toBe(2);
			expect(result.nodes_removed).toBe(0);
		});

		it('should detect removed nodes', () => {
			const before = {
				nodes: [
					{ name: 'Node1', type: 'n8n-nodes-base.start' },
					{ name: 'Node2', type: 'n8n-nodes-base.httpRequest' },
					{ name: 'Node3', type: 'n8n-nodes-base.set' },
				],
			};
			const after = {
				nodes: [{ name: 'Node1', type: 'n8n-nodes-base.start' }],
			};

			const result = calculateNodeChanges(before, after);

			expect(result.nodes_added).toBe(0);
			expect(result.nodes_removed).toBe(2);
		});

		it('should detect modified nodes', () => {
			const before = {
				nodes: [
					{ name: 'Node1', type: 'n8n-nodes-base.start' },
					{ name: 'Node2', type: 'n8n-nodes-base.httpRequest', parameters: { url: 'old' } },
				],
			};
			const after = {
				nodes: [
					{ name: 'Node1', type: 'n8n-nodes-base.start' },
					{ name: 'Node2', type: 'n8n-nodes-base.httpRequest', parameters: { url: 'new' } },
				],
			};

			const result = calculateNodeChanges(before, after);

			expect(result.nodes_added).toBe(0);
			expect(result.nodes_removed).toBe(0);
			expect(result.nodes_modified).toBe(1);
		});

		it('should handle all three types of changes simultaneously', () => {
			const before = {
				nodes: [
					{ name: 'Keep', type: 'n8n-nodes-base.start' },
					{ name: 'Remove', type: 'n8n-nodes-base.set' },
					{ name: 'Modify', type: 'n8n-nodes-base.httpRequest', parameters: { url: 'old' } },
				],
			};
			const after = {
				nodes: [
					{ name: 'Keep', type: 'n8n-nodes-base.start' },
					{ name: 'Add', type: 'n8n-nodes-base.code' },
					{ name: 'Modify', type: 'n8n-nodes-base.httpRequest', parameters: { url: 'new' } },
				],
			};

			const result = calculateNodeChanges(before, after);

			expect(result.nodes_added).toBe(1);
			expect(result.nodes_removed).toBe(1);
			expect(result.nodes_modified).toBe(1);
		});
	});

	describe('edge cases', () => {
		it('should handle null before workflow', () => {
			const after = {
				nodes: [
					{ name: 'Node1', type: 'n8n-nodes-base.start' },
					{ name: 'Node2', type: 'n8n-nodes-base.httpRequest' },
				],
			};

			const result = calculateNodeChanges(null, after);

			expect(result.nodes_added).toBe(2);
			expect(result.nodes_removed).toBe(0);
			expect(result.nodes_modified).toBe(0);
		});

		it('should handle null after workflow', () => {
			const before = {
				nodes: [
					{ name: 'Node1', type: 'n8n-nodes-base.start' },
					{ name: 'Node2', type: 'n8n-nodes-base.httpRequest' },
				],
			};

			const result = calculateNodeChanges(before, null);

			expect(result.nodes_added).toBe(0);
			expect(result.nodes_removed).toBe(2);
			expect(result.nodes_modified).toBe(0);
		});

		it('should handle undefined workflows', () => {
			const result = calculateNodeChanges(undefined, undefined);

			expect(result).toEqual({
				nodes_added: 0,
				nodes_removed: 0,
				nodes_modified: 0,
			});
		});

		it('should handle empty node arrays', () => {
			const before = { nodes: [] };
			const after = { nodes: [] };

			const result = calculateNodeChanges(before, after);

			expect(result).toEqual({
				nodes_added: 0,
				nodes_removed: 0,
				nodes_modified: 0,
			});
		});

		it('should handle nodes without names', () => {
			const before = {
				nodes: [{ name: 'Node1' }, { name: undefined }, { type: 'some-type' }],
			};
			const after = {
				nodes: [{ name: 'Node1' }, { name: 'Node2' }],
			};

			// Nodes without names should be filtered out
			const result = calculateNodeChanges(before, after);

			expect(result.nodes_added).toBe(1); // Node2
			expect(result.nodes_removed).toBe(0); // The node without name is filtered
			expect(result.nodes_modified).toBe(0);
		});
	});
});
