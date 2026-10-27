import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import * as booking from '../../actions/booking';
import { router } from '../../actions/router';
import * as schedule from '../../actions/schedule';
import { mockExecuteCtx, testNode } from '../shared';

describe('Cal.com router', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('dispatches to the operation of the chosen resource', async () => {
		const execute = vi.spyOn(booking.get, 'execute').mockResolvedValue({ uid: 'bkg_1' });
		const ctx = mockExecuteCtx({ resource: 'booking', operation: 'get' });

		const result = await router.call(ctx);

		expect(execute).toHaveBeenCalledWith(0);
		expect(result).toEqual([[{ json: { uid: 'bkg_1' }, pairedItem: { item: 0 } }]]);
	});

	it('dispatches the delete operation that carries a reserved name', async () => {
		const execute = vi.spyOn(schedule.delete, 'execute').mockResolvedValue({ success: true });
		const ctx = mockExecuteCtx({ resource: 'schedule', operation: 'delete' });

		await router.call(ctx);

		expect(execute).toHaveBeenCalledTimes(1);
	});

	it('spreads a list answer over one item for each record', async () => {
		vi.spyOn(booking.getMany, 'execute').mockResolvedValue([{ uid: 'bkg_1' }, { uid: 'bkg_2' }]);
		const ctx = mockExecuteCtx({ resource: 'booking', operation: 'getMany' });

		const [items] = await router.call(ctx);

		expect(items).toHaveLength(2);
		expect(items.every((item) => item.pairedItem)).toBe(true);
	});

	it('runs the operation once for each input item', async () => {
		const execute = vi.spyOn(booking.get, 'execute').mockResolvedValue({ uid: 'bkg_1' });
		const ctx = mockExecuteCtx({ resource: 'booking', operation: 'get' }, 3);

		const [items] = await router.call(ctx);

		expect(execute).toHaveBeenCalledTimes(3);
		expect(items.map((item) => item.pairedItem)).toEqual([{ item: 0 }, { item: 1 }, { item: 2 }]);
	});

	it('rejects a resource and operation pair that has no handler', async () => {
		const ctx = mockExecuteCtx({ resource: 'booking', operation: 'explode' });

		await expect(router.call(ctx)).rejects.toThrow(NodeOperationError);
	});

	it('passes an API error on when continueOnFail is off', async () => {
		vi.spyOn(booking.get, 'execute').mockRejectedValue(
			new NodeApiError(testNode, { message: 'Not found' }),
		);
		const ctx = mockExecuteCtx({ resource: 'booking', operation: 'get' });

		await expect(router.call(ctx)).rejects.toThrow(NodeApiError);
	});

	it('collects the error for the failing item when continueOnFail is on', async () => {
		vi.spyOn(booking.get, 'execute')
			.mockRejectedValueOnce(new Error('Not found'))
			.mockResolvedValueOnce({ uid: 'bkg_2' });
		const ctx = mockExecuteCtx({ resource: 'booking', operation: 'get' }, 2);
		ctx.continueOnFail.mockReturnValue(true);

		const [items] = await router.call(ctx);

		expect(items).toEqual([
			{ json: { error: 'Not found' }, pairedItem: { item: 0 } },
			{ json: { uid: 'bkg_2' }, pairedItem: { item: 1 } },
		]);
	});
});
