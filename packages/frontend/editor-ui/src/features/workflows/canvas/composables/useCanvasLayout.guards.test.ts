import { STICKY_NODE_TYPE } from '@/app/constants';
import {
	createCanvasGraphGroupNode,
	createCanvasGraphNode,
} from '@/features/workflows/canvas/__tests__/utils';
import { CanvasNodeRenderType, type CanvasNodeData } from '../canvas.types';
import {
	hasMeasuredDimensions,
	isAiConfigNode,
	isAiParentNode,
	isCanvasNodeData,
	isStickyCanvasNode,
} from './useCanvasLayout.guards';

function createDefaultNodeData(options: { configurable?: boolean; configuration?: boolean }) {
	return createCanvasGraphNode({
		data: {
			render: {
				type: CanvasNodeRenderType.Default,
				options: { configurable: false, configuration: false, trigger: false, ...options },
			},
		},
	}).data as CanvasNodeData;
}

describe('useCanvasLayout.guards', () => {
	describe('hasMeasuredDimensions', () => {
		test('accepts positive dimensions', () => {
			expect(hasMeasuredDimensions({ width: 96, height: 96 })).toBe(true);
		});

		test.each([
			['undefined', undefined],
			['unmeasured', { width: 0, height: 0 }],
			['missing height', { width: 96 }],
		])('rejects %s dimensions', (_, dimensions) => {
			expect(hasMeasuredDimensions(dimensions)).toBe(false);
		});
	});

	describe('isStickyCanvasNode', () => {
		test('is true for sticky notes only', () => {
			expect(isStickyCanvasNode(createCanvasGraphNode({ data: { type: STICKY_NODE_TYPE } }))).toBe(
				true,
			);
			expect(isStickyCanvasNode(createCanvasGraphNode())).toBe(false);
			expect(isStickyCanvasNode(createCanvasGraphGroupNode())).toBe(false);
		});
	});

	describe('isCanvasNodeData', () => {
		test('distinguishes node data from group data', () => {
			expect(isCanvasNodeData(createCanvasGraphNode().data)).toBe(true);
			expect(isCanvasNodeData(createCanvasGraphGroupNode().data)).toBe(false);
			expect(isCanvasNodeData(undefined)).toBe(false);
		});
	});

	describe('AI node guards', () => {
		test('identifies a configurable root as an AI parent', () => {
			const data = createDefaultNodeData({ configurable: true });
			expect(isAiParentNode(data)).toBe(true);
			expect(isAiConfigNode(data)).toBe(false);
		});

		test('identifies a configuration node as an AI config node', () => {
			const data = createDefaultNodeData({ configuration: true });
			expect(isAiConfigNode(data)).toBe(true);
			expect(isAiParentNode(data)).toBe(false);
		});

		test('treats a configurable configuration node as config only', () => {
			const data = createDefaultNodeData({ configurable: true, configuration: true });
			expect(isAiConfigNode(data)).toBe(true);
			expect(isAiParentNode(data)).toBe(false);
		});

		test('rejects plain nodes and group data', () => {
			expect(isAiParentNode(createDefaultNodeData({}))).toBe(false);
			expect(isAiConfigNode(createCanvasGraphGroupNode().data)).toBe(false);
		});
	});
});
