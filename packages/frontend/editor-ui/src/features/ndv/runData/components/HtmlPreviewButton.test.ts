import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/app/stores/ui.store';
import { HTML_PREVIEW_MODAL_KEY } from '@/app/constants';
import HtmlPreviewButton from './HtmlPreviewButton.vue';

const renderComponent = createComponentRenderer(HtmlPreviewButton, {
	pinia: createTestingPinia(),
});

describe('HtmlPreviewButton', () => {
	it('reports the size of the document', () => {
		const { getByTestId } = renderComponent({ props: { html: 'a'.repeat(2048) } });

		expect(getByTestId('html-preview-button')).toHaveTextContent('2.0 kB');
	});

	it('opens the preview modal with the document', async () => {
		const uiStore = mockedStore(useUIStore);
		const { getByTestId } = renderComponent({ props: { html: '<p>hi</p>', title: 'html' } });

		await userEvent.click(getByTestId('html-preview-button'));

		expect(uiStore.openModalWithData).toHaveBeenCalledWith({
			name: HTML_PREVIEW_MODAL_KEY,
			data: { html: '<p>hi</p>', title: 'html' },
		});
	});
});
