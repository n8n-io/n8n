import { useCanvasTraversal } from '@/features/canvas/composables/useCanvasTraversal';
import type { CanvasNode } from '../canvas.types';
import type { VueFlowStore } from '@vue-flow/core';
import { mock } from 'vitest-mock-extended';

describe('useCanvasTraversal', () => {
	const mockGetIncomers = vi.fn();
	const mockGetOutgoers = vi.fn();

	const vueFlow = mock<VueFlowStore>({
		getIncomers: mockGetIncomers,
		getOutgoers: mockGetOutgoers,
	});

	const {
		sortNodesByVerticalPosition,
		getIncomingNodes,
		getOutgoingNodes,
		getSiblingNodes,
		getDownstreamNodes,
		getUpstreamNodes,
	} = useCanvasTraversal(vueFlow);

	describe('sortNodesByVerticalPosition', () => {
		it('should sort nodes by their vertical position', () => {
			const nodes: CanvasNode[] = [
				{ id: '1', position: { x: 0, y: 200 } },
				{ id: '2', position: { x: 0, y: 100 } },
			];
			const result = sortNodesByVerticalPosition(nodes);
			expect(result).toEqual([
				{ id: '2', position: { x: 0, y: 100 } },
				{ id: '1', position: { x: 0, y: 200 } },
			]);
		});
	});

	describe('getIncomingNodes', () => {
		it('should return sorted incoming nodes by vertical position', () => {
			const incomingNodes = [
				{ id: '1', position: { x: 0, y: 200 } },
				{ id: '2', position: { x: 0, y: 100 } },
			];
			mockGetIncomers.mockReturnValue([...incomingNodes]);
			const result = getIncomingNodes('3');
			expect(result).toEqual([incomingNodes[1], incomingNodes[0]]);
		});
	});

	describe('getOutgoingNodes', () => {
		it('should return sorted outgoing nodes by vertical position', () => {
			const outgoingNodes = [
				{ id: '1', position: { x: 0, y: 300 } },
				{ id: '2', position: { x: 0, y: 150 } },
			];
			mockGetOutgoers.mockReturnValue([...outgoingNodes]);
			const result = getOutgoingNodes('3');
			expect(result).toEqual([outgoingNodes[1], outgoingNodes[0]]);
		});
	});

	describe('getSiblingNodes', () => {
		it('should return sorted sibling nodes by vertical position', () => {
			const incomingNodes = [{ id: '1', position: { x: 0, y: 200 } }];
			const incomingNodesOutgoingChildren = [{ id: '2', position: { x: 0, y: 400 } }];
			const outgoingNodes = [{ id: '3', position: { x: 0, y: 300 } }];
			const outgoingNodesIncomingChildren = [{ id: '4', position: { x: 0, y: 500 } }];

			mockGetIncomers.mockReturnValueOnce(incomingNodes);
			mockGetOutgoers.mockReturnValueOnce(incomingNodesOutgoingChildren);
			mockGetOutgoers.mockReturnValueOnce(outgoingNodes);
			mockGetIncomers.mockReturnValueOnce(outgoingNodesIncomingChildren);

			const result = getSiblingNodes('5');
			expect(result).toEqual([...incomingNodesOutgoingChildren, ...outgoingNodesIncomingChildren]);
		});
	});

	describe('getDownstreamNodes', () => {
		it('should return sorted downstream nodes by vertical position - one level', () => {
			const outgoingNodes = [{ id: '2', position: { x: 0, y: 100 } }];

			mockGetOutgoers.mockReturnValue(outgoingNodes);

			const result = getDownstreamNodes('1');
			expect(result).toEqual([{ id: '2', position: { x: 0, y: 100 } }]);
		});

		it('should return sorted downstream nodes by vertical position - multiple levels', () => {
			const outgoingNodes1 = [{ id: '1', position: { x: 0, y: 100 } }];
			const outgoingNodes2 = [{ id: '2', position: { x: 0, y: 200 } }];
			const outgoingNodes3 = [{ id: '3', position: { x: 0, y: 300 } }];

			mockGetOutgoers
				.mockReturnValueOnce(outgoingNodes1)
				.mockReturnValueOnce(outgoingNodes2)
				.mockReturnValueOnce(outgoingNodes3);

			const result = getDownstreamNodes('4');
			expect(result).toEqual([...outgoingNodes1, ...outgoingNodes2, ...outgoingNodes3]);
		});

		it('should handle circular references in downstream nodes', () => {
			const outgoingNodes1 = [{ id: '1', position: { x: 0, y: 100 } }];
			const outgoingNodes2 = [
				{ id: '1', position: { x: 0, y: 100 } },
				{ id: '2', position: { x: 0, y: 300 } },
				{ id: '3', position: { x: 0, y: 400 } },
			];
			const outgoingNodes3 = [
				{ id: '1', position: { x: 0, y: 100 } },
				{ id: '4', position: { x: 0, y: 600 } },
			];

			mockGetOutgoers
				.mockReturnValueOnce(outgoingNodes1)
				.mockReturnValueOnce(outgoingNodes2)
				.mockReturnValueOnce(outgoingNodes3);

			const result = getDownstreamNodes('5');
			expect(result).toEqual([
				outgoingNodes1[0],
				outgoingNodes2[1],
				outgoingNodes2[2],
				outgoingNodes3[1],
			]);
		});
	});

	describe('getUpstreamNodes', () => {
		it('should return sorted upstream nodes by vertical position - one level', () => {
			const incomingNodes = [{ id: '2', position: { x: 0, y: 100 } }];

			mockGetIncomers.mockReturnValue(incomingNodes);

			const result = getUpstreamNodes('1');
			expect(result).toEqual([{ id: '2', position: { x: 0, y: 100 } }]);
		});

		it('should return sorted upstream nodes by vertical position - multiple levels', () => {
			const incomingNodes1 = [{ id: '1', position: { x: 0, y: 100 } }];
			const incomingNodes2 = [{ id: '2', position: { x: 0, y: 200 } }];
			const incomingNodes3 = [{ id: '3', position: { x: 0, y: 300 } }];

			mockGetIncomers
				.mockReturnValueOnce(incomingNodes1)
				.mockReturnValueOnce(incomingNodes2)
				.mockReturnValueOnce(incomingNodes3);

			const result = getUpstreamNodes('4');
			expect(result).toEqual([...incomingNodes1, ...incomingNodes2, ...incomingNodes3]);
		});

		it('should handle circular references in upstream nodes', () => {
			const incomingNodes1 = [{ id: '1', position: { x: 0, y: 100 } }];
			const incomingNodes2 = [
				{ id: '1', position: { x: 0, y: 100 } },
				{ id: '2', position: { x: 0, y: 300 } },
				{ id: '3', position: { x: 0, y: 400 } },
			];
			const incomingNodes3 = [
				{ id: '1', position: { x: 0, y: 100 } },
				{ id: '4', position: { x: 0, y: 600 } },
			];

			mockGetIncomers
				.mockReturnValueOnce(incomingNodes1)
				.mockReturnValueOnce(incomingNodes2)
				.mockReturnValueOnce(incomingNodes3);

			const result = getUpstreamNodes('5');
			expect(result).toEqual([
				incomingNodes1[0],
				incomingNodes2[1],
				incomingNodes2[2],
				incomingNodes3[1],
			]);
		});
	});
});
