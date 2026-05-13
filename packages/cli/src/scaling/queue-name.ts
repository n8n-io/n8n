import type { InstanceSettings } from 'n8n-core';

export const DEFAULT_QUEUE_NAME = 'jobs';

type InstanceType = InstanceSettings['instanceType'];

export function resolveQueueName(instanceType: InstanceType, poolName: string): string {
	if (instanceType !== 'worker' || poolName === '') return DEFAULT_QUEUE_NAME;
	return `${DEFAULT_QUEUE_NAME}-${poolName}`;
}

export function poolQueueName(poolName: string | undefined): string {
	if (!poolName) return DEFAULT_QUEUE_NAME;
	return `${DEFAULT_QUEUE_NAME}-${poolName}`;
}
