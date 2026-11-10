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
	it('does not permit deletion when a policy cannot be loaded', async () => {
		const retention = new ExecutionRetentionService();
		retention.register('unavailable', async () => {
			throw new Error('Unavailable');
		});
		await expect(retention.assertCanDelete(['1'])).rejects.toThrow('Unavailable');
	});
});
