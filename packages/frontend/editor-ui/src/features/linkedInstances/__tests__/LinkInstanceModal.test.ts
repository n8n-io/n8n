import { ResponseError } from '@n8n/rest-api-client';
import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import LinkInstanceModal from '../components/LinkInstanceModal.vue';
import type * as Api from '../linkedInstances.api';
import { useLinkedInstancesStore } from '../linkedInstances.store';
import { deferred, fakeToken, linkedInstance } from './linkedInstances.fixtures';

const api = vi.hoisted(() => ({
	fetchLinkedInstances: vi.fn<typeof Api.fetchLinkedInstances>(),
	linkInstance: vi.fn<typeof Api.linkInstance>(),
	verifyLinkedInstance: vi.fn<typeof Api.verifyLinkedInstance>(),
	updateLinkedInstance: vi.fn<typeof Api.updateLinkedInstance>(),
	unlinkInstance: vi.fn<typeof Api.unlinkInstance>(),
}));

vi.mock('../linkedInstances.api', () => api);

const REFUSED = 'That instance refused the access token. Create a new token and try again.';

const renderModal = createComponentRenderer(LinkInstanceModal);

async function setup() {
	const pinia = createTestingPinia({ stubActions: false });
	const result = renderModal({ pinia, props: { open: true } });
	// The dialog content mounts after the portal opens.
	await screen.findByTestId('link-instance-form');
	return { ...result, pinia };
}

const nameInput = () => screen.getByTestId('link-instance-name-input');
const urlInput = () => screen.getByTestId('link-instance-url-input');
const tokenInput = () => screen.getByTestId('link-instance-token-input');
const submitButton = () => screen.getByTestId('link-instance-submit');

async function fillForm(values: { name?: string; url?: string; token?: string }) {
	if (values.name !== undefined) await userEvent.type(nameInput(), values.name);
	if (values.url !== undefined) await userEvent.type(urlInput(), values.url);
	if (values.token !== undefined) await userEvent.type(tokenInput(), values.token);
}

describe('LinkInstanceModal', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('form', () => {
		it('shows the three fields with their labels and placeholders', async () => {
			await setup();

			expect(screen.getByLabelText(/^Name/)).toBe(nameInput());
			expect(screen.getByLabelText(/^URL/)).toBe(urlInput());
			expect(screen.getByLabelText(/^Access token/)).toBe(tokenInput());
			expect(nameInput()).toHaveAttribute('placeholder', 'Acme Cloud');
			expect(urlInput()).toHaveAttribute('placeholder', 'https://acme.app.n8n.cloud');
		});

		it('hides the token as a password and tells the user where to create it', async () => {
			await setup();

			expect(tokenInput()).toHaveAttribute('type', 'password');
			// Browsers ignore "off" on a password input and could fill a saved sign-in password.
			expect(tokenInput()).toHaveAttribute('autocomplete', 'new-password');
			expect(nameInput()).toHaveAttribute('autocomplete', 'off');
			expect(urlInput()).toHaveAttribute('autocomplete', 'off');
			expect(tokenInput()).toHaveAccessibleDescription(
				'In the cloud instance, go to Settings > Instance-level MCP and create an access token.',
			);
		});

		it('puts focus in the name field when it opens', async () => {
			await setup();

			await waitFor(() => expect(nameInput()).toHaveFocus());
		});
	});

	describe('validation', () => {
		it('shows an error for each empty field and sends nothing', async () => {
			await setup();

			await userEvent.click(submitButton());

			expect(screen.getByText('Enter a name.')).toBeVisible();
			expect(screen.getByText('Enter the URL of the n8n instance.')).toBeVisible();
			expect(screen.getByText('Enter the access token.')).toBeVisible();
			expect(api.linkInstance).not.toHaveBeenCalled();
		});

		it('marks the first invalid field and moves focus to it', async () => {
			await setup();
			await fillForm({ name: 'Acme Cloud' });

			await userEvent.click(submitButton());

			expect(urlInput()).toHaveFocus();
			expect(urlInput()).toHaveAttribute('aria-invalid', 'true');
			expect(nameInput()).not.toHaveAttribute('aria-invalid');
			expect(urlInput()).toHaveAccessibleDescription('Enter the URL of the n8n instance.');
		});

		it('shows the address problem when the user leaves the field, not while typing', async () => {
			await setup();

			await userEvent.type(urlInput(), 'http://example.com');
			expect(screen.queryByText(/Use https:\/\/ for this URL/)).not.toBeInTheDocument();

			await userEvent.tab();

			expect(
				screen.getByText(
					'Use https:// for this URL. Plain http:// works only for an instance on this computer.',
				),
			).toBeVisible();
			expect(screen.queryByText('Enter a name.')).not.toBeInTheDocument();
		});

		it('shows no error for an empty field that the user only moves through', async () => {
			await setup();

			await userEvent.tab();
			await userEvent.tab();

			expect(screen.queryByText('Enter a name.')).not.toBeInTheDocument();
			expect(screen.queryByText('Enter the URL of the n8n instance.')).not.toBeInTheDocument();
			expect(nameInput()).not.toHaveAttribute('aria-invalid');
		});

		it('asks for a value again when the user clears a field that had one', async () => {
			await setup();
			await userEvent.type(nameInput(), 'Acme');
			await userEvent.tab();

			await userEvent.clear(nameInput());

			expect(screen.getByText('Enter a name.')).toBeVisible();
		});

		it.each([
			['ftp://acme.app.n8n.cloud', 'Use https:// at the start of the URL.'],
			['https://user:pw@acme.app.n8n.cloud', 'Remove the user name and password from the URL.'],
			['acme app', "That URL isn't valid. Check it and try again."],
		])('explains why %j is refused', async (url, message) => {
			await setup();

			await fillForm({ name: 'Acme', url, token: fakeToken() });
			await userEvent.click(submitButton());

			expect(screen.getByText(message)).toBeVisible();
			expect(api.linkInstance).not.toHaveBeenCalled();
		});

		it('refuses a name with characters that the server does not accept', async () => {
			await setup();

			await fillForm({ name: 'Acme <Cloud>', url: 'acme.app.n8n.cloud', token: fakeToken() });
			await userEvent.click(submitButton());

			expect(
				screen.getByText('Use only letters, digits, spaces and these characters: - _ . ( )'),
			).toBeVisible();
			expect(api.linkInstance).not.toHaveBeenCalled();
		});

		it('clears an error as soon as the value is valid', async () => {
			await setup();
			await userEvent.click(submitButton());

			await userEvent.type(nameInput(), 'Acme');

			expect(screen.queryByText('Enter a name.')).not.toBeInTheDocument();
		});
	});

	describe('submit', () => {
		it('accepts a bare host and sends the trimmed values', async () => {
			const token = fakeToken();
			const created = linkedInstance();
			api.linkInstance.mockResolvedValue(created);
			const { emitted } = await setup();

			await fillForm({ name: '  Acme Cloud ', url: ' acme.app.n8n.cloud ', token: ` ${token} ` });
			await userEvent.click(submitButton());

			await waitFor(() => expect(emitted('linked')).toEqual([[created]]));
			expect(api.linkInstance).toHaveBeenCalledWith(expect.anything(), {
				name: 'Acme Cloud',
				url: 'acme.app.n8n.cloud',
				token,
			});
			expect(emitted('update:open')).toEqual([[false]]);
		});

		it('shows "Checking…" while the server checks the instance', async () => {
			const request = deferred<ReturnType<typeof linkedInstance>>();
			api.linkInstance.mockReturnValue(request.promise);
			await setup();
			await fillForm({ name: 'Acme', url: 'acme.app.n8n.cloud', token: fakeToken() });

			await userEvent.click(submitButton());

			expect(submitButton()).toHaveTextContent('Checking…');
			expect(submitButton()).toBeDisabled();

			request.resolve(linkedInstance());
			await waitFor(() => expect(submitButton()).toHaveTextContent('Link instance'));
		});

		it('sends one request when the user submits twice', async () => {
			const request = deferred<ReturnType<typeof linkedInstance>>();
			api.linkInstance.mockReturnValue(request.promise);
			await setup();
			await fillForm({ name: 'Acme', url: 'acme.app.n8n.cloud', token: fakeToken() });

			await userEvent.click(submitButton());
			await userEvent.type(tokenInput(), '{Enter}');
			request.resolve(linkedInstance());

			await waitFor(() => expect(api.linkInstance).toHaveBeenCalledTimes(1));
		});

		it('keeps the token out of the store after a link', async () => {
			const token = fakeToken();
			api.linkInstance.mockResolvedValue(linkedInstance());
			const { pinia, emitted } = await setup();

			await fillForm({ name: 'Acme', url: 'acme.app.n8n.cloud', token });
			await userEvent.click(submitButton());
			await waitFor(() => expect(emitted('linked')).toHaveLength(1));

			expect(useLinkedInstancesStore(pinia).instances).toEqual([linkedInstance()]);
			expect(JSON.stringify(pinia.state.value)).not.toContain(token);
		});
	});

	describe('server errors', () => {
		it('shows the server message inline and keeps the dialog open', async () => {
			api.linkInstance.mockRejectedValue(new ResponseError(REFUSED, { httpStatusCode: 400 }));
			const { emitted } = await setup();

			await fillForm({ name: 'Acme', url: 'acme.app.n8n.cloud', token: fakeToken() });
			await userEvent.click(submitButton());

			const notice = await screen.findByTestId('link-instance-server-error');
			expect(notice).toHaveTextContent(REFUSED);
			expect(notice).toHaveAttribute('role', 'alert');
			expect(emitted('update:open')).toBeUndefined();
			expect(emitted('linked')).toBeUndefined();
		});

		it('keeps the name and the address, clears the token and asks for it again', async () => {
			const token = fakeToken();
			api.linkInstance.mockRejectedValue(new ResponseError(REFUSED));
			const { pinia } = await setup();

			await fillForm({ name: 'Acme', url: 'acme.app.n8n.cloud', token });
			await userEvent.click(submitButton());
			await screen.findByTestId('link-instance-server-error');

			expect(nameInput()).toHaveValue('Acme');
			expect(urlInput()).toHaveValue('acme.app.n8n.cloud');
			expect(tokenInput()).toHaveValue('');
			expect(tokenInput()).toHaveFocus();
			// The empty token is expected here, so it does not show as an error yet.
			expect(screen.queryByText('Enter the access token.')).not.toBeInTheDocument();
			expect(JSON.stringify(pinia.state.value)).not.toContain(token);
		});

		it('shows a general message when the error has no server message', async () => {
			api.linkInstance.mockRejectedValue(new Error('Unexpected response'));
			await setup();

			await fillForm({ name: 'Acme', url: 'acme.app.n8n.cloud', token: fakeToken() });
			await userEvent.click(submitButton());

			expect(await screen.findByTestId('link-instance-server-error')).toHaveTextContent(
				'Something went wrong. Try again.',
			);
		});

		it('removes the server message on the next try', async () => {
			api.linkInstance
				.mockRejectedValueOnce(new ResponseError(REFUSED))
				.mockResolvedValueOnce(linkedInstance());
			const { emitted } = await setup();
			await fillForm({ name: 'Acme', url: 'acme.app.n8n.cloud', token: fakeToken() });
			await userEvent.click(submitButton());
			await screen.findByTestId('link-instance-server-error');

			await fillForm({ token: fakeToken() });
			await userEvent.click(submitButton());

			await waitFor(() => expect(emitted('linked')).toHaveLength(1));
			expect(screen.queryByTestId('link-instance-server-error')).not.toBeInTheDocument();
		});
	});

	describe('closing', () => {
		it('asks the page to close on Cancel', async () => {
			const { emitted } = await setup();

			await userEvent.click(screen.getByTestId('link-instance-cancel'));

			expect(emitted('update:open')).toEqual([[false]]);
		});

		it('starts empty when it opens again', async () => {
			const { rerender } = await setup();
			await fillForm({ name: 'Acme', url: 'acme', token: fakeToken() });
			await userEvent.click(submitButton());

			await rerender({ open: false });
			await rerender({ open: true });
			await screen.findByTestId('link-instance-form');

			expect(nameInput()).toHaveValue('');
			expect(urlInput()).toHaveValue('');
			expect(tokenInput()).toHaveValue('');
			expect(screen.queryByText(/That URL isn't valid/)).not.toBeInTheDocument();
		});

		it('stays open until the check ends, then reports the new link', async () => {
			const request = deferred<ReturnType<typeof linkedInstance>>();
			api.linkInstance.mockReturnValue(request.promise);
			const { emitted } = await setup();
			await fillForm({ name: 'Acme', url: 'acme.app.n8n.cloud', token: fakeToken() });
			expect(screen.getByRole('button', { name: 'Close dialog' })).toBeVisible();
			await userEvent.click(submitButton());

			expect(screen.getByTestId('link-instance-cancel')).toBeDisabled();
			expect(screen.queryByRole('button', { name: 'Close dialog' })).not.toBeInTheDocument();
			await userEvent.keyboard('{Escape}');
			expect(emitted('update:open')).toBeUndefined();

			request.resolve(linkedInstance());

			await waitFor(() => expect(emitted('linked')).toEqual([[linkedInstance()]]));
			expect(emitted('update:open')).toEqual([[false]]);
		});

		it('closes on Escape when no check runs', async () => {
			const { emitted } = await setup();

			await userEvent.keyboard('{Escape}');

			expect(emitted('update:open')).toEqual([[false]]);
		});

		it('ignores the result of a request that ends after the page closed the dialog', async () => {
			const request = deferred<ReturnType<typeof linkedInstance>>();
			api.linkInstance.mockReturnValue(request.promise);
			const { emitted, rerender, pinia } = await setup();
			await fillForm({ name: 'Acme', url: 'acme.app.n8n.cloud', token: fakeToken() });
			await userEvent.click(submitButton());

			await rerender({ open: false });
			request.resolve(linkedInstance());
			await waitFor(() => expect(useLinkedInstancesStore(pinia).instances).toHaveLength(1));

			expect(emitted('linked')).toBeUndefined();
		});
	});
});
