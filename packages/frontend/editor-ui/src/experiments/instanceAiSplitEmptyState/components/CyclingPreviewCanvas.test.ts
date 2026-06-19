import { fireEvent } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { createComponentRenderer } from '@/__tests__/render';
import { INSTANCE_AI_SPLIT_EMPTY_STATE_EXAMPLES } from '../examples';
import CyclingPreviewCanvas from './CyclingPreviewCanvas.vue';

const buildManually = vi.fn();

vi.mock('../useBuildManually', () => ({
	useBuildManually: () => ({ buildManually }),
}));

// InstanceAiPreviewCanvas is heavy (canvas animation, ResizeObserver, timers).
// Stub it so tests focus on CyclingPreviewCanvas wiring.
vi.mock('./InstanceAiPreviewCanvas.vue', () => ({
	default: {
		name: 'InstanceAiPreviewCanvas',
		template: '<div data-test-id="instance-ai-preview-canvas" />',
		props: ['workflow', 'animating'],
	},
}));

const renderComponent = createComponentRenderer(CyclingPreviewCanvas, {
	props: {
		examples: INSTANCE_AI_SPLIT_EMPTY_STATE_EXAMPLES,
		activeIndex: 1,
		projectId: 'p1',
	},
});

describe('CyclingPreviewCanvas', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		buildManually.mockReset();
	});

	it('mounts the preview canvas', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('instance-ai-preview-canvas')).toBeInTheDocument();
	});

	it('calls buildManually with the projectId when the build-manually button is clicked', async () => {
		const { getByTestId } = renderComponent();
		await fireEvent.click(getByTestId('instance-ai-canvas-build-manually'));
		expect(buildManually).toHaveBeenCalledWith('p1');
	});
});
