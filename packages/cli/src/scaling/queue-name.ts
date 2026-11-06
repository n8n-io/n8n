import type { WorkerPoolConfig } from '@n8n/config';
import type { InstanceSettings } from 'n8n-core';

export const DEFAULT_QUEUE_NAME = 'jobs';

type InstanceType = InstanceSettings['instanceType'];

/** Disabled pools fall back to the default (unlabeled) queue, so a worker with a pool name still listens to `jobs`. */
export function resolveWorkerPoolName(pool: WorkerPoolConfig): string {
	return pool.enabled ? pool.name : '';
}

export function resolveQueueName(instanceType: InstanceType, poolName: string): string {
	if (instanceType !== 'worker' || poolName === '') return DEFAULT_QUEUE_NAME;
	return `${DEFAULT_QUEUE_NAME}-${poolName}`;
}

export function poolQueueName(poolName: string | undefined): string {
	if (!poolName) return DEFAULT_QUEUE_NAME;
	return `${DEFAULT_QUEUE_NAME}-${poolName}`;
}
