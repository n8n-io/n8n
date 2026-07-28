import { describe, expect, it } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import type { PreviewWorkflowNode } from '../workflows/types';
import WorkflowPreviewNode from './WorkflowPreviewNode.vue';

const baseNode: PreviewWorkflowNode = {
	id: 'n1',
	label: 'Node One',
	icon: { type: 'icon', name: 'node:code' },
	position: { x: 0, y: 0 },
};

const renderComponent = createComponentRenderer(WorkflowPreviewNode, {
	props: { node: baseNode, offsetX: 0, offsetY: 0 },
});

describe('WorkflowPreviewNode', () => {
	it('is non-interactive by default (sibling experiment safety)', () => {
		const { container } = renderComponent();
		expect((container.firstElementChild as HTMLElement).style.pointerEvents).toBe('');
	});

	it('sets pointer-events auto when interactive', () => {
		const { container } = renderComponent({ props: { interactive: true } });
		expect((container.firstElementChild as HTMLElement).style.pointerEvents).toBe('auto');
	});
});
