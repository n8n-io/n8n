import { within, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import McpAllowedCallbackUrlsDialog from '@/features/ai/mcpAccess/components/McpAllowedCallbackUrlsDialog.vue';

const renderComponent = createComponentRenderer(McpAllowedCallbackUrlsDialog);

// The dialog teleports to document.body; its root is renderless, so wait for content.
const body = () => within(document.body);

const saveButton = () => body().getByTestId('mcp-callback-urls-save');

const renderDialog = async (uris: string[]) => {
	const rendered = renderComponent({ props: { open: true, uris } });
	await waitFor(() => {
		expect(body().getByTestId('mcp-callback-urls-save')).toBeInTheDocument();
	});
	return rendered;
};

describe('McpAllowedCallbackUrlsDialog', () => {
	it('should preselect "all" mode with no URL list when nothing is configured', async () => {
		await renderDialog([]);

		expect(body().queryByTestId('mcp-callback-url-input')).not.toBeInTheDocument();
		// Saving the default "all" selection is allowed (idempotent), no tweak needed.
		expect(saveButton()).toBeEnabled();
	});

	it('should preselect "trusted" mode with the persisted URLs', async () => {
		await renderDialog(['https://a.example.com/cb', 'https://b.example.com/cb']);

		expect(body().getAllByTestId('mcp-callback-url-input')).toHaveLength(2);
		// A valid, unchanged selection can still be re-saved.
		expect(saveButton()).toBeEnabled();
	});

	it('should emit the trimmed URL list when saving trusted URLs', async () => {
		const { emitted } = await renderDialog([]);

		await userEvent.click(body().getByTestId('mcp-callback-urls-mode-trusted'));
		await userEvent.type(
			body().getByTestId('mcp-callback-url-input'),
			'  https://client.example.com/callback  ',
		);

		expect(saveButton()).toBeEnabled();
		await userEvent.click(saveButton());

		expect(emitted('save')).toEqual([[['https://client.example.com/callback']]]);
	});

	it('should show a validation error and block saving for an invalid URL', async () => {
		await renderDialog([]);

		await userEvent.click(body().getByTestId('mcp-callback-urls-mode-trusted'));
		await userEvent.type(body().getByTestId('mcp-callback-url-input'), 'not-a-url');

		expect(body().getByTestId('mcp-callback-urls-error')).toBeVisible();
		expect(saveButton()).toBeDisabled();
	});

	it('should require https for non-localhost URLs', async () => {
		await renderDialog([]);

		await userEvent.click(body().getByTestId('mcp-callback-urls-mode-trusted'));
		await userEvent.type(
			body().getByTestId('mcp-callback-url-input'),
			'http://client.example.com/callback',
		);

		expect(body().getByTestId('mcp-callback-urls-error')).toBeVisible();
		expect(saveButton()).toBeDisabled();
	});

	it('should allow http for localhost URLs', async () => {
		await renderDialog([]);

		await userEvent.click(body().getByTestId('mcp-callback-urls-mode-trusted'));
		await userEvent.type(body().getByTestId('mcp-callback-url-input'), 'http://localhost/callback');

		expect(body().queryByTestId('mcp-callback-urls-error')).not.toBeInTheDocument();
		expect(saveButton()).toBeEnabled();
	});

	it('should emit an empty list when switching back to allowing all URLs', async () => {
		const { emitted } = await renderDialog(['https://a.example.com/cb']);

		await userEvent.click(body().getByTestId('mcp-callback-urls-mode-all'));

		expect(saveButton()).toBeEnabled();
		await userEvent.click(saveButton());

		expect(emitted('save')).toEqual([[[]]]);
	});

	it('should sync to the persisted URLs when they load after the dialog is already open', async () => {
		// Dialog opened before the async allow-list resolved: it starts on "all".
		const { rerender } = await renderDialog([]);
		expect(body().queryByTestId('mcp-callback-url-input')).not.toBeInTheDocument();

		// The load resolves and the prop updates; the form must adopt the trusted list
		// rather than keep the default "all" (which would erase it on save).
		await rerender({ open: true, uris: ['https://a.example.com/cb'] });

		await waitFor(() => {
			expect(body().getAllByTestId('mcp-callback-url-input')).toHaveLength(1);
		});
	});

	it('should add and remove URL rows', async () => {
		await renderDialog(['https://a.example.com/cb']);

		await userEvent.click(body().getByTestId('mcp-callback-url-add'));
		expect(body().getAllByTestId('mcp-callback-url-input')).toHaveLength(2);

		await userEvent.click(body().getAllByTestId('mcp-callback-url-remove')[0]);
		await waitFor(() => {
			expect(body().getAllByTestId('mcp-callback-url-input')).toHaveLength(1);
		});
	});
});
