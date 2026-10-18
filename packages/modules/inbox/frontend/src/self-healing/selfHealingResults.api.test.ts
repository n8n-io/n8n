import { makeRestApiRequest } from '@n8n/rest-api-client';

import { fetchSelfHealingResult, reviewSelfHealingResult } from './selfHealingResults.api';
import { resultSelection } from './selfHealingResults.test.utils';

vi.mock('@n8n/rest-api-client', () => ({ makeRestApiRequest: vi.fn() }));

it('encodes the full result address and forwards the editor context for each action', async () => {
	const context = { baseUrl: '/rest', pushRef: 'editor-client' };
	const selection = {
		...resultSelection,
		projectId: 'project/id',
		workflowId: 'workflow/id',
		id: 'result/id',
	};
	const path = '/projects/project%2Fid/workflows/workflow%2Fid/self-healing-results/result%2Fid';
	await fetchSelfHealingResult(context, selection);
	expect(makeRestApiRequest).toHaveBeenLastCalledWith(context, 'GET', path);
	for (const action of ['apply', 'approve-and-publish', 'dismiss'] as const) {
		await reviewSelfHealingResult(context, selection, action);
		expect(makeRestApiRequest).toHaveBeenLastCalledWith(context, 'POST', `${path}/${action}`);
	}
	expect(makeRestApiRequest).toHaveBeenCalledTimes(4);
});
