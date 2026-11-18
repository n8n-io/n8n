import { makeRestApiRequest } from '@n8n/rest-api-client';

import { fetchAgentProposal, reviewAgentProposal } from './agentProposal.api';
import { proposalSelection } from './agentProposal.test.utils';

vi.mock('@n8n/rest-api-client', () => ({ makeRestApiRequest: vi.fn() }));

it('encodes the full proposal address for the read and for each action', async () => {
	const context = { baseUrl: '/rest', pushRef: 'editor-client' };
	const selection = { ...proposalSelection, projectId: 'project/id', id: 'result/id' };
	const path = '/projects/project%2Fid/self-healing-agent-results/result%2Fid';
	await fetchAgentProposal(context, selection);
	expect(makeRestApiRequest).toHaveBeenLastCalledWith(context, 'GET', path);
	for (const action of ['apply', 'dismiss'] as const) {
		await reviewAgentProposal(context, selection, action);
		expect(makeRestApiRequest).toHaveBeenLastCalledWith(context, 'POST', `${path}/${action}`);
	}
	expect(makeRestApiRequest).toHaveBeenCalledTimes(3);
});
