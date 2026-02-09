import { UserError } from 'n8n-workflow';

import type { QuotaPeriod } from './database/entities/execution-quota-config';

export class ExecutionQuotaExceededError extends UserError {
	constructor(
		readonly period: QuotaPeriod,
		readonly limit: number,
		readonly currentCount: number,
		readonly scope: 'project' | 'workflow',
	) {
		super(
			`Execution quota exceeded: ${currentCount}/${limit} executions in current ${period} period. ` +
				`This limit is set at the ${scope} level.`,
		);
	}
}
