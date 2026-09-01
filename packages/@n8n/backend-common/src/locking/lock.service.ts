import { Service } from '@n8n/di';

import { InProcessLockService } from './in-process-lock.service';
import { ILockService, LockNamespace } from './lock-service.interface';

@Service()
export class LockService implements ILockService {
	private provider: ILockService;

	constructor(inProcessLockService: InProcessLockService) {
		this.provider = inProcessLockService;
	}

	setProvider(provider: ILockService) {
		this.provider = provider;
	}

	async withLease<T>(
		ns: LockNamespace,
		key: string,
		fn: (signal: AbortSignal) => Promise<T>,
		options?: { waitTimeoutMs?: number; leaseTtlMs?: number },
	): Promise<T> {
		return await this.provider.withLease(ns, key, fn, options);
	}
}
