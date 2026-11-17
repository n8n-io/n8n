import { mockInstance } from '@n8n/backend-test-utils';
import { ExecutionLedger, ExecutionLedgerBacklogProbe } from '@n8n/backend-services';
import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { ExecutionLedgerEntity } from '../database/entities/execution-ledger.entity';
import { ExecutionLedgerRepository } from '../database/repositories/execution-ledger.repository';
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
		mockInstance(ExecutionLedgerBacklogProbe);
		mockInstance(ExecutionLedgerRepository);

		await new ExecutionLedgerModule().init();

		expect(ledger.setImplementation).toHaveBeenCalledWith(writer);
	});

	it('registers a backlog provider that reads the repository', async () => {
		mockInstance(ExecutionLedger);
		const probe = mockInstance(ExecutionLedgerBacklogProbe);
		const repository = mockInstance(ExecutionLedgerRepository);
		const stats = { rows: 3, oldestOccurredAt: null };
		repository.getBacklogStats.mockResolvedValue(stats);

		await new ExecutionLedgerModule().init();

		const provider = probe.register.mock.calls[0][0];
		expect(await provider()).toBe(stats);
	});

	it('registers the fold system task', async () => {
		const tasks = await new ExecutionLedgerModule().systemTasks();

		expect(tasks.map((task) => task.name)).toEqual(['ExecutionLedgerFoldTask']);
	});
});
