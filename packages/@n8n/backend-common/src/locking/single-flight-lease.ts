import {
	LockAcquisitionTimeoutError,
	type ILockService,
	type LockNamespace,
} from './lock-service.interface';

export interface SingleFlightLeaseOptions {
	lockService: ILockService;
	namespace: LockNamespace;
	waitTimeoutMs?: number;
	leaseTtlMs?: number;
	onLeaseTimeout?: (error: LockAcquisitionTimeoutError) => void;
}

/** Coalesce same-key work in this process and coordinate it across processes with a lease. */
export class SingleFlightLease<T> {
	private readonly inFlight = new Map<string, Promise<T>>();

	async run(
		key: string,
		fn: (signal: AbortSignal) => Promise<T>,
		options: SingleFlightLeaseOptions,
	): Promise<T> {
		const { lockService, namespace, waitTimeoutMs, leaseTtlMs, onLeaseTimeout } = options;
		const inFlightKey = `${namespace}:${key}`;
		const inFlight = this.inFlight.get(inFlightKey);
		if (inFlight) return await inFlight;

		const promise = lockService
			.withLease(namespace, key, fn, { waitTimeoutMs, leaseTtlMs })
			.catch((error: unknown) => {
				if (!(error instanceof LockAcquisitionTimeoutError)) throw error;
				onLeaseTimeout?.(error);
				throw error;
			})
			.finally(() => this.inFlight.delete(inFlightKey));

		this.inFlight.set(inFlightKey, promise);
		return await promise;
	}
}
