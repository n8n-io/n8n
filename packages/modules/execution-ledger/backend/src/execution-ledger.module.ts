import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

/**
 * Owns the `execution_ledger` table. Opt-in for now: enable it with
 * `N8N_ENABLED_MODULES=execution-ledger`.
 */
@BackendModule({ name: 'execution-ledger' })
export class ExecutionLedgerModule implements ModuleInterface {
	async entities() {
		const { ExecutionLedgerEntity } = await import(
			'./database/entities/execution-ledger.entity.js'
		);
		return [ExecutionLedgerEntity];
	}
}
