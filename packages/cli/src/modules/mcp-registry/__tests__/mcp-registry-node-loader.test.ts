import type { Logger } from '@n8n/backend-common';
import { UnrecognizedCredentialTypeError, UnrecognizedNodeTypeError } from 'n8n-core';
import type { INodeType, INodeTypeDescription, NodeLoader } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

const logger = mock<Logger>();

import { McpRegistryNodeLoader } from '../mcp-registry-node-loader';
import {
	LANGCHAIN_PACKAGE_NAME,
	MCP_REGISTRY_BASE_NODE_NAME,
	MCP_REGISTRY_PACKAGE_NAME,
} from '../node-description-transform';
import type { McpRegistryServer } from '../registry/mcp-registry.types';
import {
	gmailDirectExtendMockServer,
	notionMockServer,
	slackExtendingMockServer,
} from '../registry/mock-servers';

const baseDescription: INodeTypeDescription = {
	displayName: 'MCP Registry Client (internal)',
	name: 'mcpRegistryClientTool',
	hidden: true,
	group: ['output'],
	version: 1,
	description: 'Runtime backing for MCP registry-derived nodes',
	defaults: { name: 'MCP Registry Client' },
	codex: {
		categories: ['AI'],
		subcategories: { AI: ['Model Context Protocol'] },
		alias: ['MCP', 'Model Context Protocol'],
	},
	inputs: [],
	outputs: [],
	credentials: [{ name: 'mcpOAuth2Api', required: true }],
	properties: [
		{ displayName: 'Endpoint URL', name: 'endpointUrl', type: 'hidden', default: '' },
		{
			displayName: 'Server Transport',
			name: 'serverTransport',
			type: 'hidden',
			default: 'httpStreamable',
		},
	],
};

function createBaseNodeClass() {
	const baseInstance: INodeType = {
		description: baseDescription,
		methods: {
			loadOptions: {
				getTools: vi.fn(),
			},
		},
	};
	return baseInstance;
}

function createLoadNodesAndCredentials(options?: {
	withLangchainLoader?: boolean;
	withBaseNode?: boolean;
	knownCredentialTypes?: string[];
}): {
	loadNodesAndCredentials: LoadNodesAndCredentials;
	baseNode: INodeType;
	sourcePath: string;
} {
	const baseNode = createBaseNodeClass();
	const sourcePath = '/path/to/McpRegistryClientTool.node.js';

	const langchainLoader = mock<NodeLoader>();
	langchainLoader.getNode.mockImplementation((nodeType) => {
		if (options?.withBaseNode !== false && nodeType === MCP_REGISTRY_BASE_NODE_NAME) {
			return { type: baseNode, sourcePath };
		}
		throw new Error('not found');
	});

	const loaders =
		options?.withLangchainLoader === false ? {} : { [LANGCHAIN_PACKAGE_NAME]: langchainLoader };

	const knownCredentials: Record<string, unknown> = {};
	for (const name of options?.knownCredentialTypes ?? []) {
		knownCredentials[name] = {};
	}

	const loadNodesAndCredentials = mock<LoadNodesAndCredentials>({
		loaders: loaders as never,
		knownCredentials: knownCredentials as never,
	});

	return { loadNodesAndCredentials, baseNode, sourcePath };
}

describe('McpRegistryNodeLoader', () => {
	describe('packageName', () => {
		it('matches MCP_REGISTRY_PACKAGE_NAME', () => {
			const { loadNodesAndCredentials } = createLoadNodesAndCredentials();
			const loader = new McpRegistryNodeLoader(loadNodesAndCredentials, logger);

			expect(loader.packageName).toBe(MCP_REGISTRY_PACKAGE_NAME);
		});
	});

	describe('loadAll', () => {
		it('populates `types`, `known`, registers synthetic nodes and credentials for each supported server', async () => {
			const { loadNodesAndCredentials, sourcePath } = createLoadNodesAndCredentials();
			const loader = new McpRegistryNodeLoader(loadNodesAndCredentials, logger);
			loader.setServers([notionMockServer]);

			await loader.loadAll();

			expect(loader.types.nodes).toHaveLength(1);
			expect(loader.types.nodes[0]).toMatchObject({
				name: 'notion',
				displayName: 'Notion MCP',
			});
			expect(loader.types.credentials).toHaveLength(1);
			expect(loader.types.credentials[0]).toMatchObject({
				name: 'notionMcpOAuth2Api',
				displayName: 'Notion MCP OAuth2',
			});

			const loadedNode = loader.getNode('notion');
			const loadedCredential = loader.getCredential('notionMcpOAuth2Api');
			expect(loadedNode).toBeDefined();
			expect(loadedNode.sourcePath).toBe(sourcePath);
			expect(loadedCredential).toBeDefined();
			expect(loadedCredential.sourcePath).toBe('');

			expect(loader.known.nodes.notion).toEqual({
				className: 'McpRegistryClientTool',
				sourcePath,
			});
			expect(loader.known.credentials.notionMcpOAuth2Api).toEqual({
				className: 'McpRegistryApi',
				sourcePath: '',
				extends: ['mcpOAuth2Api'],
				supportedNodes: ['notion'],
			});
		});

		it('inherits prototype methods from the base node class on synthetic nodes', async () => {
			const { loadNodesAndCredentials, baseNode } = createLoadNodesAndCredentials();
			const loader = new McpRegistryNodeLoader(loadNodesAndCredentials, logger);
			loader.setServers([notionMockServer]);

			await loader.loadAll();

			const synthetic = loader.getNode('notion').type as INodeType;
			expect(synthetic.methods).toBe(baseNode.methods);
			expect(synthetic.description.name).toBe('notion');
			expect(synthetic.description.displayName).toBe('Notion MCP');
		});

		it('skips servers whose remote selection returns null', async () => {
			const unsupportedServer: McpRegistryServer = {
				...notionMockServer,
				slug: 'no-remotes',
				title: 'No Remotes',
				remotes: [],
			};
			const { loadNodesAndCredentials } = createLoadNodesAndCredentials();
			const loader = new McpRegistryNodeLoader(loadNodesAndCredentials, logger);
			loader.setServers([notionMockServer, unsupportedServer]);

			await loader.loadAll();

			expect(loader.types.nodes).toHaveLength(1);
			expect(loader.types.nodes[0].name).toBe('notion');
			expect(loader.types.credentials).toHaveLength(1);
			expect(loader.types.credentials[0].name).toBe('notionMcpOAuth2Api');
			expect(() => loader.getNode('noRemotes')).toThrow(UnrecognizedNodeTypeError);
			expect(() => loader.getCredential('noRemotesMcpOAuth2Api')).toThrow(
				UnrecognizedCredentialTypeError,
			);
		});

		it('no-ops when the langchain loader is missing', async () => {
			const { loadNodesAndCredentials } = createLoadNodesAndCredentials({
				withLangchainLoader: false,
			});
			const loader = new McpRegistryNodeLoader(loadNodesAndCredentials, logger);
			loader.setServers([notionMockServer]);

			await loader.loadAll();

			expect(loader.types.nodes).toHaveLength(0);
			expect(loader.types.credentials).toHaveLength(0);
		});

		it('no-ops when the base node is not registered on the langchain loader', async () => {
			const { loadNodesAndCredentials } = createLoadNodesAndCredentials({
				withBaseNode: false,
			});
			const loader = new McpRegistryNodeLoader(loadNodesAndCredentials, logger);
			loader.setServers([notionMockServer]);

			await loader.loadAll();

			expect(loader.types.nodes).toHaveLength(0);
			expect(loader.types.credentials).toHaveLength(0);
		});

		it('resets prior state before loading', async () => {
			const { loadNodesAndCredentials } = createLoadNodesAndCredentials();
			const loader = new McpRegistryNodeLoader(loadNodesAndCredentials, logger);
			loader.setServers([notionMockServer]);

			await loader.loadAll();
			await loader.loadAll();

			expect(loader.types.nodes).toHaveLength(1);
			expect(loader.types.credentials).toHaveLength(1);
		});

		it('registers a synthetic credential extending an existing one when extendsCredential is set', async () => {
			const { loadNodesAndCredentials } = createLoadNodesAndCredentials({
				knownCredentialTypes: ['slackOAuth2Api'],
			});
			const loader = new McpRegistryNodeLoader(loadNodesAndCredentials, logger);
			loader.setServers([slackExtendingMockServer]);

			await loader.loadAll();

			expect(loader.types.nodes).toHaveLength(1);
			expect(loader.types.nodes[0]).toMatchObject({
				name: 'slack',
				credentials: [{ name: 'slackMcpOAuth2Api', required: true }],
			});

			expect(loader.types.credentials).toHaveLength(1);
			expect(loader.types.credentials[0]).toMatchObject({
				name: 'slackMcpOAuth2Api',
				extends: ['slackOAuth2Api'],
			});

			expect(loader.known.credentials.slackMcpOAuth2Api).toMatchObject({
				className: 'McpRegistryApi',
				extends: ['slackOAuth2Api'],
				supportedNodes: ['slack'],
			});
		});

		it('registers a synthetic credential extending the parent even when no overrides are present', async () => {
			const { loadNodesAndCredentials, sourcePath } = createLoadNodesAndCredentials({
				knownCredentialTypes: ['gmailOAuth2'],
			});
			const loader = new McpRegistryNodeLoader(loadNodesAndCredentials, logger);
			loader.setServers([gmailDirectExtendMockServer]);

			await loader.loadAll();

			expect(loader.types.nodes).toHaveLength(1);
			expect(loader.types.nodes[0]).toMatchObject({
				name: 'gmail',
				credentials: [{ name: 'gmailMcpOAuth2Api', required: true }],
			});

			expect(loader.types.credentials).toHaveLength(1);
			expect(loader.types.credentials[0]).toMatchObject({
				name: 'gmailMcpOAuth2Api',
				extends: ['gmailOAuth2'],
				properties: [
					{ name: 'allowedHttpRequestDomains', type: 'hidden', default: 'domains' },
					{ name: 'allowedDomains', type: 'hidden', default: 'mcp.gmail.com' },
				],
			});

			expect(loader.known.credentials.gmailMcpOAuth2Api).toMatchObject({
				className: 'McpRegistryApi',
				extends: ['gmailOAuth2'],
				supportedNodes: ['gmail'],
			});

			const loadedNode = loader.getNode('gmail');
			expect(loadedNode.sourcePath).toBe(sourcePath);
		});

		it('skips servers whose extendsCredential parent matches an inherited prototype key', async () => {
			const { loadNodesAndCredentials } = createLoadNodesAndCredentials({
				knownCredentialTypes: ['slackOAuth2Api'],
			});
			const prototypeKeyServer: McpRegistryServer = {
				...slackExtendingMockServer,
				extendsCredential: {
					extends: 'toString',
					authUrl: 'https://example.com/oauth/authorize',
				},
			};
			const loader = new McpRegistryNodeLoader(loadNodesAndCredentials, logger);
			loader.setServers([prototypeKeyServer]);

			await loader.loadAll();

			expect(loader.types.nodes).toHaveLength(0);
			expect(loader.types.credentials).toHaveLength(0);
		});

		it('skips servers whose extendsCredential parent type is not registered', async () => {
			const { loadNodesAndCredentials } = createLoadNodesAndCredentials({
				knownCredentialTypes: [],
			});
			const loader = new McpRegistryNodeLoader(loadNodesAndCredentials, logger);
			loader.setServers([slackExtendingMockServer]);

			await loader.loadAll();

			expect(loader.types.nodes).toHaveLength(0);
			expect(loader.types.credentials).toHaveLength(0);
		});

		it('loads deprecated servers when passed through setServers', async () => {
			const { loadNodesAndCredentials } = createLoadNodesAndCredentials();
			const deprecatedServer: McpRegistryServer = {
				...notionMockServer,
				slug: 'deprecated-server',
				status: 'deprecated',
			};
			const loader = new McpRegistryNodeLoader(loadNodesAndCredentials, logger);
			loader.setServers([deprecatedServer]);

			await loader.loadAll();

			expect(loader.types.nodes).toHaveLength(1);
			expect(loader.types.nodes[0].name).toBe('deprecatedServer');
		});
	});

	describe('getNode', () => {
		it('returns the synthetic LoadedClass for a known type', async () => {
			const { loadNodesAndCredentials } = createLoadNodesAndCredentials();
			const loader = new McpRegistryNodeLoader(loadNodesAndCredentials, logger);
			loader.setServers([notionMockServer]);
			await loader.loadAll();

			const result = loader.getNode('notion');

			expect(result.type).toBeDefined();
			expect((result.type as INodeType).description.name).toBe('notion');
		});

		it('throws UnrecognizedNodeTypeError for an unknown type', () => {
			const { loadNodesAndCredentials } = createLoadNodesAndCredentials();
			const loader = new McpRegistryNodeLoader(loadNodesAndCredentials, logger);

			expect(() => loader.getNode('unknown')).toThrow(UnrecognizedNodeTypeError);
		});
	});

	describe('getCredential', () => {
		it('returns the credential for a known credential type', async () => {
			const { loadNodesAndCredentials } = createLoadNodesAndCredentials();
			const loader = new McpRegistryNodeLoader(loadNodesAndCredentials, logger);
			loader.setServers([notionMockServer]);

			await loader.loadAll();

			const result = loader.getCredential('notionMcpOAuth2Api');
			expect(result.type).toBeDefined();
			expect(result.type.name).toBe('notionMcpOAuth2Api');
		});

		it('throws UnrecognizedCredentialTypeError for an unknown credential type', () => {
			const { loadNodesAndCredentials } = createLoadNodesAndCredentials();
			const loader = new McpRegistryNodeLoader(loadNodesAndCredentials, logger);

			expect(() => loader.getCredential('unknown')).toThrow(UnrecognizedCredentialTypeError);
		});
	});

	describe('state management', () => {
		it('reset clears known, types, and registered node types', async () => {
			const { loadNodesAndCredentials } = createLoadNodesAndCredentials();
			const loader = new McpRegistryNodeLoader(loadNodesAndCredentials, logger);
			loader.setServers([notionMockServer]);
			await loader.loadAll();

			loader.reset();

			expect(loader.types.nodes).toEqual([]);
			expect(loader.types.credentials).toEqual([]);
			expect(loader.known.nodes).toEqual({});
			expect(loader.known.credentials).toEqual({});
			expect(() => loader.getNode('notion')).toThrow(UnrecognizedNodeTypeError);
			expect(() => loader.getCredential('notionMcpOAuth2Api')).toThrow(
				UnrecognizedCredentialTypeError,
			);
		});

		it('releaseTypes only clears types', async () => {
			const { loadNodesAndCredentials } = createLoadNodesAndCredentials();
			const loader = new McpRegistryNodeLoader(loadNodesAndCredentials, logger);
			loader.setServers([notionMockServer]);
			await loader.loadAll();

			loader.releaseTypes();

			expect(loader.types.nodes).toEqual([]);
			expect(loader.types.credentials).toEqual([]);
			expect(loader.getNode('notion')).toBeDefined();
			expect(loader.getCredential('notionMcpOAuth2Api')).toBeDefined();
		});

		it('ensureTypesLoaded calls loadAll only when types are empty', async () => {
			const { loadNodesAndCredentials } = createLoadNodesAndCredentials();
			const loader = new McpRegistryNodeLoader(loadNodesAndCredentials, logger);
			loader.setServers([notionMockServer]);

			await loader.ensureTypesLoaded();
			expect(loader.types.nodes).toHaveLength(1);

			await loader.ensureTypesLoaded();
			expect(loader.types.nodes).toHaveLength(1);
		});
	});
});
