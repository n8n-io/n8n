/**
 * The binary data store of the fallback host: n8n-core's own
 * `BinaryDataService` in n8n's filesystem mode, with the binary data settings of
 * the n8n instance (`N8N_DEFAULT_BINARY_DATA_MODE`, `N8N_BINARY_DATA_STORAGE_PATH`,
 * else `<n8n folder>/storage`).
 *
 * With the store, a node that makes binary data writes a file under
 * `workflows/<workflow id>/executions/<execution id>/binary_data/` and gives an
 * entry with n8n's `id` (`filesystem-v2:…`), as n8n does. The host reads an
 * entry with an `id` from the store when a node needs its bytes.
 *
 * `WF_FALLBACK_BINARY_STORE=off` turns the store off: binary data then stays
 * in the items as base64, as in n8n's `default` mode. Until the runtime reads
 * references itself, the host also gives the base64 data of a stored entry
 * (`WF_FALLBACK_BINARY_REFS=1` leaves it out).
 */
import { createRequire } from 'node:module';

import type { JsonObject } from './protocol';
import { isJsonObject } from './protocol';
import { BINARY_KEY } from './binary';

/** The part of n8n-core's `BinaryDataService` that the host uses. */
interface BinaryDataServiceLike {
	init(): Promise<void>;
	getAsBuffer(binaryData: { id?: string; data: string; mimeType: string }): Promise<Buffer>;
	deleteMany(
		locations: Array<{ type: 'execution'; workflowId: string; executionId: string }>,
	): Promise<void>;
}

interface Container {
	get(type: unknown): unknown;
}

function isService(value: unknown): value is BinaryDataServiceLike {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof Reflect.get(value, 'init') === 'function' &&
		typeof Reflect.get(value, 'getAsBuffer') === 'function' &&
		typeof Reflect.get(value, 'deleteMany') === 'function'
	);
}

function isContainer(value: unknown): value is Container {
	return (
		typeof value === 'object' && value !== null && typeof Reflect.get(value, 'get') === 'function'
	);
}

let store: Promise<BinaryDataServiceLike | undefined> | undefined;

/** The production executions that the host saw, by runtime id. The oldest go first. */
const productionRuns = new Set<string>();
const MAX_PRODUCTION_RUNS = 10_000;

/** Records the mode of an execution, from the step frame (`execution.mode`). */
export function registerExecution(executionId: string, mode: 'test' | 'production'): void {
	if (mode !== 'production') return;
	productionRuns.delete(executionId);
	productionRuns.add(executionId);
	if (productionRuns.size > MAX_PRODUCTION_RUNS) {
		const oldest = productionRuns.values().next().value;
		if (oldest !== undefined) productionRuns.delete(oldest);
	}
}

/**
 * The execution part of the location of binary data. A manual run has n8n's
 * execution id. A production run has the runtime's id, which n8n does not know
 * yet, so it has the prefix `wfrt-` and cannot be the id of an n8n execution.
 * When n8n saves the run, its dispatcher moves the files to n8n's id.
 */
export function storedExecutionId(executionId: string): string {
	return productionRuns.has(executionId) ? `wfrt-${executionId}` : executionId;
}

function storedLocation(location: unknown): unknown {
	if (typeof location !== 'object' || location === null) return location;
	const id: unknown = Reflect.get(location, 'executionId');
	if (Reflect.get(location, 'type') !== 'execution' || typeof id !== 'string') return location;
	return { ...location, executionId: storedExecutionId(id) };
}

/** The mode of the store: `filesystem` when it is on, else `default` (base64 in the items). */
export function binaryStoreMode(): 'filesystem' | 'default' {
	if (process.env.WF_FALLBACK_BINARY_STORE === 'off') return 'default';
	const mode = process.env.N8N_DEFAULT_BINARY_DATA_MODE;
	return mode === undefined || mode === '' || mode === 'filesystem' ? 'filesystem' : 'default';
}

/** True when the host leaves the base64 data out of stored entries (references only). */
export function referencesOnly(): boolean {
	return process.env.WF_FALLBACK_BINARY_REFS === '1';
}

/**
 * Starts n8n-core's binary data service once, in the DI container that n8n-core
 * uses, so `prepareBinaryData` and `getBinaryDataBuffer` of the nodes use it.
 */
export async function binaryStore(): Promise<BinaryDataServiceLike | undefined> {
	store ??= (async () => {
		if (binaryStoreMode() !== 'filesystem') return undefined;
		const hostRequire = createRequire(__filename);
		const core: unknown = hostRequire('n8n-core');
		// The DI container of n8n-core (its own copy of @n8n/di).
		const di: unknown = createRequire(hostRequire.resolve('n8n-core'))('@n8n/di');
		const Service =
			typeof core === 'object' && core ? Reflect.get(core, 'BinaryDataService') : undefined;
		const container = typeof di === 'object' && di ? Reflect.get(di, 'Container') : undefined;
		if (Service === undefined || !isContainer(container)) return undefined;
		const service = container.get(Service);
		if (!isService(service)) return undefined;
		await service.init();
		// A production run writes under its namespaced id (see storedExecutionId).
		for (const name of ['store', 'copyBinaryFile']) {
			const original: unknown = Reflect.get(service, name);
			if (typeof original !== 'function') continue;
			Reflect.set(service, name, async (location: unknown, ...rest: unknown[]) => {
				const result: unknown = await Reflect.apply(original, service, [
					storedLocation(location),
					...rest,
				]);
				return result;
			});
		}
		return service;
	})();
	return await store;
}

/**
 * Adds the base64 data to the stored entries of result items (`data` is the mode
 * name there), unless the runtime takes references only.
 */
export async function inlineStoredBinary(items: JsonObject[]): Promise<void> {
	if (referencesOnly()) return;
	const service = await binaryStore();
	if (!service) return;
	for (const item of items) {
		const binary = item[BINARY_KEY];
		if (!isJsonObject(binary)) continue;
		for (const entry of Object.values(binary)) {
			if (!isJsonObject(entry) || typeof entry.id !== 'string') continue;
			if (typeof entry.mimeType !== 'string') continue;
			const buffer = await service.getAsBuffer({
				id: entry.id,
				data: '',
				mimeType: entry.mimeType,
			});
			entry.data = buffer.toString('base64');
		}
	}
}

/** Deletes the binary data of an execution, as n8n's pruning does for an execution it deletes. */
export async function deleteExecutionBinaryData(
	workflowId: string,
	executionId: string,
): Promise<void> {
	const service = await binaryStore();
	if (!service) return;
	await service.deleteMany([{ type: 'execution', workflowId, executionId }]);
}
