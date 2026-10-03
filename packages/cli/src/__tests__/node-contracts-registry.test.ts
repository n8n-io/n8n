import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import { EventService } from '@n8n/backend-services';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig, NodesConfig } from '@n8n/config';
import {
	NodeContractVersionRepository,
	WorkflowRepository,
	type NodeContractVersion,
	type WorkflowEntity,
} from '@n8n/db';
import { PubSubMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type {
	ContractRegistryOptions,
	ContractStoreOptions,
	RunProfile,
} from '@n8n/nodes-base-next';
import { mock } from 'vitest-mock-extended';
import { InstanceSettings } from 'n8n-core';
import type { IExecuteFunctions } from 'n8n-workflow';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { CredentialTypes } from '@/credential-types';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { Publisher } from '@/scaling/pubsub/publisher.service';

import { NodeContractsStore, useNodeContractsRegistry } from '../node-contracts-registry';
import { NodeContractsSync } from '../node-contracts-sync';

const registered: ContractRegistryOptions[] = [];
const languages: string[][] = [];
vi.mock('@n8n/nodes-base-next', () => ({
	sandboxCredentialTypeOf: (known: (name: string) => boolean) => (name: string) =>
		known(name) ? { name } : undefined,
	useContractRegistry: (options: ContractRegistryOptions) => registered.push(options),
	setCodeLanguages: (allowed: string[]) => languages.push(allowed),
	contractStore: (options: ContractStoreOptions) => options,
	locksOf: () => [['Echo', { action: 'demo.echo', version: '1.0.0' }]],
	syncContractStore: async () => ({
		added: [{ id: 'demo.echo', semver: '1.0.0', bundleHash: 'a' }],
		failed: [],
		unsupported: [],
	}),
}));

const repository = mockInstance(NodeContractVersionRepository);
const publisher = mockInstance(Publisher);

describe('useNodeContractsRegistry', () => {
	const globalConfig = mockInstance(GlobalConfig, {
		instanceAi: {
			nodeContractsUpdatePolicy: 'strict',
			nodeContractsRegistryUrl: 'http://registry.test',
			nodeContractsFirstPartyKeyFile: '',
			nodeContractsVettingKeyFile: '',
			nodeContractRange: '>=2.0.0 <3.0.0',
			nodeContractSandbox: 'off',
			nodeContractTracePayloads: 'off',
		},
	} as unknown as GlobalConfig);
	const instanceSettings = mockInstance(InstanceSettings, {
		n8nFolder: '/n8n',
		instanceType: 'main',
		isFollower: false,
	});
	mockInstance(NodesConfig, { pythonEnabled: false, egressInputHosts: ['*.acme.test'] });
	mockInstance(OutboundHttp).transport.mockReturnValue(
		mock<ReturnType<OutboundHttp['transport']>>(),
	);
	const workflowRepository = mockInstance(WorkflowRepository);
	const meta = { nodeContracts: {} };
	workflowRepository.findByIds.mockResolvedValue([{ id: 'wf', meta } as unknown as WorkflowEntity]);

	const contextOf = (executionId: string) =>
		mock<IExecuteFunctions>({
			getExecutionId: () => executionId,
			getWorkflow: () => ({ id: 'wf', active: false }),
		});

	it('passes the config and reads the workflow meta once per execution', async () => {
		await useNodeContractsRegistry();
		const [options] = registered;

		expect(options).toMatchObject({
			policy: 'strict',
			nodeContractRange: '>=2.0.0 <3.0.0',
			store: {
				registryUrl: 'http://registry.test',
				keys: { firstParty: undefined, vetting: undefined },
				store: Container.get(NodeContractsStore).rows,
			},
		});
		expect([...(options?.egressInputHosts ?? [])]).toEqual(['*.acme.test']);
		expect(await options?.metaOf(contextOf('1'))).toBe(meta);
		expect(await options?.metaOf(contextOf('1'))).toBe(meta);
		expect(await options?.metaOf(contextOf('2'))).toBe(meta);
		expect(workflowRepository.findByIds).toHaveBeenCalledTimes(2);
		expect(workflowRepository.findByIds).toHaveBeenCalledWith(['wf'], { fields: ['meta'] });
		// N8N_PYTHON_ENABLED=false turns Python off for the Code contracts too.
		expect(languages).toEqual([['javascript']]);
		expect(options?.sandbox).toBeUndefined();
	});

	it('relays each run profile on the event service', async () => {
		const eventService = mockInstance(EventService);
		registered.length = 0;
		await useNodeContractsRegistry();
		const profile = mock<RunProfile>();

		registered[0]?.onRunProfile?.({ executionId: '7', nodeName: 'Query' }, profile);

		expect(eventService.emit).toHaveBeenCalledWith('node-contract-run-profiled', {
			executionId: '7',
			nodeName: 'Query',
			profile,
		});
	});

	it('records no payload and logs no warning by default', async () => {
		const logger = mockInstance(Logger);
		registered.length = 0;

		await useNodeContractsRegistry();

		expect(registered[0]?.tracePayloads).toBeUndefined();
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it('passes the payload capture mode and logs one warning at start', async () => {
		const logger = mockInstance(Logger);
		registered.length = 0;
		const { instanceAi } = globalConfig;
		instanceAi.nodeContractTracePayloads = 'redacted';

		try {
			await useNodeContractsRegistry();
		} finally {
			instanceAi.nodeContractTracePayloads = 'off';
		}

		expect(registered[0]?.tracePayloads).toBe('redacted');
		expect(logger.warn).toHaveBeenCalledTimes(1);
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('N8N_NODE_CONTRACT_TRACE_PAYLOADS is "redacted"'),
		);
	});

	it('passes the sandbox files, a cache dir in the n8n folder, and the n8n credential names', async () => {
		const dir = await mkdtemp(path.join(tmpdir(), 'node-contracts-sandbox-'));
		const files = ['n8n-sandbox', 'action.wasm', 'provider.wasm'].map((name) =>
			path.join(dir, name),
		);
		await Promise.all(files.map(async (file) => await writeFile(file, '')));
		mockInstance(CredentialTypes).recognizes.mockImplementation((name) => name === 'slackApi');
		Object.assign(globalConfig.instanceAi, {
			nodeContractSandbox: 'stored',
			nodeContractSandboxSidecar: files[0],
			nodeContractSandboxGuests: dir,
			nodeContractSandboxCacheDir: '',
		});
		try {
			registered.length = 0;
			await useNodeContractsRegistry();
			const [options] = registered;
			expect(options?.sandbox).toMatchObject({
				scope: 'stored',
				options: { sidecar: files[0], guests: dir, cacheDir: '/n8n/node-contracts/sandbox' },
			});
			expect(options?.sandbox?.options.credentialType('slackApi')).toEqual({ name: 'slackApi' });
			expect(options?.sandbox?.options.credentialType('evilApi')).toBeUndefined();

			globalConfig.instanceAi.nodeContractSandboxGuests = path.join(dir, 'missing');
			await expect(useNodeContractsRegistry()).rejects.toThrow(
				'N8N_NODE_CONTRACT_SANDBOX is stored, and the sandbox files are missing',
			);
		} finally {
			globalConfig.instanceAi.nodeContractSandbox = 'off';
			await rm(dir, { recursive: true, force: true });
		}
	});

	it('fetches from the registry only on a main that is not a follower', async () => {
		registered.length = 0;
		await useNodeContractsRegistry();
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
		};
		expect(repository.insertNew).toHaveBeenCalledWith([
			inserted,
			{ ...inserted, version: '1.0.1', published: null },
		]);
		expect(publisher.publishCommand).not.toHaveBeenCalled();
	});

	it('tells the other mains to reload once for a sync that adds versions', async () => {
		mockInstance(Logger);
		mockInstance(LoadNodesAndCredentials);
		mockInstance(WorkflowRepository).findNodeContractMetaPage.mockResolvedValue([
			{ id: 'wf', name: 'Flow', meta: {} } as unknown as WorkflowEntity,
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
