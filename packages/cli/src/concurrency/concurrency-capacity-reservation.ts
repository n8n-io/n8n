import assert from 'node:assert';

import type {
	CapacityTarget,
	ConcurrencyControlService,
} from '@/concurrency/concurrency-control.service';

/**
 * Represents a reservation of capacity from the concurrency control service.
 * The reservation is made for a specific execution and mode.
 *
 * @example
 * const reservation = new ConcurrencyCapacityReservation(concurrencyControlService);
 * await reservation.reserve({ executionId: '123', mode: 'webhook' });
 * ...
 * reservation.release();
 */
export class ConcurrencyCapacityReservation {
	private acquiredReservation: CapacityTarget | undefined = undefined;

	constructor(private readonly concurrencyControlService: ConcurrencyControlService) {}

	async reserve(capacityFor: CapacityTarget) {
		assert(!this.acquiredReservation, 'Capacity already reserved');

		await this.concurrencyControlService.throttle(capacityFor);
		this.acquiredReservation = capacityFor;
	}

	release() {
		if (!this.acquiredReservation) return;

		this.concurrencyControlService.release({ mode: this.acquiredReservation.mode });

		this.acquiredReservation = undefined;
	}
}
