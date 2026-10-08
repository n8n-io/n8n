import type { LinkedInstanceStatus, LinkedInstanceSummary } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { defineComponent, h } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import { MODAL_CANCEL, MODAL_CONFIRM } from '@/app/constants';
import type * as Api from '../linkedInstances.api';
import { useLinkedInstancesStore } from '../linkedInstances.store';
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

const GONE = 'We could not find this linked instance.';
const missingLink = () => new ResponseError(GONE, { httpStatusCode: 404 });

/** Records each text of the live region and whether a dialog was open at that moment. */
function recordAnnouncements() {
	const texts: Array<{ text: string; dialogOpen: boolean }> = [];
	const observer = new MutationObserver(() =>
		texts.push({
			text: announcement().textContent ?? '',
			dialogOpen: screen.queryByRole('dialog') !== null,
		}),
	);
	observer.observe(announcement(), { childList: true, characterData: true, subtree: true });
	return { texts, stop: () => observer.disconnect() };
}

/** Puts focus on an element outside the row, as a keyboard user who moved on would. */
function moveFocusElsewhere(): HTMLElement {
	const elsewhere = screen.getByRole('heading', { name: 'Linked instances' });
	elsewhere.setAttribute('tabindex', '-1');
	elsewhere.focus();
	return elsewhere;
}

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
			expect(screen.getByTestId('linked-instances-skeleton')).toHaveAttribute(
				'aria-hidden',
				'true',
			);
			expect(screen.queryByText('No linked instances yet.')).not.toBeInTheDocument();
			expect(screen.queryByTestId('linked-instances-list')).not.toBeInTheDocument();

			read.resolve([acme]);
			await screen.findByTestId('linked-instances-list');
			expect(container.querySelector('[aria-busy="true"]')).toBeNull();
			expect(screen.queryByTestId('linked-instances-skeleton')).not.toBeInTheDocument();
		});

		it('shows the empty state with a way to link an instance', async () => {
			api.fetchLinkedInstances.mockResolvedValue([]);
			setup();

			const empty = await screen.findByTestId('linked-instances-empty');
			expect(within(empty).getByText('No linked instances yet.')).toBeVisible();

			await userEvent.click(within(empty).getByRole('button', { name: 'Link instance' }));

			expect(await screen.findByTestId('link-instance-form')).toBeVisible();
		});

		it('starts from the skeleton on the next visit and never shows the old rows', async () => {
			const pinia = createTestingPinia({ stubActions: false });
			api.fetchLinkedInstances.mockResolvedValueOnce([acme]);
			const firstVisit = renderView({ pinia });
			await screen.findByTestId('linked-instances-list');
			firstVisit.unmount();

			// For example, another user signs in on the same tab without a page reload.
			const read = deferred<LinkedInstanceSummary[]>();
			api.fetchLinkedInstances.mockReturnValueOnce(read.promise);
			renderView({ pinia });

			expect(await screen.findByTestId('linked-instances-skeleton')).toBeInTheDocument();
			expect(screen.queryByText('Acme Cloud')).not.toBeInTheDocument();
			read.resolve([staging]);
			await screen.findByTestId('linked-instances-list');
			expect(screen.queryByText('Acme Cloud')).not.toBeInTheDocument();
			expect(rowOf('Staging')).toBeVisible();
		});

		it('ignores a read of the previous visit that ends after the page closed', async () => {
			const pinia = createTestingPinia({ stubActions: false });
			const staleRead = deferred<LinkedInstanceSummary[]>();
			api.fetchLinkedInstances.mockReturnValueOnce(staleRead.promise);
			renderView({ pinia }).unmount();

			const read = deferred<LinkedInstanceSummary[]>();
			api.fetchLinkedInstances.mockReturnValueOnce(read.promise);
			renderView({ pinia });
			staleRead.resolve([acme]);

			expect(await screen.findByTestId('linked-instances-skeleton')).toBeInTheDocument();
			read.resolve([]);
			expect(await screen.findByTestId('linked-instances-empty')).toBeVisible();
			expect(screen.queryByText('Acme Cloud')).not.toBeInTheDocument();
		});

		it('shows an error with "Try again" that reads the list again', async () => {
			api.fetchLinkedInstances
				.mockRejectedValueOnce(new ResponseError("Can't connect to n8n."))
				.mockResolvedValueOnce([acme]);
			setup();

			const error = await screen.findByTestId('linked-instances-load-error');
			expect(within(error).getByText("Couldn't load linked instances")).toBeVisible();
			expect(screen.queryByText('No linked instances yet.')).not.toBeInTheDocument();
			await waitFor(() =>
				expect(announcement()).toHaveTextContent("Couldn't load linked instances"),
			);

			await userEvent.click(within(error).getByRole('button', { name: 'Try again' }));

			await screen.findByTestId('linked-instances-list');
			expect(rowOf('Acme Cloud')).toBeVisible();
			expect(api.fetchLinkedInstances).toHaveBeenCalledTimes(2);
		});

		describe('after "Try again"', () => {
			async function pressTryAgain(nextRead: Promise<LinkedInstanceSummary[]>) {
				api.fetchLinkedInstances
					.mockRejectedValueOnce(new ResponseError("Can't connect to n8n."))
					.mockReturnValueOnce(nextRead);
				setup();
				const error = await screen.findByTestId('linked-instances-load-error');
				within(error).getByRole('button', { name: 'Try again' }).focus();
				await userEvent.keyboard('{Enter}');
			}

			it('says that the list loads, then moves focus to "Link instance"', async () => {
				const read = deferred<LinkedInstanceSummary[]>();
				await pressTryAgain(read.promise);

				expect(await screen.findByTestId('linked-instances-skeleton')).toBeInTheDocument();
				await waitFor(() => expect(announcement()).toHaveTextContent('Loading linked instances…'));

				read.resolve([acme]);

				await screen.findByTestId('linked-instances-list');
				await waitFor(() =>
					expect(screen.getByTestId('linked-instances-link-button')).toHaveFocus(),
				);
				// The loading message does not stay in the region after the list shows.
				await waitFor(() => expect(announcement().textContent).toBe(''));
			});

			it('moves focus to the "Link instance" of the empty state when no link exists', async () => {
				await pressTryAgain(Promise.resolve([]));

				const empty = await screen.findByTestId('linked-instances-empty');
				await waitFor(() =>
					expect(within(empty).getByRole('button', { name: 'Link instance' })).toHaveFocus(),
				);
			});

			it('announces a second failure and puts focus back on "Try again"', async () => {
				const read = deferred<LinkedInstanceSummary[]>();
				await pressTryAgain(read.promise);
				await waitFor(() => expect(announcement()).toHaveTextContent('Loading linked instances…'));

				read.reject(new ResponseError("Can't connect to n8n."));

				const error = await screen.findByTestId('linked-instances-load-error');
				await waitFor(() =>
					expect(within(error).getByRole('button', { name: 'Try again' })).toHaveFocus(),
				);
				expect(announcement()).toHaveTextContent("Couldn't load linked instances");
			});

			it('leaves focus where the user moved it while the list loaded', async () => {
				const read = deferred<LinkedInstanceSummary[]>();
				await pressTryAgain(read.promise);
				const elsewhere = moveFocusElsewhere();

				read.resolve([acme]);

				await screen.findByTestId('linked-instances-list');
				await waitFor(() => expect(announcement().textContent).toBe(''));
				expect(elsewhere).toHaveFocus();
			});
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

		it('gives each row action the name and the status of its row for screen readers', async () => {
			await renderList();

			const row = within(rowOf('Staging'));
			expect(row.getByRole('button', { name: 'Check connection' })).toHaveAccessibleDescription(
				'Staging Offline',
			);
			expect(row.getByRole('button', { name: 'Change token' })).toHaveAccessibleDescription(
				'Staging Offline',
			);
		});

		it('lists the links with a heading for each, so screen readers can count and skip them', async () => {
			await renderList();

			const list = screen.getByRole('list', { name: 'Linked instances' });
			expect(within(list).getAllByRole('listitem')).toHaveLength(2);
			expect(
				within(list)
					.getAllByRole('heading', { level: 2 })
					.map((heading) => heading.textContent?.trim()),
			).toEqual(['Acme Cloud', 'Staging']);
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

		it('turns off "Change token" and the row menu until the check ends', async () => {
			const request = deferred<LinkedInstanceSummary>();
			api.verifyLinkedInstance.mockReturnValue(request.promise);
			await renderList();
			const row = within(rowOf('Acme Cloud'));

			await userEvent.click(row.getByRole('button', { name: 'Check connection' }));

			const changeToken = row.getByRole('button', { name: 'Change token' });
			const menu = row.getByRole('button', { name: 'More actions for Acme Cloud' });
			expect(changeToken).toBeDisabled();
			expect(menu).toBeDisabled();
			await userEvent.click(menu);
			expect(screen.queryByRole('menuitem', { name: 'Unlink' })).not.toBeInTheDocument();
			expect(within(rowOf('Staging')).getByRole('button', { name: 'Change token' })).toBeEnabled();

			request.resolve({ ...acme, status: 'offline' });

			await waitFor(() => expect(changeToken).toBeEnabled());
			expect(menu).toBeEnabled();
			expect(row.getByTestId('linked-instance-status')).toHaveTextContent('Offline');
		});

		it('removes the row and moves focus to "Link instance" when the link no longer exists', async () => {
			const error = missingLink();
			api.verifyLinkedInstance.mockRejectedValue(error);
			await renderList();

			await userEvent.click(
				within(rowOf('Acme Cloud')).getByRole('button', { name: 'Check connection' }),
			);

			await waitFor(() => expect(screen.queryByText('Acme Cloud')).not.toBeInTheDocument());
			expect(showError).toHaveBeenCalledWith(error, "Couldn't check the connection");
			expect(rowOf('Staging')).toBeVisible();
			await waitFor(() => expect(screen.getByTestId('linked-instances-link-button')).toHaveFocus());
			expect(announcement().textContent).toBe('');
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
				expect(showError).toHaveBeenCalledWith(error, "Couldn't check the connection"),
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

		it('leaves focus where the user moved it during the request', async () => {
			const request = deferred<void>();
			mockConfirm.mockResolvedValue(MODAL_CONFIRM);
			api.unlinkInstance.mockReturnValue(request.promise);
			await renderList();

			await chooseUnlink('Acme Cloud');
			await waitFor(() => expect(rowOf('Acme Cloud')).toHaveAttribute('aria-busy', 'true'));
			const elsewhere = within(rowOf('Staging')).getByRole('button', { name: 'Change token' });
			elsewhere.focus();
			request.resolve();

			await waitFor(() => expect(announcement()).toHaveTextContent('Acme Cloud is unlinked.'));
			expect(screen.queryByText('Acme Cloud')).not.toBeInTheDocument();
			expect(elsewhere).toHaveFocus();
		});

		it('removes the row without an error when the link was already gone', async () => {
			mockConfirm.mockResolvedValue(MODAL_CONFIRM);
			api.unlinkInstance.mockRejectedValue(missingLink());
			await renderList();

			await chooseUnlink('Acme Cloud');

			await waitFor(() => expect(screen.queryByText('Acme Cloud')).not.toBeInTheDocument());
			expect(showError).not.toHaveBeenCalled();
			expect(announcement()).toHaveTextContent('Acme Cloud is unlinked.');
			await waitFor(() => expect(screen.getByTestId('linked-instances-link-button')).toHaveFocus());
		});

		it('shows the empty state after the last row goes and focuses its "Link instance"', async () => {
			mockConfirm.mockResolvedValue(MODAL_CONFIRM);
			api.unlinkInstance.mockResolvedValue(undefined);
			await renderList([acme]);

			await chooseUnlink('Acme Cloud');

			const empty = await screen.findByTestId('linked-instances-empty');
			expect(empty).toBeVisible();
			await waitFor(() =>
				expect(within(empty).getByRole('button', { name: 'Link instance' })).toHaveFocus(),
			);
		});

		it('turns off the row actions until the request ends, so the link is not unlinked twice', async () => {
			const request = deferred<void>();
			mockConfirm.mockResolvedValue(MODAL_CONFIRM);
			api.unlinkInstance.mockReturnValue(request.promise);
			await renderList();

			await chooseUnlink('Acme Cloud');

			const row = within(rowOf('Acme Cloud'));
			await waitFor(() => expect(row.getByText('Unlinking…')).toBeVisible());
			const menu = row.getByRole('button', { name: 'More actions for Acme Cloud' });
			expect(menu).toBeDisabled();
			expect(row.getByRole('button', { name: 'Check connection' })).toBeDisabled();
			expect(row.getByRole('button', { name: 'Change token' })).toBeDisabled();
			expect(rowOf('Acme Cloud')).toHaveAttribute('aria-busy', 'true');
			await userEvent.click(menu);
			expect(screen.queryByRole('menuitem', { name: 'Unlink' })).not.toBeInTheDocument();
			// The other row keeps its actions.
			expect(
				within(rowOf('Staging')).getByRole('button', { name: 'More actions for Staging' }),
			).toBeEnabled();

			request.resolve();

			await waitFor(() => expect(screen.queryByText('Acme Cloud')).not.toBeInTheDocument());
			expect(mockConfirm).toHaveBeenCalledTimes(1);
			expect(api.unlinkInstance).toHaveBeenCalledTimes(1);
			expect(showError).not.toHaveBeenCalled();
		});

		it('keeps the row when the user cancels', async () => {
			mockConfirm.mockResolvedValue(MODAL_CANCEL);
			await renderList();

			await chooseUnlink('Acme Cloud');

			await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
			expect(api.unlinkInstance).not.toHaveBeenCalled();
			expect(rowOf('Acme Cloud')).toBeVisible();
		});

		it('keeps the row, shows the error and puts focus back on its menu when the server refuses', async () => {
			const error = new ResponseError('Too many requests. Try again later.', {
				httpStatusCode: 429,
			});
			const request = deferred<void>();
			mockConfirm.mockResolvedValue(MODAL_CONFIRM);
			api.unlinkInstance.mockReturnValue(request.promise);
			await renderList();

			await chooseUnlink('Acme Cloud');
			const menu = within(rowOf('Acme Cloud')).getByRole('button', {
				name: 'More actions for Acme Cloud',
			});
			await waitFor(() => expect(menu).toBeDisabled());
			// A browser moves focus to the page body when the focused menu button turns off.
			if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
			request.reject(error);

			await waitFor(() =>
				expect(showError).toHaveBeenCalledWith(error, "Couldn't unlink the instance"),
			);
			expect(rowOf('Acme Cloud')).toBeVisible();
			expect(menu).toBeEnabled();
			await waitFor(() => expect(menu).toHaveFocus());
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

		it('moves focus to "Link instance" after Cancel when the link no longer exists', async () => {
			api.updateLinkedInstance.mockRejectedValue(missingLink());
			await renderList();

			await userEvent.click(within(rowOf('Staging')).getByRole('button', { name: 'Change token' }));
			await userEvent.type(await screen.findByTestId('change-token-input'), fakeToken());
			await userEvent.click(screen.getByTestId('change-token-submit'));

			expect(await screen.findByTestId('change-token-server-error')).toHaveTextContent(GONE);
			await waitFor(() => expect(screen.queryByText('Staging')).not.toBeInTheDocument());
			await userEvent.click(screen.getByTestId('change-token-cancel'));

			await waitFor(() => expect(screen.getByTestId('linked-instances-link-button')).toHaveFocus());
		});
	});

	describe('link instance', () => {
		it('adds the new row, announces its status and moves focus to it', async () => {
			const created = linkedInstance({ id: 'link-3', name: 'Production' });
			api.linkInstance.mockResolvedValue(created);
			await renderList();
			const announcements = recordAnnouncements();

			await userEvent.click(screen.getByTestId('linked-instances-link-button'));
			await screen.findByTestId('link-instance-form');
			await userEvent.type(screen.getByTestId('link-instance-name-input'), 'Production');
			await userEvent.type(screen.getByTestId('link-instance-url-input'), 'prod.app.n8n.cloud');
			await userEvent.type(screen.getByTestId('link-instance-token-input'), fakeToken());
			await userEvent.click(screen.getByTestId('link-instance-submit'));

			const row = await waitFor(() => rowOf('Production'));
			expect(screen.getAllByTestId('linked-instance-row')).toHaveLength(3);
			await waitFor(() => expect(announcement()).toHaveTextContent('Production: Online'));
			const check = within(row).getByRole('button', { name: 'Check connection' });
			await waitFor(() => expect(check).toHaveFocus());
			// The focused action also tells the name and the status of the new link.
			expect(check).toHaveAccessibleDescription('Production Online');
			announcements.stop();
			// While a dialog is open, the rest of the page is hidden from screen readers.
			expect(announcements.texts.filter(({ text }) => text !== '')).toEqual([
				{ text: 'Production: Online', dialogOpen: false },
			]);
		});

		it('announces the new link and moves focus only after the dialog has left the page', async () => {
			const created = linkedInstance({ id: 'link-3', name: 'Production' });
			// The real dialog leaves at once in this test environment. This one leaves when told to.
			const DialogThatLeavesLater = defineComponent({
				props: { open: Boolean },
				emits: ['update:open', 'linked', 'closed'],
				setup(props, { emit }) {
					return () =>
						h('div', [
							props.open
								? h(
										'button',
										{
											type: 'button',
											onClick: () => {
												emit('linked', created);
												emit('update:open', false);
											},
										},
										'Finish link',
									)
								: null,
							h('button', { type: 'button', onClick: () => emit('closed') }, 'Leave page'),
						]);
				},
			});
			api.fetchLinkedInstances.mockResolvedValue([acme]);
			renderView({
				pinia: createTestingPinia({ stubActions: false }),
				global: { stubs: { LinkInstanceModal: DialogThatLeavesLater } },
			});
			await screen.findByTestId('linked-instances-list');
			await userEvent.click(screen.getByTestId('linked-instances-link-button'));
			// The stub sends no request, so the new row goes into the store here.
			useLinkedInstancesStore().instances = [acme, created];

			await userEvent.click(screen.getByRole('button', { name: 'Finish link' }));
			await new Promise((resolve) => setTimeout(resolve, 0));
			expect(announcement().textContent).toBe('');

			await userEvent.click(screen.getByRole('button', { name: 'Leave page' }));

			await waitFor(() => expect(announcement()).toHaveTextContent('Production: Online'));
			await waitFor(() =>
				expect(
					within(rowOf('Production')).getByRole('button', { name: 'Check connection' }),
				).toHaveFocus(),
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
