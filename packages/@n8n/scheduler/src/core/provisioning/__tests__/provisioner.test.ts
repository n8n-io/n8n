import { mock } from 'vitest-mock-extended';

import { ScheduledJobOwnerRegistry } from '../../reconciliation/owner';
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

	const owner = (ownerId: string, ownerMemberId: string | null = null) => ({
		ownerType: 'thing',
		ownerId,
		ownerMemberId,
	});

	const owners = new ScheduledJobOwnerRegistry();
	owners.register('thing', { findExisting: async () => await Promise.resolve(new Set<string>()) });

	function makeProvisioner() {
		const tx = mock<ProvisionTransaction>();
		tx.findExisting.mockResolvedValue([]);
		tx.insert.mockResolvedValue([1]);
		const runInProvision: RunInProvisionTransaction = async (work) => await work(tx);
		const provisionTransaction = vi.fn().mockReturnValue(runInProvision);
		const provisioner = createJobProvisioner({
			provisionTransaction,
			deprovisionTransaction: vi.fn(),
			owners,
		});
		return { provisioner, provisionTransaction };
	}

	it('provisions a scope by running that scope’s provision transaction', async () => {
		const { provisioner, provisionTransaction } = makeProvisioner();

		// Beyond the owner, the scope is opaque to the package: it only hands it
		// back to the builder.
		const scope = { owner: owner('thing-1'), ref: 'scope-a' };
		const summary = await provisioner.provision(scope, desired);

		expect(provisionTransaction).toHaveBeenCalledWith(scope);
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
			owners,
		});

		const result = await provisioner.deprovision({ owner: owner('thing-1'), ref: 'scope-b' });

		expect(deprovisionTransaction).toHaveBeenCalledWith({
			owner: owner('thing-1'),
			ref: 'scope-b',
		});
		expect(result).toEqual({ removed: 3 });
	});

	describe('liveness resolver guardrail', () => {
		it('refuses to provision an owner type with no registered resolver', async () => {
			const { provisioner, provisionTransaction } = makeProvisioner();

			await expect(
				provisioner.provision(
					{ owner: { ownerType: 'unclaimed', ownerId: 'a', ownerMemberId: null } },
					desired,
				),
			).rejects.toThrow('no registered liveness resolver');

			expect(provisionTransaction).not.toHaveBeenCalled();
		});

		it('deprovisions an owner type with no registered resolver, so cleanup is never refused', async () => {
			const tx = mock<DeprovisionTransaction>();
			tx.deleteAll.mockResolvedValue(1);
			const runInDeprovision: RunInDeprovisionTransaction = async (work) => await work(tx);

			const provisioner = createJobProvisioner({
				provisionTransaction: vi.fn(),
				deprovisionTransaction: vi.fn().mockReturnValue(runInDeprovision),
				owners,
			});

			await expect(
				provisioner.deprovision({
					owner: { ownerType: 'unclaimed', ownerId: 'a', ownerMemberId: null },
				}),
			).resolves.toEqual({ removed: 1 });
		});
	});

	describe('owner column guardrail', () => {
		it('refuses an empty owner id, which would group unrelated jobs together', async () => {
			const { provisioner, provisionTransaction } = makeProvisioner();

			await expect(provisioner.provision({ owner: owner('') }, desired)).rejects.toThrow(
				'Scheduled job owner id must be non-empty and fit its length limit',
			);

			expect(provisionTransaction).not.toHaveBeenCalled();
		});

		it('refuses an owner id longer than its column', async () => {
			const { provisioner } = makeProvisioner();

			await expect(
				provisioner.provision({ owner: owner('a'.repeat(256)) }, desired),
			).rejects.toThrow('Scheduled job owner id must be non-empty and fit its length limit');
		});

		it('refuses an owner member id longer than its column', async () => {
			const { provisioner } = makeProvisioner();

			await expect(
				provisioner.provision({ owner: owner('thing-1', 'm'.repeat(37)) }, desired),
			).rejects.toThrow('Scheduled job owner member id must be non-empty and fit its length limit');
		});

		it('provisions an owner sitting exactly on both limits', async () => {
			const { provisioner } = makeProvisioner();

			await expect(
				provisioner.provision({ owner: owner('a'.repeat(255), 'm'.repeat(36)) }, desired),
			).resolves.toMatchObject({ inserted: [{ id: 1, name: 'wf:node:0' }] });
		});
	});
});
