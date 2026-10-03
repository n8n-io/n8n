import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { versionsOf } from '../../../nodes-base-next/dist/registry.js';
import {
	resolveRuntime,
	type RuntimeAvailability,
	type RuntimeLists,
	type RuntimePolicy,
	type RuntimeRequest,
} from '../runtime-policy';
import type { ContractOrigin } from '../runtime';
import { policyExecutorLoader, type GuestRuntime } from '../sandbox';

const LISTS: RuntimeLists = {
	'first-party': ['worker', 'in-process', 'wasm', 'container'],
	community: ['wasm', 'container'],
	private: ['container', 'wasm'],
};
const ALL: RuntimeAvailability = { missing: {}, containerOci: 'runsc' };
const NO_WASM = 'wasm is not available: the sandbox sidecar is not installed';
const NO_CONTAINER = 'container is not enabled';

const resolve = (request: Partial<RuntimeRequest>) =>
	resolveRuntime({
		version: 'slack.message.send@1.2.0',
		trust: 'community',
		needs: 'web',
		kind: 'action',
		lists: LISTS,
		available: ALL,
		...request,
	});

describe('resolveRuntime', () => {
	it.each<[string, Partial<RuntimeRequest>, string]>([
		['first-party web', { trust: 'first-party' }, 'worker'],
		['community web', {}, 'wasm'],
		['private web by its own list', { trust: 'private' }, 'container'],
		[
			'community web without wasm',
			{ available: { missing: { wasm: NO_WASM }, containerOci: 'runsc' } },
			'container',
		],
		[
			'first-party image on runc',
			{ trust: 'first-party', needs: 'image', available: { missing: {}, containerOci: 'runc' } },
			'container',
		],
		['community image on runsc', { needs: 'image' }, 'container'],
		['first-party trigger', { trust: 'first-party', kind: 'trigger' }, 'in-process'],
		[
			'community web with the worker override',
			{ lists: { ...LISTS, community: ['worker', 'wasm'] } },
			'worker',
		],
		['community trigger', { kind: 'trigger' }, 'wasm'],
		[
			'community trigger with the in-process override',
			{ kind: 'trigger', lists: { ...LISTS, community: ['in-process', 'wasm'] } },
			'in-process',
		],
	])('runs %s in its runtime', (_, request, runtime) => {
		expect(resolve(request)).toEqual({ runtime });
	});

	it.each<[string, Partial<RuntimeRequest>, string]>([
		[
			'community web without wasm and container',
			{ available: { missing: { wasm: NO_WASM, container: NO_CONTAINER } } },
			`slack.message.send@1.2.0 (community) needs one of wasm, container; ${NO_WASM}; ${NO_CONTAINER}`,
		],
		[
			'community web without wasm on runc',
			{ available: { missing: { wasm: NO_WASM }, containerOci: 'runc' } },
			`slack.message.send@1.2.0 (community) needs one of wasm, container; ${NO_WASM}; container runs community nodes only with runsc, and docker has runc`,
		],
		[
			'community image on runc',
			{ needs: 'image', available: { missing: {}, containerOci: 'runc' } },
			'slack.message.send@1.2.0 (community, image) needs container; container runs community nodes only with runsc, and docker has runc',
		],
		[
			'first-party image without container',
			{ trust: 'first-party', needs: 'image', available: { missing: { container: NO_CONTAINER } } },
			`slack.message.send@1.2.0 (first-party, image) needs container; ${NO_CONTAINER}`,
		],
		[
			'private web on runc',
			{ trust: 'private', available: { missing: { wasm: NO_WASM }, containerOci: 'runc' } },
			`slack.message.send@1.2.0 (private) needs one of container, wasm; container runs private nodes only with runsc, and docker has runc; ${NO_WASM}`,
		],
		[
			'community trigger with only container',
			{ kind: 'trigger', lists: { ...LISTS, community: ['container'] } },
			'slack.message.send@1.2.0 (community trigger) needs one of in-process, wasm; community nodes may not use in-process or wasm',
		],
	])('refuses %s', (_, request, error) => {
		expect(resolve(request)).toEqual({ error });
	});
});

describe('policyExecutorLoader', () => {
	const cacheDir = mkdtempSync(path.join(tmpdir(), 'runtime-policy-'));
	afterAll(() => rmSync(cacheDir, { recursive: true, force: true }));

	const [head] = versionsOf('httpRequest.send');
	// A runtime that names itself in its start error, so a load shows which runtime it chose.
	const named =
		(name: string): (() => GuestRuntime) =>
		() => ({
			name,
			start: async () => await Promise.reject(new Error(`started ${name}`)),
		});
	const policy = (overrides: Partial<RuntimePolicy> = {}): RuntimePolicy => ({
		lists: LISTS,
		available: ALL,
		runtimes: { worker: named('worker'), wasm: named('wasm'), container: named('container') },
		...overrides,
	});
	const load = async (loaderPolicy: RuntimePolicy, origin: ContractOrigin) =>
		await policyExecutorLoader(loaderPolicy, { cacheDir, credentialType: () => undefined })({
			...head!,
			origin,
		});

	it('runs first-party web in the worker', async () => {
		await expect(load(policy(), 'first-party')).rejects.toThrow('started worker');
	});

	it('runs community web in wasm and private web in a container, by the origin', async () => {
		await expect(load(policy(), 'community')).rejects.toThrow('started wasm');
		await expect(load(policy(), 'private')).rejects.toThrow('started container');
	});

	it('names what is missing when no allowed runtime is available', async () => {
		const available = { missing: { wasm: NO_WASM, container: NO_CONTAINER } };
		await expect(load(policy({ available }), 'community')).rejects.toThrow(
			`httpRequest.send@${head!.manifest.semver} (community) needs one of wasm, container; ${NO_WASM}; ${NO_CONTAINER}`,
		);
	});

	it('logs the runtime of each version it loads', async () => {
		const log = vi.fn();
		await expect(load(policy({ log }), 'community')).rejects.toThrow('started wasm');
		expect(log).toHaveBeenCalledExactlyOnceWith(
			`httpRequest.send@${head!.manifest.semver} (community) runs in wasm`,
		);
	});

	it('runs a community trigger in wasm and a first-party trigger in this process', async () => {
		const [trigger] = versionsOf('notion.dataSource.pageAdded');
		const loadTrigger = async (origin: ContractOrigin) =>
			await policyExecutorLoader(policy(), { cacheDir, credentialType: () => undefined })({
				...trigger!,
				origin,
			});
		await expect(loadTrigger('community')).rejects.toThrow('started wasm');
		await expect(loadTrigger('first-party')).resolves.toBeInstanceOf(Function);
	});

	it('runs in-process in this process', async () => {
		const lists = { ...LISTS, 'first-party': ['in-process' as const] };
		await expect(load(policy({ lists }), 'first-party')).resolves.toBeInstanceOf(Function);
	});
});
