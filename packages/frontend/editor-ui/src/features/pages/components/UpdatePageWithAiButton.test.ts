import type { Page } from '@n8n/api-types';
import { usePageStore } from '@n8n/frontend-module-page';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';

import UpdatePageWithAiButton from './UpdatePageWithAiButton.vue';

const assistant = vi.hoisted(() => ({
	isAvailable: { value: true },
	startThread: vi.fn(),
}));

vi.mock('@/features/ai/instanceAi/composables/useInstanceAiAvailability', () => ({
	useInstanceAiAvailable: () => assistant.isAvailable,
}));
vi.mock('@/features/ai/instanceAi/composables/useInstanceAiHandoff', () => ({
	useInstanceAiHandoff: () => ({ startThread: assistant.startThread }),
}));
vi.mock('../composables/useIsPageModuleActive', () => ({
	useIsPageModuleActive: () => ({ value: true }),
}));

const runbook: Page = {
	id: 'page-1',
	title: 'Orders runbook',
	content: 'Rotate the key.',
	projectId: 'p1',
	version: 1,
	createdAt: '2026-11-01T00:00:00.000Z',
	updatedAt: '2026-11-02T00:00:00.000Z',
};

const renderComponent = createComponentRenderer(UpdatePageWithAiButton, {
	props: { pageId: 'page-1' },
});

describe('UpdatePageWithAiButton', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
		mockedStore(usePageStore).pagesById = { 'page-1': runbook };
		assistant.isAvailable.value = true;
		assistant.startThread.mockResolvedValue('started');
	});

	it('should render nothing when the assistant is not available', () => {
		assistant.isAvailable.value = false;

		const { queryByTestId } = renderComponent();

		expect(queryByTestId('page-update-with-ai-button')).not.toBeInTheDocument();
	});

	it('should render nothing while the page is not loaded', () => {
		mockedStore(usePageStore).pagesById = {};

		const { queryByTestId } = renderComponent();

		expect(queryByTestId('page-update-with-ai-button')).not.toBeInTheDocument();
	});

	it('should ask the assistant to update the page in the project of the page', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('page-update-with-ai-button'));

		const [projectId, prompt, , launch] = assistant.startThread.mock.calls[0];
		expect(projectId).toBe('p1');
		expect(prompt).toContain('"Orders runbook"');
		expect(prompt).toContain('/page/page-1');
		expect(launch).toMatchObject({
			source: 'page_update_button',
			sourceContext: { pageId: 'page-1' },
		});
		expect(emitted().started).toHaveLength(1);
	});

	it('should not report a start when the assistant opens its setup', async () => {
		assistant.startThread.mockResolvedValue('setup');
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('page-update-with-ai-button'));

		expect(emitted().started).toBeUndefined();
	});
});
