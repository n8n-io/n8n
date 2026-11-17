import type { HttpRequestClient } from '@n8n/backend-network';
import { OperationalError, UserError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { EngineControlPlaneTransport } from '../engine-control-plane-transport';
import { EngineSubWorkflowClient } from '../engine-sub-workflow-client';
import type {
	ResolveSubWorkflowRequest,
	ResolveSubWorkflowResponse,
} from '../engine-sub-workflow.contract';

const request: ResolveSubWorkflowRequest = {
	workflowId: 'wf-sub',
	executionId: '01a03900-0000-7000-8000-000000000001',
	parent: {
		executionId: '01a03900-0000-7000-8000-00000000000a',
		workflowId: 'wf-parent',
		mode: 'manual',
		node: { id: 'call', name: 'Call', type: 'n8n-nodes-base.executeWorkflow', typeVersion: 1 },
	},
	context: { userId: 'user-1' },
	items: [{ json: { a: 1 } }],
};

const resolved: ResolveSubWorkflowResponse = {
	workflowId: 'wf-sub',
	graph: { nodes: [{ id: 't', name: 'Trigger', type: 'trigger' }], edges: [] },
	workflow: { id: 'wf-sub' },
	triggerOutputs: [[{ json: { a: 1 } }]],
	returnLastRunOnly: false,
};

describe('EngineSubWorkflowClient', () => {
	let http: HttpRequestClient;
	let client: EngineSubWorkflowClient;
	let signal: AbortSignal;

	const respondWith = (statusCode: number, body: unknown = resolved) => {
		vi.mocked(http.request).mockResolvedValue({ statusCode, body, headers: {} });
	};

	beforeEach(() => {
		http = mock<HttpRequestClient>();
		const transport = mock<EngineControlPlaneTransport>({ forScope: vi.fn(() => http) });
		client = new EngineSubWorkflowClient(transport);
		signal = new AbortController().signal;
	});

	it('posts the request to the resolve endpoint without following redirects, and returns the resolved sub-workflow', async () => {
		respondWith(200);

		await expect(client.resolve(request, signal)).resolves.toEqual(resolved);

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

	it('reports a refusal to the node with the message the control plane gave', async () => {
		respondWith(403, { code: 403, message: 'The sub-workflow limits which workflows can call it' });

		const refusal = client.resolve(request, signal);

		await expect(refusal).rejects.toThrow(UserError);
		await expect(refusal).rejects.toThrow('The sub-workflow limits which workflows can call it');
	});

	it('carries the hint of a refusal as the error description', async () => {
		respondWith(403, { code: 403, message: 'Denied', hint: 'Update the sub-workflow settings.' });

		await expect(client.resolve(request, signal)).rejects.toMatchObject({
			description: 'Update the sub-workflow settings.',
		});
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

	it('reports a redirect as operational, since the control plane is misconfigured', async () => {
		respondWith(302, {});

		await expect(client.resolve(request, signal)).rejects.toThrow(OperationalError);
	});

	it('rejects a malformed 200 body', async () => {
		respondWith(200, { workflowId: 'wf-sub' });

		await expect(client.resolve(request, signal)).rejects.toThrow(OperationalError);
	});

	it('rejects a 200 body whose graph edges lack a slot index', async () => {
		const edges = [{ from: 't', to: 's' }];
		respondWith(200, { ...resolved, graph: { ...resolved.graph, edges } });

		await expect(client.resolve(request, signal)).rejects.toThrow(/malformed/);
	});
});
