import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';
import { UnrecognizedCredentialTypeError, UnrecognizedNodeTypeError } from 'n8n-core';
import type { INodeType, INodeTypeDescription, NodeLoader } from 'n8n-workflow';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

const logger = mock<Logger>();

import { McpRegistryNodeLoader } from './mcp-registry-node-loader';
import {
	LANGCHAIN_PACKAGE_NAME,
	MCP_REGISTRY_BASE_NODE_NAME,
	MCP_REGISTRY_PACKAGE_NAME,
} from './node-description-transform';
import type { McpRegistryService } from './registry/mcp-registry.service';
import type { McpRegistryServer } from './registry/mcp-registry.types';
import { notionMockServer } from './registry/mock-servers';

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
				getTools: jest.fn(),
			},
		},
	};
	return baseInstance;
}

function createLoadNodesAndCredentials(options?: {
	withLangchainLoader?: boolean;
	withBaseNode?: boolean;
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

	const loadNodesAndCredentials = mock<LoadNodesAndCredentials>({
		loaders,
	});

	return { loadNodesAndCredentials, baseNode, sourcePath };
}

function createServiceWithServers(servers: McpRegistryServer[]): McpRegistryService {
	const service = mock<McpRegistryService>();
	service.getAll.mockReturnValue(servers);
	return service;
}

describe('McpRegistryNodeLoader', () => {
	describe('packageName', () => {
		it('matches MCP_REGISTRY_PACKAGE_NAME', () => {
			const { loadNodesAndCredentials } = createLoadNodesAndCredentials();
			const service = createServiceWithServers([]);
			const loader = new McpRegistryNodeLoader(service, loadNodesAndCredentials, logger);

			expect(loader.packageName).toBe(MCP_REGISTRY_PACKAGE_NAME);
		});
	});

	describe('loadAll', () => {
		it('populates `types`, `known`, registers synthetic nodes and credentials for each supported server', async () => {
			const { loadNodesAndCredentials, sourcePath } = createLoadNodesAndCredentials();
			const service = createServiceWithServers([notionMockServer]);
			const loader = new McpRegistryNodeLoader(service, loadNodesAndCredentials, logger);

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
			const service = createServiceWithServers([notionMockServer]);
			const loader = new McpRegistryNodeLoader(service, loadNodesAndCredentials, logger);

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
			const service = createServiceWithServers([notionMockServer, unsupportedServer]);
			const loader = new McpRegistryNodeLoader(service, loadNodesAndCredentials, logger);

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
			const service = createServiceWithServers([notionMockServer]);
			const loader = new McpRegistryNodeLoader(service, loadNodesAndCredentials, logger);

			await loader.loadAll();

			expect(loader.types.nodes).toHaveLength(0);
			expect(loader.types.credentials).toHaveLength(0);
		});

		it('no-ops when the base node is not registered on the langchain loader', async () => {
			const { loadNodesAndCredentials } = createLoadNodesAndCredentials({
				withBaseNode: false,
			});
			const service = createServiceWithServers([notionMockServer]);
			const loader = new McpRegistryNodeLoader(service, loadNodesAndCredentials, logger);

			await loader.loadAll();

			expect(loader.types.nodes).toHaveLength(0);
			expect(loader.types.credentials).toHaveLength(0);
		});

		it('resets prior state before loading', async () => {
			const { loadNodesAndCredentials } = createLoadNodesAndCredentials();
			const service = createServiceWithServers([notionMockServer]);
			const loader = new McpRegistryNodeLoader(service, loadNodesAndCredentials, logger);

			await loader.loadAll();
			await loader.loadAll();

			expect(loader.types.nodes).toHaveLength(1);
			expect(loader.types.credentials).toHaveLength(1);
		});

		it('requests deprecated servers from the registry so existing workflows keep loading', async () => {
			const { loadNodesAndCredentials } = createLoadNodesAndCredentials();
			const service = createServiceWithServers([notionMockServer]);
			const loader = new McpRegistryNodeLoader(service, loadNodesAndCredentials, logger);

			await loader.loadAll();

			expect(service.getAll).toHaveBeenCalledWith({ includeDeprecated: true });
		});
	});

	describe('getNode', () => {
		it('returns the synthetic LoadedClass for a known type', async () => {
			const { loadNodesAndCredentials } = createLoadNodesAndCredentials();
			const service = createServiceWithServers([notionMockServer]);
			const loader = new McpRegistryNodeLoader(service, loadNodesAndCredentials, logger);
			await loader.loadAll();

			const result = loader.getNode('notion');

			expect(result.type).toBeDefined();
			expect((result.type as INodeType).description.name).toBe('notion');
		});

		it('throws UnrecognizedNodeTypeError for an unknown type', () => {
			const { loadNodesAndCredentials } = createLoadNodesAndCredentials();
			const service = createServiceWithServers([]);
			const loader = new McpRegistryNodeLoader(service, loadNodesAndCredentials, logger);

			expect(() => loader.getNode('unknown')).toThrow(UnrecognizedNodeTypeError);
		});
	});

	describe('getCredential', () => {
		it('returns the credential for a known credential type', async () => {
			const { loadNodesAndCredentials } = createLoadNodesAndCredentials();
			const service = createServiceWithServers([notionMockServer]);
			const loader = new McpRegistryNodeLoader(service, loadNodesAndCredentials, logger);

			await loader.loadAll();

			const result = loader.getCredential('notionMcpOAuth2Api');
			expect(result.type).toBeDefined();
			expect(result.type.name).toBe('notionMcpOAuth2Api');
		});

		it('throws UnrecognizedCredentialTypeError for an unknown credential type', () => {
			const { loadNodesAndCredentials } = createLoadNodesAndCredentials();
			const service = createServiceWithServers([]);
			const loader = new McpRegistryNodeLoader(service, loadNodesAndCredentials, logger);

			expect(() => loader.getCredential('unknown')).toThrow(UnrecognizedCredentialTypeError);
		});
	});

	describe('state management', () => {
		it('reset clears known, types, and registered node types', async () => {
			const { loadNodesAndCredentials } = createLoadNodesAndCredentials();
			const service = createServiceWithServers([notionMockServer]);
			const loader = new McpRegistryNodeLoader(service, loadNodesAndCredentials, logger);
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
			const service = createServiceWithServers([notionMockServer]);
			const loader = new McpRegistryNodeLoader(service, loadNodesAndCredentials, logger);
			await loader.loadAll();

			loader.releaseTypes();

			expect(loader.types.nodes).toEqual([]);
			expect(loader.types.credentials).toEqual([]);
			expect(loader.getNode('notion')).toBeDefined();
			expect(loader.getCredential('notionMcpOAuth2Api')).toBeDefined();
		});

		it('ensureTypesLoaded calls loadAll only when types are empty', async () => {
			const { loadNodesAndCredentials } = createLoadNodesAndCredentials();
			const service = createServiceWithServers([notionMockServer]);
			const loader = new McpRegistryNodeLoader(service, loadNodesAndCredentials, logger);

			await loader.ensureTypesLoaded();
			expect(service.getAll).toHaveBeenCalledTimes(1);

			await loader.ensureTypesLoaded();
			expect(service.getAll).toHaveBeenCalledTimes(1);
		});
	});
});
