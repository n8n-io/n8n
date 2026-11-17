import { ExecutionRetentionService } from '../execution-retention.service';

describe('ExecutionRetentionService', () => {
	it('combines module policies and removes duplicate execution IDs', async () => {
		const retention = new ExecutionRetentionService();
		retention.register('first', async () => ['1', '2']);
		retention.register('second', async () => ['2', '3']);
		expect(await retention.getRetainedExecutionIds()).toEqual(['1', '2', '3']);
		await expect(retention.assertCanDelete(['4'])).resolves.toBeUndefined();
		await expect(retention.assertCanDelete(['4', '2'])).rejects.toThrow('pending work');
	});
	it('asks the caller to match retained IDs only when some exist', async () => {
		const retention = new ExecutionRetentionService();
		const isAnyRetained = vi.fn().mockResolvedValue(true);
		await expect(retention.assertNoneRetained(isAnyRetained)).resolves.toBeUndefined();
		expect(isAnyRetained).not.toHaveBeenCalled();

		retention.register('consumer', async () => ['1']);
		await expect(retention.assertNoneRetained(isAnyRetained)).rejects.toThrow('pending work');
		expect(isAnyRetained).toHaveBeenCalledWith(['1']);
		isAnyRetained.mockResolvedValue(false);
		await expect(retention.assertNoneRetained(isAnyRetained)).resolves.toBeUndefined();
	});
	it('does not permit deletion when a policy cannot be loaded', async () => {
		const retention = new ExecutionRetentionService();
		retention.register('unavailable', async () => {
			throw new Error('Unavailable');
		});
		await expect(retention.assertCanDelete(['1'])).rejects.toThrow('Unavailable');
	});
});
