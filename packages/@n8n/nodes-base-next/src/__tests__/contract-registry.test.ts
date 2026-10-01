import {
	integrityOf,
	packageNameOf,
	setContractVersionLoader,
	toVersionedNodeType,
	type FrozenVersion,
	type NodeContractLock,
} from '@n8n/node-sdk';
import { freezeAction, type FrozenAction } from '@n8n/node-sdk/freeze';
import { packContractPackage } from '@n8n/node-sdk/publish';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { IExecuteFunctions, INodeExecutionData, ITaskMetadata } from 'n8n-workflow';

import { contractVersionLoader, type ContractRegistryOptions } from '../contract-registry';

const echoSource = (minor: number, patch: number, text: string) => `
import { defineAction, defineNode, obj, str } from '@n8n/node-sdk';

export const echo = defineAction({
	node: defineNode({ id: 'demo', displayName: 'Demo', credentials: [] }),
	id: 'demo.echo',
	version: 1,
	minor: ${minor},
	patch: ${patch},
	action: 'Echo',
	summary: 'Echo the text.',
	flow: { effect: 'transform', cardinality: 'per-item', passthrough: 'replace' },
	input: { text: str()${minor > 0 ? ', suffix: str().optional()' : ''} },
	output: obj({ text: str() }),
	async run({ input, emit }) {
		emit({ text: ${text} });
	},
});
`;

const keyPair = () =>
	generateKeyPairSync('ed25519', {
		publicKeyEncoding: { type: 'spki', format: 'pem' },
		privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
	});
const { privateKey, publicKey } = keyPair();
const strangerKey = keyPair().privateKey;

const FIXTURES = { executions: [] };
const NAME = packageNameOf('demo.echo');

/** Tarballs the fake registry serves, by version. A test may replace one. */
const tarballs = new Map<string, { data: Buffer; integrity: string; frozen: FrozenAction }>();
const dirs = { root: '', cache: '' };
const registry = { url: '', server: createServer() };
const versions = new Map<string, FrozenAction>();

const publish = (frozen: FrozenAction, key = privateKey) => {
	const data = packContractPackage(frozen, FIXTURES, key);
	tarballs.set(frozen.manifest.semver, { data, integrity: integrityOf(data), frozen });
};

const packument = () => ({
	name: NAME,
	versions: Object.fromEntries(
		[...tarballs].map(([version, { integrity, frozen }]) => {
			const { id, abi, contractHash, bundleHash } = frozen.manifest;
			const tarball = `${registry.url}/tarballs/${version}.tgz`;
			return [
				version,
				{ n8nContract: { id, abi, contractHash, bundleHash }, dist: { tarball, integrity } },
			];
		}),
	),
});

const listen = async (server: Server) =>
	await new Promise<string>((resolve) =>
		server.listen(0, '127.0.0.1', () =>
			resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`),
		),
	);

beforeAll(async () => {
	dirs.root = await mkdtemp(path.join(tmpdir(), 'contract-registry-'));
	const entry = path.join(dirs.root, 'echo.ts');
	const freeze = async (minor: number, patch: number, text: string) => {
		await writeFile(entry, echoSource(minor, patch, text));
		const frozen = await freezeAction(entry, 'echo');
		versions.set(frozen.manifest.semver, frozen);
	};
	await freeze(0, 0, 'input.text.toUpperCase()');
	await freeze(0, 1, "input.text + '?'");
	await freeze(1, 0, "input.text + (input.suffix ?? '#')");
	registry.server.on('request', (request, response) => {
		const tarball = /^\/tarballs\/(.+)\.tgz$/.exec(request.url ?? '')?.[1];
		const found = tarball ? tarballs.get(tarball) : undefined;
		if (request.url === `/${NAME.replace('/', '%2f')}`) {
			response.setHeader('content-type', 'application/json');
			response.end(JSON.stringify(packument()));
		} else if (found) {
			response.end(found.data);
		} else {
			response.statusCode = 404;
			response.end();
		}
	});
	registry.url = await listen(registry.server);
});

beforeEach(async () => {
	dirs.cache = await mkdtemp(path.join(dirs.root, 'cache-'));
	tarballs.clear();
	['1.0.0', '1.0.1', '1.1.0'].forEach((version) => publish(frozenOf(version)));
});

afterAll(async () => {
	setContractVersionLoader(async (_context, head) => head);
	registry.server.close();
	await rm(dirs.root, { recursive: true, force: true });
});

function frozenOf(version: string): FrozenAction {
	const frozen = versions.get(version);
	if (!frozen) throw new Error(`${version} is not frozen`);
	return frozen;
}

const bundled = (version: string): FrozenVersion => ({
	manifest: frozenOf(version).manifest,
	readBundle: async () => frozenOf(version).bundle,
});

const lockOf = (version: string): NodeContractLock => {
	const { id, semver, bundleHash, contractHash } = frozenOf(version).manifest;
	return { action: id, version: semver, bundleHash, contractHash };
};

const contextOf = (metadata: ITaskMetadata[] = []) =>
	({
		getInputData: () => [{ json: {} }],
		getNode: () => ({ name: 'Echo', credentials: {} }),
		getNodeParameter: (name: string) => (name === 'text' ? 'hello' : ''),
		continueOnFail: () => false,
		setMetadata: (value: ITaskMetadata) => metadata.push(value),
	}) as unknown as IExecuteFunctions;

/** Runs the node with HEAD 1.1.0 bundled, as a release ships it. */
const run = async (
	meta: unknown,
	options: Partial<ContractRegistryOptions> = {},
	metadata: ITaskMetadata[] = [],
) => {
	setContractVersionLoader(
		contractVersionLoader({
			policy: 'tolerant',
			registryUrl: registry.url,
			publicKey,
			cacheDir: dirs.cache,
			fetch: async (url) => await fetch(url),
			metaOf: async () => meta,
			...options,
		}),
	);
	const NodeType = toVersionedNodeType([bundled('1.1.0')]);
	const result = await new NodeType().getNodeType(1).execute?.call(contextOf(metadata));
	const [items = []]: INodeExecutionData[][] = Array.isArray(result) ? result : [];
	return items.map((item) => item.json.text);
};

const locked = (version: string, policy?: string) => ({
	nodeContracts: { Echo: lockOf(version) },
	...(policy ? { nodeContractsPolicy: policy } : {}),
});

describe('contractVersionLoader', () => {
	it('runs the bundled HEAD for a node without a lock', async () => {
		expect(await run({})).toEqual(['hello#']);
	});

	it('runs the locked bundle from the registry when strict', async () => {
		expect(await run(locked('1.0.0'), { policy: 'strict' })).toEqual(['HELLO']);
	});

	it('runs the newest signed patch of the locked minor when tolerant', async () => {
		expect(await run(locked('1.0.0'))).toEqual(['hello?']);
	});

	it('takes the policy of the workflow over the instance policy', async () => {
		expect(await run(locked('1.0.0', 'strict'))).toEqual(['HELLO']);
		expect(await run(locked('1.0.0', 'tolerant'), { policy: 'strict' })).toEqual(['hello?']);
	});

	it('applies no newer patch without a trusted key or with a wrong signature', async () => {
		expect(await run(locked('1.0.0'), { publicKey: undefined })).toEqual(['HELLO']);
		publish(frozenOf('1.0.1'), strangerKey);
		expect(await run(locked('1.0.0'))).toEqual(['HELLO']);
	});

	it('refuses a tampered tarball', async () => {
		const tarball = tarballs.get('1.0.0');
		if (!tarball) throw new Error('1.0.0 is not published');
		tarballs.set('1.0.0', { ...tarball, data: Buffer.concat([tarball.data, Buffer.from([0])]) });
		await expect(run(locked('1.0.0'), { policy: 'strict' })).rejects.toThrow(
			'does not match its integrity',
		);
	});

	it('skips a tampered patch and runs the locked version', async () => {
		const tarball = tarballs.get('1.0.1');
		if (!tarball) throw new Error('1.0.1 is not published');
		tarballs.set('1.0.1', { ...tarball, data: Buffer.concat([tarball.data, Buffer.from([0])]) });
		expect(await run(locked('1.0.0'))).toEqual(['HELLO']);
	});

	it('runs a cached version without a registry', async () => {
		expect(await run(locked('1.0.0'), { policy: 'strict' })).toEqual(['HELLO']);
		expect(await run(locked('1.0.0'), { policy: 'strict', registryUrl: '' })).toEqual(['HELLO']);
	});

	it('names the action, version and bundle hash when no version matches', async () => {
		const { bundleHash } = lockOf('1.0.0');
		await expect(run(locked('1.0.0'), { registryUrl: '' })).rejects.toThrow(
			`No trusted version of demo.echo matches 1.0.0 (bundle ${bundleHash})`,
		);
	});

	it('records the version that ran in the execution metadata', async () => {
		const metadata: ITaskMetadata[] = [];
		await run(locked('1.0.0'), {}, metadata);
		const { bundleHash } = frozenOf('1.0.1').manifest;
		expect(metadata).toEqual([
			{ nodeContract: { action: 'demo.echo', version: '1.0.1', bundleHash, abi: 1 } },
		]);
	});
});
