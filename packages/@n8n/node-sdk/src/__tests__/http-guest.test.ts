import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
	Expression,
	type IHttpRequestOptions,
	type INode,
	type IWorkflowDataProxyData,
} from 'n8n-workflow';

import { missingTitlesOf } from '../define';
import { packAction, packHttpGuest } from '../pack';
import { checkPublish } from '../publish';
import { fixtureRouteOf } from '../testing';
import type { HttpGuestConfig } from '../lift/http';
import { compat } from '../credentials';
import {
	hostRuntime,
	loadExecutor,
	nodeDescriptionOf,
	verifiedBundleOf,
	type ExecutorHost,
	type PackedVersion,
} from '../runtime';
import { parseManifest, sha256, type VersionManifest } from '../version';

const RUNTIME = hostRuntime();

/** A version that no trusted key signs, as an instance publishes it. */
const versionOf = (manifest: VersionManifest, bundle: string): PackedVersion => ({
	manifest,
	origin: 'private',
	readBundle: async () => bundle,
});

const ACTIONS = `import { defineNode, t } from '@n8n/node-sdk';
const notion = defineNode({ id: 'notion', displayName: 'Notion', baseUrl: 'https://api.notion.com/v1' });
const page = t.obj({ object: t.lit('page'), id: t.str() });
export const getUser = notion.resource('user', { input: { user: t.str().title('User') } }).action('get', {
	action: 'Get a user',
	summary: 'Get one Notion user by ID.',
	flow: { effect: 'read', cardinality: 'per-item', idempotent: true },
	input: {},
	output: t.obj({ object: t.lit('user'), id: t.str() }),
	request: { method: 'GET', path: '/users/{user}', headers: { 'Notion-Version': '2022-06-28' } },
});
export const searchPages = notion.resource('page', { input: {} }).action('search', {
	action: 'Search pages',
	summary: 'Search pages by title.',
	flow: { effect: 'read', cardinality: '1:N', idempotent: true },
	input: { query: t.str().title('Query') },
	output: page,
	list: {
		method: 'POST',
		path: '/search',
		body: { query: { input: 'query' } },
		response: t.obj({ results: t.arr(page), next_cursor: t.nullable(t.str()) }),
		items: (body) => body.results,
		pages: { style: 'cursor', next: (body) => body.next_cursor, send: { body: 'start_cursor' } },
	},
});
`;

const BINDINGS: Record<'getUser' | 'searchPages', Omit<HttpGuestConfig, 'contract'>> = {
	getUser: {
		baseUrl: 'https://api.notion.com/v1',
		request: { method: 'GET', path: '/users/{user}', headers: { 'Notion-Version': '2022-06-28' } },
	},
	searchPages: {
		baseUrl: 'https://api.notion.com/v1',
		list: {
			method: 'POST',
			path: '/search',
			body: { query: { input: 'query' } },
			items: '/results',
			pages: { style: 'cursor', next: '/next_cursor', send: { body: 'start_cursor' } },
		},
	},
};

const PARAMETERS: Record<keyof typeof BINDINGS, Record<string, unknown>> = {
	getUser: { user: 'u-1' },
	searchPages: { query: 'roadmap', paging: { mode: 'all' } },
};

const node: INode = {
	id: '1',
	name: 'Notion',
	type: 'notion',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

/** A Notion fake: a user, and two pages of search results. */
function hostOf(
	name: keyof typeof BINDINGS,
	requests: IHttpRequestOptions[],
	userReply: unknown = { object: 'user', id: 'u-1' },
): ExecutorHost {
	return {
		evaluate: (expression, variables) =>
			new Expression('UTC').resolveSimpleParameterValue(
				expression,
				variables as unknown as IWorkflowDataProxyData,
			),
		items: [{ json: {} }],
		node,
		parameter: (field) => PARAMETERS[name][field],
		request: async (request) => {
			requests.push(request);
			const body = isRecordBody(request.body) ? request.body : {};
			const reply = request.url.endsWith('/users/u-1')
				? userReply
				: body.start_cursor === 'c2'
					? { results: [{ object: 'page', id: 'p2' }], next_cursor: null }
					: { results: [{ object: 'page', id: 'p1' }], next_cursor: 'c2' };
			const response = request.returnFullResponse
				? { body: reply, headers: {}, statusCode: 200 }
				: reply;
			return await Promise.resolve(response);
		},
		continueOnFail: () => false,
	};
}

const isRecordBody = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

describe('the HTTP guest', () => {
	const dirs = { root: '' };

	beforeAll(async () => {
		dirs.root = await mkdtemp(path.join(tmpdir(), 'node-sdk-http-guest-'));
		await writeFile(path.join(dirs.root, 'actions.ts'), ACTIONS);
	});

	afterAll(async () => {
		await rm(dirs.root, { recursive: true, force: true });
	});

	/** The JS version of an action, and the HTTP guest version of the same contract. */
	async function versionsOf(name: keyof typeof BINDINGS) {
		const packed = await packAction(path.join(dirs.root, 'actions.ts'), name);
		const guest = await packHttpGuest({ contract: packed.manifest.contract, ...BINDINGS[name] });
		const js: PackedVersion = versionOf(packed.manifest, packed.bundle);
		const http: PackedVersion = versionOf(guest.manifest, guest.bundle);
		return { js, http, config: guest.bundle };
	}

	const outputsOf = async (
		name: keyof typeof BINDINGS,
		run: (host: ExecutorHost) => Promise<unknown>,
	) => {
		const requests: IHttpRequestOptions[] = [];
		const outputs = await run(hostOf(name, requests));
		return { outputs, requests };
	};

	it.each(['getUser', 'searchPages'] as const)(
		'runs %s in this process as the JS bundle does',
		async (name) => {
			const { js, http } = await versionsOf(name);
			const fromJs = await outputsOf(name, await loadExecutor(js, RUNTIME));
			const fromHttp = await outputsOf(name, await loadExecutor(http, RUNTIME));
			expect(fromJs.outputs).not.toEqual([[]]);
			expect(fromHttp).toEqual(fromJs);
		},
	);

	it('refuses a config whose contract is not the contract of its manifest', async () => {
		const { http, config } = await versionsOf('getUser');
		const changed = JSON.stringify({
			...JSON.parse(config),
			contract: { ...http.manifest.contract, summary: 'Another summary.' },
		});
		const tampered = versionOf({ ...http.manifest, bundleHash: sha256(changed) }, changed);
		await expect(verifiedBundleOf(tampered, RUNTIME.nodeContractRange)).rejects.toThrow(
			'has another contract than its manifest',
		);
	});

	it('packs a config with the contract that its binding gives', async () => {
		const { js, config } = await versionsOf('searchPages');
		const { egress: _, input, ...contract } = js.manifest.contract;
		const { paging: __, ...properties } = input.properties ?? {};
		const source = {
			...JSON.parse(config),
			version: '1.2.0',
			contract: { ...contract, input: { ...input, properties } },
		};
		const packed = await packHttpGuest({
			...source,
			node: { displayName: 'Notion', icon: 'node:n8n-nodes-base.notion' },
		});
		expect(nodeDescriptionOf(packed.manifest).displayName).toBe('Notion: Search pages');
		expect(packed.manifest).toMatchObject({
			semver: '1.2.0',
			nodeContract: '2.10.0',
			guest: 'http',
			bundleHash: sha256(packed.bundle),
			contract: js.manifest.contract,
		});
		expect(parseManifest(JSON.stringify(packed.manifest))).toEqual(packed.manifest);
		expect(
			(
				await packHttpGuest({
					...source,
					node: { displayName: 'Notion', icon: 'node:n8n-nodes-base.notion' },
				})
			).bundle,
		).toBe(packed.bundle);
		const version: PackedVersion = versionOf(packed.manifest, packed.bundle);
		const fromJs = await outputsOf('searchPages', await loadExecutor(js, RUNTIME));
		expect(await outputsOf('searchPages', await loadExecutor(version, RUNTIME))).toEqual(fromJs);
	});

	it('titles each input field without a title from its name', async () => {
		const { js } = await versionsOf('getUser');
		const { input } = js.manifest.contract;
		const contract = {
			...js.manifest.contract,
			input: { ...input, properties: { user: { type: 'string' }, page_size: { type: 'integer' } } },
		};
		const { manifest } = await packHttpGuest({ contract, ...BINDINGS.getUser });
		expect(manifest.contract.input.properties).toMatchObject({
			user: { title: 'User' },
			page_size: { title: 'Page Size' },
		});
		expect(missingTitlesOf(manifest.contract)).toEqual([]);
	});

	it('passes the publish gate on the routes that a run of it records', async () => {
		const { js } = await versionsOf('getUser');
		const packed = await packHttpGuest({ contract: js.manifest.contract, ...BINDINGS.getUser });
		const requests: IHttpRequestOptions[] = [];
		const executor = await loadExecutor(versionOf(packed.manifest, packed.bundle), RUNTIME);
		await executor(hostOf('getUser', requests));
		const routes = requests.map((request) =>
			fixtureRouteOf(request, { object: 'user', id: 'u-1' }),
		);
		const fixture = (output: unknown) => ({
			executions: [{ name: 'a user', params: { user: 'u-1' }, routes, output: [output] }],
		});
		await expect(
			checkPublish(undefined, packed, fixture({ object: 'user', id: 'u-1' })),
		).resolves.toBeUndefined();
		await expect(
			checkPublish(undefined, packed, fixture({ object: 'user', id: 'u-2' })),
		).rejects.toThrow();
	});

	describe('an error expression', () => {
		const ERROR_OF = '={{ $response.body.ok === false ? $response.body.error : undefined }}';
		const failing = { ok: false, error: 'user_not_found' };

		const withErrorOf = async () => {
			const { js } = await versionsOf('getUser');
			const packed = await packHttpGuest({
				contract: js.manifest.contract,
				...BINDINGS.getUser,
				errorOf: ERROR_OF,
			});
			const version: PackedVersion = versionOf(packed.manifest, packed.bundle);
			return { packed, version };
		};

		it('goes into the manifest, which needs Node Contract 2.10.0', async () => {
			const { packed } = await withErrorOf();
			expect(packed.manifest).toMatchObject({ errorOf: ERROR_OF, nodeContract: '2.10.0' });
			expect(parseManifest(JSON.stringify(packed.manifest))).toEqual(packed.manifest);
		});

		it('fails an in-band error on the host', async () => {
			const { version } = await withErrorOf();
			const executor = await loadExecutor(version, RUNTIME);
			await expect(executor(hostOf('getUser', [], failing))).rejects.toThrow('user_not_found');
			await expect(executor(hostOf('getUser', []))).resolves.toEqual([
				[{ json: { object: 'user', id: 'u-1' }, pairedItem: { item: 0 } }],
			]);
		});
	});

	describe('a credential type', () => {
		const notionApi = compat('notionApi', { hosts: ['api.notion.com'] });
		const typeOf = (name: string) => (name === 'notionApi' ? notionApi : undefined);

		const configTo = async (baseUrl: string, credentialBaseUrl?: string) => {
			const { js } = await versionsOf('getUser');
			return {
				...BINDINGS.getUser,
				contract: { ...js.manifest.contract, credentials: ['notionApi'] },
				baseUrl,
				credentials: [
					{ name: 'notionApi', ...(credentialBaseUrl ? { baseUrl: credentialBaseUrl } : {}) },
				],
			};
		};

		const withCredential = (requests: IHttpRequestOptions[]): ExecutorHost => ({
			...hostOf('getUser', requests),
			node: { ...node, credentials: { notionApi: { id: '1', name: 'Notion' } } },
			credentialData: async () => ({}),
		});

		it('comes from n8n by its name, not from the config', async () => {
			const packed = await packHttpGuest(
				await configTo('https://evil.example', 'https://evil.example'),
			);
			const requests: IHttpRequestOptions[] = [];
			const executor = await loadExecutor(
				versionOf(packed.manifest, packed.bundle),
				hostRuntime({ credentialTypeOf: typeOf }),
			);
			await expect(executor(withCredential(requests))).rejects.toThrow('Domain not allowed');
			expect(requests).toEqual([]);
		});

		it('that n8n does not have refuses the version', async () => {
			const packed = await packHttpGuest(await configTo('https://api.notion.com/v1'));
			const version = versionOf(packed.manifest, packed.bundle);
			await expect(
				loadExecutor(version, hostRuntime({ credentialTypeOf: () => undefined })),
			).rejects.toThrow('uses the credential type notionApi, which n8n does not have');
		});

		it('with known hosts refuses a base URL on another host when it packs', async () => {
			await expect(
				packHttpGuest(await configTo('https://evil.example'), { credentialTypeOf: typeOf }),
			).rejects.toThrow('notionApi goes only to api.notion.com, not to evil.example');
			const packed = await packHttpGuest(
				await configTo('https://api.notion.com/v1', 'https://evil.example'),
				{ credentialTypeOf: typeOf },
			);
			expect(JSON.parse(packed.bundle)).toMatchObject({ credentials: [{ name: 'notionApi' }] });
			expect(packed.bundle).not.toContain('evil.example');
			const notionWithBase = compat('notionApi', { baseUrl: 'https://api.notion.com/v1' });
			await expect(
				packHttpGuest(await configTo('https://evil.example'), {
					credentialTypeOf: () => notionWithBase,
				}),
			).rejects.toThrow('notionApi goes only to api.notion.com, not to evil.example');
		});
	});

	it('refuses an HTTP guest version below Node Contract 2.10.0', async () => {
		const { http } = await versionsOf('getUser');
		const old: PackedVersion = { ...http, manifest: { ...http.manifest, nodeContract: '2.9.0' } };
		await expect(verifiedBundleOf(old, RUNTIME.nodeContractRange)).rejects.toThrow(
			'needs Node Contract 2.10.0 or newer',
		);
	});

	it('refuses a config that does not match its bundle hash', async () => {
		const { http } = await versionsOf('getUser');
		const swapped: PackedVersion = { ...http, readBundle: async () => '{}' };
		await expect(verifiedBundleOf(swapped, RUNTIME.nodeContractRange)).rejects.toThrow(
			'does not match',
		);
	});
});
