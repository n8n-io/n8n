import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { fetchWorkflowProvenance } from '../provenance.api';

const { makeRestApiRequest } = vi.hoisted(() => ({ makeRestApiRequest: vi.fn() }));

vi.mock('@n8n/rest-api-client', () => ({ makeRestApiRequest }));

const context: IRestApiContext = { baseUrl: 'http://localhost:5678/rest', pushRef: 'push-ref' };

const record = {
	workflowId: 'wf-1',
	threadId: 'thread-1',
	createdAt: '2026-10-01T09:30:00.000Z',
	canOpenThread: false,
};

describe('fetchWorkflowProvenance', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('sends a GET request for the workflow', async () => {
		makeRestApiRequest.mockResolvedValue({ provenance: null });

		await fetchWorkflowProvenance(context, 'wf-1');

		expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'GET', '/instance-ai/provenance/wf-1');
	});

	it('encodes the workflow id as one path segment', async () => {
		makeRestApiRequest.mockResolvedValue({ provenance: null });

		await fetchWorkflowProvenance(context, 'a/b?c');

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'GET',
			'/instance-ai/provenance/a%2Fb%3Fc',
		);
	});

	it('returns the record of a workflow the Assistant built', async () => {
		makeRestApiRequest.mockResolvedValue({ provenance: record });

		await expect(fetchWorkflowProvenance(context, 'wf-1')).resolves.toEqual(record);
	});

	it('returns null when the Assistant did not build the workflow', async () => {
		makeRestApiRequest.mockResolvedValue({ provenance: null });

		await expect(fetchWorkflowProvenance(context, 'wf-1')).resolves.toBeNull();
	});

	it('drops fields that the badge does not use', async () => {
		makeRestApiRequest.mockResolvedValue({ provenance: { ...record, extra: 'ignored' } });

		await expect(fetchWorkflowProvenance(context, 'wf-1')).resolves.toEqual(record);
	});

	it.each([
		['no body', undefined],
		['no provenance field', {}],
		['a record without a thread id', { provenance: { ...record, threadId: undefined } }],
		['a record with an empty thread id', { provenance: { ...record, threadId: '' } }],
		['a record without the access flag', { provenance: { ...record, canOpenThread: 'yes' } }],
	])('rejects a response with %s', async (_case, response) => {
		makeRestApiRequest.mockResolvedValue(response);

		await expect(fetchWorkflowProvenance(context, 'wf-1')).rejects.toThrow();
	});

	it('passes request errors on to the caller', async () => {
		const error = new Error('offline');
		makeRestApiRequest.mockRejectedValue(error);

		await expect(fetchWorkflowProvenance(context, 'wf-1')).rejects.toBe(error);
	});
});
