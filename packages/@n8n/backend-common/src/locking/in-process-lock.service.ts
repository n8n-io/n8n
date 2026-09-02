import { Service } from '@n8n/di';

import {
	LockAcquisitionTimeoutError,
	type ILockService,
	type LockNamespace,
} from './lock-service.interface';

type ReleaseFn = () => void;
/**
 * Opaque ownership token created on lock acquisition. The release function
 * captures this token and only releases if it still matches `held`, which
 * prevents a stale release (from acquisition A) from corrupting a later
 * acquisition B's lock state.
 */
type OwnerToken = symbol;

interface LockState {
	held: OwnerToken | null;
	queue: Array<(token: OwnerToken) => void>;
}

@Service()
export class InProcessLockService implements ILockService {
	private locks: Map<string, LockState> = new Map();

	private getOrCreateLockState(lockId: string): LockState {
		let lockState = this.locks.get(lockId);
		if (!lockState) {
			lockState = { held: null, queue: [] };
			this.locks.set(lockId, lockState);
		}
		return lockState;
	}

	private createReleaseFn(lockId: string, lockState: LockState, token: OwnerToken): ReleaseFn {
		return () => {
			if (lockState.held !== token) return;

			const next = lockState.queue.shift();
			if (next) {
				const nextToken: OwnerToken = Symbol();
				lockState.held = nextToken;
				next(nextToken);
			} else {
				lockState.held = null;
				this.locks.delete(lockId);
			}
		};
	}

	private async acquireLock(lockId: string, timeoutMs?: number): Promise<ReleaseFn> {
		const lockState = this.getOrCreateLockState(lockId);

		if (!lockState.held) {
			const token: OwnerToken = Symbol();
			lockState.held = token;
			return this.createReleaseFn(lockId, lockState, token);
		}

		// Race the lock-release signal against an optional timeout.
		//
		// Node.js is single-threaded: `resolver` (called by releaseLock) and
		// the setTimeout callback each run to completion before the other can
		// start. Only one of them will settle the Promise first; the second
		// call to resolve/reject on an already-settled Promise is a no-op per
		// the Promise spec. clearTimeout on an already-fired timer is likewise
		// a harmless no-op.
		const token = await new Promise<OwnerToken>((resolve, reject) => {
			let timer: ReturnType<typeof setTimeout> | undefined;

			const resolver = (ownerToken: OwnerToken) => {
				if (timer !== undefined) clearTimeout(timer);
				resolve(ownerToken);
			};

			lockState.queue.push(resolver);

			if (timeoutMs !== undefined) {
				timer = setTimeout(() => {
					const idx = lockState.queue.indexOf(resolver);
					if (idx !== -1) {
						lockState.queue.splice(idx, 1);
					}
					reject(
						new LockAcquisitionTimeoutError(
							`Timed out waiting for lock '${lockId}' after ${timeoutMs}ms`,
						),
					);
				}, timeoutMs);
			}
		});

		return this.createReleaseFn(lockId, lockState, token);
	}

	buildLockKey(ns: LockNamespace, key: string): string {
		return `${ns}:${key}`;
	}

	async withLease<T>(
		ns: LockNamespace,
		key: string,
		fn: (signal: AbortSignal) => Promise<T>,
		options?: { waitTimeoutMs?: number; leaseTtlMs?: number },
	): Promise<T> {
		const release = await this.acquireLock(this.buildLockKey(ns, key), options?.waitTimeoutMs);
		const abortController = new AbortController();
		try {
			return await fn(abortController.signal);
		} finally {
			abortController.abort();
			release();
		}
	}
}
