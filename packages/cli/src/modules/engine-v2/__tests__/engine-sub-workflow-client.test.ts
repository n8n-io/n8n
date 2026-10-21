import type { HttpRequestClient } from '@n8n/backend-network';
import type { ActionScope } from '@n8n/engine';
import { OperationalError, UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { EngineControlPlaneTransport } from '../engine-control-plane-transport';
import { EngineSubWorkflowClient } from '../engine-sub-workflow-client';
import type {
	ResolveSubWorkflowRequest,
	ResolveSubWorkflowResponse,
} from '../engine-sub-workflow.contract';

const request: ResolveSubWorkflowRequest = {
	workflowId: 'wf-child',
	executionId: '01a03900-0000-7000-8000-000000000001',
	parent: { executionId: 'exec-1', workflowId: 'wf-parent', mode: 'manual' },
	context: { userId: 'user-1' },
	items: [{ json: { a: 1 } }],
};

const resolved: ResolveSubWorkflowResponse = {
	workflowId: 'wf-child',
	graph: { nodes: [{ id: 't', name: 'Trigger', type: 'trigger' }], edges: [] },
	workflow: { id: 'wf-child' },
	triggerOutputs: [[{ json: { a: 1 } }]],
	returnLastRunOnly: false,
};

describe('EngineSubWorkflowClient', () => {
	let http: HttpRequestClient;
	let requestedScope: ActionScope | undefined;
	let client: EngineSubWorkflowClient;
	let signal: AbortSignal;

	const respondWith = (statusCode: number, body: unknown = resolved) => {
		vi.mocked(http.request).mockResolvedValue({ statusCode, body, headers: {} });
	};

	beforeEach(() => {
		http = mock<HttpRequestClient>();
		const transport = mock<EngineControlPlaneTransport>({
			forScope: vi.fn((scope: ActionScope) => {
				requestedScope = scope;
				return http;
			}),
		});
		client = new EngineSubWorkflowClient(transport);
		signal = new AbortController().signal;
	});

	it('asks the transport for a client scoped to sub-workflow resolution', () => {
		expect(requestedScope).toBe('sub-workflows:resolve');
	});

	it('posts the request as the body of the sub-workflow resolve endpoint, without following redirects', async () => {
		respondWith(200);

		await client.resolve(request, signal);

		expect(http.request).toHaveBeenCalledWith(
			expect.objectContaining({
				url: '/internal/sub-workflows/resolve',
				method: 'POST',
				body: request,
				json: true,
				disableFollowRedirect: true,
				abortSignal: signal,
			}),
		);
	});

	it('returns the resolved sub-workflow of a 200', async () => {
		respondWith(200);

		await expect(client.resolve(request, signal)).resolves.toEqual(resolved);
	});

	it('reports a refusal to the node with the message the control plane gave', async () => {
		respondWith(403, { code: 403, message: 'The sub-workflow limits which workflows can call it' });

		const refusal = client.resolve(request, signal);

		await expect(refusal).rejects.toThrow(UserError);
		await expect(refusal).rejects.toThrow('The sub-workflow limits which workflows can call it');
	});

	it('reports a refusal without a message by its status', async () => {
		respondWith(404, {});

		await expect(client.resolve(request, signal)).rejects.toThrow(/404/);
	});

	it('reports a rejected token as operational, since the planes disagree and not the caller', async () => {
		respondWith(401, { code: 401, message: 'Unauthorized' });

		await expect(client.resolve(request, signal)).rejects.toThrow(OperationalError);
	});

	it('reports a server failure as operational', async () => {
		respondWith(500, { message: 'boom' });

		await expect(client.resolve(request, signal)).rejects.toThrow(OperationalError);
	});

	it('rejects a malformed 200 body', async () => {
		respondWith(200, { workflowId: 'wf-child' });

		await expect(client.resolve(request, signal)).rejects.toThrow(OperationalError);
	});
});
