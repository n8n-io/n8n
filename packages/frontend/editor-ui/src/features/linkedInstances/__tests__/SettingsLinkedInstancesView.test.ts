import type { LinkedInstanceStatus, LinkedInstanceSummary } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

import { createComponentRenderer } from '@/__tests__/render';
import { MODAL_CANCEL, MODAL_CONFIRM } from '@/app/constants';
import type * as Api from '../linkedInstances.api';
import SettingsLinkedInstancesView from '../views/SettingsLinkedInstancesView.vue';
import { deferred, fakeToken, linkedInstance } from './linkedInstances.fixtures';

const api = vi.hoisted(() => ({
	fetchLinkedInstances: vi.fn<typeof Api.fetchLinkedInstances>(),
	linkInstance: vi.fn<typeof Api.linkInstance>(),
	verifyLinkedInstance: vi.fn<typeof Api.verifyLinkedInstance>(),
	updateLinkedInstance: vi.fn<typeof Api.updateLinkedInstance>(),
	unlinkInstance: vi.fn<typeof Api.unlinkInstance>(),
}));

vi.mock('../linkedInstances.api', () => api);

const mockConfirm = vi.fn();
const showMessage = vi.fn();
const showError = vi.fn();

vi.mock('@n8n/design-system', async () => ({
	...(await vi.importActual<object>('@n8n/design-system')),
	useMessage: () => ({ confirm: mockConfirm }),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showMessage, showError }),
}));

const acme = linkedInstance();
const staging = linkedInstance({
	id: 'link-2',
	name: 'Staging',
	baseUrl: 'http://localhost:5680',
	status: 'offline',
	defaultRemoteProject: null,
});

const renderView = createComponentRenderer(SettingsLinkedInstancesView);

function setup() {
	return renderView({ pinia: createTestingPinia({ stubActions: false }) });
}

async function renderList(rows: LinkedInstanceSummary[] = [acme, staging]) {
	api.fetchLinkedInstances.mockResolvedValue(rows);
	setup();
	await screen.findByTestId('linked-instances-list');
}

function rowOf(name: string): HTMLElement {
	const row = screen
		.getAllByTestId('linked-instance-row')
		.find((element) => within(element).queryByText(name) !== null);
	if (!row) throw new Error(`No row for ${name}`);
	return row;
}

const announcement = () => screen.getByTestId('linked-instances-announcement');

async function chooseUnlink(name: string) {
	await userEvent.click(
		within(rowOf(name)).getByRole('button', { name: `More actions for ${name}` }),
	);
	await userEvent.click(await screen.findByRole('menuitem', { name: 'Unlink' }));
}

describe('SettingsLinkedInstancesView', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe('page states', () => {
		it('shows the title and the description', async () => {
			await renderList();

			expect(screen.getByRole('heading', { name: 'Linked instances' })).toBeVisible();
			expect(
				screen.getByText('Link a cloud n8n so you can choose where chats and workflows run.'),
			).toBeVisible();
			expect(document.title).toContain('Linked instances');
		});

		it('shows a busy placeholder, not the empty state, until the list loads', async () => {
			const read = deferred<LinkedInstanceSummary[]>();
			api.fetchLinkedInstances.mockReturnValue(read.promise);
			const { container } = setup();

			expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
			expect(screen.queryByText('No linked instances yet.')).not.toBeInTheDocument();
			expect(screen.queryByTestId('linked-instances-list')).not.toBeInTheDocument();

			read.resolve([acme]);
			await screen.findByTestId('linked-instances-list');
			expect(container.querySelector('[aria-busy="true"]')).toBeNull();
		});

		it('shows the empty state with a way to link an instance', async () => {
			api.fetchLinkedInstances.mockResolvedValue([]);
			setup();

			const empty = await screen.findByTestId('linked-instances-empty');
			expect(within(empty).getByText('No linked instances yet.')).toBeVisible();

			await userEvent.click(within(empty).getByRole('button', { name: 'Link instance' }));

			expect(await screen.findByTestId('link-instance-form')).toBeVisible();
		});

		it('shows an error with "Try again" that reads the list again', async () => {
			api.fetchLinkedInstances
				.mockRejectedValueOnce(new ResponseError("Can't connect to n8n."))
				.mockResolvedValueOnce([acme]);
			setup();

			const error = await screen.findByTestId('linked-instances-load-error');
			expect(within(error).getByText('Could not load linked instances')).toBeVisible();
			expect(screen.queryByText('No linked instances yet.')).not.toBeInTheDocument();

			await userEvent.click(within(error).getByRole('button', { name: 'Try again' }));

			await screen.findByTestId('linked-instances-list');
			expect(rowOf('Acme Cloud')).toBeVisible();
			expect(api.fetchLinkedInstances).toHaveBeenCalledTimes(2);
		});
	});

	describe('list', () => {
		it('shows the name, the URL, the status and the default project of each link', async () => {
			await renderList();

			const row = within(rowOf('Acme Cloud'));
			expect(row.getByText('https://acme.app.n8n.cloud')).toBeVisible();
			expect(row.getByTestId('linked-instance-status')).toHaveTextContent('Online');
			expect(row.getByText('Put new automations in: Automations')).toBeVisible();
			expect(row.getByRole('button', { name: 'Check connection' })).toBeVisible();
			expect(row.getByRole('button', { name: 'Change token' })).toBeVisible();
		});

		it('says when no default project is set yet', async () => {
			await renderList();

			expect(
				within(rowOf('Staging')).getByText('Put new automations in: not set yet'),
			).toBeVisible();
		});

		it('gives each row action the name of its row for screen readers', async () => {
			await renderList();

			const check = within(rowOf('Staging')).getByRole('button', { name: 'Check connection' });
			expect(check).toHaveAccessibleDescription('Staging');
		});

		it.each<[LinkedInstanceStatus, string]>([
			['online', 'Online'],
			['offline', 'Offline'],
			['unauthorised', 'Token refused'],
			['mcp-disabled', 'Turn on MCP'],
			['unknown', 'Not checked yet'],
		])('shows the status %s as "%s"', async (status, label) => {
			await renderList([linkedInstance({ status })]);

			expect(within(rowOf('Acme Cloud')).getByTestId('linked-instance-status')).toHaveTextContent(
				label,
			);
		});
	});

	describe('check connection', () => {
		it('shows the new status and announces it', async () => {
			api.verifyLinkedInstance.mockResolvedValue({ ...acme, status: 'mcp-disabled' });
			await renderList();

			await userEvent.click(
				within(rowOf('Acme Cloud')).getByRole('button', { name: 'Check connection' }),
			);

			await waitFor(() =>
				expect(within(rowOf('Acme Cloud')).getByTestId('linked-instance-status')).toHaveTextContent(
					'Turn on MCP',
				),
			);
			expect(api.verifyLinkedInstance).toHaveBeenCalledWith(expect.anything(), acme.id);
			expect(announcement()).toHaveTextContent('Acme Cloud: Turn on MCP');
			expect(announcement()).toHaveAttribute('aria-live', 'polite');
		});

		it('announces the same result again on a second check', async () => {
			api.verifyLinkedInstance.mockResolvedValue(acme);
			await renderList();
			const button = within(rowOf('Acme Cloud')).getByRole('button', { name: 'Check connection' });
			await userEvent.click(button);
			await waitFor(() => expect(announcement()).toHaveTextContent('Acme Cloud: Online'));
			const texts: string[] = [];
			const observer = new MutationObserver(() => texts.push(announcement().textContent ?? ''));
			observer.observe(announcement(), { childList: true, characterData: true, subtree: true });

			await userEvent.click(button);

			await waitFor(() => expect(texts.at(-1)).toBe('Acme Cloud: Online'));
			observer.disconnect();
			// The region was emptied first, so screen readers read the message again.
			expect(texts).toContain('');
		});

		it('shows "Checking…" and ignores more clicks until the check ends', async () => {
			const request = deferred<LinkedInstanceSummary>();
			api.verifyLinkedInstance.mockReturnValue(request.promise);
			await renderList();
			const row = within(rowOf('Acme Cloud'));

			await userEvent.click(row.getByRole('button', { name: 'Check connection' }));
			const checking = row.getByRole('button', { name: 'Checking…' });
			expect(checking).toBeDisabled();
			await userEvent.click(checking);

			// The other row can still be checked.
			expect(
				within(rowOf('Staging')).getByRole('button', { name: 'Check connection' }),
			).toBeEnabled();
			request.resolve(acme);
			await waitFor(() =>
				expect(row.getByRole('button', { name: 'Check connection' })).toBeEnabled(),
			);
			expect(api.verifyLinkedInstance).toHaveBeenCalledTimes(1);
		});

		it('shows the error and keeps the old status when the check request fails', async () => {
			const error = new ResponseError('Too many requests. Try again later.', {
				httpStatusCode: 429,
			});
			api.verifyLinkedInstance.mockRejectedValue(error);
			await renderList();

			await userEvent.click(
				within(rowOf('Acme Cloud')).getByRole('button', { name: 'Check connection' }),
			);

			await waitFor(() =>
				expect(showError).toHaveBeenCalledWith(error, 'Could not check Acme Cloud'),
			);
			expect(within(rowOf('Acme Cloud')).getByTestId('linked-instance-status')).toHaveTextContent(
				'Online',
			);
			expect(
				within(rowOf('Acme Cloud')).getByRole('button', { name: 'Check connection' }),
			).toBeEnabled();
		});
	});

	describe('unlink', () => {
		it('asks first, with the name and what happens next', async () => {
			mockConfirm.mockResolvedValue(MODAL_CANCEL);
			await renderList();

			await chooseUnlink('Acme Cloud');

			await waitFor(() =>
				expect(mockConfirm).toHaveBeenCalledWith(
					'Chats that run there stop working. Workflows already in Acme Cloud keep running.',
					'Unlink Acme Cloud?',
					expect.objectContaining({ confirmButtonText: 'Unlink', cancelButtonText: 'Cancel' }),
				),
			);
		});

		it('removes the row after the user confirms', async () => {
			mockConfirm.mockResolvedValue(MODAL_CONFIRM);
			api.unlinkInstance.mockResolvedValue(undefined);
			await renderList();

			await chooseUnlink('Acme Cloud');

			await waitFor(() => expect(screen.queryByText('Acme Cloud')).not.toBeInTheDocument());
			expect(api.unlinkInstance).toHaveBeenCalledWith(expect.anything(), acme.id);
			expect(rowOf('Staging')).toBeVisible();
			expect(announcement()).toHaveTextContent('Acme Cloud is unlinked.');
			await waitFor(() => expect(screen.getByTestId('linked-instances-link-button')).toHaveFocus());
		});

		it('shows the empty state after the last row goes', async () => {
			mockConfirm.mockResolvedValue(MODAL_CONFIRM);
			api.unlinkInstance.mockResolvedValue(undefined);
			await renderList([acme]);

			await chooseUnlink('Acme Cloud');

			expect(await screen.findByTestId('linked-instances-empty')).toBeVisible();
		});

		it('keeps the row when the user cancels', async () => {
			mockConfirm.mockResolvedValue(MODAL_CANCEL);
			await renderList();

			await chooseUnlink('Acme Cloud');

			await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
			expect(api.unlinkInstance).not.toHaveBeenCalled();
			expect(rowOf('Acme Cloud')).toBeVisible();
		});

		it('keeps the row and shows the error when the server refuses', async () => {
			const error = new ResponseError('That link does not exist.', { httpStatusCode: 404 });
			mockConfirm.mockResolvedValue(MODAL_CONFIRM);
			api.unlinkInstance.mockRejectedValue(error);
			await renderList();

			await chooseUnlink('Acme Cloud');

			await waitFor(() =>
				expect(showError).toHaveBeenCalledWith(error, 'Could not unlink Acme Cloud'),
			);
			expect(rowOf('Acme Cloud')).toBeVisible();
		});
	});

	describe('change token', () => {
		it('opens the dialog for that row and updates it', async () => {
			const token = fakeToken();
			api.updateLinkedInstance.mockResolvedValue({ ...staging, status: 'online' });
			await renderList();

			await userEvent.click(within(rowOf('Staging')).getByRole('button', { name: 'Change token' }));
			expect(await screen.findByRole('dialog', { name: 'Change token for Staging' })).toBeVisible();
			await userEvent.type(screen.getByTestId('change-token-input'), token);
			await userEvent.click(screen.getByTestId('change-token-submit'));

			await waitFor(() =>
				expect(within(rowOf('Staging')).getByTestId('linked-instance-status')).toHaveTextContent(
					'Online',
				),
			);
			expect(api.updateLinkedInstance).toHaveBeenCalledWith(expect.anything(), staging.id, {
				token,
			});
			expect(showMessage).toHaveBeenCalledWith({ title: 'Token updated', type: 'success' });
			await waitFor(() =>
				expect(
					within(rowOf('Staging')).getByRole('button', { name: 'Change token' }),
				).toHaveFocus(),
			);
		});
	});

	describe('link instance', () => {
		it('adds the new row, announces its status and moves focus to it', async () => {
			const created = linkedInstance({ id: 'link-3', name: 'Production' });
			api.linkInstance.mockResolvedValue(created);
			await renderList();

			await userEvent.click(screen.getByTestId('linked-instances-link-button'));
			await screen.findByTestId('link-instance-form');
			await userEvent.type(screen.getByTestId('link-instance-name-input'), 'Production');
			await userEvent.type(screen.getByTestId('link-instance-url-input'), 'prod.app.n8n.cloud');
			await userEvent.type(screen.getByTestId('link-instance-token-input'), fakeToken());
			await userEvent.click(screen.getByTestId('link-instance-submit'));

			const row = await waitFor(() => rowOf('Production'));
			expect(screen.getAllByTestId('linked-instance-row')).toHaveLength(3);
			expect(announcement()).toHaveTextContent('Production: Online');
			await waitFor(() =>
				expect(within(row).getByRole('button', { name: 'Check connection' })).toHaveFocus(),
			);
		});

		it('returns focus to "Link instance" after Cancel', async () => {
			await renderList();
			const linkButton = screen.getByTestId('linked-instances-link-button');

			await userEvent.click(linkButton);
			await userEvent.click(await screen.findByTestId('link-instance-cancel'));

			await waitFor(() => expect(linkButton).toHaveFocus());
		});
	});
});
