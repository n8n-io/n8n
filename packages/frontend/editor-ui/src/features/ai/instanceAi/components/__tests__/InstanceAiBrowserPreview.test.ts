import { fireEvent } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { reactive } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';

import type { CloudBrowserLiveView } from '../../composables/useCloudBrowserLiveViews';
import { CloudBrowserLiveViewsKey } from '../../composables/useCloudBrowserLiveViews';
import InstanceAiBrowserPreview from '../InstanceAiBrowserPreview.vue';

const renderComponent = createComponentRenderer(InstanceAiBrowserPreview);

const live: CloudBrowserLiveView = {
	status: 'live',
	liveViewUrl: 'https://live.example.com/1',
	windowId: 'window-1',
};

// A popup in front of the first window, which stays loaded behind it.
const popup: CloudBrowserLiveView = {
	status: 'live',
	liveViewUrl: 'https://live.example.com/popup',
	windowId: 'window-2',
	background: { windowId: 'window-1', liveViewUrl: 'https://live.example.com/1' },
};

function render(view: CloudBrowserLiveView | undefined) {
	const liveViews = reactive(new Map<string, CloudBrowserLiveView>());
	if (view) liveViews.set('task-1', view);
	const rendered = renderComponent({
		props: { taskId: 'task-1' },
		global: { provide: { [CloudBrowserLiveViewsKey as symbol]: liveViews } },
	});
	return { ...rendered, liveViews };
}

describe('InstanceAiBrowserPreview', () => {
	describe('placeholder', () => {
		it.each([
			['before the live view loads', undefined],
			['while the browser starts', { status: 'starting' as const }],
		])('says the browser is opening %s, with a spinner', (_, view) => {
			const { getByTestId, queryByTestId } = render(view);

			expect(getByTestId('instance-ai-browser-preview-placeholder')).toHaveTextContent(
				'Opening the browser…',
			);
			expect(getByTestId('instance-ai-browser-preview-spinner')).toBeInTheDocument();
			expect(queryByTestId('instance-ai-browser-preview-frame')).not.toBeInTheDocument();
		});

		it.each([
			['disconnected', { status: 'disconnected' as const, reason: 'idleTimeout' }],
			['not found', { status: 'not-found' as const }],
		])('says the browser closed when it is %s, without a spinner', (_, view) => {
			const { getByTestId, queryByTestId } = render(view as CloudBrowserLiveView);

			expect(getByTestId('instance-ai-browser-preview-placeholder')).toHaveTextContent(
				'The browser closed',
			);
			expect(queryByTestId('instance-ai-browser-preview-spinner')).not.toBeInTheDocument();
		});

		it('shows again when a new session reuses the window id', async () => {
			const { getByTestId, queryByTestId, liveViews } = render(live);
			await fireEvent.load(getByTestId('instance-ai-browser-preview-frame'));
			expect(queryByTestId('instance-ai-browser-preview-placeholder')).not.toBeInTheDocument();

			liveViews.set('task-1', { ...live, liveViewUrl: 'https://live.example.com/2' });
			await flushPromises();

			expect(getByTestId('instance-ai-browser-preview-placeholder')).toHaveTextContent(
				'Opening the browser…',
			);
			await fireEvent.load(getByTestId('instance-ai-browser-preview-frame'));
			expect(queryByTestId('instance-ai-browser-preview-placeholder')).not.toBeInTheDocument();
		});

		it('stays over the frame until the frame has loaded', async () => {
			const { getByTestId, queryByTestId } = render(live);
			const frame = getByTestId('instance-ai-browser-preview-frame');
			expect(getByTestId('instance-ai-browser-preview-placeholder')).toHaveTextContent(
				'Opening the browser…',
			);

			await fireEvent.load(frame);

			expect(queryByTestId('instance-ai-browser-preview-placeholder')).not.toBeInTheDocument();
		});
	});

	describe('live view', () => {
		it("keeps Browserbase's navigation bar and is view-only", () => {
			const { getByTestId } = render({
				...live,
				liveViewUrl: 'https://live.example.com/1?navbar=false',
			});

			const frame = getByTestId('instance-ai-browser-preview-frame');
			expect(frame).toHaveAttribute('src', 'https://live.example.com/1');
			expect(frame).toHaveAttribute('data-cloud-browser-task-id', 'task-1');
			expect(frame).toHaveAttribute('data-cloud-browser-window-id', 'window-1');
			expect(frame).toHaveAttribute('tabindex', '-1');
			expect(frame).toHaveClass('viewOnly');
		});
	});

	describe('windows', () => {
		it('keeps the window behind loaded but hidden and view-only', () => {
			const { getByTestId } = render(popup);

			const current = getByTestId('instance-ai-browser-preview-frame');
			expect(current).toHaveAttribute('src', 'https://live.example.com/popup');
			expect(current).toHaveAttribute('data-cloud-browser-window-id', 'window-2');
			expect(current).not.toHaveAttribute('aria-hidden');

			const background = getByTestId('instance-ai-browser-preview-background-frame');
			expect(background).toHaveAttribute('src', 'https://live.example.com/1');
			expect(background).toHaveAttribute('data-cloud-browser-task-id', 'task-1');
			expect(background).toHaveAttribute('data-cloud-browser-window-id', 'window-1');
			expect(background).toHaveAttribute('aria-hidden', 'true');
			expect(background).toHaveAttribute('tabindex', '-1');
			expect(background).not.toHaveAttribute('title');
			expect(background).toHaveClass('backgroundFrame');
			expect(background).toHaveClass('viewOnly');
		});

		it('shows the same frame again when the window behind is current again', async () => {
			const { getByTestId, queryByTestId, liveViews } = render(popup);
			const background = getByTestId('instance-ai-browser-preview-background-frame');
			await fireEvent.load(background);

			liveViews.set('task-1', live);
			await flushPromises();

			// The frame is kept, so the window does not reload.
			expect(getByTestId('instance-ai-browser-preview-frame')).toBe(background);
			expect(background).not.toHaveClass('backgroundFrame');
			expect(queryByTestId('instance-ai-browser-preview-background-frame')).not.toBeInTheDocument();
			expect(queryByTestId('instance-ai-browser-preview-placeholder')).not.toBeInTheDocument();
		});
	});
});
