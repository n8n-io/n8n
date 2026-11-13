/**
 * The deduplication store of the fallback host: n8n's `DeduplicationHelper` of
 * the cli (`checkItemAndReturnIfNotProcessed` and the Remove Duplicates node
 * "across executions"), with a JSON file for each workflow and scope instead
 * of the `processed_data` table.
 *
 * This store is for the test bed only (`WF_FALLBACK_DEDUPLICATION=file`): the
 * files are not n8n's `processed_data` table, so the n8n UI does not show or
 * clear them. In an n8n instance the deduplication data stays in n8n's table:
 * without the option, each call goes to n8n as a `deduplication` service call
 * of the step (`ServiceDeduplicator`, spec 9.9).
 *
 * The files are under `WF_FALLBACK_DEDUPLICATION_DIR`, else
 * `<n8n user folder>/.n8n/deduplication`.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type {
	DeduplicationItemTypes,
	DeduplicationMode,
	DeduplicationScope,
	ICheckProcessedContextData,
	ICheckProcessedOptions,
	IDataDeduplicator,
	IDeduplicationOutput,
} from 'n8n-workflow';
import { tryToParseDateTime, UserError } from 'n8n-workflow';

import { callService } from './service-calls';

/** The stored value of one workflow and scope, as n8n's `processed_data.value`. */
interface Stored {
	mode: DeduplicationMode;
	/** The hashes (mode `entries`), or the latest value (the `latest…` modes). */
	data: string[] | DeduplicationItemTypes;
}

class DeduplicationError extends UserError {}

function storeDir(): string {
	const configured = process.env.WF_FALLBACK_DEDUPLICATION_DIR;
	if (configured) return configured;
	const user = process.env.N8N_USER_FOLDER ?? homedir();
	return join(user, '.n8n', 'deduplication');
}

function contextOf(scope: DeduplicationScope, contextData: ICheckProcessedContextData): string {
	if (scope === 'node') {
		if (!contextData.node) {
			throw new DeduplicationError(
				"No node information has been provided and so cannot use scope 'node'",
			);
		}
		// The node id, so the data stays when the node gets a new name.
		return `n:${contextData.node.id}`;
	}
	return '';
}

function fileOf(scope: DeduplicationScope, contextData: ICheckProcessedContextData): string {
	const key = `${contextData.workflow.id}\n${contextOf(scope, contextData)}`;
	return join(storeDir(), `${createHash('sha256').update(key).digest('hex')}.json`);
}

function isStored(value: unknown): value is Stored {
	return typeof value === 'object' && value !== null && 'mode' in value && 'data' in value;
}

function read(file: string): Stored | null {
	try {
		const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
		return isStored(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

function write(file: string, value: Stored): void {
	mkdirSync(storeDir(), { recursive: true });
	writeFileSync(file, JSON.stringify(value));
}

function hashOf(value: DeduplicationItemTypes): string {
	return createHash('md5').update(value.toString()).digest('base64');
}

function compare(
	mode: DeduplicationMode,
	a: DeduplicationItemTypes,
	b: DeduplicationItemTypes,
): 1 | 0 | -1 {
	if (mode === 'latestIncrementalKey') {
		const x = Number(a);
		const y = Number(b);
		if (!Number.isNaN(x) && !Number.isNaN(y)) return x === y ? 0 : x > y ? 1 : -1;
		throw new DeduplicationError(
			'Invalid value. Only numbers are supported in mode "latestIncrementalKey"',
		);
	}
	if (mode === 'latestDate') {
		try {
			const x = tryToParseDateTime(a);
			const y = tryToParseDateTime(b);
			return x === y ? 0 : x > y ? 1 : -1;
		} catch {
			throw new DeduplicationError(
				'Invalid value. Only valid dates are supported in mode "latestDate"',
			);
		}
	}
	throw new DeduplicationError(
		"Invalid mode. Only 'latestIncrementalKey' and 'latestDate' are supported.",
	);
}

const isLatestMode = (mode: DeduplicationMode) =>
	mode === 'latestIncrementalKey' || mode === 'latestDate';

/** `IDataDeduplicator` with the rules of the cli's `DeduplicationHelper`. */
export class FileDeduplicator implements IDataDeduplicator {
	async checkProcessedAndRecord(
		items: DeduplicationItemTypes[],
		scope: DeduplicationScope,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<IDeduplicationOutput> {
		if (!contextData.workflow.id) throw new DeduplicationError('The workflow has no id');
		const file = fileOf(scope, contextData);
		const stored = read(file);
		if (stored && stored.mode !== options.mode) {
			throw new DeduplicationError(
				'Deduplication data was originally saved with an incompatible setting of the ‘Keep Items Where’ parameter. Try ’Clean Database’ operation to reset.',
			);
		}
		if (isLatestMode(options.mode)) {
			const sorted = items.slice().sort((a, b) => compare(options.mode, a, b));
			if (!stored) {
				const latest = sorted.pop();
				if (latest !== undefined) write(file, { mode: options.mode, data: latest });
				return { new: items, processed: [] };
			}
			const out: IDeduplicationOutput = { new: [], processed: [] };
			if (Array.isArray(stored.data)) return out;
			const previous = stored.data;
			let largest = previous;
			for (const item of sorted) {
				if (compare(options.mode, item, previous) === 1) {
					out.new.push(item);
					if (compare(options.mode, item, largest) === 1) largest = item;
				} else {
					out.processed.push(item);
				}
			}
			write(file, { mode: options.mode, data: largest });
			return out;
		}
		const hashes = items.map(hashOf);
		if (!stored) {
			if (options.maxEntries) hashes.splice(0, hashes.length - options.maxEntries);
			write(file, { mode: options.mode, data: hashes });
			return { new: items, processed: [] };
		}
		const out: IDeduplicationOutput = { new: [], processed: [] };
		if (!Array.isArray(stored.data)) return out;
		const known = new Set(stored.data);
		const data = [...stored.data];
		hashes.forEach((hash, index) => {
			if (known.has(hash)) {
				out.processed.push(items[index]);
			} else {
				out.new.push(items[index]);
				data.push(hash);
			}
		});
		if (options.maxEntries) data.splice(0, data.length - options.maxEntries);
		write(file, { mode: options.mode, data });
		return out;
	}

	async removeProcessed(
		items: DeduplicationItemTypes[],
		scope: DeduplicationScope,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<void> {
		if (isLatestMode(options.mode)) {
			throw new DeduplicationError('Removing processed data is not possible in mode "latest"');
		}
		const file = fileOf(scope, contextData);
		const stored = read(file);
		if (!stored || !Array.isArray(stored.data)) return;
		const data = [...stored.data];
		for (const hash of items.map(hashOf)) {
			const index = data.indexOf(hash);
			if (index !== -1) data.splice(index, 1);
		}
		write(file, { mode: stored.mode, data });
	}

	async clearAllProcessedItems(
		scope: DeduplicationScope,
		contextData: ICheckProcessedContextData,
	): Promise<void> {
		rmSync(fileOf(scope, contextData), { force: true });
	}

	async getProcessedDataCount(
		scope: DeduplicationScope,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<number> {
		const stored = read(fileOf(scope, contextData));
		return options.mode === 'entries' && stored && Array.isArray(stored.data)
			? stored.data.length
			: 0;
	}
}

/**
 * The args of a `deduplication` call: n8n runs it for the workflow of the
 * execution. They go to `wfrt` as JSON.
 */
function callArgs(
	scope: DeduplicationScope,
	contextData: ICheckProcessedContextData,
	options: ICheckProcessedOptions | undefined,
	items?: DeduplicationItemTypes[],
): object {
	return {
		...(items ? { items } : {}),
		scope,
		...(contextData.node ? { node: { id: contextData.node.id } } : {}),
		options: options ?? {},
	};
}

function isOutput(value: unknown): value is IDeduplicationOutput {
	return (
		typeof value === 'object' &&
		value !== null &&
		Array.isArray(Reflect.get(value, 'new')) &&
		Array.isArray(Reflect.get(value, 'processed'))
	);
}

/**
 * `IDataDeduplicator` over n8n's store: each call is a `deduplication`
 * service call of the running step, which n8n answers with its
 * `DeduplicationHelper` on `processed_data`.
 */
export class ServiceDeduplicator implements IDataDeduplicator {
	async checkProcessedAndRecord(
		items: DeduplicationItemTypes[],
		scope: DeduplicationScope,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<IDeduplicationOutput> {
		const result = await callService(
			'deduplication',
			'checkProcessedAndRecord',
			callArgs(scope, contextData, options, items),
		);
		if (!isOutput(result)) throw new DeduplicationError('The deduplication service gave no result');
		return result;
	}

	async removeProcessed(
		items: DeduplicationItemTypes[],
		scope: DeduplicationScope,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<void> {
		await callService(
			'deduplication',
			'removeProcessed',
			callArgs(scope, contextData, options, items),
		);
	}

	async clearAllProcessedItems(
		scope: DeduplicationScope,
		contextData: ICheckProcessedContextData,
		options?: ICheckProcessedOptions,
	): Promise<void> {
		await callService(
			'deduplication',
			'clearAllProcessedItems',
			callArgs(scope, contextData, options),
		);
	}

	async getProcessedDataCount(
		scope: DeduplicationScope,
		contextData: ICheckProcessedContextData,
		options: ICheckProcessedOptions,
	): Promise<number> {
		const result = await callService(
			'deduplication',
			'getProcessedDataCount',
			callArgs(scope, contextData, options),
		);
		return typeof result === 'number' ? result : 0;
	}
}

interface DeduplicationServiceClass {
	init(deduplicator: IDataDeduplicator): Promise<void>;
}

function isServiceClass(value: unknown): value is DeduplicationServiceClass {
	return typeof value === 'function' && typeof Reflect.get(value, 'init') === 'function';
}

let started: Promise<void> | undefined;

/**
 * Gives n8n-core's `DataDeduplicationService` its store, once for the process:
 * the file store when `WF_FALLBACK_DEDUPLICATION=file` (the test bed), else
 * n8n's own store through service calls.
 */
export async function startDeduplication(): Promise<void> {
	started ??= (async () => {
		const core: unknown = createRequire(__filename)('n8n-core');
		const service =
			typeof core === 'object' && core !== null
				? Reflect.get(core, 'DataDeduplicationService')
				: undefined;
		if (!isServiceClass(service)) return;
		try {
			await service.init(
				process.env.WF_FALLBACK_DEDUPLICATION === 'file'
					? new FileDeduplicator()
					: new ServiceDeduplicator(),
			);
		} catch {
			// Another part of the process started it already.
		}
	})();
	await started;
}
