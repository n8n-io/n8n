import type { SelfHealingAgentResultDetail } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';

import * as api from './agentProposal.api';
import { useAgentProposalStore } from './agentProposal.store';
import { proposal, proposalSelection } from './agentProposal.test.utils';

vi.mock('./agentProposal.api');

beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(api.fetchAgentProposal).mockImplementation(async (_context, selection) =>
		proposal({ resultId: selection.id }),
	);
});

it('ignores a detail response after selecting another proposal', async () => {
	const request = createDeferredPromise<SelfHealingAgentResultDetail>();
	vi.mocked(api.fetchAgentProposal).mockReturnValueOnce(request.promise);
	const store = useAgentProposalStore();
	const first = store.select(proposalSelection);
	await store.select({ ...proposalSelection, id: 'other' });
	request.resolve(proposal());
	await first;
	expect(store.detail?.resultId).toBe('other');
	expect(store.loading).toBe(false);
});

it('does not let a pending read replace a completed action', async () => {
	const store = useAgentProposalStore();
	await store.select(proposalSelection);
	const request = createDeferredPromise<SelfHealingAgentResultDetail>();
	vi.mocked(api.fetchAgentProposal).mockReturnValueOnce(request.promise);
	const loading = store.retryDetail();
	store.acceptResult(proposal({ reviewState: 'applied' }));
	request.resolve(proposal());
	await loading;
	expect(store.detail?.reviewState).toBe('applied');
	expect(store.loading).toBe(false);
});

it('ignores an action result for a proposal that is not selected', async () => {
	const store = useAgentProposalStore();
	await store.select(proposalSelection);
	store.acceptResult(proposal({ resultId: 'other', reviewState: 'applied' }));
	expect(store.detail?.resultId).toBe(proposalSelection.id);
	expect(store.detail?.reviewState).toBe('open');
});

it('calls the callback before it shows a refreshed proposal', async () => {
	const store = useAgentProposalStore();
	await store.select(proposalSelection);
	vi.mocked(api.fetchAgentProposal).mockResolvedValueOnce(proposal({ reviewState: 'applied' }));
	const beforeShow = vi.fn(() => expect(store.detail?.reviewState).toBe('open'));
	await store.retryDetail(beforeShow);
	expect(beforeShow).toHaveBeenCalledOnce();
	expect(store.detail?.reviewState).toBe('applied');
});

it.each([403, 404])('clears saved detail when a read returns %s', async (httpStatusCode) => {
	const store = useAgentProposalStore();
	await store.select(proposalSelection);
	const error = new ResponseError('Unavailable', { httpStatusCode });
	vi.mocked(api.fetchAgentProposal).mockRejectedValueOnce(error);
	await store.retryDetail();
	expect(store.detail).toBeNull();
	expect(store.error).toBe(error);
	expect(store.loading).toBe(false);
});

it('tracks a pending action for each proposal', async () => {
	const store = useAgentProposalStore();
	const second = { ...proposalSelection, id: 'other' };
	await store.select(proposalSelection);

	expect(store.beginAction(proposalSelection, 'apply')).toBe(true);
	expect(store.beginAction(proposalSelection, 'dismiss')).toBe(false);
	expect(store.pendingAction).toBe('apply');

	await store.select(second);
	expect(store.pendingAction).toBeNull();
	expect(store.beginAction(second, 'dismiss')).toBe(true);

	store.endAction(proposalSelection);
	expect(store.pendingAction).toBe('dismiss');
	await store.select(proposalSelection);
	expect(store.pendingAction).toBeNull();
});
