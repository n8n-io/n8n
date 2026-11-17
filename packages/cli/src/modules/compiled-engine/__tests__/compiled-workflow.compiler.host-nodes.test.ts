/**
 * A compiled node with conditions on its credential runs compiled only for the values that
 * were checked against the v1 node. For other values n8n compiles the workflow with that
 * node in the fallback host, and goes back to the compiled node when the values are checked.
 */
import type { Logger } from '@n8n/backend-common';
import type { UrlService } from '@n8n/backend-services';
import type { InstanceSettings } from 'n8n-core';
import type { INode } from 'n8n-workflow';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mock } from 'vitest-mock-extended';

import type { CredentialTypes } from '@/credential-types';
import type { NodeTypes } from '@/node-types';

import type { CompiledEngineCredentials } from '../compiled-engine-credentials';
import type { CompiledEngineProcesses } from '../compiled-engine-processes';
import type { CompiledEngineConfig } from '../compiled-engine.config';
import type { CompiledSubWorkflowResolver } from '../compiled-sub-workflow.resolver';
import { CompiledWorkflowCompiler } from '../compiled-workflow.compiler';
import { loadWorkflowLang } from '../workflow-lang';

vi.mock('../workflow-lang', () => ({ loadWorkflowLang: vi.fn() }));

const guard = {
	name: 'g1',
	code: '',
	kind: 'guard' as const,
	flags: ['f00000001'],
	allowed: ['@flags=f00000001:1'],
	node: 'Acme',
};
const flag = { name: 'f00000001', code: '(c) => (c.apiKey.length < 64)', kind: 'flag' as const };

interface ConvertOptions {
	sql?: boolean;
	mysql?: boolean;
	nodeSources?: {
		runsInHost?: (nodeName: string) => boolean;
		entry?: (type: string, version: number) => string | undefined;
	};
}

describe('CompiledWorkflowCompiler: nodes with conditions on a credential', () => {
	const credentials = mock<CompiledEngineCredentials>();
	const processes = mock<CompiledEngineProcesses>();
	const subWorkflows = mock<CompiledSubWorkflowResolver>();
	const logger = mock<Logger>();
	const nodeTypes = mock<NodeTypes>();
	const urlService = mock<UrlService>();
	const convertWorkflow = vi.fn();
	const nodes: INode[] = [
		{
			id: '1',
			name: 'Acme',
			type: 'n8n-nodes-base.acme',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			credentials: { acmeApi: { id: 'cred1', name: 'Acme' } },
		},
	];
	const input = { id: 'wf1', name: 'W', versionId: 'v1', nodes, connections: {} };
	let dataDir = '';
	let compiler: CompiledWorkflowCompiler;

	beforeEach(async () => {
		vi.resetAllMocks();
		dataDir = await mkdtemp(join(tmpdir(), 'compiled-engine-host-nodes-'));
		Object.defineProperty(processes, 'dataDir', { get: () => dataDir, configurable: true });
		logger.scoped.mockReturnValue(logger);
		urlService.getInstanceBaseUrl.mockReturnValue('http://localhost:5678');
		subWorkflows.preload.mockResolvedValue(new Map());
		credentials.publicCredentials.mockResolvedValue(new Map());
		nodeTypes.getByNameAndVersion.mockImplementation(() => {
			throw new Error('unknown node type');
		});
		// The converter of this test compiles the node unless the caller says that it runs in
		// the host. A compiled node asks for its flag and gives its guard.
		convertWorkflow.mockImplementation((_workflow: unknown, options: ConvertOptions) => {
			const inHost = options.nodeSources?.runsInHost?.('Acme') === true;
			return {
				ok: true,
				source: inHost ? 'host' : 'compiled',
				diagnostics: [],
				fallbackNodes: inHost ? ['Acme'] : [],
				nodes: {},
				...(inHost ? {} : { credentialDerivations: { acme: [flag, guard] } }),
			};
		});
		vi.mocked(loadWorkflowLang).mockResolvedValue({
			COMPILER_VERSION: 'test',
			convertWorkflow,
			compile: (source: string) => ({
				ok: true,
				diagnostics: [],
				module: new TextEncoder().encode(source),
				manifest: {
					steps: [],
					nodeTypes: [],
					credentials: [{ slot: 'acme', type: 'acmeApi' }],
					triggers: [],
				},
			}),
			credentialSlots: () => new Map([['acmeApi:Acme', 'acme']]),
			credentialKey: (type: string, name: string) => `${type}:${name}`,
			nodeDescriptionOf: () => undefined,
			evaluateInSandbox: () => undefined,
		} as unknown as Awaited<ReturnType<typeof loadWorkflowLang>>);
		compiler = new CompiledWorkflowCompiler(
			processes,
			subWorkflows,
			logger,
			nodeTypes,
			urlService,
			mock<InstanceSettings>({ instanceId: 'instance' }),
			credentials,
			mock<CredentialTypes>(),
			mock<CompiledEngineConfig>({
				compileNodes: true,
				artifactCacheMb: 1,
				sqlMysql: false,
				sqlMssql: false,
			}),
		);
	});

	afterEach(async () => {
		await rm(dataDir, { recursive: true, force: true });
	});

	it('keeps the node compiled when the values of its conditions are checked', async () => {
		credentials.unprovenFlagNodes.mockResolvedValue([]);

		const artifact = await compiler.compile(input);

		expect(artifact.module?.toString()).toBe('compiled');
		expect(artifact.nodes.Acme).toBe('code');
		expect(artifact.derivations).toEqual({ acme: [flag, guard] });
		expect(convertWorkflow).toHaveBeenCalledTimes(1);
		expect(credentials.unprovenFlagNodes).toHaveBeenCalledWith('wf1', artifact.slots, {
			acme: [flag, guard],
		});
	});

	it('runs the node in the fallback host when the values are not checked, and goes back when they are', async () => {
		credentials.unprovenFlagNodes.mockResolvedValue(['Acme']);

		const unproven = await compiler.compile(input);

		expect(unproven.ok).toBe(true);
		expect(unproven.module?.toString()).toBe('host');
		expect(unproven.nodes.Acme).toBe('host');
		// The module asks for no flag: n8n withholds nothing, and the node cannot fail on one.
		expect(unproven.derivations).toBeUndefined();
		expect(convertWorkflow).toHaveBeenCalledTimes(2);

		// The same credential again: both artifacts come from the cache.
		const again = await compiler.compile(input);
		expect(again.key).toBe(unproven.key);
		expect(convertWorkflow).toHaveBeenCalledTimes(2);

		// The credential changes to values that were checked: the compiled node is back.
		credentials.unprovenFlagNodes.mockResolvedValue([]);
		const proven = await compiler.compile(input);
		expect(proven.module?.toString()).toBe('compiled');
		expect(proven.nodes.Acme).toBe('code');
		expect(proven.key).not.toBe(unproven.key);
		expect(convertWorkflow).toHaveBeenCalledTimes(2);
	});

	it('runs a node in the fallback host after it reached a limit that v1 does not have', async () => {
		credentials.unprovenFlagNodes.mockResolvedValue([]);
		const compiled = await compiler.compile(input);
		expect(compiled.nodes.Acme).toBe('code');

		// The first report of a node is new. The second report changes nothing.
		expect(compiler.runInHost('wf1', 'Acme')).toBe(true);
		expect(compiler.runInHost('wf1', 'Acme')).toBe(false);

		const inHost = await compiler.compile(input);
		expect(inHost.ok).toBe(true);
		expect(inHost.module?.toString()).toBe('host');
		expect(inHost.nodes.Acme).toBe('host');
		expect(inHost.key).not.toBe(compiled.key);

		// Another workflow with the same nodes keeps its compiled node.
		const other = await compiler.compile({ ...input, id: 'wf2' });
		expect(other.nodes.Acme).toBe('code');
	});

	it('gives the nodes in the host to store, and takes stored nodes after a restart', async () => {
		credentials.unprovenFlagNodes.mockResolvedValue([]);
		expect(compiler.hostNodes()).toEqual({});
		compiler.runInHost('wf1', 'Acme');
		compiler.runInHost('wf2', 'Other');
		const stored = compiler.hostNodes();
		expect(stored).toEqual({ wf1: ['Acme'], wf2: ['Other'] });

		const restarted = new CompiledWorkflowCompiler(
			processes,
			subWorkflows,
			logger,
			nodeTypes,
			urlService,
			mock<InstanceSettings>({ instanceId: 'instance' }),
			credentials,
			mock<CredentialTypes>(),
			mock<CompiledEngineConfig>({
				compileNodes: true,
				artifactCacheMb: 1,
				sqlMysql: false,
				sqlMssql: false,
			}),
		);
		restarted.restoreHostNodes(stored);
		expect(restarted.hostNodes()).toEqual(stored);
		const inHost = await restarted.compile(input);
		expect(inHost.nodes.Acme).toBe('host');
		// A stored node is not new: the caller does not compile again for it.
		expect(restarted.runInHost('wf1', 'Acme')).toBe(false);
	});

	it('keeps a fixed number of nodes in the host, and forgets the oldest workflow first', () => {
		for (let k = 0; k < 100; k++) expect(compiler.runInHost('wf-full', `Node ${k}`)).toBe(true);
		expect(compiler.runInHost('wf-full', 'Node 100')).toBe(false);
		for (let w = 0; w < 49; w++) {
			for (let k = 0; k < 100; k++) compiler.runInHost(`wf${w}`, `Node ${k}`);
		}
		const count = () => Object.values(compiler.hostNodes()).reduce((sum, n) => sum + n.length, 0);
		expect(count()).toBe(5000);
		expect(compiler.runInHost('wf-new', 'Download')).toBe(true);
		expect(count()).toBe(4901);
		expect(compiler.hostNodes()['wf-full']).toBeUndefined();
		expect(compiler.hostNodes()['wf-new']).toEqual(['Download']);
	});

	it('does not ask for the conditions when nodes are not compiled from their code', async () => {
		compiler = new CompiledWorkflowCompiler(
			processes,
			subWorkflows,
			logger,
			nodeTypes,
			urlService,
			mock<InstanceSettings>({ instanceId: 'instance' }),
			credentials,
			mock<CredentialTypes>(),
			mock<CompiledEngineConfig>({
				compileNodes: false,
				artifactCacheMb: 1,
				sqlMysql: false,
				sqlMssql: false,
			}),
		);

		await compiler.compile(input);

		expect(credentials.unprovenFlagNodes).not.toHaveBeenCalled();
	});

	it('tells the converter that the runtime runs the sql effect', async () => {
		credentials.unprovenFlagNodes.mockResolvedValue([]);

		await compiler.compile(input);

		const options: ConvertOptions = convertWorkflow.mock.calls[0][1];
		expect(options.sql).toBe(true);
		// The MySQL client of the runtime is off by default.
		expect(options).not.toHaveProperty('mysql');
	});

	it('tells the converter that the runtime has the MySQL client only with the setting', async () => {
		credentials.unprovenFlagNodes.mockResolvedValue([]);
		const off = await compiler.compile(input);
		const withSetting = new CompiledWorkflowCompiler(
			processes,
			subWorkflows,
			logger,
			nodeTypes,
			urlService,
			mock<InstanceSettings>({ instanceId: 'instance' }),
			credentials,
			mock<CredentialTypes>(),
			mock<CompiledEngineConfig>({
				compileNodes: true,
				artifactCacheMb: 1,
				sqlMysql: true,
				sqlMssql: false,
			}),
		);

		const on = await withSetting.compile(input);

		const options: ConvertOptions = convertWorkflow.mock.calls[1][1];
		expect(options.mysql).toBe(true);
		// A module of the other setting is not used again.
		expect(on.key).not.toBe(off.key);
	});

	it('moves a library node to the host after a limit when nodes are not compiled from their code', async () => {
		compiler = new CompiledWorkflowCompiler(
			processes,
			subWorkflows,
			logger,
			nodeTypes,
			urlService,
			mock<InstanceSettings>({ instanceId: 'instance' }),
			credentials,
			mock<CredentialTypes>(),
			mock<CompiledEngineConfig>({
				compileNodes: false,
				artifactCacheMb: 1,
				sqlMysql: false,
				sqlMssql: false,
			}),
		);
		const first = await compiler.compile(input);
		expect(first.module?.toString()).toBe('compiled');
		const firstOptions: ConvertOptions = convertWorkflow.mock.calls[0][1];
		expect(firstOptions.nodeSources).toBeUndefined();

		compiler.runInHost('wf1', 'Acme');
		const inHost = await compiler.compile(input);

		expect(inHost.module?.toString()).toBe('host');
		expect(inHost.key).not.toBe(first.key);
		const options: ConvertOptions = convertWorkflow.mock.calls[1][1];
		// The sources give no file, so no node compiles from its code.
		expect(options.nodeSources?.entry?.('n8n-nodes-base.acme', 1)).toBeUndefined();
		expect(credentials.unprovenFlagNodes).not.toHaveBeenCalled();
	});
});
