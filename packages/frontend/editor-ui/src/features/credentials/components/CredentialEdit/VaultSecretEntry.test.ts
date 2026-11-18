import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { fireEvent, waitFor } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';

import { createComponentRenderer } from '@/__tests__/render';

import { startVaultCapture } from '../../credentials.api';
import VaultSecretEntry from './VaultSecretEntry.vue';

vi.mock('../../credentials.api', async (importOriginal) => ({
	...(await importOriginal<object>()),
	startVaultCapture: vi.fn(),
}));

const CAPTURE_ORIGIN = 'https://vault.example.com';
const CAPTURE_URL = `${CAPTURE_ORIGIN}/capture?ticket=abc`;

const renderComponent = createComponentRenderer(VaultSecretEntry);

interface FakeWindow {
	location: { href: string };
	closed: boolean;
	close: ReturnType<typeof vi.fn>;
	focus: ReturnType<typeof vi.fn>;
}

function fakeWindow(): FakeWindow {
	const win: FakeWindow = {
		location: { href: '' },
		closed: false,
		close: vi.fn(() => {
			win.closed = true;
		}),
		focus: vi.fn(),
	};
	return win;
}

function sendMessage(
	data: unknown,
	{ origin = CAPTURE_ORIGIN, source }: { origin?: string; source: unknown },
) {
	const event = new MessageEvent('message', { data, origin });
	Object.defineProperty(event, 'source', { value: source });
	window.dispatchEvent(event);
}

const stored = { type: 'n8n-vault-credential-stored', reference: { $vault: 'kv/creds/cred1' } };

describe('VaultSecretEntry', () => {
	let popup: FakeWindow;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		popup = fakeWindow();
		vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
		vi.mocked(startVaultCapture).mockReset();
		vi.mocked(startVaultCapture).mockResolvedValue({
			captureUrl: CAPTURE_URL,
			captureOrigin: CAPTURE_ORIGIN,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it('does nothing until the button is pressed', () => {
		const rendered = renderComponent({ props: { credentialId: 'cred1' } });

		expect(rendered.getByTestId('vault-secret-open')).toBeInTheDocument();
		expect(window.open).not.toHaveBeenCalled();
		expect(startVaultCapture).not.toHaveBeenCalled();
	});

	it('opens the window before the request, then points it at the entry page', async () => {
		const rendered = renderComponent({ props: { credentialId: 'cred1' } });

		await fireEvent.click(rendered.getByTestId('vault-secret-open'));
		await rendered.findByTestId('vault-secret-waiting');

		expect(window.open).toHaveBeenCalledWith('about:blank', 'n8n-vault-entry', expect.any(String));
		expect(startVaultCapture).toHaveBeenCalledWith(expect.anything(), 'cred1');
		expect(popup.location.href).toMatch(
			/^https:\/\/vault\.example\.com\/capture\?ticket=abc&theme=light&cx=-?\d+&cy=-?\d+$/,
		);
	});

	it('opens the window centered over the editor', async () => {
		vi.stubGlobal('screenX', 100);
		vi.stubGlobal('screenY', 50);
		vi.stubGlobal('outerWidth', 1440);
		vi.stubGlobal('outerHeight', 900);
		const rendered = renderComponent({ props: { credentialId: 'cred1' } });

		await fireEvent.click(rendered.getByTestId('vault-secret-open'));

		const features = vi.mocked(window.open).mock.calls[0][2];
		expect(features).toContain('popup=yes');
		expect(features).toContain('width=440');
		expect(features).toContain('left=600'); // 100 + (1440 - 440) / 2
		expect(features).toContain('top=290'); // 50 + (900 - 420) / 2
		// The page gets the center of the editor, because it resizes itself and places itself again.
		await waitFor(() => expect(popup.location.href).toContain('&theme=light&cx=820&cy=500')); // 100 + 1440 / 2 and 50 + 900 / 2
		vi.unstubAllGlobals();
	});

	it('gives the entry page the editor theme', async () => {
		document.body.setAttribute('data-theme', 'dark');
		const rendered = renderComponent({ props: { credentialId: 'cred1' } });

		await fireEvent.click(rendered.getByTestId('vault-secret-open'));
		await rendered.findByTestId('vault-secret-waiting');

		expect(popup.location.href).toContain('&theme=dark&');
		document.body.removeAttribute('data-theme');
	});

	it('tells the person when the browser blocks the window, without asking n8n for a ticket', async () => {
		vi.mocked(window.open).mockReturnValue(null);
		const rendered = renderComponent({ props: { credentialId: 'cred1' } });

		await fireEvent.click(rendered.getByTestId('vault-secret-open'));

		expect(await rendered.findByTestId('vault-secret-error')).toHaveTextContent('blocked');
		expect(startVaultCapture).not.toHaveBeenCalled();
	});

	it('closes the window and offers a retry when n8n cannot start the entry', async () => {
		vi.mocked(startVaultCapture).mockRejectedValueOnce(new Error('broker down'));
		const rendered = renderComponent({ props: { credentialId: 'cred1' } });

		await fireEvent.click(rendered.getByTestId('vault-secret-open'));

		await rendered.findByTestId('vault-secret-error');
		expect(popup.close).toHaveBeenCalled();
		await fireEvent.click(rendered.getByTestId('vault-secret-open'));
		await waitFor(() => expect(startVaultCapture).toHaveBeenCalledTimes(2));
	});

	it('emits "stored" and closes the window when the vault reports this credential', async () => {
		const rendered = renderComponent({ props: { credentialId: 'cred1' } });
		await fireEvent.click(rendered.getByTestId('vault-secret-open'));
		await rendered.findByTestId('vault-secret-waiting');

		sendMessage(stored, { source: popup });
		await flushPromises();

		expect(rendered.emitted('stored')).toHaveLength(1);
		expect(rendered.getByTestId('vault-secret-stored')).toBeInTheDocument();
		expect(popup.close).toHaveBeenCalled();
	});

	it('ignores messages from another origin, another window or about another credential', async () => {
		const rendered = renderComponent({ props: { credentialId: 'cred1' } });
		await fireEvent.click(rendered.getByTestId('vault-secret-open'));
		await rendered.findByTestId('vault-secret-waiting');

		sendMessage(stored, { origin: 'https://evil.example.com', source: popup });
		sendMessage(stored, { source: fakeWindow() });
		sendMessage(
			{ type: 'n8n-vault-credential-stored', reference: { $vault: 'kv/creds/other' } },
			{ source: popup },
		);
		sendMessage('not an object', { source: popup });
		await flushPromises();

		expect(rendered.emitted('stored')).toBeUndefined();
		expect(rendered.getByTestId('vault-secret-waiting')).toBeInTheDocument();
	});

	it('goes back to the start when the person closes the window without storing', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const rendered = renderComponent({ props: { credentialId: 'cred1' } });
		await fireEvent.click(rendered.getByTestId('vault-secret-open'));
		await rendered.findByTestId('vault-secret-waiting');

		popup.closed = true;
		await vi.advanceTimersByTimeAsync(600);

		expect(await rendered.findByTestId('vault-secret-open')).toBeInTheDocument();
		expect(rendered.emitted('stored')).toBeUndefined();
	});

	it('brings the window to the front on request', async () => {
		const rendered = renderComponent({ props: { credentialId: 'cred1' } });
		await fireEvent.click(rendered.getByTestId('vault-secret-open'));

		await fireEvent.click(await rendered.findByTestId('vault-secret-show'));

		expect(popup.focus).toHaveBeenCalled();
	});

	it('closes the window when the component goes away', async () => {
		const rendered = renderComponent({ props: { credentialId: 'cred1' } });
		await fireEvent.click(rendered.getByTestId('vault-secret-open'));
		await rendered.findByTestId('vault-secret-waiting');

		rendered.unmount();

		expect(popup.close).toHaveBeenCalled();
	});
});
