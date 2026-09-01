import { mock } from 'vitest-mock-extended';

import { createJobProvisioner } from '../provisioner';
import type {
	DeprovisionTransaction,
	ProvisionTransaction,
	RunInDeprovisionTransaction,
	RunInProvisionTransaction,
} from '../transaction';
import type { DesiredJob } from '../types';

describe('createJobProvisioner', () => {
	const desired: DesiredJob[] = [
		{
			name: 'wf:node:0',
			schedule: { kind: 'cron', cronExpression: '0 0 9 * * *', timezone: null },
			firstRunAt: new Date('2026-01-05T09:00:00.000Z'),
		},
	];

	it('provisions a scope by running that scope’s provision transaction', async () => {
		const tx = mock<ProvisionTransaction>();
		tx.findExisting.mockResolvedValue([]);
		tx.insert.mockResolvedValue([1]);
		const runInProvision: RunInProvisionTransaction = async (work) => await work(tx);
		const provisionTransaction = vi.fn().mockReturnValue(runInProvision);

		const provisioner = createJobProvisioner({
			provisionTransaction,
			deprovisionTransaction: vi.fn(),
		});

		// The scope is opaque to the package: it only hands it back to the builder.
		const summary = await provisioner.provision({ ref: 'scope-a' }, desired);

		expect(provisionTransaction).toHaveBeenCalledWith({ ref: 'scope-a' });
		expect(summary.inserted).toEqual([{ id: 1, name: 'wf:node:0' }]);
	});

	it('deprovisions a scope by running that scope’s deprovision transaction', async () => {
		const tx = mock<DeprovisionTransaction>();
		tx.deleteAll.mockResolvedValue(3);
		const runInDeprovision: RunInDeprovisionTransaction = async (work) => await work(tx);
		const deprovisionTransaction = vi.fn().mockReturnValue(runInDeprovision);

		const provisioner = createJobProvisioner({
			provisionTransaction: vi.fn(),
			deprovisionTransaction,
		});

		const result = await provisioner.deprovision({ ref: 'scope-b' });

		expect(deprovisionTransaction).toHaveBeenCalledWith({ ref: 'scope-b' });
		expect(result).toEqual({ removed: 3 });
	});
});
