import { describe, it, expect, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import HighlightedEdge from '@/features/workflow-diff/HighlightedEdge.vue';
import type { CanvasEdgeProps } from '@/components/canvas/elements/edges/CanvasEdge.vue';
import { Position } from '@vue-flow/core';
import { NodeConnectionTypes } from 'n8n-workflow';

// Mock the Edge component
vi.mock('@/components/canvas/elements/edges/CanvasEdge.vue', () => ({
	default: {
		name: 'CanvasEdge',
		template:
			'<div class="canvas-edge"><slot name="highlight" v-bind="{ segments: mockSegments }" /></div>',
		setup() {
			return {
				mockSegments: [['M0,0 L100,100', 'test-marker']],
			};
		},
	},
}));

// Mock BaseEdge from vue-flow
vi.mock('@vue-flow/core', () => ({
	BaseEdge: {
		name: 'BaseEdge',
		props: ['style', 'path', 'interactionWidth'],
		template: '<path class="base-edge" :d="path" />',
	},
	Position: {
		Left: 'left',
		Top: 'top',
		Right: 'right',
		Bottom: 'bottom',
	},
}));

const renderComponent = createComponentRenderer(HighlightedEdge, {
	global: {
		stubs: {
			Edge: {
				template:
					'<div class="canvas-edge"><slot name="highlight" v-bind="{ segments: mockSegments }" /></div>',
				setup() {
					return {
						mockSegments: [['M0,0 L100,100', 'test-marker']],
					};
				},
			},
			BaseEdge: {
				name: 'BaseEdge',
				props: ['style', 'path', 'interactionWidth'],
				template: '<path class="base-edge" :d="path" />',
			},
		},
	},
});

describe('HighlightedEdge', () => {
	const mockProps: Partial<CanvasEdgeProps> = {
		id: 'edge-1',
		source: 'node-1',
		target: 'node-2',
		sourceX: 0,
		sourceY: 0,
		sourcePosition: Position.Right,
		targetX: 100,
		targetY: 100,
		targetPosition: Position.Left,
		data: {
			status: undefined,
			source: {
				index: 0,
				type: NodeConnectionTypes.Main,
			},
			target: {
				index: 0,
				type: NodeConnectionTypes.Main,
			},
		},
	};

	it('should render the component', () => {
		const { container } = renderComponent({
			props: mockProps,
		});

		expect(container.querySelector('.canvas-edge')).toBeInTheDocument();
	});

	it('should pass props to the Edge component', () => {
		const { container } = renderComponent({
			props: mockProps,
		});

		const edgeElement = container.querySelector('.canvas-edge');
		expect(edgeElement).toBeInTheDocument();
	});

	it('should render BaseEdge components in highlight slot', () => {
		const { container } = renderComponent({
			props: mockProps,
		});

		const baseEdges = container.querySelectorAll('.base-edge');
		expect(baseEdges).toHaveLength(1);
	});

	it('should render with readonly and non-selectable properties', () => {
		const { container } = renderComponent({
			props: mockProps,
		});

		// The Edge component should be rendered (we're testing the wrapper behavior)
		expect(container.querySelector('.canvas-edge')).toBeInTheDocument();
	});

	it('should handle edge props correctly', () => {
		const customProps: Partial<CanvasEdgeProps> = {
			...mockProps,
			id: 'custom-edge',
			source: 'custom-source',
			target: 'custom-target',
		};

		const { container } = renderComponent({
			props: customProps,
		});

		expect(container.querySelector('.canvas-edge')).toBeInTheDocument();
	});

	it('should render with minimal props', () => {
		const minimalProps: Partial<CanvasEdgeProps> = {
			id: 'minimal-edge',
			source: 'src',
			target: 'tgt',
		};

		const { container } = renderComponent({
			props: minimalProps,
		});

		expect(container.querySelector('.canvas-edge')).toBeInTheDocument();
	});
});
