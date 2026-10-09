import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { firstPartyRuntime, firstPartyVersionsOf as versionsOf } from './first-party';
import type { CredentialManifest } from '../manifest';
import {
	credentialRuntimeNameOf,
	resolveRuntime,
	runtimeNameOf,
	type RuntimeAvailability,
	type RuntimeLists,
	type RuntimePolicy,
	type RuntimeRequest,
} from '../runtime-policy';
import { hostRuntime, type ContractOrigin } from '../runtime';
import { policyCredentialTypeLoader, policyExecutorLoader, type GuestRuntime } from '../sandbox';
import { sha256 } from '../version';

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
		['first-party HTTP guest', { trust: 'first-party', needs: 'http-guest' }, 'in-process'],
		['first-party WASM component', { trust: 'first-party', needs: 'component' }, 'wasm'],
		['private WASM component', { trust: 'private', needs: 'component' }, 'wasm'],
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
		[
			'a WASM component in in-process, worker or container',
			{
				trust: 'first-party',
				needs: 'component',
				lists: { ...LISTS, 'first-party': ['in-process', 'worker', 'container'] },
			},
			'slack.message.send@1.2.0 (first-party, WASM component) needs wasm; first-party nodes may not use wasm',
		],
		[
			'a WASM component without wasm',
			{ needs: 'component', available: { missing: { wasm: NO_WASM } } },
			`slack.message.send@1.2.0 (community, WASM component) needs wasm; ${NO_WASM}`,
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
		await policyExecutorLoader(loaderPolicy, { cacheDir, credentialType: () => undefined })(
			{ ...head!, origin },
			hostRuntime(),
		);

	it('runs first-party web in the worker', async () => {
		await expect(load(policy(), 'first-party')).rejects.toThrow('started worker');
	});

	it('runs community web in wasm and private web in a container, by the origin', async () => {
		await expect(load(policy(), 'community')).rejects.toThrow('started wasm');
		await expect(load(policy(), 'private')).rejects.toThrow('started container');
	});

	it('runs a private HTTP guest version in this process', () => {
		const manifest = { ...head!.manifest, guest: 'http' as const };
		expect(runtimeNameOf(policy(), { manifest, origin: 'private' })).toBe('in-process');
		expect(runtimeNameOf(policy(), { manifest: head!.manifest, origin: 'private' })).toBe(
			'container',
		);
	});

	it('runs a WASM component only in wasm', () => {
		const manifest = { ...head!.manifest, guest: 'component' as const };
		const lists = { ...LISTS, 'first-party': ['in-process', 'worker', 'container'] as const };
		expect(runtimeNameOf(policy(), { manifest, origin: 'first-party' })).toBe('wasm');
		expect(() => runtimeNameOf(policy({ lists }), { manifest, origin: 'first-party' })).toThrow(
			'(first-party, WASM component) needs wasm; first-party nodes may not use wasm',
		);
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
			await policyExecutorLoader(policy(), { cacheDir, credentialType: () => undefined })(
				{ ...trigger!, origin },
				firstPartyRuntime(),
			);
		await expect(loadTrigger('community')).rejects.toThrow('started wasm');
		await expect(loadTrigger('first-party')).resolves.toBeInstanceOf(Function);
	});

	it('runs in-process in this process', async () => {
		const lists = { ...LISTS, 'first-party': ['in-process' as const] };
		await expect(load(policy({ lists }), 'first-party')).resolves.toBeInstanceOf(Function);
	});
});

describe('the runtime of a credential bundle', () => {
	const cacheDir = mkdtempSync(path.join(tmpdir(), 'runtime-policy-credential-'));
	afterAll(() => rmSync(cacheDir, { recursive: true, force: true }));

	const bundle =
		'module.exports = { default: { scheme: { sign: (fields, request) => ({ ...request, headers: { "x-key": "k" } }) } } };';
	const manifest: CredentialManifest = {
		kind: 'credential',
		id: 'acme.oauth2',
		name: 'acmeOAuth2Api',
		semver: '1.0.0',
		nodeContract: '2.13.0',
		displayName: 'Acme OAuth2 API',
		fields: { type: 'object', properties: {} },
		scheme: { kind: 'custom', reason: 'The API signs each request.' },
		bundleHash: sha256(bundle),
		hooks: ['sign'],
	};
	const runtimeOf = (lists: Partial<RuntimeLists>, origin: ContractOrigin) =>
		credentialRuntimeNameOf({ lists: { ...LISTS, ...lists } }, { manifest, origin });

	it('reads a sandboxed entry of the list as a worker, and in-process only for first-party', () => {
		expect(runtimeOf({}, 'first-party')).toBe('in-process');
		expect(runtimeOf({ 'first-party': ['container'] }, 'first-party')).toBe('worker');
		expect(runtimeOf({}, 'community')).toBe('worker');
		expect(runtimeOf({ community: ['in-process', 'worker'] }, 'community')).toBe('worker');
		expect(runtimeOf({ private: ['container'] }, 'private')).toBe('worker');
	});

	it('refuses in-process for a community or a private credential', () => {
		const refusal = (origin: ContractOrigin) =>
			`acme.oauth2@1.0.0 (${origin} credential) needs a worker: the ${origin} runtime list has no worker, wasm or container, and a credential may use in-process only when it is first-party`;
		expect(() => runtimeOf({ community: ['in-process'] }, 'community')).toThrow(
			refusal('community'),
		);
		expect(() => runtimeOf({ private: ['in-process'] }, 'private')).toThrow(refusal('private'));
	});

	it('runs a first-party credential in this process and a community one in the worker', async () => {
		const log = vi.fn();
		const loader = policyCredentialTypeLoader(
			{
				lists: LISTS,
				available: ALL,
				log,
				runtimes: {
					worker: () => ({
						name: 'worker',
						start: async () => await Promise.reject(new Error('started worker')),
					}),
				},
			},
			{ cacheDir },
		);
		const signOf = async (origin: ContractOrigin) => {
			const { scheme } = await loader(manifest, { origin, bundle });
			if (scheme.kind !== 'custom') throw new Error('no custom scheme');
			return await scheme.sign({}, { url: 'https://acme.test/x' });
		};
		await expect(signOf('first-party')).resolves.toEqual({
			url: 'https://acme.test/x',
			headers: { 'x-key': 'k' },
		});
		await expect(signOf('community')).rejects.toThrow('started worker');
		expect(log.mock.calls).toEqual([
			['acme.oauth2@1.0.0 (first-party credential) runs in in-process'],
			['acme.oauth2@1.0.0 (community credential) runs in worker'],
		]);
	});
});
