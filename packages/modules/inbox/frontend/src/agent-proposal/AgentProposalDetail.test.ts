import type { SelfHealingAgentResultDetail } from '@n8n/api-types';
import { createComponentRenderer, waitAllPromises } from '@n8n/frontend-test-utils';
import { ResponseError } from '@n8n/rest-api-client';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';

import * as api from './agentProposal.api';
import { proposal, proposalSelection } from './agentProposal.test.utils';
import AgentProposalDetail from './AgentProposalDetail.vue';

vi.mock('./agentProposal.api');
// Another track owns the tab components. The container does not need them.
vi.mock('./AgentProposalContent.vue', () => ({
	default: {
		props: ['detail', 'tab', 'pendingAction'],
		emits: ['action', 'update:tab'],
		template: `<div data-test-id="proposal-content" :data-state="detail.reviewState" :data-pending="pendingAction" :data-tab="tab" :data-error="detail.applyError">
<button v-for="action in ['apply', 'dismiss']" :key="action" :data-test-id="action" @click="$emit('action', action)" />
<button data-test-id="open-evals" @click="$emit('update:tab', 'evals')" />
</div>`,
	},
}));
const { showError, showMessage } = vi.hoisted(() => ({
	showError: vi.fn(),
	showMessage: vi.fn(),
}));
vi.mock('@n8n/composables/useToast', () => ({ useToast: () => ({ showError, showMessage }) }));

const onItemChange = vi.fn();
let selectedId: string | null;
const renderComponent = createComponentRenderer(AgentProposalDetail, {
	props: {
		selection: proposalSelection,
		tab: 'activity',
		onItemChange,
		isSelected: (id: string) => selectedId === id,
	},
});

async function renderLoaded() {
	const view = renderComponent();
	await waitAllPromises();
	return view;
}

beforeEach(() => {
	vi.resetAllMocks();
	selectedId = proposalSelection.id;
	vi.mocked(api.fetchAgentProposal).mockResolvedValue(proposal());
});

it('loads the selected proposal and forwards the tab', async () => {
	const view = await renderLoaded();

	expect(api.fetchAgentProposal).toHaveBeenCalledWith(expect.anything(), proposalSelection);
	expect(view.getByTestId('proposal-content')).toHaveAttribute('data-tab', 'activity');
	view.getByTestId('open-evals').click();
	expect(view.emitted('update:tab')).toEqual([['evals']]);
});

it('loads the new proposal when the selection changes', async () => {
	const view = await renderLoaded();
	const second = { ...proposalSelection, id: 'result-2' };
	vi.mocked(api.fetchAgentProposal).mockResolvedValue(proposal({ resultId: 'result-2' }));

	await view.rerender({ selection: second });
	await waitAllPromises();

	expect(api.fetchAgentProposal).toHaveBeenLastCalledWith(expect.anything(), second);
});

it.each([
	{ action: 'apply', reviewState: 'applied' },
	{ action: 'dismiss', reviewState: 'dismissed' },
] as const)('closes the item and advances after $action', async ({ action, reviewState }) => {
	const closed = proposal({ reviewState, updatedAt: '2026-10-10T09:00:00.000Z' });
	vi.mocked(api.reviewAgentProposal).mockResolvedValue(closed);
	const view = await renderLoaded();

	view.getByTestId(action).click();
	await waitAllPromises();

	expect(api.reviewAgentProposal).toHaveBeenCalledWith(
		expect.anything(),
		proposalSelection,
		action,
	);
	expect(view.getByTestId('proposal-content')).toHaveAttribute('data-state', reviewState);
	expect(onItemChange).toHaveBeenCalledExactlyOnceWith({
		type: 'self_healing_agent_result',
		id: proposalSelection.id,
		state: 'closed',
		updatedAt: closed.updatedAt,
		advance: true,
	});
	expect(showMessage).toHaveBeenCalledTimes(action === 'apply' ? 1 : 0);
	expect(showError).not.toHaveBeenCalled();
});

it('keeps an outdated proposal selected after Apply', async () => {
	vi.mocked(api.reviewAgentProposal).mockResolvedValue(proposal({ reviewState: 'outdated' }));
	const view = await renderLoaded();

	view.getByTestId('apply').click();
	await waitAllPromises();

	expect(view.getByTestId('proposal-content')).toHaveAttribute('data-state', 'outdated');
	expect(onItemChange).toHaveBeenCalledExactlyOnceWith(
		expect.objectContaining({ state: 'closed', advance: false }),
	);
	expect(showMessage).not.toHaveBeenCalled();
});

it('keeps the proposal open for a retry when a step of Apply fails', async () => {
	vi.mocked(api.reviewAgentProposal)
		.mockResolvedValueOnce(proposal({ applyError: 'The agent is locked' }))
		.mockResolvedValueOnce(proposal({ reviewState: 'applied' }));
	const view = await renderLoaded();

	view.getByTestId('apply').click();
	await waitAllPromises();

	expect(view.getByTestId('proposal-content')).toHaveAttribute('data-error', 'The agent is locked');
	expect(view.getByTestId('proposal-content')).not.toHaveAttribute('data-pending');
	expect(onItemChange).not.toHaveBeenCalled();

	view.getByTestId('apply').click();
	await waitAllPromises();

	expect(api.reviewAgentProposal).toHaveBeenCalledTimes(2);
	expect(onItemChange).toHaveBeenCalledOnce();
});

it('sends one request while an action is pending', async () => {
	const request = createDeferredPromise<SelfHealingAgentResultDetail>();
	vi.mocked(api.reviewAgentProposal).mockReturnValue(request.promise);
	const view = await renderLoaded();

	view.getByTestId('apply').click();
	view.getByTestId('dismiss').click();
	await waitAllPromises();

	expect(api.reviewAgentProposal).toHaveBeenCalledOnce();
	expect(view.getByTestId('proposal-content')).toHaveAttribute('data-pending', 'apply');
	request.resolve(proposal({ reviewState: 'applied' }));
	await waitAllPromises();
});

it('does not send an action for a closed proposal', async () => {
	vi.mocked(api.fetchAgentProposal).mockResolvedValue(proposal({ reviewState: 'applied' }));
	const view = await renderLoaded();

	view.getByTestId('dismiss').click();
	await waitAllPromises();

	expect(api.reviewAgentProposal).not.toHaveBeenCalled();
});

it('reads the saved state after a competing action and reports the closure', async () => {
	const conflict = new ResponseError('Conflict', { httpStatusCode: 409 });
	vi.mocked(api.reviewAgentProposal).mockRejectedValue(conflict);
	const view = await renderLoaded();
	vi.mocked(api.fetchAgentProposal).mockResolvedValue(proposal({ reviewState: 'dismissed' }));

	view.getByTestId('apply').click();
	await waitAllPromises();

	expect(view.getByTestId('proposal-content')).toHaveAttribute('data-state', 'dismissed');
	expect(onItemChange).toHaveBeenCalledExactlyOnceWith(
		expect.objectContaining({ state: 'closed', advance: false }),
	);
	expect(showError).toHaveBeenCalledExactlyOnceWith(conflict, "Couldn't update proposal");
});

it('shows the error and keeps the proposal open when the server rejects the action', async () => {
	const rejected = new ResponseError('Forbidden', { httpStatusCode: 403 });
	vi.mocked(api.reviewAgentProposal).mockRejectedValue(rejected);
	const view = await renderLoaded();

	view.getByTestId('apply').click();
	await waitAllPromises();

	expect(view.getByTestId('proposal-content')).toHaveAttribute('data-state', 'open');
	expect(onItemChange).not.toHaveBeenCalled();
	expect(showError).toHaveBeenCalledExactlyOnceWith(rejected, "Couldn't update proposal");
});

it('updates the list without an error toast when the user opened another item', async () => {
	vi.mocked(api.reviewAgentProposal).mockRejectedValue(
		new ResponseError('Conflict', { httpStatusCode: 409 }),
	);
	await renderLoaded();
	vi.mocked(api.fetchAgentProposal).mockResolvedValue(proposal({ reviewState: 'dismissed' }));

	document.querySelector<HTMLElement>('[data-test-id="apply"]')?.click();
	selectedId = 'result-2';
	await waitAllPromises();

	expect(onItemChange).toHaveBeenCalledExactlyOnceWith(
		expect.objectContaining({ id: proposalSelection.id, state: 'closed', advance: false }),
	);
	expect(showError).not.toHaveBeenCalled();
});

it('accepts the saved state without an error when the response was lost', async () => {
	vi.mocked(api.reviewAgentProposal).mockRejectedValue(new Error('Network error'));
	const view = await renderLoaded();
	vi.mocked(api.fetchAgentProposal).mockResolvedValue(proposal({ reviewState: 'applied' }));

	view.getByTestId('apply').click();
	await waitAllPromises();

	expect(view.getByTestId('proposal-content')).toHaveAttribute('data-state', 'applied');
	expect(onItemChange).toHaveBeenCalledOnce();
	expect(showError).not.toHaveBeenCalled();
});

it('reports the closure after a retry when the first read after a failed action fails', async () => {
	vi.mocked(api.reviewAgentProposal).mockRejectedValue(new Error('Network error'));
	const view = await renderLoaded();
	vi.mocked(api.fetchAgentProposal).mockRejectedValueOnce(new Error('Network error'));

	view.getByTestId('apply').click();
	await waitAllPromises();

	expect(view.getByTestId('agent-proposal-detail-error')).toBeInTheDocument();
	expect(showError).toHaveBeenCalledOnce();
	expect(onItemChange).not.toHaveBeenCalled();

	vi.mocked(api.fetchAgentProposal).mockResolvedValue(proposal({ reviewState: 'applied' }));
	view.getByRole('button', { name: 'Retry' }).click();
	await waitAllPromises();

	expect(view.getByTestId('proposal-content')).toHaveAttribute('data-state', 'applied');
	expect(onItemChange).toHaveBeenCalledExactlyOnceWith(
		expect.objectContaining({ state: 'closed', advance: false }),
	);
});

it.each([
	[404, 'Proposal unavailable'],
	[403, 'You no longer have access'],
	[500, "Couldn't load proposal"],
])('explains a failed read with status %s', async (httpStatusCode, heading) => {
	vi.mocked(api.fetchAgentProposal).mockRejectedValue(
		new ResponseError('Failed', { httpStatusCode }),
	);
	const view = await renderLoaded();

	expect(view.getByTestId('agent-proposal-detail-error')).toHaveTextContent(heading);
});
