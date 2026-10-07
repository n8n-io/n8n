import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { EventService } from '@n8n/backend-services';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig, NodesConfig } from '@n8n/config';
import {
	NodeContractStatusRepository,
	NodeContractVersionRepository,
	WorkflowRepository,
	type NodeContractVersion,
	type WorkflowEntity,
} from '@n8n/db';
import { PubSubMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { HostRuntimeOptions, RunProfile } from '@n8n/node-sdk/host';
import type { ContractStoreOptions, ContractVersionLoaderOptions } from '@n8n/node-sdk/registry';
import type { RuntimePolicy } from '@n8n/node-sdk/runtimes';
import type { SandboxOptions } from '@n8n/node-sdk/sandbox';
import { mock } from 'vitest-mock-extended';
import { InstanceSettings } from 'n8n-core';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { CredentialTypes } from '@/credential-types';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { Publisher } from '@/scaling/pubsub/publisher.service';

import {
	ContractNodeLoader,
	NodeContractsRuntimes,
	NodeContractsStore,
	nodeContractsRuntime,
} from '../node-contracts-registry';
import { NodeContractsSync } from '../node-contracts-sync';

/** The options of one host runtime, with those of its version loader and runtime policy. */
type Registered = HostRuntimeOptions &
	ContractVersionLoaderOptions & { runtimes: RuntimePolicy; sandbox: SandboxOptions };

const registered: Registered[] = [];
const loaderOptions: ContractVersionLoaderOptions[] = [];
const policies: Array<[RuntimePolicy, SandboxOptions]> = [];
const closed: string[] = [];
const warmed: object[] = [];
vi.mock('@n8n/node-sdk/host', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/node-sdk/host')>();
	return {
		...actual,
		hostRuntime: (options: HostRuntimeOptions = {}) => {
			const [policy, sandbox] = policies.at(-1) ?? [];
			const loader = loaderOptions.at(-1);
			if (policy && sandbox && loader) {
				registered.push({ ...loader, ...options, runtimes: policy, sandbox });
			}
			return actual.hostRuntime(options);
		},
	};
});
vi.mock('@n8n/node-sdk/registry', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/node-sdk/registry')>()),
	isStoreStatusRecord: (value: unknown) =>
		typeof value === 'object' && value !== null && 'yank' in value,
	contractStore: (options: ContractStoreOptions) => ({
		...options,
		embedded: options.store.embedded,
	}),
	contractVersionLoader: (options: ContractVersionLoaderOptions) => {
		loaderOptions.push(options);
		return async (_context: unknown, head: unknown) => head;
	},
	isNodeContractPin: () => true,
	syncContractStore: async () => ({
		added: [{ id: 'demo.echo', semver: '1.0.0', bundleHash: 'a' }],
		failed: [],
		unsupported: [],
	}),
}));
vi.mock('@n8n/node-sdk/sandbox', () => ({
	policyExecutorLoader: (policy: RuntimePolicy, sandbox: SandboxOptions) => {
		policies.push([policy, sandbox]);
		return async () => await Promise.reject(new Error('no executor in this test'));
	},
	warmSandbox: async (options: object) => {
		warmed.push(options);
		if (warmed.length > 1) throw new Error('no sidecar');
	},
}));
vi.mock('@n8n/node-sdk/runtimes', () => ({
	workerRuntime: () => ({ name: 'worker' }),
	containerRuntime: (options: object) => ({ name: 'container', options }),
	wasmReuseRuntime: (options: object) => ({
		name: 'wasm-reuse',
		options,
		close: () => closed.push('wasm-reuse'),
	}),
	pooledRuntime: (inner: { name: string }, options: object) => ({
		name: `${inner.name}-pool`,
		inner,
		options,
		close: () => closed.push(`${inner.name}-pool`),
	}),
}));

const repository = mockInstance(NodeContractVersionRepository);
const statusRepository = mockInstance(NodeContractStatusRepository);
const publisher = mockInstance(Publisher);

describe('nodeContractsRuntime', () => {
	const globalConfig = mockInstance(GlobalConfig, {
		instanceAi: {
			nodeContractsUpdatePolicy: 'strict',
			nodeContractsNpmRegistry: 'http://registry.test',
			nodeContractsNpmScope: '@acme',
			nodeContractsNpmToken: 'npm-token',
			nodeContractsFirstPartyKeyFile: '',
			nodeContractsVettingKeyFile: '',
			nodeContractsRevokedAllow: ['demo.echo@1.0.0'],
			nodeContractRange: '>=2.0.0 <3.0.0',
			nodeContractTracePayloads: 'off',
			nodesNextRuntimesFirstParty: ['worker', 'in-process', 'wasm', 'container'],
			nodesNextRuntimesCommunity: ['wasm', 'container'],
			nodesNextRuntimesPrivate: ['wasm', 'container'],
			nodesNextContainerEnabled: false,
			nodeContractSandboxSidecar: '',
			nodeContractSandboxGuests: '',
			nodeContractSandboxCacheDir: '',
		},
	} as unknown as GlobalConfig);
	const logger = mockInstance(Logger);
	const instanceSettings = mockInstance(InstanceSettings, {
		n8nFolder: '/n8n',
		instanceType: 'main',
		isFollower: false,
	});
	mockInstance(NodesConfig, {
		pythonEnabled: false,
		egressInputHosts: ['*.acme.test'],
		permissionsDeny: ['code'],
		responseSizeMaxMiB: 2,
	});
	mockInstance(OutboundHttp).transport.mockReturnValue(
		mock<ReturnType<OutboundHttp['transport']>>(),
	);
	const workflowRepository = mockInstance(WorkflowRepository);
	const meta = { nodeContractsPolicy: 'strict' };
	workflowRepository.findByIds.mockResolvedValue([{ id: 'wf', meta } as unknown as WorkflowEntity]);

	const contextOf = (executionId: string) =>
		mock<IExecuteFunctions>({
			getExecutionId: () => executionId,
			getWorkflow: () => ({ id: 'wf', active: false }),
		});

	it('passes the config and reads the workflow meta once per execution', async () => {
		await nodeContractsRuntime();
		const [options] = registered;

		expect(options).toMatchObject({
			policy: 'strict',
			nodeContractRange: '>=2.0.0 <3.0.0',
			store: {
				registryUrl: 'http://registry.test',
				npmScope: '@acme',
				npmToken: 'npm-token',
				keys: { firstParty: undefined, vetting: undefined },
				store: Container.get(NodeContractsStore).rows,
			},
		});
		expect([...(options?.egressInputHosts ?? [])]).toEqual(['*.acme.test']);
		expect([...(options?.permissionsDeny ?? [])]).toEqual(['code']);
		expect([...(options?.revokedAllowed ?? [])]).toEqual(['demo.echo@1.0.0']);
		expect(options?.maxResponseBytes).toBe(2 * 1024 * 1024);
		expect(await options?.metaOf(contextOf('1'))).toBe(meta);
		expect(await options?.metaOf(contextOf('1'))).toBe(meta);
		expect(await options?.metaOf(contextOf('2'))).toBe(meta);
		expect(workflowRepository.findByIds).toHaveBeenCalledTimes(2);
		expect(workflowRepository.findByIds).toHaveBeenCalledWith(['wf'], { fields: ['meta'] });
		// N8N_PYTHON_ENABLED=false turns Python off for the Code contracts too.
		expect(options?.codeLanguages).toEqual(['javascript']);
		const extractor = options?.fileExtractor;
		const file = {
			async *read() {
				yield Buffer.from('{"a":1}');
			},
		};
		expect(await extractor?.(file as never, { format: 'json', options: {} })).toEqual({ a: 1 });
	});

	it('passes the default lists, a worker pool, and the runtimes that cannot start', async () => {
		registered.length = 0;
		await nodeContractsRuntime();
		const runtimes = registered[0]?.runtimes;

		expect(Array.from(runtimes?.lists['first-party'] ?? [])).toEqual([
			'worker',
			'in-process',
			'wasm',
			'container',
		]);
		expect(Array.from(runtimes?.lists.community ?? [])).toEqual(['wasm', 'container']);
		expect(Array.from(runtimes?.lists.private ?? [])).toEqual(['wasm', 'container']);
		expect(runtimes?.available).toEqual({
			missing: {
				wasm: 'wasm is not available: the sandbox sidecar is not installed',
				container: 'container is not enabled',
			},
		});
		expect(Object.keys(runtimes?.runtimes ?? {})).toEqual(['worker']);
		expect(runtimes?.runtimes.worker?.()).toMatchObject({
			name: 'worker-pool',
			options: { size: 1 },
		});
		expect(logger.warn).toHaveBeenCalledTimes(1);
		expect(logger.warn).toHaveBeenCalledWith(
			'The wasm runtime is not available: N8N_NODE_CONTRACT_SANDBOX_SIDECAR or N8N_NODE_CONTRACT_SANDBOX_GUESTS is not set',
		);
	});

	it('warns when the community or private list has a runtime without a security boundary', async () => {
		const { instanceAi } = globalConfig;
		instanceAi.nodesNextRuntimesCommunity = ['wasm', 'worker', 'in-process'];
		instanceAi.nodesNextRuntimesPrivate = ['in-process'];
		try {
			await nodeContractsRuntime();

			expect(logger.warn).toHaveBeenCalledWith(
				'N8N_NODES_NEXT_RUNTIMES_COMMUNITY has worker, in-process: community node code runs without a security boundary',
			);
			expect(logger.warn).toHaveBeenCalledWith(
				'N8N_NODES_NEXT_RUNTIMES_PRIVATE has in-process: private node code runs without a security boundary',
			);
		} finally {
			instanceAi.nodesNextRuntimesCommunity = ['wasm', 'container'];
			instanceAi.nodesNextRuntimesPrivate = ['wasm', 'container'];
		}
	});

	it('makes each runtime once and closes it at shutdown', async () => {
		closed.length = 0;
		registered.length = 0;
		await nodeContractsRuntime();
		await nodeContractsRuntime();
		const [first, second] = registered.map((options) => options.runtimes.runtimes.worker?.());

		expect(first).toBe(second);
		Container.get(NodeContractsRuntimes).close();
		expect(closed).toEqual(['worker-pool']);
		expect(registered[0]?.runtimes.runtimes.worker?.()).not.toBe(first);
	});

	it('relays each run profile on the event service', async () => {
		const eventService = mockInstance(EventService);
		registered.length = 0;
		await nodeContractsRuntime();
		const profile = mock<RunProfile>();

		registered[0]?.onRunProfile?.({ executionId: '7', nodeName: 'Query' }, profile);

		expect(eventService.emit).toHaveBeenCalledWith('node-contract-run-profiled', {
			executionId: '7',
			nodeName: 'Query',
			profile,
		});
	});

	it('relays each permission refusal and each install on the event service', async () => {
		const eventService = mockInstance(EventService);
		registered.length = 0;
		await nodeContractsRuntime();
		const node = mock<INode>({ name: 'GET', type: '@n8n/nodes-core.httpRequestGet' });
		const install = {
			id: 'demo.echo',
			version: '2.0.0',
			previousVersion: '1.1.0',
			origin: 'community' as const,
			addedPermissions: ['egress api.echo.test'],
		};

		registered[0]?.onPermissionRefused?.({
			action: 'httpRequest.get',
			node,
			permission: 'egress-input',
			host: 'other.test',
			message: 'Host not allowed',
		});
		Container.get(NodeContractsStore).rows.installed?.([install]);

		expect(eventService.emit).toHaveBeenCalledWith('node-permission-refused', {
			action: 'httpRequest.get',
			nodeName: 'GET',
			nodeType: '@n8n/nodes-core.httpRequestGet',
			permission: 'egress-input',
			host: 'other.test',
			message: 'Host not allowed',
		});
		expect(eventService.emit).toHaveBeenCalledWith('node-contract-installed', install);
	});

	it('records no payload and logs no payload warning by default', async () => {
		logger.warn.mockClear();
		registered.length = 0;

		await nodeContractsRuntime();

		expect(registered[0]?.tracePayloads).toBeUndefined();
		expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('TRACE_PAYLOADS'));
	});

	it('passes the payload capture mode and logs one warning at start', async () => {
		logger.warn.mockClear();
		registered.length = 0;
		const { instanceAi } = globalConfig;
		instanceAi.nodeContractTracePayloads = 'redacted';

		try {
			await nodeContractsRuntime();
		} finally {
			instanceAi.nodeContractTracePayloads = 'off';
		}

		expect(registered[0]?.tracePayloads).toBe('redacted');
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('N8N_NODE_CONTRACT_TRACE_PAYLOADS is "redacted"'),
		);
	});

	it('passes wasm when the sandbox files exist, a cache dir in the n8n folder, and the n8n credential names', async () => {
		const dir = await mkdtemp(path.join(tmpdir(), 'node-contracts-sandbox-'));
		const files = ['n8n-sandbox', 'action.wasm', 'provider.wasm', 'trigger.wasm'].map((name) =>
			path.join(dir, name),
		);
		await Promise.all(files.map(async (file) => await writeFile(file, '')));
		mockInstance(CredentialTypes).recognizes.mockImplementation((name) => name === 'slackApi');
		Object.assign(globalConfig.instanceAi, {
			nodeContractSandboxSidecar: files[0],
			nodeContractSandboxGuests: dir,
		});
		try {
			registered.length = 0;
			warmed.length = 0;
			Container.get(NodeContractsRuntimes).close();
			await nodeContractsRuntime();
			const [options] = registered;

			expect(warmed).toEqual([
				{ sidecar: files[0], guests: dir, cacheDir: '/n8n/node-contracts/sandbox' },
			]);

			expect(options?.runtimes.available.missing.wasm).toBeUndefined();
			expect(options?.runtimes.runtimes.wasm?.()).toMatchObject({
				name: 'wasm-reuse',
				options: { sidecar: files[0], guests: dir },
			});
			expect(options?.sandbox.cacheDir).toBe('/n8n/node-contracts/sandbox');
			expect(options?.sandbox.credentialType('slackApi')).toMatchObject({
				name: 'slackApi',
				scheme: { kind: 'compat' },
			});
			expect(options?.sandbox.credentialType('evilApi')).toBeUndefined();

			await nodeContractsRuntime();
			await vi.waitFor(() =>
				expect(logger.debug).toHaveBeenCalledWith(
					'The sandbox guests did not compile at start: no sidecar',
				),
			);
			globalConfig.instanceAi.nodeContractSandboxGuests = path.join(dir, 'missing');
			await nodeContractsRuntime();
			expect(warmed).toHaveLength(2);
			expect(registered[2]?.runtimes.runtimes.wasm).toBeUndefined();
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('The wasm runtime is not available: the sandbox files are missing'),
			);
		} finally {
			Object.assign(globalConfig.instanceAi, {
				nodeContractSandboxSidecar: '',
				nodeContractSandboxGuests: '',
			});
			await rm(dir, { recursive: true, force: true });
		}
	});

	describe('container', () => {
		const state = { dir: '', path: process.env.PATH };

		/** A `docker` on the PATH that prints `output` for `docker info`, or fails. */
		const fakeDocker = async (script: string) => {
			state.dir = await mkdtemp(path.join(tmpdir(), 'node-contracts-docker-'));
			const docker = path.join(state.dir, 'docker');
			await writeFile(docker, `#!/bin/sh\n${script}\n`);
			await chmod(docker, 0o755);
			process.env.PATH = `${state.dir}${path.delimiter}${state.path ?? ''}`;
		};

		beforeEach(() => {
			globalConfig.instanceAi.nodesNextContainerEnabled = true;
			registered.length = 0;
			Container.get(NodeContractsRuntimes).close();
		});

		afterEach(async () => {
			globalConfig.instanceAi.nodesNextContainerEnabled = false;
			process.env.PATH = state.path;
			await rm(state.dir, { recursive: true, force: true });
		});

		it('uses runsc when docker lists it', async () => {
			await fakeDocker("echo 'io.containerd.runc.v2 runc runsc '");
			await nodeContractsRuntime();
			const runtimes = registered[0]?.runtimes;

			expect(runtimes?.available).toEqual({
				missing: { wasm: 'wasm is not available: the sandbox sidecar is not installed' },
				containerOci: 'runsc',
			});
			expect(runtimes?.runtimes.container?.()).toMatchObject({
				name: 'container-pool',
				inner: { options: { ociRuntime: 'runsc' } },
			});
		});

		it('uses runc when docker does not list runsc', async () => {
			await fakeDocker("echo 'io.containerd.runc.v2 runc '");
			await nodeContractsRuntime();

			expect(registered[0]?.runtimes.available.containerOci).toBe('runc');
		});

		it('is not available and warns when docker does not answer', async () => {
			await fakeDocker('exit 1');
			await nodeContractsRuntime();
			const runtimes = registered[0]?.runtimes;

			expect(runtimes?.available.missing.container).toBe(
				'container is not available: docker does not answer',
			);
			expect(runtimes?.runtimes.container).toBeUndefined();
			expect(logger.warn).toHaveBeenCalledWith(
				'The container runtime is not available: docker does not answer',
				expect.anything(),
			);
		});
	});

	it('fetches from the registry only on a main that is not a follower', async () => {
		registered.length = 0;
		await nodeContractsRuntime();
		const { mayFetch } = registered[0]?.store as unknown as ContractStoreOptions;
		expect(mayFetch?.()).toBe(true);
		Object.assign(instanceSettings, { isFollower: true });
		expect(mayFetch?.()).toBe(false);
		Object.assign(instanceSettings, { isFollower: false, instanceType: 'worker' });
		expect(mayFetch?.()).toBe(false);
		Object.assign(instanceSettings, { instanceType: 'main' });
	});

	it('reads the first-party key and the vetting key from their files', async () => {
		const dir = await mkdtemp(path.join(tmpdir(), 'node-contract-keys-'));
		const { instanceAi } = globalConfig;
		try {
			await writeFile(path.join(dir, 'first-party.pem'), 'FIRST');
			await writeFile(path.join(dir, 'vetting.pem'), 'VETTING');
			instanceAi.nodeContractsFirstPartyKeyFile = path.join(dir, 'first-party.pem');
			const store = Container.get(NodeContractsStore);
			expect(await store.keys()).toEqual({ firstParty: 'FIRST', vetting: undefined });
			instanceAi.nodeContractsVettingKeyFile = path.join(dir, 'vetting.pem');
			expect(await store.keys()).toEqual({ firstParty: 'FIRST', vetting: 'VETTING' });
		} finally {
			instanceAi.nodeContractsFirstPartyKeyFile = '';
			instanceAi.nodeContractsVettingKeyFile = '';
			await rm(dir, { recursive: true, force: true });
		}
	});
});

describe('NodeContractsStore', () => {
	const row: NodeContractVersion = {
		digest: `sha256:${'a'.repeat(64)}`,
		contractId: 'demo.echo',
		version: '1.0.0',
		kind: 'action',
		manifest: '{}\n',
		bundle: 'module.exports = {}',
		fixtures: null,
		signatures: [{ key: `sha256:${'b'.repeat(64)}`, sig: 'c2ln' }],
		published: new Date('2026-10-02T12:00:00.000Z'),
		origin: 'community',
		createdById: null,
		createdAt: new Date(),
	};
	const version = {
		id: 'demo.echo',
		version: '1.0.0',
		kind: 'action' as const,
		manifest: row.digest,
		manifestText: row.manifest,
		bundle: 'module.exports = {}',
		signatures: row.signatures,
		published: '2026-10-02T12:00:00.000Z',
		origin: 'community' as const,
	};

	it('maps the rows of the table to versions of the instance store', async () => {
		repository.findAllForExport.mockResolvedValue([row]);
		repository.findBundle.mockResolvedValue(null);
		repository.existsByDigest.mockResolvedValue(true);
		const { rows } = Container.get(NodeContractsStore);

		expect(await rows.has(row.digest)).toBe(true);
		expect(repository.existsByDigest).toHaveBeenCalledWith(row.digest);
		expect(await rows.versions()).toEqual([{ ...version, fixtures: undefined }]);
		expect(await rows.bundle(row.digest)).toBeUndefined();
	});

	it('reads the credential manifests of the table', async () => {
		const credential = { ...row, contractId: 'ping.token', kind: 'credential' as const };
		repository.findCredentialManifests.mockResolvedValue([credential]);

		expect(await Container.get(NodeContractsStore).rows.credentialManifests()).toEqual([
			{
				id: 'ping.token',
				version: '1.0.0',
				kind: 'credential',
				manifest: row.digest,
				manifestText: row.manifest,
				signatures: row.signatures,
				origin: 'community',
			},
		]);
	});

	it('inserts versions, and drops a published value that is not a date', async () => {
		await Container.get(NodeContractsStore).rows.insert([
			version,
			{ ...version, version: '1.0.1', published: 'yesterday' },
		]);

		const inserted = {
			digest: row.digest,
			contractId: 'demo.echo',
			version: '1.0.0',
			kind: 'action',
			manifest: row.manifest,
			bundle: row.bundle,
			fixtures: null,
			signatures: row.signatures,
			published: row.published,
			origin: 'community',
			createdById: null,
		};
		expect(repository.insertNew).toHaveBeenCalledWith([
			inserted,
			{ ...inserted, version: '1.0.1', published: null },
		]);
		expect(publisher.publishCommand).not.toHaveBeenCalled();
	});

	it('maps the status lines of the table and skips a line that does not parse', async () => {
		const yank = { id: 'demo.echo', yank: '1.0.0', reason: 'wrong output', at: '2026-10-02' };
		statusRepository.findLines.mockResolvedValue([JSON.stringify(yank), 'not json']);
		const { rows } = Container.get(NodeContractsStore);

		expect(await rows.statuses('demo.echo')).toEqual([yank]);
		expect(statusRepository.findLines).toHaveBeenCalledWith('demo.echo');

		await rows.insertStatuses([yank]);
		expect(statusRepository.insertNew).toHaveBeenCalledWith([
			{
				digest: expect.stringMatching(/^sha256:[0-9a-f]{64}$/),
				contractId: 'demo.echo',
				line: JSON.stringify(yank),
			},
		]);
	});

	it('tells the other mains to reload once for a sync that adds versions', async () => {
		mockInstance(Logger);
		const loader = Object.assign(
			Object.create(ContractNodeLoader.prototype) as ContractNodeLoader,
			{
				frozenVersionsOf: () => [{ manifest: { id: 'demo.echo', kind: 'action' } }],
			},
		);
		Container.set(
			LoadNodesAndCredentials,
			Object.assign(mock<LoadNodesAndCredentials>(), {
				loaders: { '@n8n/nodes-integrations': loader },
			}),
		);
		const echo = {
			name: 'Echo',
			type: '@n8n/nodes-integrations.demoEcho',
			typeVersion: 1,
			contract: { version: '1.0.0', digest: `sha256:${'a'.repeat(64)}` },
		};
		mockInstance(WorkflowRepository).findNodeContractNodesPage.mockResolvedValue([
			{ id: 'wf', name: 'Flow', nodes: [echo], activeVersion: null } as unknown as WorkflowEntity,
		]);

		const { added } = await Container.get(NodeContractsSync).run({ refreshNodeTypes: false });

		expect(added).toHaveLength(2);
		expect(publisher.publishCommand).toHaveBeenCalledTimes(1);
		expect(publisher.publishCommand).toHaveBeenCalledWith({ command: 'reload-node-contracts' });
	});

	it('reloads the node types of a main when another main adds versions', async () => {
		const loadNodesAndCredentials = mockInstance(LoadNodesAndCredentials);
		const handler = Container.get(PubSubMetadata)
			.getHandlers()
			.find(({ eventName }) => eventName === 'reload-node-contracts');
		expect(handler).toMatchObject({
			eventHandlerClass: NodeContractsStore,
			methodName: 'reloadNodeTypes',
			filter: { instanceType: 'main' },
		});

		await Container.get(NodeContractsStore).reloadNodeTypes();

		expect(loadNodesAndCredentials.refreshNodeTypes).toHaveBeenCalledWith();
	});
});
