import type { InstanceSettings } from 'n8n-core';

type InstanceType = InstanceSettings['instanceType'];

const DEFAULT_QUEUE_NAME = 'jobs';

export function resolveQueueName(instanceType: InstanceType, poolName: string): string {
	if (instanceType !== 'worker' || poolName === '') return DEFAULT_QUEUE_NAME;
	return `${DEFAULT_QUEUE_NAME}-${poolName}`;
}
