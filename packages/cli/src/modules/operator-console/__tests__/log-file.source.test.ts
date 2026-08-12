import type { OperatorLogFilter, OperatorLogRecord } from '@n8n/api-types';
import type { GlobalConfig, InstanceSettingsConfig } from '@n8n/config';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { LogFileSource } from '../sources/log-file.source';

/** One line as `jsonConsoleFormat` writes it: everything but level/message nested. */
const line = (
	message: string,
	overrides: { level?: string; scopes?: string[]; executionId?: string; ts?: string } = {},
) =>
	JSON.stringify({
		level: overrides.level ?? 'info',
		message,
		metadata: {
			timestamp: overrides.ts ?? '2026-08-12T10:00:00.000Z',
			...(overrides.scopes ? { scopes: overrides.scopes } : {}),
			...(overrides.executionId ? { executionId: overrides.executionId } : {}),
			file: 'thing.ts',
		},
	});

describe('LogFileSource', () => {
	let dir: string;
	let source: LogFileSource;

	const messages = (records: OperatorLogRecord[]) => records.map((r) => r.message);

	beforeEach(async () => {
		dir = await mkdtemp(path.join(tmpdir(), 'oc-logs-'));

		const globalConfig = mock<GlobalConfig>({
			logging: { file: { location: path.join(dir, 'n8n.log') } },
		} as unknown as GlobalConfig);

		source = new LogFileSource(
			globalConfig,
			mock<InstanceSettingsConfig>({ n8nFolder: dir }),
			mock<InstanceSettings>({ hostId: 'main-1', instanceType: 'main' }),
		);

		// Identity redactor: redaction itself is the capture layer's concern; here
		// we only assert that reads are routed through it.
		source.setRedactor((record) => record);
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	const writeLog = async (name: string, lines: string[]) =>
		await writeFile(path.join(dir, name), lines.join('\n') + '\n');

	describe('rotation ordering', () => {
		test('treats the highest-numbered file as newest, not the lowest', async () => {
			// Winston's File transport keeps writing to a higher index as it rotates,
			// so `n8n.log` is the OLDEST file — the reverse of logrotate.
			await writeLog('n8n.log', [line('oldest')]);
			await writeLog('n8n1.log', [line('middle')]);
			await writeLog('n8n2.log', [line('newest')]);

			const { records } = await source.read({ filter: {}, limit: 10 });

			expect(messages(records)).toEqual(['oldest', 'middle', 'newest']);
		});

		test('ignores unrelated files in the log directory', async () => {
			await writeLog('n8n.log', [line('kept')]);
			await writeLog('other.log', [line('ignored')]);
			await writeLog('n8n.log.gz', [line('also ignored')]);

			const { records } = await source.read({ filter: {}, limit: 10 });

			expect(messages(records)).toEqual(['kept']);
		});
	});

	describe('backward reads', () => {
		test('returns the most recent lines when no cursor is given', async () => {
			await writeLog(
				'n8n.log',
				['a', 'b', 'c', 'd', 'e'].map((m) => line(m)),
			);

			const { records } = await source.read({ filter: {}, limit: 2 });

			expect(messages(records)).toEqual(['d', 'e']);
		});

		test('spans rotated files when one file has too few lines', async () => {
			await writeLog('n8n.log', [line('a'), line('b')]);
			await writeLog('n8n1.log', [line('c')]);

			const { records } = await source.read({ filter: {}, limit: 3 });

			expect(messages(records)).toEqual(['a', 'b', 'c']);
		});
	});

	describe('forward reads', () => {
		test('resumes strictly after the cursor', async () => {
			await writeLog(
				'n8n.log',
				['a', 'b', 'c'].map((m) => line(m)),
			);

			const first = await source.read({ filter: {}, limit: 1, direction: 'forward' });
			const second = await source.read({
				filter: {},
				limit: 10,
				direction: 'forward',
				since: first.nextCursor,
			});

			expect(messages(first.records)).toEqual(['a']);
			expect(messages(second.records)).toEqual(['b', 'c']);
		});
	});

	describe('gap reporting', () => {
		test('flags a gap when the cursor predates the oldest surviving file', async () => {
			// n8n.log has been rotated away; the oldest remaining is n8n5.log.
			await writeLog('n8n5.log', [line('survivor')]);

			const { gap } = await source.read({ filter: {}, limit: 10, since: 'file:0' });

			expect(gap).toBe(true);
		});

		test('reports no gap when the cursor is still covered', async () => {
			await writeLog('n8n.log', [line('a'), line('b')]);

			const { nextCursor } = await source.read({ filter: {}, limit: 1, direction: 'forward' });
			const { gap } = await source.read({ filter: {}, limit: 10, since: nextCursor });

			expect(gap).toBe(false);
		});
	});

	describe('parsing', () => {
		test('lifts winston metadata into named fields', async () => {
			await writeLog('n8n.log', [
				line('boom', { level: 'error', scopes: ['scaling'], executionId: '42' }),
			]);

			const { records } = await source.read({ filter: {}, limit: 1 });

			expect(records[0]).toMatchObject({
				level: 'error',
				scope: 'scaling',
				executionId: '42',
				origin: 'file',
				stream: 'log',
				hostId: 'main-1',
				role: 'main',
				ts: '2026-08-12T10:00:00.000Z',
			});
			// Lifted keys must not be duplicated back into `meta`.
			expect(records[0].meta).toEqual({ file: 'thing.ts' });
		});

		test('skips a torn final line rather than throwing', async () => {
			// The transport may be mid-write when we read.
			await writeFile(path.join(dir, 'n8n.log'), line('complete') + '\n' + '{"level":"in');

			const { records } = await source.read({ filter: {}, limit: 10 });

			expect(messages(records)).toEqual(['complete']);
		});
	});

	describe('filtering', () => {
		test('applies level, scope, execution and grep filters', async () => {
			await writeLog('n8n.log', [
				line('quiet', { level: 'debug' }),
				line('loud', { level: 'error', executionId: '7' }),
				line('scoped', { level: 'warn', scopes: ['redis'] }),
			]);

			const read = async (filter: OperatorLogFilter) =>
				messages((await source.read({ filter, limit: 10 })).records);

			expect(await read({ minLevel: 'warn' })).toEqual(['loud', 'scoped']);
			expect(await read({ executionId: '7' })).toEqual(['loud']);
			expect(await read({ scopes: ['redis'] })).toEqual(['scoped']);
			expect(await read({ grep: 'LOU' })).toEqual(['loud']);
		});
	});

	describe('redaction', () => {
		test('routes every record through the configured redactor', async () => {
			await writeLog('n8n.log', [line('token=abc123')]);
			source.setRedactor((record) => ({ ...record, message: '[redacted]' }));

			const { records } = await source.read({ filter: {}, limit: 10 });

			expect(messages(records)).toEqual(['[redacted]']);
		});

		test('refuses to read at all when no redactor was configured', async () => {
			// n8n.log is unredacted at rest, so a wiring mistake must fail loudly
			// rather than silently leaking — especially into the AI snapshot path.
			await writeLog('n8n.log', [line('secret')]);
			const unconfigured = new LogFileSource(
				mock<GlobalConfig>({
					logging: { file: { location: path.join(dir, 'n8n.log') } },
				} as unknown as GlobalConfig),
				mock<InstanceSettingsConfig>({ n8nFolder: dir }),
				mock<InstanceSettings>({ hostId: 'main-1', instanceType: 'main' }),
			);

			await expect(unconfigured.read({ filter: {}, limit: 10 })).rejects.toThrow('redactor');
		});
	});
});
