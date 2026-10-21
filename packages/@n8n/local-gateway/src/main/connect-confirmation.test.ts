const { mockShowMessageBox } = vi.hoisted(() => ({ mockShowMessageBox: vi.fn() }));

vi.mock('electron', () => ({
	app: { focus: vi.fn() },
	dialog: { showMessageBox: mockShowMessageBox },
}));

import { confirmConnect } from './connect-confirmation';

describe('confirmConnect', () => {
	beforeEach(() => {
		mockShowMessageBox.mockReset();
	});

	it('returns false when the user cancels', async () => {
		mockShowMessageBox.mockResolvedValue({ response: 1 });

		await expect(confirmConnect('https://a.app.n8n.cloud/', null)).resolves.toBe(false);
	});

	it('returns true when the user clicks Connect', async () => {
		mockShowMessageBox.mockResolvedValue({ response: 0 });

		await expect(confirmConnect('https://a.app.n8n.cloud/', null)).resolves.toBe(true);
	});

	it('shows the target origin and defaults to Cancel', async () => {
		mockShowMessageBox.mockResolvedValue({ response: 1 });

		await confirmConnect('https://a.app.n8n.cloud/some/path', null);

		expect(mockShowMessageBox).toHaveBeenCalledWith(
			expect.objectContaining({
				message: 'Connect n8n Gateway to https://a.app.n8n.cloud?',
				buttons: ['Connect', 'Cancel'],
				defaultId: 1,
				cancelId: 1,
			}),
		);
	});

	it('names the current connection that will end', async () => {
		mockShowMessageBox.mockResolvedValue({ response: 1 });

		await confirmConnect('https://b.app.n8n.cloud', 'https://a.app.n8n.cloud');

		expect(mockShowMessageBox).toHaveBeenCalledWith(
			expect.objectContaining({
				detail: expect.stringContaining('https://a.app.n8n.cloud'),
			}),
		);
	});
});
