import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'vue-router';

import { useUIStore } from '@/app/stores/ui.store';

import PagePeekPanel from './PagePeekPanel.vue';

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: vi.fn().mockReturnValue({
		push: vi.fn().mockResolvedValue(undefined),
		resolve: vi.fn().mockReturnValue({ href: '/page/p1' }),
	}),
}));

vi.mock('@n8n/frontend-module-page', async (importOriginal) => {
	const { defineComponent, h } = await import('vue');
	return {
		...(await importOriginal<typeof import('@n8n/frontend-module-page')>()),
		PageEditor: defineComponent({
			props: { pageId: { type: String, required: true } },
			emits: ['not-found', 'save-status'],
			setup:
				(props, { emit }) =>
				() =>
					h('div', [
						h('span', { 'data-test-id': 'page-editor-stub' }, props.pageId),
						h('button', {
							'data-test-id': 'stub-save',
							onClick: () => emit('save-status', 'saved'),
						}),
						h('button', { 'data-test-id': 'stub-missing', onClick: () => emit('not-found') }),
					]),
		}),
	};
});

const renderComponent = createComponentRenderer(PagePeekPanel, {
	props: { pageId: 'p1' },
});

describe('PagePeekPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createTestingPinia();
		useUIStore().modalsById = { credentialEdit: { open: true }, about: { open: false } };
	});

	it('should show the editor of the page', () => {
		const { getByTestId } = renderComponent();

		expect(getByTestId('page-editor-stub')).toHaveTextContent('p1');
	});

	it('should show the save status of the page', async () => {
		const { getByTestId } = renderComponent();

		await userEvent.click(getByTestId('stub-save'));

		expect(getByTestId('page-peek-save-status')).toHaveTextContent('Saved');
	});

	it('should say that the page is missing in place of the editor', async () => {
		const { getByTestId, queryByTestId } = renderComponent();

		await userEvent.click(getByTestId('stub-missing'));

		expect(getByTestId('page-peek-not-found')).toBeInTheDocument();
		expect(queryByTestId('page-editor-stub')).toBeNull();
	});

	it('should emit `close` from the close button', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('page-peek-close'));

		expect(emitted('close')).toHaveLength(1);
	});

	it('should emit `close` on Escape', async () => {
		const { getByTestId, emitted } = renderComponent();

		getByTestId('page-peek-close').focus();
		await userEvent.keyboard('{Escape}');

		expect(emitted('close')).toHaveLength(1);
	});

	it('should open the page view, close the open modals and emit `close`', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('page-peek-open-full'));

		expect(useRouter().push).toHaveBeenCalled();
		expect(useUIStore().closeModal).toHaveBeenCalledTimes(1);
		expect(useUIStore().closeModal).toHaveBeenCalledWith('credentialEdit');
		expect(emitted('close')).toHaveLength(1);
	});
});
