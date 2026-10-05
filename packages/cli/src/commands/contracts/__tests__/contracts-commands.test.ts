import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { NodeContractsSync } from '@/node-contracts-sync';

import { ContractsExportCommand } from '../export';
import { ContractsImportCommand } from '../import';
import { ContractsSyncCommand } from '../sync';

vi.mock('@/node-contracts-registry', () => ({ NodeContractsStore: class {} }));
vi.mock('@/node-contracts-sync', () => ({ NodeContractsSync: class {} }));

describe('contracts commands', () => {
	mockInstance(Logger);
	const nodeContractsSync = mockInstance(NodeContractsSync);
	const { instanceAi } = Container.get(GlobalConfig);

	afterEach(() => {
		instanceAi.nodeContractsEnabled = true;
	});

	it.each([
		['contracts:export', ContractsExportCommand],
		['contracts:import', ContractsImportCommand],
		['contracts:sync', ContractsSyncCommand],
	])('%s refuses with node contracts disabled', async (name, Command) => {
		instanceAi.nodeContractsEnabled = false;

		const run = new Command().run();

		await expect(run).rejects.toThrow(UserError);
		await expect(run).rejects.toThrow(
			`${name} needs node contracts. Set N8N_INSTANCE_AI_NODE_CONTRACTS_ENABLED=true to use it.`,
		);
	});

	it('contracts:sync runs with node contracts enabled', async () => {
		nodeContractsSync.run.mockResolvedValue({ added: [], failed: [], unsupported: [] } as never);

		const command = new ContractsSyncCommand();
		Object.assign(command, { flags: {} });

		await command.run();

		expect(nodeContractsSync.run).toHaveBeenCalledOnce();
	});
});
