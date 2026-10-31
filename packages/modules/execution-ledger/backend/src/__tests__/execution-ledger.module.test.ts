import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { ExecutionLedgerEntity } from '../database/entities/execution-ledger.entity';
import { ExecutionLedgerModule } from '../execution-ledger.module';

describe('ExecutionLedgerModule', () => {
	it('registers the module entrypoint', () => {
		expect(Container.get(ModuleMetadata).get('execution-ledger')?.class).toBe(
			ExecutionLedgerModule,
		);
	});

	it('registers the ledger entity', async () => {
		expect(await new ExecutionLedgerModule().entities()).toEqual([ExecutionLedgerEntity]);
	});
});
