import type {
	OperatorLogBatch,
	OperatorLogFilter,
	OperatorLogHost,
	OperatorLogLevel,
	OperatorLogReadResult,
	OperatorLogRecord,
	OperatorLogRole,
} from '@n8n/api-types';
import { OPERATOR_LOG_LEVELS } from '@n8n/api-types';
import { GlobalConfig, InstanceSettingsConfig, type LogScope } from '@n8n/config';
import { Service } from '@n8n/di';
import { createReadStream } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { InstanceSettings } from 'n8n-core';

import type { LogReadOptions, LogSource, RecordRedactor, Unsubscribe } from './log-source';

/** Lines per synthetic-seq file slot. Bounds a single file's addressable lines. */
const LINES_PER_FILE = 1_000_000_000;

const CURSOR_PREFIX = 'file:';

const LEVELS = new Set<string>(OPERATOR_LOG_LEVELS);

const LEVEL_RANK: Record<OperatorLogLevel, number> = { error: 0, warn: 1, info: 2, debug: 3 };

/** Keys winston puts in `metadata` that we lift into named fields. */
const LIFTED_META_KEYS = ['timestamp', 'scopes', 'executionId', 'workflowId', 'nodeName'];

type ParsedLine = {
	level?: unknown;
	message?: unknown;
	metadata?: Record<string, unknown>;
};

/**
 * Deep history, read from the rotated `n8n.log` set that the winston file
 * transport already writes. We deliberately do not write our own copy — see
 * `.agents/specs/operator-console.md`.
 *
 * Two consequences the caller must understand:
 *
 * - **Narrower content than the live tail.** This file holds `Logger` output
 *   only, so tee'd `console.log` from Code nodes is absent. Records are marked
 *   `origin: 'file'` so the UI can show the boundary instead of implying lines
 *   went missing.
 * - **Unredacted at rest.** The winston transport is not in our path, so every
 *   read goes through {@link RecordRedactor}.
 */
@Service()
export class LogFileSource implements LogSource {
	/**
	 * Defaults to a redactor that refuses to pass anything through, so a wiring
	 * mistake fails loudly instead of quietly leaking unredacted logs — including
	 * to the AI snapshot action, which ships content off-instance.
	 */
	private redactor: RecordRedactor = () => {
		throw new Error('LogFileSource used before a redactor was configured');
	};

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly instanceSettingsConfig: InstanceSettingsConfig,
		private readonly instanceSettings: InstanceSettings,
	) {}

	setRedactor(redactor: RecordRedactor) {
		this.redactor = redactor;
	}

	/**
	 * Live tail is not this source's job — it is the deep-history tier behind the
	 * ring buffer and the cross-host stream.
	 */
	subscribe(_filter: OperatorLogFilter, _onBatch: (batch: OperatorLogBatch) => void): Unsubscribe {
		return () => {};
	}

	async hosts(): Promise<OperatorLogHost[]> {
		return [
			{
				hostId: this.instanceSettings.hostId,
				role: this.role,
				lastSeenAt: new Date().toISOString(),
			},
		];
	}

	async read(options: LogReadOptions): Promise<OperatorLogReadResult> {
		const { filter, limit, since, direction = 'backward' } = options;

		const files = await this.listFiles();
		if (files.length === 0) return { records: [], nextCursor: '', gap: false };

		const from = since ? this.decodeCursor(since) : undefined;

		const records =
			direction === 'forward'
				? await this.readForward(files, from, filter, limit)
				: await this.readBackward(files, from, filter, limit);

		const oldestAvailable = files[0].index * LINES_PER_FILE;
		const gap = from !== undefined && from < oldestAvailable;

		// The cursor continues in the direction just read: forward pages resume
		// after the newest record, backward pages resume before the oldest.
		const edge = direction === 'forward' ? records[records.length - 1] : records[0];
		const nextCursor = edge ? this.encodeCursor(edge.seq) : (since ?? '');

		return { records, nextCursor, gap };
	}

	/** Records at or before `from`, newest last. Walks files newest → oldest. */
	private async readBackward(
		files: LogFile[],
		from: number | undefined,
		filter: OperatorLogFilter,
		limit: number,
	): Promise<OperatorLogRecord[]> {
		const collected: OperatorLogRecord[][] = [];
		let total = 0;

		for (let i = files.length - 1; i >= 0 && total < limit; i--) {
			const file = files[i];
			if (from !== undefined && file.index * LINES_PER_FILE > from) continue;

			// Keep only a trailing window per file — files are size-capped, but there
			// is no reason to hold a whole file in memory to return `limit` lines.
			const window: OperatorLogRecord[] = [];
			await this.scan(file, filter, (record) => {
				if (from !== undefined && record.seq > from) return 'stop';
				window.push(record);
				if (window.length > limit) window.shift();
				return 'continue';
			});

			if (window.length > 0) {
				collected.unshift(window);
				total += window.length;
			}
		}

		return collected.flat().slice(-limit);
	}

	/** Records strictly after `from`, oldest first. Walks files oldest → newest. */
	private async readForward(
		files: LogFile[],
		from: number | undefined,
		filter: OperatorLogFilter,
		limit: number,
	): Promise<OperatorLogRecord[]> {
		const out: OperatorLogRecord[] = [];

		for (const file of files) {
			if (out.length >= limit) break;
			if (from !== undefined && (file.index + 1) * LINES_PER_FILE <= from) continue;

			await this.scan(file, filter, (record) => {
				if (from !== undefined && record.seq <= from) return 'continue';
				out.push(record);
				return out.length >= limit ? 'stop' : 'continue';
			});
		}

		return out;
	}

	/** Streams one file line by line, emitting parsed, filtered, redacted records. */
	private async scan(
		file: LogFile,
		filter: OperatorLogFilter,
		onRecord: (record: OperatorLogRecord) => 'continue' | 'stop',
	) {
		const stream = createReadStream(file.path, { encoding: 'utf8' });
		const lines = createInterface({ input: stream, crlfDelay: Infinity });

		let lineNumber = 0;

		try {
			for await (const line of lines) {
				const seq = file.index * LINES_PER_FILE + lineNumber;
				lineNumber++;

				if (line.trim() === '') continue;

				const record = this.toRecord(line, seq);
				if (!record) continue;
				if (!this.matches(record, filter)) continue;

				if (onRecord(this.redactor(record)) === 'stop') break;
			}
		} finally {
			lines.close();
			stream.destroy();
		}
	}

	/**
	 * Maps one winston JSON line to a record. `jsonConsoleFormat` emits
	 * `{ level, message, metadata: { timestamp, scopes, ...rest } }` — everything
	 * except `level` and `message` is nested under `metadata` by `format.metadata()`.
	 *
	 * Returns `undefined` for anything unparseable rather than throwing: a
	 * truncated final line is normal while the transport is mid-write.
	 */
	private toRecord(line: string, seq: number): OperatorLogRecord | undefined {
		let parsed: ParsedLine;
		try {
			parsed = JSON.parse(line) as ParsedLine;
		} catch {
			return undefined;
		}

		const level = typeof parsed.level === 'string' ? parsed.level : undefined;
		if (!level || !LEVELS.has(level)) return undefined;

		const metadata = parsed.metadata ?? {};
		const scopes = metadata.scopes;

		const meta = Object.fromEntries(
			Object.entries(metadata).filter(([key]) => !LIFTED_META_KEYS.includes(key)),
		);

		return {
			seq,
			ts: typeof metadata.timestamp === 'string' ? metadata.timestamp : new Date(0).toISOString(),
			hostId: this.instanceSettings.hostId,
			role: this.role,
			stream: 'log',
			level: level as OperatorLogLevel,
			origin: 'file',
			scope:
				Array.isArray(scopes) && typeof scopes[0] === 'string'
					? (scopes[0] as LogScope)
					: undefined,
			executionId: typeof metadata.executionId === 'string' ? metadata.executionId : undefined,
			workflowId: typeof metadata.workflowId === 'string' ? metadata.workflowId : undefined,
			nodeName: typeof metadata.nodeName === 'string' ? metadata.nodeName : undefined,
			message: typeof parsed.message === 'string' ? parsed.message : String(parsed.message ?? ''),
			meta: Object.keys(meta).length > 0 ? meta : undefined,
		};
	}

	private matches(record: OperatorLogRecord, filter: OperatorLogFilter): boolean {
		if (filter.minLevel && LEVEL_RANK[record.level] > LEVEL_RANK[filter.minLevel]) return false;
		if (filter.scopes?.length && (!record.scope || !filter.scopes.includes(record.scope)))
			return false;
		if (filter.hostIds?.length && !filter.hostIds.includes(record.hostId)) return false;
		if (filter.roles?.length && !filter.roles.includes(record.role)) return false;
		if (filter.executionId && record.executionId !== filter.executionId) return false;
		if (filter.grep && !record.message.toLowerCase().includes(filter.grep.toLowerCase()))
			return false;
		return true;
	}

	/**
	 * Winston names rotated files `n8n.log`, `n8n1.log`, `n8n2.log`… where the
	 * *highest* index is the newest — the opposite of the logrotate convention.
	 * Returned oldest first.
	 */
	private async listFiles(): Promise<LogFile[]> {
		const { dir, base, ext } = this.resolveLogPath();

		let entries: string[];
		try {
			entries = await readdir(dir);
		} catch {
			return [];
		}

		const files: LogFile[] = [];

		for (const entry of entries) {
			if (!entry.startsWith(base) || !entry.endsWith(ext)) continue;

			const middle = entry.slice(base.length, entry.length - ext.length);
			if (middle !== '' && !/^\d+$/.test(middle)) continue;

			files.push({ index: middle === '' ? 0 : Number(middle), path: path.join(dir, entry) });
		}

		return files.sort((a, b) => a.index - b.index);
	}

	/** Mirrors `Logger.setFileTransport` so we read exactly what it writes. */
	private resolveLogPath() {
		const configured = this.globalConfig.logging.file.location;
		const location = path.isAbsolute(configured)
			? configured
			: path.join(this.instanceSettingsConfig.n8nFolder, configured);

		const ext = path.extname(location);

		return { dir: path.dirname(location), base: path.basename(location, ext), ext };
	}

	private get role(): OperatorLogRole {
		const type = this.instanceSettings.instanceType;
		return type === 'worker' || type === 'webhook' ? type : 'main';
	}

	private encodeCursor(seq: number) {
		return `${CURSOR_PREFIX}${seq}`;
	}

	private decodeCursor(cursor: string): number | undefined {
		const raw = cursor.startsWith(CURSOR_PREFIX) ? cursor.slice(CURSOR_PREFIX.length) : cursor;
		const seq = Number(raw);
		return Number.isFinite(seq) ? seq : undefined;
	}
}

type LogFile = { index: number; path: string };
