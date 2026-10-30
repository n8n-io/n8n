import type { Request, Response } from 'express';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { BadRequestError, ForbiddenError } from '@n8n/errors';

import type { DataTableCallRequest } from '../engine-data-tables.contract';
import { EngineDataTablesController } from '../engine-data-tables.controller';
import type { EngineDataTablesService } from '../engine-data-tables.service';

const callRequest: DataTableCallRequest = {
	execution: { executionId: 'exec-1', workflowId: 'wf-1' },
	consumer: { nodeType: 'n8n-nodes-base.dataTable' },
	call: { kind: 'getColumns', dataTableId: 'dt-1' },
};

const columns = [{ id: 'col-1', name: 'total', type: 'number', index: 0, dataTableId: 'dt-1' }];

describe('EngineDataTablesController', () => {
	let dataTablesService: EngineDataTablesService;
	let controller: EngineDataTablesController;

	const newResponse = () => {
		const res = { status: vi.fn(), json: vi.fn() };
		res.status.mockReturnValue(res);
		return res as unknown as Mocked<Response>;
	};

	const newRequest = (body: unknown = callRequest) => ({ body }) as unknown as Request;

	beforeEach(() => {
		dataTablesService = mock<EngineDataTablesService>();
		controller = new EngineDataTablesController(dataTablesService);

		vi.mocked(dataTablesService.call).mockResolvedValue({ data: columns });
	});

	describe('call', () => {
		it('answers 200 with the result', async () => {
			const res = newResponse();

			await controller.call(newRequest(), res);

			expect(res.status).toHaveBeenCalledExactlyOnceWith(200);
			expect(res.json).toHaveBeenCalledExactlyOnceWith({ data: columns });
		});

		it('hands the validated body to the service', async () => {
			await controller.call(newRequest(), newResponse());

			expect(dataTablesService.call).toHaveBeenCalledExactlyOnceWith(callRequest);
		});

		it('answers 422 with the refusal, so the data plane can raise the matching v1 error', async () => {
			const error = { kind: 'user' as const, message: 'Validation error with data table request' };
			vi.mocked(dataTablesService.call).mockResolvedValue({ error });
			const res = newResponse();

			await controller.call(newRequest(), res);

			expect(res.status).toHaveBeenCalledExactlyOnceWith(422);
			expect(res.json).toHaveBeenCalledExactlyOnceWith({ error });
		});

		it.each([
			['a body without a call', { ...callRequest, call: undefined }],
			['a body with an unknown kind', { ...callRequest, call: { kind: 'dropEverything' } }],
			['a body that is not a request at all', { hello: 'world' }],
		])('rejects %s without a reason', async (_label, body) => {
			const res = newResponse();

			await expect(controller.call(newRequest(body), res)).rejects.toThrow(BadRequestError);
			expect(res.status).not.toHaveBeenCalled();
			// Unvalidated input must never reach the access check or the store.
			expect(dataTablesService.call).not.toHaveBeenCalled();
		});

		it('passes a service error on without writing a response', async () => {
			const error = new ForbiddenError('Data tables are not available to this node type');
			vi.mocked(dataTablesService.call).mockRejectedValue(error);
			const res = newResponse();

			await expect(controller.call(newRequest(), res)).rejects.toBe(error);
			expect(res.status).not.toHaveBeenCalled();
		});
	});
});
