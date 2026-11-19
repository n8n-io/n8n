import { mockInstance } from '@n8n/backend-test-utils';
import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';
import type { LeaseKind, LeaseProvider, LeaseStatus } from '@n8n/leases';
import { mock } from 'vitest-mock-extended';

import type { LeaseTransaction } from '../durable-lease.service';
import { DurableLeaseService } from '../durable-lease.service';

describe('DurableLeaseService', () => {
	const kind: LeaseKind<LeaseTransaction> = {
		name: 'test-kind',
		handler: { hold: vi.fn() },
		source: { listDesired: vi.fn(), pageDesired: vi.fn() },
	};

	let logger: ReturnType<typeof mockInstance<Logger>>;
	let service: DurableLeaseService;

	beforeEach(() => {
		Container.reset();
		logger = mockInstance(Logger);
		service = Container.get(DurableLeaseService);
	});

	describe('without a provider', () => {
		it('logs at debug and resolves when a kind is registered', async () => {
			await expect(service.registerKind(kind)).resolves.toBeUndefined();
			expect(logger.debug).toHaveBeenCalled();
		});

		it('logs at debug and resolves when a kind changes', async () => {
			await expect(service.changed('test-kind', ['a'])).resolves.toBeUndefined();
			expect(logger.debug).toHaveBeenCalled();
		});

		it('logs at debug and resolves when every kind is synced', async () => {
			await expect(service.syncAll()).resolves.toBeUndefined();
			expect(logger.debug).toHaveBeenCalled();
		});

		it('rejects a status request with an unexpected error', async () => {
			await expect(service.status('test-kind', ['a'])).rejects.toThrow(UnexpectedError);
		});
	});

	describe('with a provider', () => {
		it('forwards registration, changes, sync and status to the provider', async () => {
			const statuses: LeaseStatus[] = [
				{
					key: 'a',
					state: 'held',
					detail: 'ready',
					attempts: 0,
					lastError: null,
					holder: 'host-1',
					fencingToken: 1,
				},
			];
			const provider = mock<LeaseProvider<LeaseTransaction>>();
			provider.registerHolder.mockResolvedValue();
			provider.sync.mockResolvedValue();
			provider.status.mockResolvedValue(statuses);
			service.registerProvider(provider);

			await service.registerKind(kind);
			await service.changed('test-kind', ['a']);
			await service.syncAll();
			const result = await service.status('test-kind', ['a']);

			expect(provider.registerSource).toHaveBeenCalledWith('test-kind', kind.source);
			expect(provider.registerHolder).toHaveBeenCalledWith(
				'test-kind',
				expect.any(Object),
				expect.any(Function),
			);
			expect(provider.sync).toHaveBeenCalledWith('test-kind', ['a']);
			expect(provider.sync).toHaveBeenCalledWith('test-kind');
			expect(provider.status).toHaveBeenCalledWith('test-kind', ['a']);
			expect(result).toEqual(statuses);
		});
	});
});
