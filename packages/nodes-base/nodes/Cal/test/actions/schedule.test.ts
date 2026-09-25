import { NodeOperationError } from 'n8n-workflow';

import * as create from '../../actions/schedule/create.operation';
import * as del from '../../actions/schedule/delete.operation';
import * as get from '../../actions/schedule/get.operation';
import * as getMany from '../../actions/schedule/getMany.operation';
import * as update from '../../actions/schedule/update.operation';
import { calApiRequestV2Versioned } from '../../GenericFunctions';
import { mockExecuteCtx } from '../shared';

vi.mock('../../GenericFunctions', async (importActual) => ({
	...(await importActual()),
	calApiRequestV2Versioned: vi.fn(),
}));

const apiRequest = vi.mocked(calApiRequestV2Versioned);

describe('Cal.com schedule operations', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('create', () => {
		it('sends the required fields and pins the schedules API version', async () => {
			apiRequest.mockResolvedValue({ data: { id: 1 } });
			const ctx = mockExecuteCtx({
				name: 'Working hours',
				timeZone: 'Europe/Berlin',
				isDefault: true,
			});

			const result = await create.execute.call(ctx, 0);

			expect(apiRequest).toHaveBeenCalledWith('POST', '/schedules', '2024-06-11', {
				name: 'Working hours',
				timeZone: 'Europe/Berlin',
				isDefault: true,
			});
			expect(result).toEqual({ id: 1 });
		});

		it('maps the availability and override collections into arrays', async () => {
			apiRequest.mockResolvedValue({ data: {} });
			const ctx = mockExecuteCtx({
				name: 'Working hours',
				timeZone: 'Europe/Berlin',
				availability: {
					rule: [
						{ days: ['Monday', 'Tuesday'], startTime: '08:00', endTime: '16:00' },
						{ days: [], startTime: '10:00', endTime: '12:00' },
					],
				},
				overrides: {
					override: [
						{ date: '2033-12-24', startTime: '09:00', endTime: '12:00' },
						{ date: '', startTime: '09:00', endTime: '12:00' },
					],
				},
			});

			await create.execute.call(ctx, 0);

			const [, , , body] = apiRequest.mock.calls[0];
			expect(body).toMatchObject({
				availability: [{ days: ['Monday', 'Tuesday'], startTime: '08:00', endTime: '16:00' }],
				overrides: [{ date: '2033-12-24', startTime: '09:00', endTime: '12:00' }],
			});
		});

		it('leaves the availability out so Cal.com uses its own default', async () => {
			apiRequest.mockResolvedValue({ data: {} });
			const ctx = mockExecuteCtx({ name: 'Working hours', timeZone: 'UTC' });

			await create.execute.call(ctx, 0);

			const [, , , body] = apiRequest.mock.calls[0];
			expect(body).not.toHaveProperty('availability');
			expect(body).not.toHaveProperty('overrides');
		});
	});

	describe('get', () => {
		it('reads one schedule by ID', async () => {
			apiRequest.mockResolvedValue({ data: { id: 42 } });
			const ctx = mockExecuteCtx({ schedule: { mode: 'id', value: '42' } });

			const result = await get.execute.call(ctx, 0);

			expect(apiRequest).toHaveBeenCalledWith('GET', '/schedules/42', '2024-06-11');
			expect(result).toEqual({ id: 42 });
		});
	});

	describe('getMany', () => {
		it('cuts the result down to the limit', async () => {
			apiRequest.mockResolvedValue({ data: [{ id: 1 }, { id: 2 }, { id: 3 }] });
			const ctx = mockExecuteCtx({ returnAll: false, limit: 2 });

			const result = await getMany.execute.call(ctx, 0);

			expect(apiRequest).toHaveBeenCalledWith('GET', '/schedules', '2024-06-11');
			expect(result).toEqual([{ id: 1 }, { id: 2 }]);
		});
	});

	describe('update', () => {
		it('sends only the fields that are set', async () => {
			apiRequest.mockResolvedValue({ data: { id: 42 } });
			const ctx = mockExecuteCtx({
				schedule: { mode: 'id', value: '42' },
				updateFields: { name: 'New hours', isDefault: false },
			});

			const result = await update.execute.call(ctx, 0);

			expect(apiRequest).toHaveBeenCalledWith('PATCH', '/schedules/42', '2024-06-11', {
				name: 'New hours',
				isDefault: false,
			});
			expect(result).toEqual({ id: 42 });
		});

		it('reports an empty update instead of sending one', async () => {
			const ctx = mockExecuteCtx({ schedule: { mode: 'id', value: '42' }, updateFields: {} });

			await expect(update.execute.call(ctx, 0)).rejects.toThrow(NodeOperationError);
			expect(apiRequest).not.toHaveBeenCalled();
		});
	});

	describe('delete', () => {
		it('reports the deleted ID, since the API answers with a status only', async () => {
			apiRequest.mockResolvedValue({ status: 'success' });
			const ctx = mockExecuteCtx({ schedule: { mode: 'id', value: '42' } });

			const result = await del.execute.call(ctx, 0);

			expect(apiRequest).toHaveBeenCalledWith('DELETE', '/schedules/42', '2024-06-11');
			expect(result).toEqual({ success: true, scheduleId: 42 });
		});

		it('rejects a schedule ID that is not a number', async () => {
			const ctx = mockExecuteCtx({ schedule: { mode: 'id', value: 'working-hours' } });

			await expect(del.execute.call(ctx, 0)).rejects.toThrow(NodeOperationError);
			expect(apiRequest).not.toHaveBeenCalled();
		});
	});
});
