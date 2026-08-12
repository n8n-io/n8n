import type { OperatorLogRecord } from '@n8n/api-types';

import type { OperatorConsoleEntry } from './operatorConsole.types';
import {
	HOST_COLOR_TOKENS,
	hostColorToken,
	recordsFromEntries,
	shortHostId,
	toJsonl,
} from './operatorConsole.utils';

function makeRecord(overrides: Partial<OperatorLogRecord> = {}): OperatorLogRecord {
	return {
		seq: 1,
		ts: '2026-05-04T09:12:33.482Z',
		hostId: 'main-1',
		role: 'main',
		stream: 'log',
		level: 'info',
		origin: 'live',
		message: 'hello',
		...overrides,
	};
}

describe('hostColorToken', () => {
	it('always returns a token from the palette', () => {
		for (const hostId of ['main-1', 'worker-abc', '', 'ζζζ']) {
			expect(HOST_COLOR_TOKENS).toContain(hostColorToken(hostId));
		}
	});

	it('is stable for the same host', () => {
		expect(hostColorToken('worker-7')).toBe(hostColorToken('worker-7'));
	});
});

describe('shortHostId', () => {
	it('leaves short ids alone', () => {
		expect(shortHostId('main-1')).toBe('main-1');
	});

	it('elides long ids', () => {
		expect(shortHostId('worker-0123456789abcdef')).toBe('worker-0123…');
	});
});

describe('recordsFromEntries', () => {
	it('drops markers so a download contains only real log lines', () => {
		const entries: OperatorConsoleEntry[] = [
			{ kind: 'marker', id: 'm1', marker: 'gap' },
			{ kind: 'record', id: 'r1', record: makeRecord({ message: 'a' }) },
			{ kind: 'marker', id: 'm2', marker: 'dropped', count: 2 },
			{ kind: 'record', id: 'r2', record: makeRecord({ message: 'b' }) },
		];

		expect(recordsFromEntries(entries).map((record) => record.message)).toEqual(['a', 'b']);
	});
});

describe('toJsonl', () => {
	it('emits one JSON object per line', () => {
		const lines = toJsonl([makeRecord({ message: 'a' }), makeRecord({ message: 'b' })]).split('\n');

		expect(lines).toHaveLength(2);
		expect(JSON.parse(lines[0])).toMatchObject({ message: 'a' });
		expect(JSON.parse(lines[1])).toMatchObject({ message: 'b' });
	});

	it('returns an empty string for an empty buffer', () => {
		expect(toJsonl([])).toBe('');
	});
});
