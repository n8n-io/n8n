import { WorkerPoolsService } from '@/scaling/worker-pools.service';

describe('WorkerPoolsService', () => {
	const service = new WorkerPoolsService();

	describe('getAvailablePools', () => {
		it('should return default pool', () => {
			expect(service.getAvailablePools()).toEqual(['default']);
		});
	});
});
