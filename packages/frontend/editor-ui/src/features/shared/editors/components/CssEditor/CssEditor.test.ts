import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';

import { renderComponent } from '@/__tests__/render';
import CssEditor from '@/features/shared/editors/components/CssEditor/CssEditor.vue';
import { EditorView } from '@codemirror/view';
import { userEvent } from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { setActivePinia } from 'pinia';

const DEFAULT_SETUP = {
	props: {
		modelValue: '.container { color: red; }',
		isReadOnly: false,
	},
};

function editorState(container: Element) {
	const dom = container.querySelector<HTMLElement>('.cm-editor');
	return dom ? EditorView.findFromDOM(dom)?.state : undefined;
}

describe('CssEditor.vue', () => {
	const pinia = createTestingPinia({
		initialState: {
			[STORES.SETTINGS]: {
				settings: SETTINGS_STORE_DEFAULT_STATE.settings,
			},
		},
	});
	setActivePinia(pinia);

	afterAll(() => {
		vi.clearAllMocks();
	});

	it('renders simple css', async () => {
		const { getByRole } = renderComponent(CssEditor, DEFAULT_SETUP);

		await waitFor(() => expect(getByRole('textbox')).toHaveTextContent('.container'));
	});

	it('emits update:model-value events', async () => {
		const { emitted, getByRole } = renderComponent(CssEditor, DEFAULT_SETUP);

		const textbox = await waitFor(() => getByRole('textbox'));
		await userEvent.type(textbox, 'a');

		await waitFor(() =>
			expect(emitted('update:model-value')).toContainEqual(['a.container { color: red; }']),
		);
	});

	it('enforces the read-only prop on the editor', async () => {
		const { container } = renderComponent(CssEditor, {
			props: { ...DEFAULT_SETUP.props, isReadOnly: true },
		});

		await waitFor(() => expect(editorState(container)?.readOnly).toBe(true));
	});

	it('rejects typed input while read-only', async () => {
		const { container, getByRole } = renderComponent(CssEditor, {
			props: { ...DEFAULT_SETUP.props, isReadOnly: true },
		});

		const textbox = await waitFor(() => getByRole('textbox'));
		await userEvent.type(textbox, 'a');

		expect(container.querySelector('.cm-content')?.textContent).toEqual(
			DEFAULT_SETUP.props.modelValue,
		);
	});

	it('becomes editable when the read-only prop is turned off at runtime', async () => {
		const { container, rerender } = renderComponent(CssEditor, {
			props: { ...DEFAULT_SETUP.props, isReadOnly: true },
		});

		await waitFor(() => expect(editorState(container)?.readOnly).toBe(true));

		await rerender({ isReadOnly: false });

		await waitFor(() => expect(editorState(container)?.readOnly).toBe(false));
	});

	it('becomes read-only when the read-only prop is turned on at runtime', async () => {
		const { container, rerender } = renderComponent(CssEditor, DEFAULT_SETUP);

		await waitFor(() => expect(editorState(container)?.readOnly).toBe(false));

		await rerender({ isReadOnly: true });

		await waitFor(() => expect(editorState(container)?.readOnly).toBe(true));
	});
});
