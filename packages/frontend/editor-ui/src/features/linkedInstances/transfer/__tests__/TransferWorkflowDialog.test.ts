import type { LinkedInstancePushResult, LinkedInstanceTransferPreflight } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { createTestingPinia } from '@pinia/testing';
import { render as renderVNode, screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type { VNode } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';
import {
	deferred,
	linkedInstance,
	pushResult,
	transferPreflight,
} from '../../__tests__/linkedInstances.fixtures';
import type * as Api from '../transfer.api';
import TransferWorkflowDialog from '../TransferWorkflowDialog.vue';
import type { TransferWorkflow } from '../transferDialogState';

const api = vi.hoisted(() => ({
	fetchTransferPreflight: vi.fn<typeof Api.fetchTransferPreflight>(),
	moveWorkflow: vi.fn<typeof Api.moveWorkflow>(),
}));
vi.mock('../transfer.api', () => api);

const syncLocalTurnOff = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('../syncLocalTurnOff', () => ({ syncLocalTurnOff }));

const toast = vi.hoisted(() => ({
	showToast: vi.fn(),
	showMessage: vi.fn(),
	showError: vi.fn(),
}));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => toast }));

const UNREACHABLE = "Can't reach Acme Cloud. Check that it's running, then try again.";

const workflow = (overrides: Partial<TransferWorkflow> = {}): TransferWorkflow => ({
	id: 'wf-1',
	name: 'Daily report',
	liveHere: false,
	canUnpublish: false,
	...overrides,
});

const renderDialog = createComponentRenderer(TransferWorkflowDialog);

type Props = {
	workflow?: TransferWorkflow;
	offerTurnOn?: boolean;
	fromAssistant?: boolean;
};

async function setup(props: Props = {}, preflight = transferPreflight()) {
	api.fetchTransferPreflight.mockResolvedValue(preflight);
	const result = renderDialog({
		pinia: createTestingPinia({ stubActions: false }),
		props: { open: true, workflow: workflow(), instance: linkedInstance(), ...props },
	});
	await screen.findByTestId('transfer-workflow-dialog');
	return result;
}

async function setupReady(props: Props = {}, preflight = transferPreflight()) {
	const result = await setup(props, preflight);
	await screen.findByTestId('transfer-moves');
	return result;
}

const submitButton = () => screen.getByTestId('transfer-submit');
const cancelButton = () => screen.getByTestId('transfer-cancel');
const details = () => screen.getByRole('region', { name: 'Move details' });
const statusLine = () => screen.getByRole('status');

/** The toast is a VNode. Rendering it shows what the user sees. */
function renderToastMessage() {
	const [[config]] = toast.showToast.mock.calls as Array<[{ message: VNode }]>;
	return renderVNode({ render: () => config.message });
}

describe('TransferWorkflowDialog', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('loading', () => {
		it('checks what moves when it opens, with Move disabled and focus on Cancel', async () => {
			const preflight = deferred<LinkedInstanceTransferPreflight>();
			api.fetchTransferPreflight.mockReturnValue(preflight.promise);
			renderDialog({
				pinia: createTestingPinia({ stubActions: false }),
				props: { open: true, workflow: workflow(), instance: linkedInstance() },
			});

			expect(await screen.findByTestId('transfer-checking')).toHaveTextContent(
				'Checking what moves…',
			);
			expect(statusLine()).toHaveTextContent('Checking what moves…');
			expect(api.fetchTransferPreflight).toHaveBeenCalledWith(expect.anything(), 'link-1', {
				workflowId: 'wf-1',
			});
			expect(submitButton()).toBeDisabled();
			await waitFor(() => expect(cancelButton()).toHaveFocus());

			preflight.resolve(transferPreflight());

			expect(await screen.findByTestId('transfer-moves')).toBeVisible();
			expect(screen.queryByTestId('transfer-checking')).not.toBeInTheDocument();
			expect(statusLine()).toHaveTextContent('Check done. 4 nodes move to Acme Cloud.');
			expect(submitButton()).toBeEnabled();
		});

		it('names the workflow and the place in the title, with no description in the editor', async () => {
			await setup();

			expect(
				screen.getByRole('dialog', { name: 'Move "Daily report" to Acme Cloud?' }),
			).not.toHaveAccessibleDescription();
			expect(
				screen.queryByText('This chat stays here. The workflow moves.'),
			).not.toBeInTheDocument();
		});

		it('says that the chat stays here when an Assistant chat opened it', async () => {
			await setup({ fromAssistant: true });

			expect(screen.getByRole('dialog')).toHaveAccessibleDescription(
				'This chat stays here. The workflow moves.',
			);
		});
	});

	describe('sections', () => {
		it('shows what moves, where it goes and the credentials that are there already', async () => {
			await setupReady(
				{},
				transferPreflight({
					moves: { nodes: 5 },
					targetProject: { id: 'p-1', name: 'Automations' },
					credentials: [
						{ name: 'Slack', type: 'slackApi', status: 'matched' },
						{ name: 'Jira', type: 'jiraApi', status: 'matched' },
					],
				}),
			);

			const moves = within(screen.getByTestId('transfer-moves'));
			expect(moves.getByText('5 nodes')).toBeVisible();
			expect(moves.getByText('Goes to the project Automations')).toBeVisible();
			expect(
				moves.getByText('Uses the credentials with the same names in Acme Cloud: Slack and Jira'),
			).toBeVisible();
			expect(screen.queryByText('Needs setting up')).not.toBeInTheDocument();
			expect(screen.queryByText("Can't move")).not.toBeInTheDocument();
		});

		it('names the personal project and counts one node', async () => {
			await setupReady({}, transferPreflight({ moves: { nodes: 1 }, targetProject: null }));

			expect(screen.getByText('1 node')).toBeVisible();
			expect(screen.getByText('Goes to your personal project')).toBeVisible();
			expect(statusLine()).toHaveTextContent('Check done. 1 node moves to Acme Cloud.');
		});

		it('lists the credentials that need setting up with their status', async () => {
			await setupReady(
				{},
				transferPreflight({
					credentials: [
						{ name: 'Gmail account', type: 'gmailOAuth2', status: 'needs-set-up' },
						{ name: 'Notion', type: 'notionApi', status: 'unknown' },
					],
				}),
			);

			expect(screen.getByRole('heading', { name: 'Needs setting up' })).toBeVisible();
			const items = within(screen.getByTestId('transfer-needs-set-up')).getAllByRole('listitem');
			expect(items.map((item) => item.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
				'Gmail account: Arrives empty',
				'Notion: Not checked',
			]);
			expect(
				screen.getByText(
					"n8n couldn't check the credentials in Acme Cloud. Some may need setting up after the move.",
				),
			).toBeVisible();
			// One short line for screen readers, in place of the whole summary.
			expect(statusLine()).toHaveTextContent(
				'Check done. 4 nodes move to Acme Cloud. 2 credentials need setting up.',
			);
		});

		it('mentions the node type check only when the user turns the copy on', async () => {
			const text =
				"n8n checks the node types during the move. If Acme Cloud doesn't have one, this version can't go live there.";
			await setupReady({ offerTurnOn: true }, transferPreflight({ nodeTypeCheck: 'unknown' }));
			expect(screen.queryByText(text)).not.toBeInTheDocument();

			await userEvent.click(screen.getByRole('checkbox', { name: 'Turn it on in Acme Cloud' }));

			expect(screen.getByText(text)).toBeVisible();
		});

		it('names the called workflows under "Can\'t move" and disables Move', async () => {
			await setupReady(
				{ workflow: workflow({ liveHere: true, canUnpublish: true }), offerTurnOn: true },
				transferPreflight({
					subWorkflowCalls: [
						{ id: 'wf-2', name: 'Enrich lead' },
						{ id: 'wf-3', name: null },
					],
				}),
			);

			expect(screen.getByRole('heading', { name: "Can't move" })).toBeVisible();
			const blocked = within(screen.getByTestId('transfer-cannot-move'));
			expect(blocked.getByText('Enrich lead')).toBeVisible();
			expect(blocked.getByText("A workflow you can't open (ID wf-3)")).toBeVisible();
			expect(submitButton()).toBeDisabled();
			expect(statusLine()).toHaveTextContent("Check done. The workflow can't move to Acme Cloud.");
			// Choices do not matter while the workflow cannot move.
			expect(screen.queryByTestId('transfer-turn-off-here')).not.toBeInTheDocument();
			expect(screen.queryByTestId('transfer-turn-on')).not.toBeInTheDocument();
		});

		it('lists node types that the linked instance does not have and disables Move', async () => {
			await setupReady(
				{},
				transferPreflight({ nodeTypeCheck: 'checked', missingNodeTypes: ['acme.thing@2'] }),
			);

			expect(screen.getByText("Acme Cloud doesn't have these node types:")).toBeVisible();
			expect(screen.getByText('acme.thing@2')).toBeVisible();
			expect(submitButton()).toBeDisabled();
		});
	});

	describe('choices', () => {
		it('offers no choice for a workflow that is not live here', async () => {
			await setupReady();

			expect(screen.queryByText('The copy here')).not.toBeInTheDocument();
			expect(screen.queryByTestId('transfer-turn-off-here')).not.toBeInTheDocument();
			expect(screen.queryByTestId('transfer-turn-on')).not.toBeInTheDocument();
		});

		it('offers to turn off the copy here only when the user can turn it off', async () => {
			await setupReady({ workflow: workflow({ liveHere: true, canUnpublish: false }) });

			expect(screen.queryByTestId('transfer-turn-off-here')).not.toBeInTheDocument();
		});

		it('offers both choices, off by default, and tells what the picked choices do', async () => {
			await setupReady(
				{ workflow: workflow({ liveHere: true, canUnpublish: true }), offerTurnOn: true },
				transferPreflight({
					credentials: [{ name: 'Gmail', type: 'gmailOAuth2', status: 'needs-set-up' }],
				}),
			);
			const turnOffHere = screen.getByRole('checkbox', {
				name: 'Turn off the copy on this computer',
			});
			const turnOn = screen.getByRole('checkbox', { name: 'Turn it on in Acme Cloud' });
			expect(screen.getByRole('heading', { name: 'The copy here' })).toBeVisible();
			expect(turnOffHere).not.toBeChecked();
			expect(turnOn).not.toBeChecked();

			const turnsOffHere =
				'The workflow turns off here. It runs in Acme Cloud only when the copy there is on.';
			const hints = within(screen.getByTestId('transfer-hints'));

			await userEvent.click(turnOffHere);
			expect(hints.getByText(turnsOffHere)).toBeVisible();

			await userEvent.click(turnOn);
			expect(screen.queryByText(turnsOffHere)).not.toBeInTheDocument();
			expect(
				hints.getByText(
					"This version can't go live in Acme Cloud until you set up its credentials there.",
				),
			).toBeVisible();
			expect(
				hints.getByText(
					'The workflow here stays on. Turn it off here after the copy is on in Acme Cloud.',
				),
			).toBeVisible();
			// Screen readers read each new hint.
			expect(screen.getByTestId('transfer-hints')).toHaveAttribute('aria-live', 'polite');
		});

		it('does not offer to turn on the copy unless the opener asks for it', async () => {
			await setupReady({ workflow: workflow({ liveHere: true, canUnpublish: true }) });

			expect(
				screen.getByRole('checkbox', { name: 'Turn off the copy on this computer' }),
			).toBeVisible();
			expect(screen.queryByTestId('transfer-turn-on')).not.toBeInTheDocument();
		});
	});

	describe('error and retry', () => {
		it('shows the server message and checks again on "Try again"', async () => {
			api.fetchTransferPreflight
				.mockRejectedValueOnce(new ResponseError(UNREACHABLE, { httpStatusCode: 400 }))
				.mockResolvedValueOnce(transferPreflight());
			renderDialog({
				pinia: createTestingPinia({ stubActions: false }),
				props: { open: true, workflow: workflow(), instance: linkedInstance() },
			});

			expect(await screen.findByText(UNREACHABLE)).toBeVisible();
			expect(submitButton()).toBeDisabled();
			// The notice reads out the error once: no live region around it repeats it.
			expect(screen.getByRole('alert')).toHaveTextContent(UNREACHABLE);
			expect(screen.getByRole('alert').closest('[aria-live]')).toBeNull();
			expect(statusLine()).toBeEmptyDOMElement();

			await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

			expect(await screen.findByTestId('transfer-moves')).toBeVisible();
			expect(screen.queryByText(UNREACHABLE)).not.toBeInTheDocument();
			expect(api.fetchTransferPreflight).toHaveBeenCalledTimes(2);
			// "Try again" went away, so focus moves to Cancel instead of the page.
			await waitFor(() => expect(cancelButton()).toHaveFocus());
		});

		it('keeps focus on "Try again" when the check fails again', async () => {
			api.fetchTransferPreflight.mockRejectedValue(new ResponseError(UNREACHABLE));
			renderDialog({
				pinia: createTestingPinia({ stubActions: false }),
				props: { open: true, workflow: workflow(), instance: linkedInstance() },
			});
			await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));

			await waitFor(() => expect(screen.getByRole('button', { name: 'Try again' })).toHaveFocus());
			expect(api.fetchTransferPreflight).toHaveBeenCalledTimes(2);
		});

		it('shows its own message when the server gave none', async () => {
			api.fetchTransferPreflight.mockRejectedValue(new TypeError('Failed to fetch'));
			renderDialog({
				pinia: createTestingPinia({ stubActions: false }),
				props: { open: true, workflow: workflow(), instance: linkedInstance() },
			});

			expect(
				await screen.findByText("Couldn't check what moves to Acme Cloud. Try again."),
			).toBeVisible();
			expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument();
		});
	});

	describe('move', () => {
		it('moves with the picked choices, then closes and shows a toast with a link to the copy', async () => {
			const request = deferred<LinkedInstancePushResult>();
			api.moveWorkflow.mockReturnValue(request.promise);
			const { emitted, rerender } = await setupReady({
				workflow: workflow({ liveHere: true, canUnpublish: true }),
				offerTurnOn: true,
			});
			await userEvent.click(screen.getByRole('checkbox', { name: 'Turn it on in Acme Cloud' }));

			await userEvent.click(submitButton());

			expect(api.moveWorkflow).toHaveBeenCalledWith(expect.anything(), 'link-1', {
				workflowId: 'wf-1',
				publish: true,
				deactivateLocal: false,
			});
			expect(submitButton()).toHaveTextContent('Moving…');
			expect(cancelButton()).toBeDisabled();
			expect(screen.queryByRole('button', { name: 'Close dialog' })).not.toBeInTheDocument();
			// Every control is disabled, so the details keep focus in the dialog.
			await waitFor(() => expect(details()).toHaveFocus());
			expect(statusLine()).toHaveTextContent('Moving the workflow to Acme Cloud…');
			// The status line reads the move, so the button label is not read a second time.
			expect(submitButton()).toHaveAttribute('aria-live', 'off');

			const result = pushResult({ published: true });
			request.resolve(result);

			await waitFor(() => expect(emitted('moved')).toEqual([[result]]));
			expect(emitted('update:open')).toEqual([[false]]);
			expect(toast.showToast).not.toHaveBeenCalled();

			await rerender({ open: false });

			await waitFor(() => expect(emitted('closed')).toHaveLength(1));
			expect(toast.showToast).toHaveBeenCalledWith(
				expect.objectContaining({ title: 'Moved to Acme Cloud', type: 'success', duration: 0 }),
			);
			expect(syncLocalTurnOff).not.toHaveBeenCalled();

			renderToastMessage();
			expect(screen.getByText("It's on in Acme Cloud.")).toBeVisible();
			const open = screen.getByRole('link', { name: /Open in Acme Cloud/ });
			expect(open).toHaveAttribute('href', 'https://acme.app.n8n.cloud/workflow/remote-wf-1');
			expect(open).toHaveAttribute('target', '_blank');
			expect(open).toHaveAttribute('rel', 'noopener noreferrer');
		});

		it('lists what needs setting up in the toast, with a link for each credential', async () => {
			api.moveWorkflow.mockResolvedValue(
				pushResult({
					credentialsNeedingSetup: [{ id: 'cred-1', name: 'Gmail account', type: 'gmailOAuth2' }],
					warnings: [
						'The workflow is in Acme Cloud, but 1 credential that it uses there has no value.',
					],
				}),
			);
			const { rerender } = await setupReady();
			await userEvent.click(submitButton());
			await rerender({ open: false });
			await waitFor(() => expect(toast.showToast).toHaveBeenCalled());

			expect(toast.showToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning' }));
			renderToastMessage();
			expect(screen.getByText("It's off in Acme Cloud.")).toBeVisible();
			expect(screen.getByText('Needs setting up in Acme Cloud:')).toBeVisible();
			expect(screen.getByText('Gmail account')).toBeVisible();
			const setUp = screen.getByRole('link', {
				name: 'Set up in Acme Cloud: Gmail account (opens in a new tab)',
			});
			expect(setUp).toHaveAttribute('href', 'https://acme.app.n8n.cloud/home/credentials/cred-1');
			expect(setUp).toHaveAttribute('rel', 'noopener noreferrer');
			expect(
				screen.getByText(
					'The workflow is in Acme Cloud, but 1 credential that it uses there has no value.',
				),
			).toBeVisible();
		});

		it('turns off the workflow here when the user picked it, and updates the editor', async () => {
			api.moveWorkflow.mockResolvedValue(pushResult({ published: true, localDeactivated: true }));
			const { rerender } = await setupReady({
				workflow: workflow({ liveHere: true, canUnpublish: true }),
				offerTurnOn: true,
			});
			await userEvent.click(
				screen.getByRole('checkbox', { name: 'Turn off the copy on this computer' }),
			);
			await userEvent.click(screen.getByRole('checkbox', { name: 'Turn it on in Acme Cloud' }));

			await userEvent.click(submitButton());

			await waitFor(() => expect(syncLocalTurnOff).toHaveBeenCalledWith('wf-1'));
			expect(api.moveWorkflow).toHaveBeenCalledWith(expect.anything(), 'link-1', {
				workflowId: 'wf-1',
				publish: true,
				deactivateLocal: true,
			});
			await rerender({ open: false });
			await waitFor(() => expect(toast.showToast).toHaveBeenCalled());
			renderToastMessage();
			expect(screen.getByText(/It's off on this computer\./)).toBeVisible();
		});

		it('stays open with the server message when the move fails, and keeps focus on Move', async () => {
			api.moveWorkflow.mockRejectedValue(new ResponseError(UNREACHABLE, { httpStatusCode: 400 }));
			const { emitted } = await setupReady();

			await userEvent.click(submitButton());

			expect(await screen.findByTestId('transfer-move-error')).toHaveTextContent(UNREACHABLE);
			expect(screen.getByRole('alert').closest('[aria-live]')).toBeNull();
			expect(statusLine()).toBeEmptyDOMElement();
			expect(emitted('update:open')).toBeUndefined();
			expect(emitted('moved')).toBeUndefined();
			expect(submitButton()).toBeEnabled();
			await waitFor(() => expect(submitButton()).toHaveFocus());
		});

		it('shows its own message when a failed move gives none', async () => {
			api.moveWorkflow.mockRejectedValue(new TypeError('Failed to fetch'));
			await setupReady();

			await userEvent.click(submitButton());

			expect(await screen.findByTestId('transfer-move-error')).toHaveTextContent(
				"Couldn't move the workflow to Acme Cloud. Try again.",
			);
		});

		it('does not say that the moved version is on when the move did not publish it', async () => {
			const warning =
				'The new version is not live, because the source workflow does not publish this version. An earlier version stays live.';
			api.moveWorkflow.mockResolvedValue(
				pushResult({ created: false, published: true, warnings: [warning] }),
			);
			const { rerender } = await setupReady({
				workflow: workflow({ liveHere: true, canUnpublish: true }),
			});

			await userEvent.click(submitButton());
			expect(api.moveWorkflow).toHaveBeenCalledWith(expect.anything(), 'link-1', {
				workflowId: 'wf-1',
				publish: false,
				deactivateLocal: false,
			});
			await rerender({ open: false });
			await waitFor(() => expect(toast.showToast).toHaveBeenCalled());

			renderToastMessage();
			expect(
				screen.getByText(
					'A version of it stays on in Acme Cloud. Open it there to see which version runs.',
				),
			).toBeVisible();
			expect(screen.queryByText("It's on in Acme Cloud.")).not.toBeInTheDocument();
			expect(screen.getByText(warning)).toBeVisible();
		});
	});

	describe('keyboard', () => {
		it('closes on Escape when no move runs', async () => {
			const { emitted } = await setupReady();

			await userEvent.keyboard('{Escape}');

			expect(emitted('update:open')).toEqual([[false]]);
		});

		it('ignores Escape while the move runs', async () => {
			const request = deferred<LinkedInstancePushResult>();
			api.moveWorkflow.mockReturnValue(request.promise);
			const { emitted } = await setupReady();
			await userEvent.click(submitButton());

			await userEvent.keyboard('{Escape}');

			expect(emitted('update:open')).toBeUndefined();
			request.resolve(pushResult());
			await waitFor(() => expect(emitted('update:open')).toEqual([[false]]));
		});

		it('keeps focus inside the dialog when Tab passes the last control', async () => {
			await setupReady();
			await waitFor(() => expect(cancelButton()).toHaveFocus());

			await userEvent.tab();
			expect(submitButton()).toHaveFocus();
			await userEvent.tab();
			expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus();
			await userEvent.tab();
			expect(cancelButton()).toHaveFocus();
			await userEvent.tab({ shift: true });
			expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus();
		});

		it('lets keyboard users scroll the details only when they do not fit', async () => {
			const notify: Array<() => void> = [];
			vi.stubGlobal(
				'ResizeObserver',
				class {
					constructor(callback: () => void) {
						notify.push(callback);
					}

					observe() {}

					unobserve() {}

					disconnect() {}
				},
			);
			await setupReady();
			await waitFor(() => expect(cancelButton()).toHaveFocus());
			expect(details()).toHaveAttribute('tabindex', '-1');

			Object.defineProperties(details(), {
				scrollHeight: { configurable: true, value: 900 },
				clientHeight: { configurable: true, value: 400 },
			});
			for (const callback of notify) callback();

			await waitFor(() => expect(details()).toHaveAttribute('tabindex', '0'));
			await userEvent.tab({ shift: true });
			expect(details()).toHaveFocus();
		});

		it('tells the opener when it has left, so the opener can move focus', async () => {
			const { emitted, rerender } = await setupReady();

			await rerender({ open: false });

			await waitFor(() => expect(emitted('closed')).toHaveLength(1));
			expect(screen.queryByTestId('transfer-workflow-dialog')).not.toBeInTheDocument();
			expect(toast.showToast).not.toHaveBeenCalled();
		});
	});

	it('ignores a check that ends after the dialog opened again', async () => {
		const first = deferred<LinkedInstanceTransferPreflight>();
		api.fetchTransferPreflight
			.mockReturnValueOnce(first.promise)
			.mockResolvedValueOnce(transferPreflight({ moves: { nodes: 9 } }));
		const { rerender } = renderDialog({
			pinia: createTestingPinia({ stubActions: false }),
			props: { open: true, workflow: workflow(), instance: linkedInstance() },
		});
		await screen.findByTestId('transfer-checking');

		await rerender({ open: false });
		await rerender({ open: true });
		expect(await screen.findByText('9 nodes')).toBeVisible();
		first.resolve(transferPreflight({ moves: { nodes: 2 } }));
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(screen.getByText('9 nodes')).toBeVisible();
		expect(screen.queryByText('2 nodes')).not.toBeInTheDocument();
	});
});
