import { ExecutionLedger } from '@n8n/db';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

/**
 * Owns the `execution_ledger` table and binds the row writer to the core `ExecutionLedger`.
 * Opt-in for now: enable it with `N8N_ENABLED_MODULES=execution-ledger`.
 */
@BackendModule({ name: 'execution-ledger', instanceTypes: ['main', 'worker', 'webhook'] })
export class ExecutionLedgerModule implements ModuleInterface {
	async init() {
		const { ExecutionLedgerRowWriter } = await import('./execution-ledger-row.writer.js');
		Container.get(ExecutionLedger).setImplementation(Container.get(ExecutionLedgerRowWriter));
	}

	async entities() {
		const { ExecutionLedgerEntity } = await import(
			'./database/entities/execution-ledger.entity.js'
		);
		return [ExecutionLedgerEntity];
	}
}
