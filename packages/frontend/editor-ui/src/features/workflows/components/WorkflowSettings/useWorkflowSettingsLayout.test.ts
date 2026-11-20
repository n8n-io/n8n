import { ref } from 'vue';
import * as vueuse from '@vueuse/core';
import { useWorkflowSettingsLayout } from './useWorkflowSettingsLayout';

vi.mock('@vueuse/core', async (importOriginal) => ({
	...(await importOriginal<typeof vueuse>()),
	useElementSize: vi.fn(),
}));

function mockContainerWidth(initialWidth: number) {
	const width = ref(initialWidth);
	vi.mocked(vueuse.useElementSize).mockReturnValue({
		width,
		height: ref(0),
		stop: vi.fn(),
	});
	return width;
}

describe('useWorkflowSettingsLayout', () => {
	it.each([
		[1, 'vertical'],
		[320, 'vertical'],
		[599, 'vertical'],
		[600, 'horizontal'],
		[1200, 'horizontal'],
	] as const)('uses for a container width of %i the %s layout', (width, expected) => {
		mockContainerWidth(width);

		const { rowLayout } = useWorkflowSettingsLayout(ref(document.createElement('div')));

		expect(rowLayout.value).toBe(expected);
	});

	it('uses the horizontal layout when the container has no measured width', () => {
		mockContainerWidth(0);

		const { rowLayout } = useWorkflowSettingsLayout(ref(null));

		expect(rowLayout.value).toBe('horizontal');
	});

	it('changes the layout when the container width crosses the breakpoint', () => {
		const width = mockContainerWidth(400);
		const { rowLayout } = useWorkflowSettingsLayout(ref(document.createElement('div')));
		expect(rowLayout.value).toBe('vertical');

		width.value = 800;

		expect(rowLayout.value).toBe('horizontal');
	});

	it('measures the container that the caller passes', () => {
		mockContainerWidth(400);
		const container = ref(document.createElement('div'));

		useWorkflowSettingsLayout(container);

		expect(vi.mocked(vueuse.useElementSize).mock.lastCall?.[0]).toBe(container);
	});
});
