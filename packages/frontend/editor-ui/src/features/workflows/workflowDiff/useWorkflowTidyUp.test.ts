import { describe, it, expect } from 'vitest';
import { shouldTidyUp, type WorkflowForTidyUp } from './useWorkflowTidyUp';

describe('useWorkflowTidyUp', () => {
	describe('shouldTidyUp', () => {
		const createMockWorkflow = (
			nodes: Array<{ id: string; position?: [number, number] }>,
		): WorkflowForTidyUp => ({
			nodes: nodes.map((node) => ({
				position: node.position,
			})),
		});

		it('returns false when option is undefined', () => {
			const workflow = createMockWorkflow([{ id: 'node1' }]);

			const result = shouldTidyUp(workflow, undefined);

			expect(result).toBe(false);
		});

		it('returns true when option is "always"', () => {
			const workflow = createMockWorkflow([{ id: 'node1', position: [100, 100] }]);

			const result = shouldTidyUp(workflow, 'always');

			expect(result).toBe(true);
		});

		it('returns true when option is "always" even if nodes have positions', () => {
			const workflow = createMockWorkflow([
				{ id: 'node1', position: [100, 100] },
				{ id: 'node2', position: [200, 200] },
			]);

			const result = shouldTidyUp(workflow, 'always');

			expect(result).toBe(true);
		});

		it('returns true when option is "if-missing" and all nodes lack positions', () => {
			const workflow = createMockWorkflow([
				{ id: 'node1' },
				{ id: 'node2' },
				{ id: 'node3' },
			]);

			const result = shouldTidyUp(workflow, 'if-missing');

			expect(result).toBe(true);
		});

		it('returns false when option is "if-missing" and some nodes have positions', () => {
			const workflow = createMockWorkflow([
				{ id: 'node1', position: [100, 100] },
				{ id: 'node2' },
			]);

			const result = shouldTidyUp(workflow, 'if-missing');

			expect(result).toBe(false);
		});

		it('returns false when option is "if-missing" and all nodes have positions', () => {
			const workflow = createMockWorkflow([
				{ id: 'node1', position: [100, 100] },
				{ id: 'node2', position: [200, 200] },
			]);

			const result = shouldTidyUp(workflow, 'if-missing');

			expect(result).toBe(false);
		});

		it('returns true when option is "if-missing" and workflow has no nodes', () => {
			const workflow = createMockWorkflow([]);

			const result = shouldTidyUp(workflow, 'if-missing');

			expect(result).toBe(true);
		});
	});
});
