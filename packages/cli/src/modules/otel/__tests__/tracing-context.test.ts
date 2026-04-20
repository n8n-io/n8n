import { mock } from 'jest-mock-extended';
import type { ExecutionRepository } from '@n8n/db';
import type { Logger } from '@n8n/backend-common';

import { TraceContextService } from '../tracing-context';

const W3C_TRACEPARENT_REGEX = /^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/;

describe('TraceContextService', () => {
	describe('deterministicTraceparent', () => {
		it('should produce a valid W3C traceparent format', () => {
			const result = TraceContextService.deterministicTraceparent('test-123');

			expect(result).toMatch(W3C_TRACEPARENT_REGEX);
		});

		it('should produce the same output for the same input', () => {
			const first = TraceContextService.deterministicTraceparent('exec-456');
			const second = TraceContextService.deterministicTraceparent('exec-456');

			expect(first).toBe(second);
		});

		it('should produce different outputs for different inputs', () => {
			const first = TraceContextService.deterministicTraceparent('exec-1');
			const second = TraceContextService.deterministicTraceparent('exec-2');

			expect(first).not.toBe(second);
		});

		it('should set trace flags to 01 (sampled)', () => {
			const result = TraceContextService.deterministicTraceparent('any-id');

			expect(result).toMatch(/-01$/);
		});

		it('should set version to 00', () => {
			const result = TraceContextService.deterministicTraceparent('any-id');

			expect(result).toMatch(/^00-/);
		});
	});

	describe('seed', () => {
		const executionRepository = mock<ExecutionRepository>();
		const logger = mock<Logger>();
		let service: TraceContextService;

		beforeEach(() => {
			jest.clearAllMocks();
			service = new TraceContextService(executionRepository, logger);
		});

		it('should persist inbound context when provided', async () => {
			const inbound = { traceparent: '00-abc123def456abc123def456abc123de-1234567890abcdef-01' };

			const result = await service.seed('exec-1', inbound);

			expect(result).toEqual(inbound);
			expect(executionRepository.update).toHaveBeenCalledWith('exec-1', {
				tracingContext: inbound,
			});
		});

		it('should persist inbound context with tracestate', async () => {
			const inbound = {
				traceparent: '00-abc123def456abc123def456abc123de-1234567890abcdef-01',
				tracestate: 'vendor1=value1',
			};

			const result = await service.seed('exec-1', inbound);

			expect(result).toEqual(inbound);
			expect(executionRepository.update).toHaveBeenCalledWith('exec-1', {
				tracingContext: inbound,
			});
		});

		it('should generate deterministic traceparent when no inbound provided', async () => {
			const result = await service.seed('exec-2');

			expect(result.traceparent).toMatch(W3C_TRACEPARENT_REGEX);
			expect(result.traceparent).toBe(TraceContextService.deterministicTraceparent('exec-2'));
			expect(executionRepository.update).toHaveBeenCalledWith('exec-2', {
				tracingContext: { traceparent: result.traceparent },
			});
		});

		it('should log error and return context when DB persistence fails', async () => {
			executionRepository.update.mockRejectedValueOnce(new Error('DB connection failed'));

			const result = await service.seed('exec-3');

			expect(result.traceparent).toMatch(W3C_TRACEPARENT_REGEX);
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to seed tracing context',
				expect.objectContaining({ executionId: 'exec-3' }),
			);
		});

		it('should never throw', async () => {
			executionRepository.update.mockRejectedValueOnce(new Error('DB error'));

			await expect(service.seed('exec-4')).resolves.toBeDefined();
		});
	});
});
