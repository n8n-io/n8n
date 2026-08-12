import type { OperatorLogRecord } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import type { ExecutionsConfig } from '@n8n/config';
import type { InstanceSettings } from 'n8n-core';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import type { Publisher } from '@/scaling/pubsub/publisher.service';
import { MAX_PUBSUB_PAYLOAD_BYTES } from '@/scaling/constants';

import type { OperatorConsoleConfig } from '../operator-console.config';
import { SEARCH_RESPONSE_MAX_BYTES } from '../operator-console.constants';
import { capRecords, SearchResponderService } from '../producer/search-responder.service';
import type { LogFileSource } from '../sources/log-file.source';

const HOST_ID = 'worker-1';

const record = (overrides: Partial<OperatorLogRecord> = {}): OperatorLogRecord => ({
	seq: 1,
	ts: '2026-08-12T10:00:00.000Z',
	hostId: HOST_ID,
	role: 'worker',
	stream: 'log',
	level: 'info',
	origin: 'file',
	message: 'hello',
	...overrides,
});

describe('capRecords', () => {
	it('should keep the newest records when over the limit', () => {
		const records = [1, 2, 3, 4].map((seq) => record({ seq }));

		const { records: kept, truncated } = capRecords(records, 2, 1_000_000);

		expect(kept.map((r) => r.seq)).toEqual([3, 4]);
		expect(truncated).toBe(true);
	});

	it('should not flag truncation when everything fits', () => {
		const records = [1, 2].map((seq) => record({ seq }));

		expect(capRecords(records, 5, 1_000_000)).toEqual({ records, truncated: false });
	});

	it('should stop at the byte budget and say so', () => {
		const records = Array.from({ length: 50 }, (_, seq) =>
			record({ seq, message: 'x'.repeat(1000) }),
		);

		const { records: kept, truncated } = capRecords(records, 50, 5000);

		expect(truncated).toBe(true);
		expect(kept.length).toBeGreaterThan(0);
		expect(kept.length).toBeLessThan(50);
		// Newest survive the cut.
		expect(kept[kept.length - 1].seq).toBe(49);
		expect(JSON.stringify(kept).length).toBeLessThanOrEqual(5000 + 1000);
	});

	it('should keep at least one record even if it alone blows the budget', () => {
		const { records: kept } = capRecords([record({ message: 'x'.repeat(5000) })], 10, 100);

		expect(kept).toHaveLength(1);
	});

	it('should stay well under the pubsub payload ceiling', () => {
		expect(SEARCH_RESPONSE_MAX_BYTES).toBeLessThan(MAX_PUBSUB_PAYLOAD_BYTES / 2);
	});
});

describe('SearchResponderService', () => {
	let publisher: MockProxy<Publisher>;
	let history: MockProxy<LogFileSource>;
	let responder: SearchResponderService;

	const setup = ({
		mode = 'queue',
		records = [],
		historyEnabled = true,
	}: {
		mode?: 'queue' | 'regular';
		records?: OperatorLogRecord[];
		historyEnabled?: boolean;
	} = {}) => {
		publisher = mock<Publisher>();
		publisher.publishWorkerResponse.mockResolvedValue(undefined);

		history = mock<LogFileSource>();
		history.read.mockResolvedValue({ records, nextCursor: '', gap: false });

		responder = new SearchResponderService(
			mockLogger(),
			mock<InstanceSettings>({ hostId: HOST_ID, instanceType: 'worker' }),
			publisher,
			mock<OperatorConsoleConfig>({ history: historyEnabled }),
			history,
			mock<ExecutionsConfig>({ mode }),
		);
	};

	/** The single response this host published. */
	const published = () => {
		const [msg] = publisher.publishWorkerResponse.mock.calls[0];
		if (msg.response !== 'response-to-search-logs') throw new Error('wrong response type');
		return msg.payload;
	};

	beforeEach(() => setup());

	it('should answer with its own matches, tagged with the request id', async () => {
		setup({ records: [record({ message: 'boom' })] });

		await responder.handleSearchLogs({ requestId: 'req-1', filter: { grep: 'boom' }, limit: 10 });

		const payload = published();
		expect(payload.requestId).toBe('req-1');
		expect(payload.hostId).toBe(HOST_ID);
		expect(payload.records.map((r) => r.message)).toEqual(['boom']);
		expect(payload.truncated).toBe(false);
	});

	it('should read one past the limit so truncation is observed, not guessed', async () => {
		await responder.handleSearchLogs({ requestId: 'req-1', filter: {}, limit: 25 });

		expect(history.read).toHaveBeenCalledWith({ filter: {}, limit: 26, direction: 'backward' });
	});

	it('should cap at the limit and flag truncation', async () => {
		setup({ records: Array.from({ length: 6 }, (_, seq) => record({ seq })) });

		await responder.handleSearchLogs({ requestId: 'req-1', filter: {}, limit: 5 });

		const payload = published();
		expect(payload.records).toHaveLength(5);
		expect(payload.truncated).toBe(true);
	});

	it('should cap on payload size so a wide filter cannot blow the pubsub ceiling', async () => {
		// 2000 records of ~1 KiB each is far more than the byte budget allows.
		setup({
			records: Array.from({ length: 2000 }, (_, seq) => record({ seq, message: 'x'.repeat(1024) })),
		});

		await responder.handleSearchLogs({ requestId: 'req-1', filter: {}, limit: 2000 });

		const payload = published();
		expect(payload.truncated).toBe(true);
		expect(payload.records.length).toBeLessThan(2000);
		expect(JSON.stringify(payload).length).toBeLessThan(MAX_PUBSUB_PAYLOAD_BYTES);
	});

	it('should answer empty rather than going silent when history is disabled', async () => {
		setup({ historyEnabled: false });

		await responder.handleSearchLogs({ requestId: 'req-1', filter: {}, limit: 10 });

		expect(history.read).not.toHaveBeenCalled();
		expect(published()).toEqual({
			requestId: 'req-1',
			hostId: HOST_ID,
			records: [],
			truncated: false,
		});
	});

	it('should answer empty rather than throwing when the local read fails', async () => {
		history.read.mockRejectedValue(new Error('EACCES'));

		await responder.handleSearchLogs({ requestId: 'req-1', filter: {}, limit: 10 });

		expect(published().records).toEqual([]);
	});

	it('should swallow a publish failure rather than taking the host down', async () => {
		publisher.publishWorkerResponse.mockRejectedValue(new Error('Redis unreachable'));

		await expect(
			responder.handleSearchLogs({ requestId: 'req-1', filter: {}, limit: 10 }),
		).resolves.toBeUndefined();
	});

	it('should be inert outside queue mode', async () => {
		setup({ mode: 'regular' });

		await responder.handleSearchLogs({ requestId: 'req-1', filter: {}, limit: 10 });

		expect(publisher.publishWorkerResponse).not.toHaveBeenCalled();
	});
});
