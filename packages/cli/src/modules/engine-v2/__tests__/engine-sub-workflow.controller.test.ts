import type { Request, Response } from 'express';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { BadRequestError, ForbiddenError } from '@n8n/errors';

import type {
	ResolveSubWorkflowRequest,
	ResolveSubWorkflowResponse,
} from '../engine-sub-workflow.contract';
import { EngineSubWorkflowController } from '../engine-sub-workflow.controller';
import type { EngineSubWorkflowService } from '../engine-sub-workflow.service';

const resolveRequest: ResolveSubWorkflowRequest = {
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

const resolved: ResolveSubWorkflowResponse = {
	workflowId: 'wf-sub',
	graph: { nodes: [{ id: 't', name: 'Trigger', type: 'trigger' }], edges: [] },
	workflow: { id: 'wf-sub' },
	triggerOutputs: [[{ json: { a: 1 } }]],
	returnLastRunOnly: false,
};

describe('EngineSubWorkflowController', () => {
	let service: EngineSubWorkflowService;
	let controller: EngineSubWorkflowController;

	const newResponse = () => {
		const res = { status: vi.fn(), json: vi.fn() };
		res.status.mockReturnValue(res);
		return res as unknown as Mocked<Response>;
	};

	const newRequest = (body: unknown = resolveRequest) => ({ body }) as unknown as Request;

	beforeEach(() => {
		service = mock<EngineSubWorkflowService>();
		controller = new EngineSubWorkflowController(service);
		vi.mocked(service.resolve).mockResolvedValue(resolved);
	});

	// The happy path runs through the real server in the integration test.
	it.each([
		['a body without a workflow id', { ...resolveRequest, workflowId: undefined }],
		[
			'a body whose execution id is not a uuid',
			{ ...resolveRequest, executionId: 'sub-execution' },
		],
		[
			'a body whose parent execution id is not a uuid',
			{ ...resolveRequest, parent: { ...resolveRequest.parent, executionId: 'exec-1' } },
		],
		[
			'a body without the calling node',
			{ ...resolveRequest, parent: { ...resolveRequest.parent, node: undefined } },
		],
		[
			'a body with an unknown mode',
			{ ...resolveRequest, parent: { ...resolveRequest.parent, mode: 'nope' } },
		],
		['a body whose items are not objects', { ...resolveRequest, items: [1] }],
		['a body whose items have no json', { ...resolveRequest, items: [{ binary: {} }] }],
		['a non-object body', 'nope'],
	])('rejects %s with 400 before asking the service', async (_name, body) => {
		await expect(controller.resolveSubWorkflow(newRequest(body), newResponse())).rejects.toThrow(
			BadRequestError,
		);
		expect(service.resolve).not.toHaveBeenCalled();
	});

	it('passes a service error on without writing a response', async () => {
		const error = new ForbiddenError('The sub-workflow limits which workflows can call it');
		vi.mocked(service.resolve).mockRejectedValue(error);
		const res = newResponse();

		await expect(controller.resolveSubWorkflow(newRequest(), res)).rejects.toBe(error);
		expect(res.status).not.toHaveBeenCalled();
		expect(res.json).not.toHaveBeenCalled();
	});
});
