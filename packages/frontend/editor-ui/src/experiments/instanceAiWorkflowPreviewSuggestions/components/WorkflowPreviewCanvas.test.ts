import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import WorkflowPreviewCanvas from './WorkflowPreviewCanvas.vue';
import type { PreviewWorkflow } from '../workflows/types';

vi.mock('@vueuse/core', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@vueuse/core')>();
	return {
		...actual,
		useElementSize: vi.fn(),
	};
});

import { useElementSize } from '@vueuse/core';
import { ref } from 'vue';

const minimalWorkflow: PreviewWorkflow = {
	nodes: [
		{
			id: 'trigger',
			label: 'Trigger',
			icon: { type: 'icon', name: 'play' },
			position: { x: 0, y: 0 },
		},
		{
			id: 'action',
			label: 'Action',
			icon: { type: 'icon', name: 'bolt' },
			position: { x: 200, y: 0 },
		},
	],
	connections: [{ source: 'trigger', target: 'action' }],
};

describe('WorkflowPreviewCanvas renderScale', () => {
	it('applies scale(width / 1600) when rendered width is narrower than canvas', () => {
		const widthRef = ref(800);
		vi.mocked(useElementSize).mockReturnValue({
			width: widthRef,
			height: ref(420),
		} as unknown as ReturnType<typeof useElementSize>);

		const wrapper = mount(WorkflowPreviewCanvas, {
			props: { workflow: minimalWorkflow, animating: false },
			global: { stubs: { WorkflowPreviewNode: true } },
		});

		const canvasContent = wrapper.find('[class*="canvasContent"]');
		const style = canvasContent.attributes('style') ?? '';
		expect(style).toContain('scale(0.5)');
	});

	it('applies scale(1) when rendered width equals or exceeds canvas width', () => {
		const widthRef = ref(1600);
		vi.mocked(useElementSize).mockReturnValue({
			width: widthRef,
			height: ref(420),
		} as unknown as ReturnType<typeof useElementSize>);

		const wrapper = mount(WorkflowPreviewCanvas, {
			props: { workflow: minimalWorkflow, animating: false },
			global: { stubs: { WorkflowPreviewNode: true } },
		});

		const canvasContent = wrapper.find('[class*="canvasContent"]');
		const style = canvasContent.attributes('style') ?? '';
		expect(style).toContain('scale(1)');
	});

	it('applies scale(1) when rendered width exceeds canvas width', () => {
		const widthRef = ref(2400);
		vi.mocked(useElementSize).mockReturnValue({
			width: widthRef,
			height: ref(420),
		} as unknown as ReturnType<typeof useElementSize>);

		const wrapper = mount(WorkflowPreviewCanvas, {
			props: { workflow: minimalWorkflow, animating: false },
			global: { stubs: { WorkflowPreviewNode: true } },
		});

		const canvasContent = wrapper.find('[class*="canvasContent"]');
		const style = canvasContent.attributes('style') ?? '';
		expect(style).toContain('scale(1)');
	});
});
