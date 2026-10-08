import { ResponseError } from '@n8n/rest-api-client';
import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import ChangeTokenModal from '../components/ChangeTokenModal.vue';
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

const showMessage = vi.fn();
const showError = vi.fn();

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError }),
}));

const REFUSED = 'That instance refused the access token. Create a new token and try again.';

const renderModal = createComponentRenderer(ChangeTokenModal);

const instance = linkedInstance({ status: 'unauthorised' });

async function setup() {
	const pinia = createTestingPinia({ stubActions: false });
	useLinkedInstancesStore(pinia).instances = [instance];
	const result = renderModal({ pinia, props: { open: true, instance } });
	await screen.findByTestId('change-token-form');
	return { ...result, pinia };
}

const tokenInput = () => screen.getByTestId('change-token-input');
const submitButton = () => screen.getByTestId('change-token-submit');

describe('ChangeTokenModal', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('names the instance and shows one hidden token field with its help text', async () => {
		await setup();

		expect(screen.getByRole('dialog', { name: 'Change token for Acme Cloud' })).toBeVisible();
		expect(screen.getByLabelText(/^Access token/)).toBe(tokenInput());
		expect(tokenInput()).toHaveAttribute('type', 'password');
		expect(tokenInput()).toHaveAttribute('autocomplete', 'new-password');
		expect(tokenInput()).toHaveAccessibleDescription(
			'In the cloud instance, go to Settings > Instance-level MCP and create an access token.',
		);
		await waitFor(() => expect(tokenInput()).toHaveFocus());
	});

	it('asks for a token before it sends anything', async () => {
		await setup();

		await userEvent.click(submitButton());

		expect(screen.getByText('Enter the access token.')).toBeVisible();
		expect(tokenInput()).toHaveAttribute('aria-invalid', 'true');
		expect(api.updateLinkedInstance).not.toHaveBeenCalled();
	});

	it('refuses a token with spaces inside it', async () => {
		await setup();

		await userEvent.type(tokenInput(), 'abc def');
		await userEvent.click(submitButton());

		expect(
			screen.getByText(
				'Use only the letters A to Z, digits and symbols, without spaces or accented characters.',
			),
		).toBeVisible();
		expect(api.updateLinkedInstance).not.toHaveBeenCalled();
	});

	it('sends the new token, says "Token updated" and closes', async () => {
		const token = fakeToken();
		const updated = { ...instance, status: 'online' as const };
		api.updateLinkedInstance.mockResolvedValue(updated);
		const { emitted, pinia } = await setup();

		await userEvent.type(tokenInput(), token);
		await userEvent.click(submitButton());

		await waitFor(() => expect(emitted('update:open')).toEqual([[false]]));
		expect(api.updateLinkedInstance).toHaveBeenCalledWith(expect.anything(), instance.id, {
			token,
		});
		expect(showMessage).toHaveBeenCalledWith({ title: 'Token updated', type: 'success' });
		expect(useLinkedInstancesStore(pinia).instances).toEqual([updated]);
		expect(JSON.stringify(pinia.state.value)).not.toContain(token);
	});

	it('shows "Checking…" while the server checks the token', async () => {
		const request = deferred<typeof instance>();
		api.updateLinkedInstance.mockReturnValue(request.promise);
		await setup();
		await userEvent.type(tokenInput(), fakeToken());

		await userEvent.click(submitButton());

		expect(submitButton()).toHaveAccessibleName('Checking…');
		expect(submitButton()).toBeDisabled();
		// The button is a polite live region, so screen readers hear the new label.
		expect(submitButton()).toHaveAttribute('aria-live', 'polite');
		request.resolve(instance);
		await waitFor(() => expect(submitButton()).toHaveAccessibleName('Save token'));
	});

	it('removes the row and says so when the link no longer exists', async () => {
		const gone = 'We could not find this linked instance.';
		api.updateLinkedInstance.mockRejectedValue(new ResponseError(gone, { httpStatusCode: 404 }));
		const { pinia } = await setup();

		await userEvent.type(tokenInput(), fakeToken());
		await userEvent.click(submitButton());

		expect(await screen.findByTestId('change-token-server-error')).toHaveTextContent(gone);
		expect(useLinkedInstancesStore(pinia).instances).toEqual([]);
		expect(showMessage).not.toHaveBeenCalled();
	});

	it('shows the server message inline, clears the token and stays open', async () => {
		const token = fakeToken();
		api.updateLinkedInstance.mockRejectedValue(new ResponseError(REFUSED, { httpStatusCode: 400 }));
		const { emitted, pinia } = await setup();

		await userEvent.type(tokenInput(), token);
		await userEvent.click(submitButton());

		expect(await screen.findByTestId('change-token-server-error')).toHaveTextContent(REFUSED);
		expect(tokenInput()).toHaveValue('');
		expect(tokenInput()).toHaveFocus();
		expect(screen.queryByText('Enter the access token.')).not.toBeInTheDocument();
		expect(showMessage).not.toHaveBeenCalled();
		expect(emitted('update:open')).toBeUndefined();
		// The old token stays on the server, so the row keeps its status.
		expect(useLinkedInstancesStore(pinia).instances).toEqual([instance]);
		expect(JSON.stringify(pinia.state.value)).not.toContain(token);
	});

	it('clears the token when the dialog closes', async () => {
		const { rerender } = await setup();
		await userEvent.type(tokenInput(), fakeToken());

		await rerender({ open: false, instance });
		await rerender({ open: true, instance });
		await screen.findByTestId('change-token-form');

		expect(tokenInput()).toHaveValue('');
	});

	it('stays open until the check ends, then says "Token updated" and closes', async () => {
		const request = deferred<typeof instance>();
		api.updateLinkedInstance.mockReturnValue(request.promise);
		const { emitted } = await setup();
		await userEvent.type(tokenInput(), fakeToken());
		expect(screen.getByRole('button', { name: 'Close dialog' })).toBeVisible();
		await userEvent.click(submitButton());

		expect(screen.getByTestId('change-token-cancel')).toBeDisabled();
		expect(screen.queryByRole('button', { name: 'Close dialog' })).not.toBeInTheDocument();
		await userEvent.keyboard('{Escape}');
		expect(emitted('update:open')).toBeUndefined();

		request.resolve({ ...instance, status: 'online' });

		await waitFor(() => expect(emitted('update:open')).toEqual([[false]]));
		expect(showMessage).toHaveBeenCalledWith({ title: 'Token updated', type: 'success' });
	});

	it('tells the page when the dialog has left, so the page can move focus', async () => {
		const { emitted, rerender } = await setup();
		expect(emitted('closed')).toBeUndefined();

		await rerender({ open: false, instance });

		await waitFor(() => expect(emitted('closed')).toHaveLength(1));
		expect(screen.queryByTestId('change-token-form')).not.toBeInTheDocument();
	});

	it('asks the page to close on Cancel', async () => {
		const { emitted } = await setup();

		await userEvent.click(screen.getByTestId('change-token-cancel'));

		expect(emitted('update:open')).toEqual([[false]]);
		expect(api.updateLinkedInstance).not.toHaveBeenCalled();
	});
});
