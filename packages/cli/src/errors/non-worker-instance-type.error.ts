import { ApplicationError } from 'n8n-workflow';

import type { N8nInstanceType } from '@/interfaces';

export class NonWorkerInstanceTypeError extends ApplicationError {
	constructor(instanceType: N8nInstanceType) {
		super('Method called on non-worker instance type', {
			level: 'warning',
			extra: { instanceType },
		});
	}
}
