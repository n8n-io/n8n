import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, NodeExecutionWithMetadata } from 'n8n-workflow';

import { Clockify } from '../Clockify.node';
import * as GenericFunctions from '../GenericFunctions';

describe('Clockify Node - Task Update', () => {
	let clockify: Clockify;
	let executeFunctions: ReturnType<typeof mockDeep<IExecuteFunctions>>;
	let clockifyApiRequestSpy: jest.SpyInstance;

	beforeEach(() => {
		clockify = new Clockify();
		executeFunctions = mockDeep<IExecuteFunctions>();
		clockifyApiRequestSpy = jest.spyOn(GenericFunctions, 'clockifyApiRequest');

		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctions.getNode.mockReturnValue({
			id: 'test-node-id',
			name: 'Clockify',
			type: 'n8n-nodes-base.clockify',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});
		executeFunctions.continueOnFail.mockReturnValue(false);
		executeFunctions.helpers.returnJsonArray.mockImplementation((data) =>
			(Array.isArray(data) ? data : [data]).map((item) => ({ json: item })),
		);
		executeFunctions.helpers.constructExecutionMetaData.mockImplementation(
			(data) => data as NodeExecutionWithMetadata[],
		);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	function setupParams(updateFields: Record<string, unknown>) {
		executeFunctions.getNodeParameter.mockImplementation(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(paramName: string, _itemIndex: number, fallback?: any): any => {
				const params: Record<string, unknown> = {
					resource: 'task',
					operation: 'update',
					workspaceId: 'ws-123',
					projectId: 'proj-456',
					taskId: 'task-789',
					updateFields,
				};
				return params[paramName] ?? fallback;
			},
		);
	}

	describe('when name is not in updateFields', () => {
		it('should fetch the current task name and preserve it in the update', async () => {
			setupParams({ status: 'DONE' });

			clockifyApiRequestSpy
				.mockResolvedValueOnce({ id: 'task-789', name: 'My Task' })
				.mockResolvedValueOnce({ id: 'task-789', name: 'My Task', status: 'DONE' });

			await clockify.execute.call(executeFunctions);

			expect(clockifyApiRequestSpy).toHaveBeenCalledTimes(2);
			expect(clockifyApiRequestSpy).toHaveBeenNthCalledWith(
				1,
				'GET',
				'/workspaces/ws-123/projects/proj-456/tasks/task-789',
				{},
				{},
			);
			expect(clockifyApiRequestSpy).toHaveBeenNthCalledWith(
				2,
				'PUT',
				'/workspaces/ws-123/projects/proj-456/tasks/task-789',
				expect.objectContaining({ name: 'My Task', status: 'DONE' }),
				{},
			);
		});
	});

	describe('when name is provided in updateFields', () => {
		it('should not make an extra API call to fetch the existing name', async () => {
			setupParams({ name: 'Renamed Task', status: 'ACTIVE' });

			clockifyApiRequestSpy.mockResolvedValueOnce({
				id: 'task-789',
				name: 'Renamed Task',
				status: 'ACTIVE',
			});

			await clockify.execute.call(executeFunctions);

			expect(clockifyApiRequestSpy).toHaveBeenCalledTimes(1);
			expect(clockifyApiRequestSpy).toHaveBeenCalledWith(
				'PUT',
				'/workspaces/ws-123/projects/proj-456/tasks/task-789',
				expect.objectContaining({ name: 'Renamed Task', status: 'ACTIVE' }),
				{},
			);
		});
	});

	describe('when estimate is provided in updateFields', () => {
		it('should convert the HH:MM estimate to ISO 8601 duration format', async () => {
			setupParams({ name: 'Task With Estimate', estimate: '02:30' });

			clockifyApiRequestSpy.mockResolvedValueOnce({
				id: 'task-789',
				name: 'Task With Estimate',
				estimate: 'PT02H30M',
			});

			await clockify.execute.call(executeFunctions);

			expect(clockifyApiRequestSpy).toHaveBeenCalledWith(
				'PUT',
				'/workspaces/ws-123/projects/proj-456/tasks/task-789',
				expect.objectContaining({ estimate: 'PT02H30M' }),
				{},
			);
		});

		it('should preserve the existing task name when only estimate is updated', async () => {
			setupParams({ estimate: '01:00' });

			clockifyApiRequestSpy
				.mockResolvedValueOnce({ id: 'task-789', name: 'Existing Name' })
				.mockResolvedValueOnce({ id: 'task-789', name: 'Existing Name', estimate: 'PT01H00M' });

			await clockify.execute.call(executeFunctions);

			expect(clockifyApiRequestSpy).toHaveBeenCalledTimes(2);
			expect(clockifyApiRequestSpy).toHaveBeenNthCalledWith(
				2,
				'PUT',
				'/workspaces/ws-123/projects/proj-456/tasks/task-789',
				expect.objectContaining({ name: 'Existing Name', estimate: 'PT01H00M' }),
				{},
			);
		});
	});
});
