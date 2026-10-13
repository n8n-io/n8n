import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';

import { renderComponent } from '@/__tests__/render';
import HtmlEditor from '@/features/shared/editors/components/HtmlEditor/HtmlEditor.vue';
import { userEvent } from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { htmlEditorEventBus } from '@/app/event-bus';
import { loadPrettier, type PrettierModules } from '@/features/shared/editors/utils/loadPrettier';

vi.mock('@/features/shared/editors/utils/loadPrettier', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('@/features/shared/editors/utils/loadPrettier')>();
	return { loadPrettier: vi.fn(actual.loadPrettier) };
});

const DEFAULT_SETUP = {
	props: {
		modelValue: '<html><ul><li>one</li><li>two</li></ul></html>',
		isReadOnly: false,
	},
};

describe('HtmlEditor.vue', () => {
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

	it('renders simple html', async () => {
		const { getByRole } = renderComponent(HtmlEditor, {
			...DEFAULT_SETUP,
			props: DEFAULT_SETUP.props,
		});

		await waitFor(() =>
			expect(getByRole('textbox')).toHaveTextContent('<ul><li>one</li><li>two</li></ul>'),
		);
	});

	it('formats html (and style/script tags)', async () => {
		const unformattedHtml =
			'<!DOCTYPE html><html><head>  <meta charset="UTF-8" />  <title>My HTML document</title></head><body>  <div class="container">    <h1>This is an H1 heading</h1>    <h2>This is an H2 heading</h2>    <p>This is a paragraph</p>  </div> </body> <style>.container {  background-color: #ffffff;  text-align: center;}</style><script>console.log("Hello World!");</script></html>';
		const { getByRole } = renderComponent(HtmlEditor, {
			...DEFAULT_SETUP,
			props: { ...DEFAULT_SETUP.props, modelValue: unformattedHtml },
		});

		let textbox = await waitFor(() => getByRole('textbox'));
		expect(textbox.querySelectorAll('.cm-line').length).toBe(1);

		htmlEditorEventBus.emit('format-html');
		textbox = await waitFor(() => getByRole('textbox'));

		await waitFor(() => expect(textbox.querySelectorAll('.cm-line').length).toBe(24));
	});

	it('makes the editor read-only while it formats html', async () => {
		const { promise, resolve } = Promise.withResolvers<PrettierModules>();
		vi.mocked(loadPrettier).mockReturnValueOnce(promise);
		const { getByRole } = renderComponent(HtmlEditor, DEFAULT_SETUP);

		const textbox = await waitFor(() => getByRole('textbox'));
		htmlEditorEventBus.emit('format-html');

		expect(textbox).toHaveAttribute('aria-readonly', 'true');

		const { loadPrettier: actualLoadPrettier } = await vi.importActual<
			typeof import('@/features/shared/editors/utils/loadPrettier')
		>('@/features/shared/editors/utils/loadPrettier');
		resolve(await actualLoadPrettier());

		await waitFor(() => expect(textbox).not.toHaveAttribute('aria-readonly'));
		expect(textbox.querySelectorAll('.cm-line').length).toBeGreaterThan(1);
	});

	it('emits update:model-value events', async () => {
		const { emitted, getByRole } = renderComponent(HtmlEditor, {
			...DEFAULT_SETUP,
			props: DEFAULT_SETUP.props,
		});

		const textbox = await waitFor(() => getByRole('textbox'));
		await userEvent.type(textbox, '<div>Content');

		await waitFor(() =>
			expect(emitted('update:model-value')).toEqual([
				['<div>Content</div><html><ul><li>one</li><li>two</li></ul></html>'],
			]),
		);
	});
});
