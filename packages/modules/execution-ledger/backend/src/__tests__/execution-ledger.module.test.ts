import { mockInstance } from '@n8n/backend-test-utils';
import { ExecutionLedger } from '@n8n/db';
import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { ExecutionLedgerEntity } from '../database/entities/execution-ledger.entity';
import { ExecutionLedgerRowWriter } from '../execution-ledger-row.writer';
import { ExecutionLedgerModule } from '../execution-ledger.module';

describe('ExecutionLedgerModule', () => {
	it('registers the module entrypoint for main, worker and webhook instances', () => {
		const entry = Container.get(ModuleMetadata).get('execution-ledger');

		expect(entry?.class).toBe(ExecutionLedgerModule);
		expect(entry?.instanceTypes).toEqual(['main', 'worker', 'webhook']);
	});

	it('registers the ledger entity', async () => {
		expect(await new ExecutionLedgerModule().entities()).toEqual([ExecutionLedgerEntity]);
	});

	it('binds the row writer to the core ledger service', async () => {
		const ledger = mockInstance(ExecutionLedger);
		const writer = mockInstance(ExecutionLedgerRowWriter);

		await new ExecutionLedgerModule().init();

		expect(ledger.setImplementation).toHaveBeenCalledWith(writer);
	});
});
