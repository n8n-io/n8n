import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

import { fakeToken, pushResult, transferPreflight } from '../../__tests__/linkedInstances.fixtures';
import { fetchTransferPreflight, moveWorkflow } from '../transfer.api';

vi.mock('@n8n/rest-api-client', () => ({
	makeRestApiRequest: vi.fn(),
}));

const context = { baseUrl: '/rest', pushRef: 'push-1' } as IRestApiContext;

describe('transfer.api', () => {
	beforeEach(() => {
		vi.mocked(makeRestApiRequest).mockReset();
	});

	describe('fetchTransferPreflight', () => {
		it('asks the preflight route of the link for the workflow', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValue(transferPreflight());

			await expect(
				fetchTransferPreflight(context, 'link-1', { workflowId: 'wf-1' }),
			).resolves.toEqual(transferPreflight());
			expect(makeRestApiRequest).toHaveBeenCalledWith(
				context,
				'POST',
				'/linked-instances/link-1/transfer/preflight',
				{ workflowId: 'wf-1' },
			);
		});

		it('encodes the link id in the path', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValue(transferPreflight());

			await fetchTransferPreflight(context, 'a/b?c', { workflowId: 'wf-1' });

			expect(vi.mocked(makeRestApiRequest).mock.calls[0][2]).toBe(
				'/linked-instances/a%2Fb%3Fc/transfer/preflight',
			);
		});

		it('reads values that this client does not know as "unknown"', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValue({
				...transferPreflight(),
				nodeTypeCheck: 'partial',
				credentials: [{ name: 'Slack', type: 'slackApi', status: 'expired' }],
			});

			const preflight = await fetchTransferPreflight(context, 'link-1', { workflowId: 'wf-1' });

			expect(preflight.nodeTypeCheck).toBe('unknown');
			expect(preflight.credentials).toEqual([
				{ name: 'Slack', type: 'slackApi', status: 'unknown' },
			]);
		});

		it('keeps the personal project as null and a hidden sub-workflow name as null', async () => {
			const response = transferPreflight({
				targetProject: null,
				subWorkflowCalls: [{ id: 'wf-9', name: null }],
			});
			vi.mocked(makeRestApiRequest).mockResolvedValue(response);

			await expect(
				fetchTransferPreflight(context, 'link-1', { workflowId: 'wf-1' }),
			).resolves.toEqual(response);
		});

		it('drops fields that the preflight does not name', async () => {
			const extra = fakeToken();
			vi.mocked(makeRestApiRequest).mockResolvedValue({ ...transferPreflight(), token: extra });

			const preflight = await fetchTransferPreflight(context, 'link-1', { workflowId: 'wf-1' });

			expect(JSON.stringify(preflight)).not.toContain(extra);
		});

		it.each([
			['a negative node count', { ...transferPreflight(), moves: { nodes: -1 } }],
			['a node count that is not whole', { ...transferPreflight(), moves: { nodes: 1.5 } }],
			['no credential list', { ...transferPreflight(), credentials: undefined }],
			['no sub-workflow list', { ...transferPreflight(), subWorkflowCalls: null }],
		])('rejects a response with %s', async (_label, response) => {
			vi.mocked(makeRestApiRequest).mockResolvedValue(response);

			await expect(
				fetchTransferPreflight(context, 'link-1', { workflowId: 'wf-1' }),
			).rejects.toThrow();
		});
	});

	describe('moveWorkflow', () => {
		it('sends the move with its choices to the transfer route of the link', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValue(pushResult());
			const payload = { workflowId: 'wf-1', publish: true, deactivateLocal: false };

			await expect(moveWorkflow(context, 'link-1', payload)).resolves.toEqual(pushResult());
			expect(makeRestApiRequest).toHaveBeenCalledWith(
				context,
				'POST',
				'/linked-instances/link-1/transfer',
				payload,
			);
		});

		it('keeps a remote URL that is not http(s), because the move worked', async () => {
			const result = pushResult({ remoteUrl: 'ftp://acme.example.test/workflow/1' });
			vi.mocked(makeRestApiRequest).mockResolvedValue(result);

			await expect(moveWorkflow(context, 'link-1', { workflowId: 'wf-1' })).resolves.toEqual(
				result,
			);
		});

		it('drops fields that the result does not name', async () => {
			const extra = fakeToken();
			vi.mocked(makeRestApiRequest).mockResolvedValue({ ...pushResult(), token: extra });

			const result = await moveWorkflow(context, 'link-1', { workflowId: 'wf-1' });

			expect(result).toEqual(pushResult());
		});

		it.each([
			['no warnings list', { ...pushResult(), warnings: undefined }],
			['a credential without an id', { ...pushResult(), credentialsNeedingSetup: [{ name: 'A' }] }],
			['a text in place of a flag', { ...pushResult(), localDeactivated: 'yes' }],
		])('rejects a result with %s', async (_label, response) => {
			vi.mocked(makeRestApiRequest).mockResolvedValue(response);

			await expect(moveWorkflow(context, 'link-1', { workflowId: 'wf-1' })).rejects.toThrow();
		});
	});
});
