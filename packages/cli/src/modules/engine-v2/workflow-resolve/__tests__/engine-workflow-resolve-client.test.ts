import type { HttpRequestClient } from '@n8n/backend-network';
import { OperationalError, UserError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { EngineControlPlaneTransport } from '../../control-plane/engine-control-plane-transport';
import { EngineWorkflowResolveClient } from '../engine-workflow-resolve-client';
import type {
	ResolvedErrorWorkflow,
	ResolvedSubWorkflow,
	ResolveErrorWorkflowRequest,
	ResolveSubWorkflowRequest,
} from '../engine-workflow-resolve.contract';

const request: ResolveSubWorkflowRequest = {
	kind: 'sub-workflow',
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

const resolved: ResolvedSubWorkflow = {
	kind: 'sub-workflow',
	workflowId: 'wf-sub',
	graph: { nodes: [{ id: 't', name: 'Trigger', type: 'trigger' }], edges: [] },
	workflow: { id: 'wf-sub' },
	triggerOutputs: [[{ json: { a: 1 } }]],
	returnLastRunOnly: false,
	resolveErrorWorkflowOnFailure: false,
};

const source: ResolveErrorWorkflowRequest['source'] = {
	executionId: '01a03900-0000-7000-8000-00000000000a',
	workflowId: 'failed-wf',
	workflow: { id: 'failed-wf', nodes: [] },
	hostMode: 'trigger',
	hasParent: false,
};

const errorRequest: ResolveErrorWorkflowRequest = {
	kind: 'error-workflow',
	executionId: '01a03900-0000-7000-8000-000000000002',
	source,
};

const resolvedErrorWorkflow: ResolvedErrorWorkflow = {
	kind: 'error-workflow',
	workflowId: 'err-wf',
	graph: { nodes: [{ id: 't', name: 'Error Trigger', type: 'trigger' }], edges: [] },
	workflow: { id: 'err-wf' },
	triggerOutputs: [[{ json: { execution: { id: 'exec' } } }]],
	resolveErrorWorkflowOnFailure: false,
	projectId: 'project-1',
};

describe('EngineWorkflowResolveClient', () => {
	let http: HttpRequestClient;
	let transport: EngineControlPlaneTransport;
	let client: EngineWorkflowResolveClient;
	let signal: AbortSignal;

	const respondWith = (statusCode: number, body: unknown = resolved) => {
		vi.mocked(http.request).mockResolvedValue({ statusCode, body, headers: {} });
	};

	beforeEach(() => {
		http = mock<HttpRequestClient>();
		transport = mock<EngineControlPlaneTransport>({ forScope: vi.fn(() => http) });
		client = new EngineWorkflowResolveClient(transport);
		signal = new AbortController().signal;
	});

	it('asks for a token with the workflow resolve scope', () => {
		expect(transport.forScope).toHaveBeenCalledExactlyOnceWith('workflows:resolve');
	});

	it('posts the request to the resolve endpoint without following redirects, and returns the resolved workflow', async () => {
		respondWith(200);

		await expect(client.resolve(request, signal)).resolves.toEqual(resolved);

		expect(http.request).toHaveBeenCalledWith(
			expect.objectContaining({
				url: '/internal/workflows/resolve',
				method: 'POST',
				body: request,
				json: true,
				disableFollowRedirect: true,
				abortSignal: signal,
			}),
		);
	});

	it('returns a resolved error workflow for an error workflow request', async () => {
		respondWith(200, resolvedErrorWorkflow);

		await expect(client.resolve(errorRequest, signal)).resolves.toEqual(resolvedErrorWorkflow);
	});

	it('reports a refusal with the message the control plane gave', async () => {
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

	it.each([401, 408, 429])(
		'reports a %i as operational, because a later try can succeed',
		async (statusCode) => {
			respondWith(statusCode, { code: statusCode, message: 'Try again' });

			await expect(client.resolve(request, signal)).rejects.toThrow(OperationalError);
		},
	);

	it('reports a server failure as operational', async () => {
		respondWith(500, { message: 'boom' });

		await expect(client.resolve(request, signal)).rejects.toThrow(OperationalError);
	});

	it('reports a redirect as operational, since the control plane is misconfigured', async () => {
		respondWith(302, {});

		await expect(client.resolve(request, signal)).rejects.toThrow(OperationalError);
	});

	it.each([
		['a body without a kind', { ...resolved, kind: undefined }],
		['a body of the other kind', resolvedErrorWorkflow],
		[
			'a body without resolveErrorWorkflowOnFailure',
			{ ...resolved, resolveErrorWorkflowOnFailure: undefined },
		],
		[
			'a body whose graph edges lack a slot index',
			{ ...resolved, graph: { ...resolved.graph, edges: [{ from: 't', to: 's' }] } },
		],
		[
			'a sub-workflow body without returnLastRunOnly',
			{ ...resolved, returnLastRunOnly: undefined },
		],
	])('rejects a 200 body with %s', async (_name, body) => {
		respondWith(200, body);

		await expect(client.resolve(request, signal)).rejects.toThrow(/malformed/);
	});

	it('rejects a 200 error workflow body without a projectId', async () => {
		respondWith(200, { ...resolvedErrorWorkflow, projectId: undefined });

		await expect(client.resolve(errorRequest, signal)).rejects.toThrow(/malformed/);
	});
});
