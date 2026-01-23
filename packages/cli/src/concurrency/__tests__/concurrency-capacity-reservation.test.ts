import { mock } from 'jest-mock-extended';

import type {
	CapacityTarget,
	ConcurrencyControlService,
} from '@/concurrency/concurrency-control.service';

import { ConcurrencyCapacityReservation } from '../concurrency-capacity-reservation';

describe('ConcurrencyCapacityReservation', () => {
	const concurrencyControlService = mock<ConcurrencyControlService>();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('reserve', () => {
		it('should call throttle on the concurrency control service', async () => {
			const reservation = new ConcurrencyCapacityReservation(concurrencyControlService);
			const capacityTarget: CapacityTarget = { executionId: '123', mode: 'webhook' };

			await reservation.reserve(capacityTarget);

			expect(concurrencyControlService.throttle).toHaveBeenCalledWith(capacityTarget);
			expect(concurrencyControlService.throttle).toHaveBeenCalledTimes(1);
		});

		it('should store the reservation after throttling', async () => {
			const reservation = new ConcurrencyCapacityReservation(concurrencyControlService);
			const capacityTarget: CapacityTarget = { executionId: '456', mode: 'trigger' };

			await reservation.reserve(capacityTarget);
			reservation.release();

			expect(concurrencyControlService.release).toHaveBeenCalledWith({ mode: capacityTarget.mode });
		});
	});

	describe('release', () => {
		it('should call release on the concurrency control service if reservation was acquired', async () => {
			const reservation = new ConcurrencyCapacityReservation(concurrencyControlService);
			const capacityTarget: CapacityTarget = { executionId: '789', mode: 'chat' };
			await reservation.reserve(capacityTarget);

			reservation.release();

			expect(concurrencyControlService.release).toHaveBeenCalledWith({ mode: capacityTarget.mode });
			expect(concurrencyControlService.release).toHaveBeenCalledTimes(1);
		});

		it('should do nothing if no reservation was acquired', () => {
			const reservation = new ConcurrencyCapacityReservation(concurrencyControlService);

			reservation.release();

			expect(concurrencyControlService.release).not.toHaveBeenCalled();
		});

		it('should be idempotent when called multiple times', async () => {
			const reservation = new ConcurrencyCapacityReservation(concurrencyControlService);
			const capacityTarget: CapacityTarget = { executionId: '202', mode: 'webhook' };
			await reservation.reserve(capacityTarget);

			reservation.release();
			reservation.release();
			reservation.release();

			expect(concurrencyControlService.release).toHaveBeenCalledTimes(1);
			expect(concurrencyControlService.release).toHaveBeenCalledWith({ mode: capacityTarget.mode });
		});
	});
});
