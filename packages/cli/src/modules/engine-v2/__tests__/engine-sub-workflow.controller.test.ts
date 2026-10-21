import type { Request, Response } from 'express';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@n8n/errors';

import type {
	ResolveSubWorkflowRequest,
	ResolveSubWorkflowResponse,
} from '../engine-sub-workflow.contract';
import { EngineSubWorkflowController } from '../engine-sub-workflow.controller';
import type { EngineSubWorkflowService } from '../engine-sub-workflow.service';

const resolveRequest: ResolveSubWorkflowRequest = {
	workflowId: 'wf-child',
	executionId: '01a03900-0000-7000-8000-000000000001',
	parent: { executionId: 'exec-1', workflowId: 'wf-parent', mode: 'manual' },
	context: { userId: 'user-1', projectId: 'project-1' },
	items: [{ json: { a: 1 } }],
};

const resolved: ResolveSubWorkflowResponse = {
	workflowId: 'wf-child',
	graph: { nodes: [{ id: 't', name: 'Trigger', type: 'trigger' }], edges: [] },
	workflow: { id: 'wf-child' },
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

	it('answers 200 with the resolved sub-workflow', async () => {
		const res = newResponse();

		await controller.resolveSubWorkflow(newRequest(), res);

		expect(res.status).toHaveBeenCalledExactlyOnceWith(200);
		expect(res.json).toHaveBeenCalledExactlyOnceWith(resolved);
	});

	it('hands the validated body to the service', async () => {
		await controller.resolveSubWorkflow(newRequest(), newResponse());

		expect(service.resolve).toHaveBeenCalledExactlyOnceWith(resolveRequest);
	});

	it.each([
		['a body without a workflow id', { ...resolveRequest, workflowId: undefined }],
		['a body whose execution id is not a uuid', { ...resolveRequest, executionId: 'child' }],
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
});
