import type { SelfHealingResultDetail } from '@n8n/api-types';
import { ResponseError } from '@n8n/rest-api-client';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';

import { useSelfHealingResultStore } from './selfHealingResult.store';
import * as api from './selfHealingResults.api';
import { result, resultSelection } from './selfHealingResults.test.utils';

vi.mock('./selfHealingResults.api');

beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(api.fetchSelfHealingResult).mockImplementation(async (_context, selection) =>
		result({ resultId: selection.id }),
	);
	vi.mocked(api.fetchResultWorkflow).mockResolvedValue({
		name: 'Daily report',
		scopes: ['workflow:read', 'workflow:update'],
	});
});

it('ignores a detail response after selecting another result', async () => {
	const request = createDeferredPromise<SelfHealingResultDetail>();
	vi.mocked(api.fetchSelfHealingResult).mockReturnValueOnce(request.promise);
	const store = useSelfHealingResultStore();
	const first = store.select(resultSelection);
	await store.select({ ...resultSelection, id: 'other' });
	request.resolve(result());
	await first;
	expect(store.detail?.resultId).toBe('other');
	expect(store.loading).toBe(false);
});

it('does not let a pending read replace a completed action', async () => {
	const store = useSelfHealingResultStore();
	await store.select(resultSelection);
	const request = createDeferredPromise<SelfHealingResultDetail>();
	vi.mocked(api.fetchSelfHealingResult).mockReturnValueOnce(request.promise);
	const loading = store.refreshDetail();
	store.acceptResult(result({ reviewState: 'applied' }));
	request.resolve(result());
	await loading;
	expect(store.detail?.reviewState).toBe('applied');
	expect(store.loading).toBe(false);
});

it.each([403, 404])('clears saved detail when a read returns %s', async (httpStatusCode) => {
	const store = useSelfHealingResultStore();
	await store.select(resultSelection);
	const error = new ResponseError('Unavailable', { httpStatusCode });
	vi.mocked(api.fetchSelfHealingResult).mockRejectedValueOnce(error);
	await store.refreshDetail();
	expect(store.detail).toBeNull();
	expect(store.error).toBe(error);
	expect(store.loading).toBe(false);
});

it('keeps the report available when the workflow metadata request fails', async () => {
	const error = new Error('Request failed');
	vi.mocked(api.fetchResultWorkflow).mockRejectedValueOnce(error);
	const store = useSelfHealingResultStore();
	await store.select(resultSelection);
	expect(store.detail?.report).toBe(result().report);
	expect(store.workflow).toBeNull();
	expect(store.workflowError).toBe(error);
	expect(store.error).toBeNull();
});
