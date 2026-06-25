import type { Logger } from '@n8n/backend-common';
import type { SsrfProtectionService, SsrfEventMap } from '@n8n/backend-network';
import type { EgressBlockedDestinationRepository } from '@n8n/db';
import { TypedEmitter } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';

import { EgressCalibrationService } from '../egress-calibration.service';

describe('EgressCalibrationService', () => {
	let events: TypedEmitter<SsrfEventMap>;
	let ssrfProtectionService: SsrfProtectionService;
	let repository: ReturnType<typeof mock<EgressBlockedDestinationRepository>>;
	const logger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });
	let service: EgressCalibrationService;

	const emitBlocked = (payload: Partial<SsrfEventMap['ssrf.blocked']>) => {
		events.emit('ssrf.blocked', {
			phase: 'pre_flight',
			reason: 'blocked_ip',
			durationMs: 1,
			wouldBlock: true,
			...payload,
		});
	};

	beforeEach(() => {
		jest.clearAllMocks();
		events = new TypedEmitter<SsrfEventMap>();
		ssrfProtectionService = mock<SsrfProtectionService>({
			events: events as unknown as SsrfProtectionService['events'],
		});
		repository = mock<EgressBlockedDestinationRepository>();
		service = new EgressCalibrationService(ssrfProtectionService, repository, logger);
		service.start();
	});

	afterEach(async () => {
		await service.onShutdown();
	});

	it('aggregates repeated blocks of the same destination into one record', async () => {
		emitBlocked({ hostname: 'evil.example.com', ip: '10.0.0.1' });
		emitBlocked({ hostname: 'evil.example.com', ip: '10.0.0.1' });
		emitBlocked({ hostname: 'evil.example.com', ip: '10.0.0.1' });

		await service.listDestinations();

		expect(repository.recordBlocks).toHaveBeenCalledWith([
			{
				hostname: 'evil.example.com',
				resolvedIp: '10.0.0.1',
				feature: 'unknown',
				decision: 'would-block',
				count: 3,
			},
		]);
	});

	it('records the same destination under each decision separately', async () => {
		emitBlocked({ hostname: 'evil.example.com', ip: '10.0.0.1', wouldBlock: true });
		emitBlocked({ hostname: 'evil.example.com', ip: '10.0.0.1', wouldBlock: false });
		emitBlocked({ hostname: 'evil.example.com', ip: '10.0.0.1', wouldBlock: false });

		await service.listDestinations();

		const records = repository.recordBlocks.mock.calls[0][0];
		expect(records).toEqual(
			expect.arrayContaining([
				{
					hostname: 'evil.example.com',
					resolvedIp: '10.0.0.1',
					feature: 'unknown',
					decision: 'would-block',
					count: 1,
				},
				{
					hostname: 'evil.example.com',
					resolvedIp: '10.0.0.1',
					feature: 'unknown',
					decision: 'blocked',
					count: 2,
				},
			]),
		);
	});

	it('records distinct destinations separately', async () => {
		emitBlocked({ hostname: 'a.example.com', ip: '10.0.0.1' });
		emitBlocked({ hostname: 'b.example.com', ip: '10.0.0.2' });

		await service.listDestinations();

		const records = repository.recordBlocks.mock.calls[0][0];
		expect(records).toEqual(
			expect.arrayContaining([
				{
					hostname: 'a.example.com',
					resolvedIp: '10.0.0.1',
					feature: 'unknown',
					decision: 'would-block',
					count: 1,
				},
				{
					hostname: 'b.example.com',
					resolvedIp: '10.0.0.2',
					feature: 'unknown',
					decision: 'would-block',
					count: 1,
				},
			]),
		);
	});

	it('ignores non-policy blocks (dns_error, invalid_url)', async () => {
		emitBlocked({ reason: 'dns_error', hostname: 'broken.example.com' });
		emitBlocked({ reason: 'invalid_url' });

		await service.listDestinations();

		expect(repository.recordBlocks).not.toHaveBeenCalled();
	});

	it('skips events with neither hostname nor ip', async () => {
		emitBlocked({ hostname: '', ip: '' });

		await service.listDestinations();

		expect(repository.recordBlocks).not.toHaveBeenCalled();
	});

	it('records a bare-IP block with an empty hostname', async () => {
		emitBlocked({ hostname: undefined, ip: '169.254.169.254' });

		await service.listDestinations();

		expect(repository.recordBlocks).toHaveBeenCalledWith([
			{
				hostname: '',
				resolvedIp: '169.254.169.254',
				feature: 'unknown',
				decision: 'would-block',
				count: 1,
			},
		]);
	});

	it('clear() empties the buffer and the table', async () => {
		emitBlocked({ hostname: 'a.example.com', ip: '10.0.0.1' });
		await service.clear();

		expect(repository.clearAll).toHaveBeenCalled();

		// Buffer was cleared too: a subsequent flush writes nothing.
		await service.listDestinations();
		expect(repository.recordBlocks).not.toHaveBeenCalled();
	});

	it('re-buffers on a failed flush so counts are not lost', async () => {
		repository.recordBlocks.mockRejectedValueOnce(new Error('db down'));
		emitBlocked({ hostname: 'a.example.com', ip: '10.0.0.1' });

		await expect(service.listDestinations()).rejects.toThrow('db down');

		// Next flush retries with the same counts.
		repository.recordBlocks.mockResolvedValueOnce(undefined);
		await service.listDestinations();
		expect(repository.recordBlocks).toHaveBeenLastCalledWith([
			{
				hostname: 'a.example.com',
				resolvedIp: '10.0.0.1',
				feature: 'unknown',
				decision: 'would-block',
				count: 1,
			},
		]);
	});

	it('accumulates counts across a failed flush and subsequent blocks', async () => {
		repository.recordBlocks.mockRejectedValueOnce(new Error('db down'));
		emitBlocked({ hostname: 'a.example.com', ip: '10.0.0.1' });
		emitBlocked({ hostname: 'a.example.com', ip: '10.0.0.1' });

		// First flush fails; the count of 2 is re-buffered, not lost.
		await expect(service.listDestinations()).rejects.toThrow('db down');

		// A further block arrives, then the next flush succeeds: 2 (re-buffered) + 1.
		emitBlocked({ hostname: 'a.example.com', ip: '10.0.0.1' });
		repository.recordBlocks.mockResolvedValueOnce(undefined);
		await service.listDestinations();

		expect(repository.recordBlocks).toHaveBeenLastCalledWith([
			{
				hostname: 'a.example.com',
				resolvedIp: '10.0.0.1',
				feature: 'unknown',
				decision: 'would-block',
				count: 3,
			},
		]);
	});

	it('flushes automatically when the buffer reaches capacity', async () => {
		repository.recordBlocks.mockResolvedValue(undefined);

		// MAX_BUFFER_ENTRIES is 1000; the 1000th distinct destination triggers a flush.
		for (let i = 0; i < 1000; i++) {
			emitBlocked({ hostname: `h${i}.example.com`, ip: `10.0.${Math.floor(i / 256)}.${i % 256}` });
		}
		// The capacity-triggered flush runs detached (void), so let it settle.
		await new Promise((resolve) => setImmediate(resolve));

		expect(repository.recordBlocks).toHaveBeenCalledTimes(1);
		expect(repository.recordBlocks.mock.calls[0][0]).toHaveLength(1000);
	});
});
