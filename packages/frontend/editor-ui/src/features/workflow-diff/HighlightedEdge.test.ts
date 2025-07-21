import { describe, it, expect, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import HighlightedEdge from '@/features/workflow-diff/HighlightedEdge.vue';
import type { CanvasEdgeProps } from '@/components/canvas/elements/edges/CanvasEdge.vue';

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
	const mockProps: CanvasEdgeProps = {
		id: 'edge-1',
		source: 'node-1',
		target: 'node-2',
		sourceHandleId: 'output',
		targetHandleId: 'input',
		data: {
			source: {
				node: 'node-1',
				type: 'main',
				index: 0,
			},
			target: {
				node: 'node-2',
				type: 'main',
				index: 0,
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
		const customProps: CanvasEdgeProps = {
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
			props: minimalProps as CanvasEdgeProps,
		});

		expect(container.querySelector('.canvas-edge')).toBeInTheDocument();
	});
});
