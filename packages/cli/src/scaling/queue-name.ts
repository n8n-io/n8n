import type { InstanceSettings } from 'n8n-core';

import { DEFAULT_QUEUE_NAME } from './constants';

type InstanceType = InstanceSettings['instanceType'];

export function resolveQueueName(instanceType: InstanceType, poolName: string): string {
	if (instanceType !== 'worker' || poolName === '') return DEFAULT_QUEUE_NAME;
	return `${DEFAULT_QUEUE_NAME}-${poolName}`;
}
