import type { ExecutionLedgerFoldStep, ExecutionLedgerRow, OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';

import { toUsageDeltas } from './execution-limit-usage.deltas';
import { ExecutionLimitUsageRepository } from './execution-limit-usage.repository';

/**
 * Counts started and blocked runs for each project and for the instance. The step
 * increments, so each ledger row must reach it one time only.
 */
@Service()
export class ExecutionLimitUsageFoldStep implements ExecutionLedgerFoldStep {
	readonly name = 'execution_limit_usage';

	constructor(private readonly repository: ExecutionLimitUsageRepository) {}

	async fold(rows: readonly ExecutionLedgerRow[], ctx: OperationContext): Promise<undefined> {
		await this.repository.addUsage(toUsageDeltas(rows), ctx);
		return undefined;
	}
}
