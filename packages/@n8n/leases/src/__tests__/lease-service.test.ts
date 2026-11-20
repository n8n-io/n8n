import {
	DuplicateLeaseKindError,
	InvalidLeaseKindError,
	InvalidLeaseKindOptionsError,
	UnknownLeaseKindError,
} from '../errors';
import * as leases from '../index';
import { LeaseService } from '../lease-service';
import type { LeaseProvider } from '../provider';
import { DEFAULT_LEASE_KIND_OPTIONS } from '../constants';
import type { Lease, LeaseKind, LeaseSource, LeaseStatus } from '../types';

type Tx = { id: string };

const makeProvider = () => {
	const provider = {
		registerHolder: vi.fn<LeaseProvider<Tx>['registerHolder']>().mockResolvedValue(undefined),
		registerSource: vi.fn<LeaseProvider<Tx>['registerSource']>(),
		sync: vi.fn<LeaseProvider<Tx>['sync']>().mockResolvedValue(undefined),
		status: vi.fn<LeaseProvider<Tx>['status']>().mockResolvedValue([]),
	};
	return provider;
};

const source: LeaseSource = {
	listDesired: vi.fn(),
	pageDesired: vi.fn(),
};

const makeKind = (overrides: Partial<LeaseKind<Tx>> = {}): LeaseKind<Tx> => ({
	name: 'kind-name',
	handler: { hold: vi.fn().mockResolvedValue(undefined) },
	source,
	...overrides,
});

describe('LeaseService', () => {
	let provider: ReturnType<typeof makeProvider>;
	let service: LeaseService<Tx>;

	beforeEach(() => {
		provider = makeProvider();
		service = new LeaseService<Tx>(provider);
	});

	describe('registerKind', () => {
		it('registers the source before the holder', async () => {
			await service.registerKind(makeKind());

			expect(provider.registerSource).toHaveBeenCalledWith('kind-name', source);
			expect(provider.registerHolder).toHaveBeenCalledTimes(1);
			expect(provider.registerHolder.mock.calls[0][0]).toBe('kind-name');
			expect(provider.registerSource.mock.invocationCallOrder[0]).toBeLessThan(
				provider.registerHolder.mock.invocationCallOrder[0],
			);
		});

		it.each(['a', 'abc-123', 'a-', 'a'.repeat(24)])('accepts the name %j', async (name) => {
			await expect(service.registerKind(makeKind({ name }))).resolves.toBeUndefined();
		});

		it.each(['Upper', 'has_underscore', 'has space', '1abc', '-abc', '', 'a'.repeat(25)])(
			'rejects the name %j',
			async (name) => {
				await expect(service.registerKind(makeKind({ name }))).rejects.toThrow(
					InvalidLeaseKindError,
				);
				expect(provider.registerSource).not.toHaveBeenCalled();
				expect(provider.registerHolder).not.toHaveBeenCalled();
			},
		);

		it('rejects a duplicate name', async () => {
			await service.registerKind(makeKind());

			await expect(service.registerKind(makeKind())).rejects.toThrow(DuplicateLeaseKindError);
			expect(provider.registerSource).toHaveBeenCalledTimes(1);
			expect(provider.registerHolder).toHaveBeenCalledTimes(1);
		});

		it('rejects a duplicate name while the first registration is pending', async () => {
			const first = service.registerKind(makeKind());

			await expect(service.registerKind(makeKind())).rejects.toThrow(DuplicateLeaseKindError);
			await first;
			expect(provider.registerHolder).toHaveBeenCalledTimes(1);
		});

		it('treats the kind as unknown until registerHolder resolves', async () => {
			let resolveHolder!: () => void;
			provider.registerHolder.mockReturnValueOnce(
				new Promise<void>((resolve) => {
					resolveHolder = resolve;
				}),
			);
			const registration = service.registerKind(makeKind());

			await expect(service.changed('kind-name')).rejects.toThrow(UnknownLeaseKindError);
			await expect(service.status('kind-name', ['a'])).rejects.toThrow(UnknownLeaseKindError);
			await service.syncAll();
			expect(provider.sync).not.toHaveBeenCalled();

			resolveHolder();
			await registration;
			await service.changed('kind-name');
			expect(provider.sync).toHaveBeenCalledWith('kind-name');
		});

		it('unregisters the kind when registerHolder rejects, so it can be registered again', async () => {
			const providerError = new Error('provider failed');
			provider.registerHolder.mockRejectedValueOnce(providerError);

			await expect(service.registerKind(makeKind())).rejects.toBe(providerError);
			await expect(service.changed('kind-name')).rejects.toThrow(UnknownLeaseKindError);
			await expect(service.registerKind(makeKind())).resolves.toBeUndefined();
			expect(provider.registerHolder).toHaveBeenCalledTimes(2);
		});

		it('unregisters the kind when registerSource throws', async () => {
			const providerError = new Error('source failed');
			provider.registerSource.mockImplementationOnce(() => {
				throw providerError;
			});

			await expect(service.registerKind(makeKind())).rejects.toBe(providerError);
			expect(provider.registerHolder).not.toHaveBeenCalled();
			await expect(service.changed('kind-name')).rejects.toThrow(UnknownLeaseKindError);
		});

		it('merges kind options over the defaults', async () => {
			await service.registerKind(
				makeKind({ options: { startTimeoutSeconds: 10, leaseSeconds: 30 } }),
			);

			expect(provider.registerHolder.mock.calls[0][1]).toEqual({
				startTimeoutSeconds: 10,
				maxFailedStarts: 5,
				leaseSeconds: 30,
			});
		});

		it('uses the defaults when no options are given', async () => {
			await service.registerKind(makeKind());

			expect(provider.registerHolder.mock.calls[0][1]).toStrictEqual({
				startTimeoutSeconds: 60,
				maxFailedStarts: 5,
			});
		});

		it('keeps the default start timeout when only maxFailedStarts is given', async () => {
			await service.registerKind(makeKind({ options: { maxFailedStarts: 3 } }));

			expect(provider.registerHolder.mock.calls[0][1]).toStrictEqual({
				startTimeoutSeconds: 60,
				maxFailedStarts: 3,
			});
		});

		it.each([
			['leaseSeconds', 0],
			['leaseSeconds', 1.5],
			['startTimeoutSeconds', -1],
			['startTimeoutSeconds', Number.NaN],
			['startTimeoutSeconds', Number.POSITIVE_INFINITY],
			['maxFailedStarts', 0],
			['leaseSeconds', null],
			['startTimeoutSeconds', null],
			['startTimeoutSeconds', '5'],
			['maxFailedStarts', '5'],
		] as const)('rejects %s %j', async (option, value) => {
			const options = { [option]: value } as LeaseKind<Tx>['options'];
			await expect(service.registerKind(makeKind({ options }))).rejects.toThrow(
				InvalidLeaseKindOptionsError,
			);
			expect(provider.registerSource).not.toHaveBeenCalled();
			expect(provider.registerHolder).not.toHaveBeenCalled();
		});

		it('keeps a null maxFailedStarts', async () => {
			await service.registerKind(makeKind({ options: { maxFailedStarts: null } }));

			expect(provider.registerHolder.mock.calls[0][1].maxFailedStarts).toBeNull();
		});

		it('keeps the default for an undefined option', async () => {
			await service.registerKind(
				makeKind({ options: { startTimeoutSeconds: undefined, maxFailedStarts: undefined } }),
			);

			expect(provider.registerHolder.mock.calls[0][1]).toStrictEqual({
				startTimeoutSeconds: 60,
				maxFailedStarts: 5,
			});
		});

		it('passes the lease to the kind handler', async () => {
			const kind = makeKind();
			await service.registerKind(kind);
			const hold = provider.registerHolder.mock.calls[0][2];
			const lease = { kind: 'kind-name', key: 'k1' } as Lease<Tx>;

			await hold(lease);

			expect(kind.handler.hold).toHaveBeenCalledWith(lease);
		});

		it('rejects the hold when the kind handler rejects', async () => {
			const handlerError = new Error('hold failed');
			const kind = makeKind({ handler: { hold: vi.fn().mockRejectedValue(handlerError) } });
			await service.registerKind(kind);
			const hold = provider.registerHolder.mock.calls[0][2];

			await expect(hold({ kind: 'kind-name', key: 'k1' } as Lease<Tx>)).rejects.toBe(handlerError);
		});
	});

	describe('changed', () => {
		it('syncs the given keys', async () => {
			await service.registerKind(makeKind());

			await service.changed('kind-name', ['a', 'b']);

			expect(provider.sync).toHaveBeenCalledWith('kind-name', ['a', 'b']);
		});

		it('syncs the kind with one argument when no keys are given', async () => {
			await service.registerKind(makeKind());

			await service.changed('kind-name');

			expect(provider.sync.mock.calls[0]).toEqual(['kind-name']);
		});
	});

	describe('syncAll', () => {
		it('syncs every registered kind in order', async () => {
			await service.registerKind(makeKind({ name: 'first' }));
			await service.registerKind(makeKind({ name: 'second' }));

			await service.syncAll();

			expect(provider.sync.mock.calls).toEqual([['first'], ['second']]);
		});

		it('resolves without calling the provider when no kind is registered', async () => {
			await expect(service.syncAll()).resolves.toBeUndefined();

			expect(provider.sync).not.toHaveBeenCalled();
		});

		it('syncs every kind when one fails, then rejects with every failure', async () => {
			const firstError = new Error('first failed');
			const thirdError = new Error('third failed');
			provider.sync
				.mockRejectedValueOnce(firstError)
				.mockResolvedValueOnce(undefined)
				.mockRejectedValueOnce(thirdError);
			await service.registerKind(makeKind({ name: 'first' }));
			await service.registerKind(makeKind({ name: 'second' }));
			await service.registerKind(makeKind({ name: 'third' }));

			const error = await service.syncAll().catch((e: unknown) => e);

			expect(provider.sync.mock.calls).toEqual([['first'], ['second'], ['third']]);
			expect(error).toBeInstanceOf(AggregateError);
			expect((error as AggregateError).errors).toEqual([firstError, thirdError]);
			expect((error as AggregateError).message).toBe('Failed to sync lease kinds: first, third');
		});
	});

	describe('status', () => {
		it('returns the provider status', async () => {
			const statuses: LeaseStatus[] = [
				{
					key: 'a',
					state: 'held',
					detail: 'ready',
					attempts: 0,
					lastError: null,
					holder: 'main-1',
					fencingToken: 1,
				},
			];
			provider.status.mockResolvedValue(statuses);
			await service.registerKind(makeKind());

			await expect(service.status('kind-name', ['a'])).resolves.toBe(statuses);
			expect(provider.status).toHaveBeenCalledWith('kind-name', ['a']);
		});
	});

	describe('unknown kind', () => {
		it('rejects changed and status without calling the provider', async () => {
			await expect(service.changed('missing')).rejects.toThrow(UnknownLeaseKindError);
			await expect(service.changed('missing', ['a'])).rejects.toThrow(UnknownLeaseKindError);
			await expect(service.status('missing', ['a'])).rejects.toThrow(UnknownLeaseKindError);

			expect(provider.sync).not.toHaveBeenCalled();
			expect(provider.status).not.toHaveBeenCalled();
		});
	});
});

describe('package exports', () => {
	it('exports the error classes as Error subclasses', () => {
		expect(leases.InvalidLeaseKindError).toBe(InvalidLeaseKindError);
		expect(leases.DuplicateLeaseKindError).toBe(DuplicateLeaseKindError);
		expect(leases.UnknownLeaseKindError).toBe(UnknownLeaseKindError);
		expect(leases.InvalidLeaseKindOptionsError).toBe(InvalidLeaseKindOptionsError);
		expect(new leases.InvalidLeaseKindError('x')).toBeInstanceOf(Error);
		expect(new leases.InvalidLeaseKindOptionsError('x', 'leaseSeconds', 0)).toBeInstanceOf(Error);
		expect(new leases.DuplicateLeaseKindError('x')).toBeInstanceOf(Error);
		expect(new leases.UnknownLeaseKindError('x')).toBeInstanceOf(Error);
	});

	it('exports LeaseService', () => {
		expect(leases.LeaseService).toBe(LeaseService);
	});

	it('exports the constants', () => {
		expect(leases.MAX_LEASE_KIND_LENGTH).toBe(24);
		expect(leases.DEFAULT_LEASE_KIND_OPTIONS).toBe(DEFAULT_LEASE_KIND_OPTIONS);
		expect(leases.DEFAULT_LEASE_KIND_OPTIONS).toEqual({
			startTimeoutSeconds: 60,
			maxFailedStarts: 5,
		});
	});
});
