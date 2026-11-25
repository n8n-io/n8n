import type { Request, Response } from 'express';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { BadRequestError, ForbiddenError } from '@n8n/errors';

import type {
	ResolvedSubWorkflow,
	ResolveErrorWorkflowRequest,
	ResolveSubWorkflowRequest,
} from '../engine-workflow-resolve.contract';
import { EngineWorkflowResolveController } from '../engine-workflow-resolve.controller';
import type { EngineWorkflowResolveService } from '../engine-workflow-resolve.service';

const subWorkflowRequest: ResolveSubWorkflowRequest = {
	kind: 'sub-workflow',
	workflowId: 'wf-sub',
	executionId: '01a03900-0000-7000-8000-000000000001',
	parent: {
		executionId: '01a03900-0000-7000-8000-00000000000a',
		workflowId: 'wf-parent',
		mode: 'manual',
		node: { id: 'call', name: 'Call', type: 'n8n-nodes-base.executeWorkflow', typeVersion: 1 },
	},
	context: { userId: 'user-1', projectId: 'project-1' },
	items: [{ json: { a: 1 } }],
};

const errorWorkflowRequest: ResolveErrorWorkflowRequest = {
	kind: 'error-workflow',
	executionId: '01a03900-0000-7000-8000-000000000002',
	source: {
		executionId: '01a03900-0000-7000-8000-00000000000a',
		workflowId: 'failed-wf',
		workflow: { id: 'failed-wf', nodes: [] },
		hostMode: 'trigger',
		hasParent: false,
		failedStep: {
			nodeName: 'Code',
			error: { name: 'Error', message: 'boom', details: { description: 'why' } },
		},
	},
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

describe('EngineWorkflowResolveController', () => {
	let service: EngineWorkflowResolveService;
	let controller: EngineWorkflowResolveController;

	const newResponse = () => {
		const res = { status: vi.fn(), json: vi.fn() };
		res.status.mockReturnValue(res);
		return res as unknown as Mocked<Response>;
	};

	const newRequest = (body: unknown) => ({ body }) as unknown as Request;

	beforeEach(() => {
		service = mock<EngineWorkflowResolveService>();
		controller = new EngineWorkflowResolveController(service);
		vi.mocked(service.resolve).mockResolvedValue(resolved);
	});

	// The happy path of a sub-workflow runs through the real server in the integration test.
	it.each([
		['a body without a kind', { ...subWorkflowRequest, kind: undefined }],
		['a body with an unknown kind', { ...subWorkflowRequest, kind: 'other' }],
		['a non-object body', 'nope'],
	])('rejects %s with 400 before asking the service', async (_name, body) => {
		await expect(controller.resolveWorkflow(newRequest(body), newResponse())).rejects.toThrow(
			BadRequestError,
		);
		expect(service.resolve).not.toHaveBeenCalled();
	});

	describe('a sub-workflow request', () => {
		const parent = subWorkflowRequest.parent;

		it.each([
			['a body without a workflow id', { ...subWorkflowRequest, workflowId: undefined }],
			[
				'a body whose execution id is not a uuid',
				{ ...subWorkflowRequest, executionId: 'sub-execution' },
			],
			[
				'a body whose parent execution id is not a uuid',
				{ ...subWorkflowRequest, parent: { ...parent, executionId: 'exec-1' } },
			],
			[
				'a body without the calling node',
				{ ...subWorkflowRequest, parent: { ...parent, node: undefined } },
			],
			[
				'a body with an unknown mode',
				{ ...subWorkflowRequest, parent: { ...parent, mode: 'nope' } },
			],
			['a body whose items are not objects', { ...subWorkflowRequest, items: [1] }],
			['a body whose items have no json', { ...subWorkflowRequest, items: [{ binary: {} }] }],
			[
				'a body whose items carry binary bytes instead of a stored reference',
				{
					...subWorkflowRequest,
					items: [{ json: {}, binary: { data: { data: 'aGk=', mimeType: 'text/plain' } } }],
				},
			],
		])('rejects %s with 400 before asking the service', async (_name, body) => {
			await expect(controller.resolveWorkflow(newRequest(body), newResponse())).rejects.toThrow(
				BadRequestError,
			);
			expect(service.resolve).not.toHaveBeenCalled();
		});

		it('accepts an item whose binary is a stored reference', async () => {
			const binary = { data: { id: 'filesystem-v2:abc', data: '', mimeType: 'text/plain' } };
			const body = { ...subWorkflowRequest, items: [{ json: {}, binary }] };

			await controller.resolveWorkflow(newRequest(body), newResponse());

			expect(service.resolve).toHaveBeenCalledExactlyOnceWith(body);
		});
	});

	describe('an error workflow request', () => {
		const source = errorWorkflowRequest.source;

		it('answers the resolved workflow with 200', async () => {
			const res = newResponse();

			await controller.resolveWorkflow(newRequest(errorWorkflowRequest), res);

			expect(service.resolve).toHaveBeenCalledExactlyOnceWith(errorWorkflowRequest);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(resolved);
		});

		it('accepts a failed execution without a failed step', async () => {
			const body = {
				...errorWorkflowRequest,
				source: { ...source, failedStep: undefined },
			};

			await controller.resolveWorkflow(newRequest(body), newResponse());

			expect(service.resolve).toHaveBeenCalledOnce();
		});

		it.each([
			[
				'a body whose execution id is not a uuid',
				{ ...errorWorkflowRequest, executionId: 'exec-1' },
			],
			[
				'a body whose source execution id is not a uuid',
				{ ...errorWorkflowRequest, source: { ...source, executionId: 'exec-1' } },
			],
			[
				'a body without a source workflow id',
				{ ...errorWorkflowRequest, source: { ...source, workflowId: undefined } },
			],
			[
				'a body with an unknown host mode',
				{ ...errorWorkflowRequest, source: { ...source, hostMode: 'nope' } },
			],
			[
				'a body whose workflow is not an object',
				{ ...errorWorkflowRequest, source: { ...source, workflow: 'wf' } },
			],
			[
				'a body without the parent flag',
				{ ...errorWorkflowRequest, source: { ...source, hasParent: undefined } },
			],
			[
				'a body whose failed step has no error message',
				{
					...errorWorkflowRequest,
					source: { ...source, failedStep: { nodeName: 'Code', error: { name: 'Error' } } },
				},
			],
		])('rejects %s with 400 before asking the service', async (_name, body) => {
			await expect(controller.resolveWorkflow(newRequest(body), newResponse())).rejects.toThrow(
				BadRequestError,
			);
			expect(service.resolve).not.toHaveBeenCalled();
		});
	});

	it('passes a service error on without writing a response', async () => {
		const error = new ForbiddenError('The sub-workflow limits which workflows can call it');
		vi.mocked(service.resolve).mockRejectedValue(error);
		const res = newResponse();

		await expect(controller.resolveWorkflow(newRequest(subWorkflowRequest), res)).rejects.toBe(
			error,
		);
		expect(res.status).not.toHaveBeenCalled();
		expect(res.json).not.toHaveBeenCalled();
	});
});
