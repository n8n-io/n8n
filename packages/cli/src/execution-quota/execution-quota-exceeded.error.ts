import type { ExecutionQuotaPeriod, ExecutionQuotaScopeType } from '@n8n/db';
import { UserError } from 'n8n-workflow';

export class ExecutionQuotaExceededError extends UserError {
	constructor(scopeType: ExecutionQuotaScopeType, period: ExecutionQuotaPeriod, limit: number) {
		super(`This ${scopeType} has reached its execution quota of ${limit} per ${period}`, {
			extra: { scopeType, period, limit },
		});
	}
}
