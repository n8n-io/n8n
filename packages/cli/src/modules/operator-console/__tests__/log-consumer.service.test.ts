import type { OperatorLogRecord } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import type { ExecutionsConfig, GlobalConfig } from '@n8n/config';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { Push } from '@/push';

import { LogRingBuffer } from '../capture/ring-buffer';
import { LeaseManagerService } from '../consumer/lease-manager.service';
import { LogConsumerService } from '../consumer/log-consumer.service';
import { OperatorConsoleConfig } from '../operator-console.config';
import { CompositeLogSource } from '../sources/composite-log.source';
import { LogFileSource } from '../sources/log-file.source';
import type { RedisStreamSource } from '../sources/redis-stream.source';
import { RingBufferSource } from '../sources/ring-buffer.source';

const PUSH_REF = 'push-ref-1';

const entry = (message: string, level: OperatorLogRecord['level'] = 'info') => ({
	ts: '2026-08-12T10:00:00.000Z',
	hostId: 'main-1',
	role: 'main' as const,
	stream: 'log' as const,
	level,
	origin: 'live' as const,
	message,
});

/**
 * Wires the real buffer, source and consumer together — the live path is
 * exactly what unit-mocked pieces hid: every part worked alone while nothing
 * reached the browser.
 */
describe('LogConsumerService', () => {
	let buffer: LogRingBuffer;
	let consumer: LogConsumerService;
	let push: Push;

	beforeEach(() => {
		vi.useFakeTimers();

		const config = new OperatorConsoleConfig();
		const instanceSettings = mock<InstanceSettings>({ hostId: 'main-1', instanceType: 'main' });

		buffer = new LogRingBuffer(config);
		push = mock<Push>();

		const source = new CompositeLogSource(
			new RingBufferSource(buffer, config, instanceSettings),
			mock<RedisStreamSource>(),
			mock<LogFileSource>(),
			mock<GlobalConfig>({ executions: { mode: 'regular' } as ExecutionsConfig }),
		);

		consumer = new LogConsumerService(
			mockLogger(),
			source,
			mock<LeaseManagerService>(),
			push,
			config,
		);
	});

	afterEach(() => {
		consumer.shutdown();
		vi.useRealTimers();
	});

	it('pushes captured records to an open console', () => {
		consumer.open(PUSH_REF, { minLevel: 'debug' });

		buffer.add(entry('hello'));
		vi.advanceTimersByTime(500);

		expect(push.send).toHaveBeenCalledTimes(1);
		expect(push.send).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'operatorLogs',
				data: expect.objectContaining({
					records: [expect.objectContaining({ message: 'hello' })],
				}),
			}),
			PUSH_REF,
		);
	});

	it('batches rather than sending one message per line', () => {
		consumer.open(PUSH_REF, { minLevel: 'debug' });

		buffer.add(entry('one'));
		buffer.add(entry('two'));
		buffer.add(entry('three'));
		vi.advanceTimersByTime(500);

		expect(push.send).toHaveBeenCalledTimes(1);
		const [message] = vi.mocked(push.send).mock.calls[0];
		expect(message.data).toMatchObject({ records: expect.arrayContaining([]) });
		expect((message.data as { records: unknown[] }).records).toHaveLength(3);
	});

	it('applies each session’s own filter, not just the union', () => {
		consumer.open('warns-only', { minLevel: 'warn' });
		consumer.open('everything', { minLevel: 'debug' });

		buffer.add(entry('chatter', 'debug'));
		vi.advanceTimersByTime(500);

		const targets = vi.mocked(push.send).mock.calls.map(([, ref]) => ref);
		expect(targets).toEqual(['everything']);
	});

	it('stops pushing once the console closes', () => {
		consumer.open(PUSH_REF, { minLevel: 'debug' });
		consumer.close(PUSH_REF);

		buffer.add(entry('after close'));
		vi.advanceTimersByTime(500);

		expect(push.send).not.toHaveBeenCalled();
	});

	it('keeps streaming across a lease renewal that repeats the same filter', () => {
		consumer.open(PUSH_REF, { minLevel: 'debug' });
		consumer.open(PUSH_REF, { minLevel: 'debug' });

		buffer.add(entry('still here'));
		vi.advanceTimersByTime(500);

		expect(push.send).toHaveBeenCalledTimes(1);
	});

	it('expires a session that stopped renewing, so a hard tab close goes quiet', () => {
		consumer.open(PUSH_REF, { minLevel: 'debug' });

		vi.advanceTimersByTime(new OperatorConsoleConfig().leaseTtlMs + 1000);
		buffer.add(entry('nobody listening'));
		vi.advanceTimersByTime(500);

		expect(push.send).not.toHaveBeenCalled();
	});
});
