import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { renderComponent } from '@/__tests__/render';

import FileCodeViewer from '../FileCodeViewer.vue';

describe('FileCodeViewer', () => {
	const renderViewer = (props: { path: string; content: string }) =>
		renderComponent(FileCodeViewer, {
			global: { plugins: [createTestingPinia()] },
			props,
		});

	it('renders the given content', async () => {
		const { getByRole } = renderViewer({ path: 'src/main.ts', content: 'export {};' });

		const textbox = await waitFor(() => getByRole('textbox'));
		expect(textbox).toHaveTextContent('export {};');
	});

	it('replaces the doc when the content prop changes for the same path', async () => {
		const { getByRole, rerender } = renderViewer({ path: 'src/main.ts', content: 'export {};' });
		await waitFor(() => getByRole('textbox'));

		await rerender({ path: 'src/main.ts', content: 'export const x = 1;' });

		await waitFor(() => expect(getByRole('textbox')).toHaveTextContent('export const x = 1;'));
	});

	it('supports undo after an edit', async () => {
		const { getByRole } = renderViewer({ path: 'src/main.ts', content: 'abc' });
		const textbox = await waitFor(() => getByRole('textbox'));

		await userEvent.type(textbox, 'X');
		await waitFor(() => expect(textbox).toHaveTextContent('Xabc'));

		await userEvent.type(textbox, '{Control>}z{/Control}');
		await waitFor(() => expect(textbox).toHaveTextContent('abc'));
	});
});
