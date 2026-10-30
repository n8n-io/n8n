import { mock } from 'vitest-mock-extended';

import { DuplicateLeaseKindError, InvalidLeaseKindError, UnknownLeaseKindError } from '../errors';
import { LeaseService } from '../lease-service';
import type { LeaseProvider } from '../provider';
import type { Lease, LeaseKind, LeaseSpec } from '../types';
import { DEFAULT_LEASE_KIND_OPTIONS } from '../types';

type Tx = { id: string };

const specs: LeaseSpec[] = [
	{ key: 'wf-1:node-1', data: { n: 1 } },
	{ key: 'wf-2:node-1', data: { n: 2 } },
];

const kind = (overrides: Partial<LeaseKind<Tx>> = {}): LeaseKind<Tx> => ({
	name: 'workflow-trigger',
	handler: { hold: vi.fn(async () => {}) },
	listDesired: vi.fn(async (keys?: readonly string[]) =>
		keys === undefined ? specs : specs.filter((spec) => keys.includes(spec.key)),
	),
	...overrides,
});

describe('LeaseService', () => {
	it('registers a holder with the kind options merged over the defaults', () => {
		const provider = mock<LeaseProvider<Tx>>();
		new LeaseService(provider).registerKind(kind({ options: { leaseSeconds: 20 } }));

		expect(provider.registerHolder).toHaveBeenCalledWith(
			'workflow-trigger',
			{ ...DEFAULT_LEASE_KIND_OPTIONS, leaseSeconds: 20 },
			expect.any(Function),
		);
	});

	it('routes a held lease to the kind handler', async () => {
		const provider = mock<LeaseProvider<Tx>>();
		const registered = kind();
		new LeaseService(provider).registerKind(registered);
		const [, , hold] = provider.registerHolder.mock.calls[0];
		const lease = mock<Lease<Tx>>();

		await hold(lease);

		expect(registered.handler.hold).toHaveBeenCalledWith(lease);
	});

	it('lets the handler check the lease in its own transaction through the provider fence', async () => {
		const provider = mock<LeaseProvider<Tx>>();
		let held: boolean | undefined;
		new LeaseService(provider).registerKind(
			kind({
				handler: {
					hold: async (lease) => {
						held = await lease.isHeld({ id: 'tx-1' });
					},
				},
			}),
		);
		const [, , hold] = provider.registerHolder.mock.calls[0];
		const isHeld = vi.fn(async (_tx: Tx) => false);

		await hold(mock<Lease<Tx>>({ isHeld }));

		expect(isHeld).toHaveBeenCalledWith({ id: 'tx-1' });
		expect(held).toBe(false);
	});

	it('answers liveness from the desired leases among the asked keys', async () => {
		const provider = mock<LeaseProvider<Tx>>();
		new LeaseService(provider).registerKind(kind());
		const [, findDesired] = provider.registerLiveness.mock.calls[0];

		await expect(findDesired(['wf-1:node-1', 'wf-9:node-1'])).resolves.toEqual(
			new Set(['wf-1:node-1']),
		);
	});

	it('syncs the desired leases of the changed keys', async () => {
		const provider = mock<LeaseProvider<Tx>>();
		const service = new LeaseService(provider);
		service.registerKind(kind());

		await service.changed('workflow-trigger', ['wf-2:node-1', 'wf-3:node-1']);

		expect(provider.sync).toHaveBeenCalledWith(
			'workflow-trigger',
			[specs[1]],
			['wf-2:node-1', 'wf-3:node-1'],
		);
	});

	it('syncs every kind in full', async () => {
		const provider = mock<LeaseProvider<Tx>>();
		const service = new LeaseService(provider);
		service.registerKind(kind());
		service.registerKind(kind({ name: 'agent-socket', listDesired: async () => [] }));

		await service.syncAll();

		expect(provider.sync).toHaveBeenCalledWith('workflow-trigger', specs, undefined);
		expect(provider.sync).toHaveBeenCalledWith('agent-socket', [], undefined);
	});

	it.each(['', 'Workflow', 'with space', '1st', 'x'.repeat(25)])(
		'rejects the kind name %j',
		(name) => {
			expect(() =>
				new LeaseService(mock<LeaseProvider<Tx>>()).registerKind(kind({ name })),
			).toThrow(InvalidLeaseKindError);
		},
	);

	it('rejects a kind registered twice', () => {
		const service = new LeaseService(mock<LeaseProvider<Tx>>());
		service.registerKind(kind());

		expect(() => service.registerKind(kind())).toThrow(DuplicateLeaseKindError);
	});

	it('rejects a change for an unknown kind', async () => {
		await expect(new LeaseService(mock<LeaseProvider<Tx>>()).changed('unknown')).rejects.toThrow(
			UnknownLeaseKindError,
		);
	});
});
