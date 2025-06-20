import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { STORES } from '@n8n/stores';
import { createTestingPinia } from '@pinia/testing';

import { renderComponent } from '@/__tests__/render';
import HtmlEditor from '@/components/HtmlEditor/HtmlEditor.vue';
import { userEvent } from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { htmlEditorEventBus } from '../event-bus';

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
