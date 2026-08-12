import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import { HTML_PREVIEW_MODAL_KEY } from '@/app/constants';
import HtmlPreviewModal from './HtmlPreviewModal.vue';

vi.mock('@/app/components/Modal.vue', () => ({
	default: {
		name: 'Modal',
		template: '<div data-test-id="modal"><slot name="header" /><slot name="content" /></div>',
		props: ['name', 'title', 'width', 'height', 'center'],
	},
}));

const { copy } = vi.hoisted(() => ({ copy: vi.fn() }));

vi.mock('@n8n/composables/useClipboard', () => ({ useClipboard: () => ({ copy }) }));

const html = '<p>Hello</p>';

const renderComponent = createComponentRenderer(HtmlPreviewModal, {
	pinia: createTestingPinia({
		initialState: { ui: { modalsById: { [HTML_PREVIEW_MODAL_KEY]: { open: true } } } },
	}),
	props: { data: { html } },
});

describe('HtmlPreviewModal', () => {
	it('previews the document by default', () => {
		const { container, queryByTestId } = renderComponent();

		expect(container.querySelector('iframe')?.getAttribute('srcdoc')).toContain('Hello');
		expect(queryByTestId('html-preview-raw')).not.toBeInTheDocument();
	});

	it('switches to the raw document and back', async () => {
		const { container, getByText, getByTestId, queryByTestId } = renderComponent();

		await userEvent.click(getByText('Raw'));

		expect(getByTestId('html-preview-raw')).toHaveTextContent(html);
		expect(container.querySelector('iframe')).not.toBeInTheDocument();

		await userEvent.click(getByText('Preview'));

		expect(queryByTestId('html-preview-raw')).not.toBeInTheDocument();
		expect(container.querySelector('iframe')).toBeInTheDocument();
	});

	it('copies the document', async () => {
		const { getByText } = renderComponent();

		await userEvent.click(getByText('Copy'));

		expect(copy).toHaveBeenCalledWith(html);
	});
});
