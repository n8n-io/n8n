import { v4 as uuidv4 } from 'uuid';
import type { INode, INodeCredentials, INodeTypeDescription } from 'n8n-workflow';

import { AI_MCP_TOOL_NODE_TYPE } from '@/app/constants/nodeTypes';
import type { AgentJsonMcpServerConfig } from '../types';

const MCP_REGISTRY_NODE_PREFIX = '@n8n/mcp-registry.';
const HTTP_STREAMABLE_TRANSPORT = 'httpStreamable';

function pickLatestVersion(version: number | number[]): number {
	if (Array.isArray(version)) {
		return [...version].sort((a, b) => b - a)[0] ?? 1;
	}
	return version;
}

function toNodeTransport(
	transport: AgentJsonMcpServerConfig['transport'] | undefined,
): 'sse' | 'httpStreamable' {
	return transport === 'sse' ? 'sse' : HTTP_STREAMABLE_TRANSPORT;
}

function toServerTransport(transport: unknown): AgentJsonMcpServerConfig['transport'] {
	return transport === 'sse' ? 'sse' : 'streamableHttp';
}

function toArray(value: unknown): string[] {
	return Array.isArray(value)
		? value.filter((item): item is string => typeof item === 'string')
		: [];
}

function toNumber(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

function toStringValue(value: unknown): string | undefined {
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function slugify(value: string): string {
	const normalized = value
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return normalized || 'mcp-server';
}

function resolveDefaultParameter(nodeType: INodeTypeDescription, name: string): unknown {
	const property = nodeType.properties.find((candidate) => candidate.name === name);
	if (!property || !('default' in property)) {
		return undefined;
	}
	return (property as { default?: unknown }).default;
}

function resolveDefaultTimeout(nodeType: INodeTypeDescription): number | undefined {
	const optionsProperty = nodeType.properties.find((property) => property.name === 'options');
	if (
		!optionsProperty ||
		optionsProperty.type !== 'collection' ||
		!Array.isArray(optionsProperty.options)
	) {
		return undefined;
	}

	const timeoutOption = optionsProperty.options.find((option) => option.name === 'timeout');
	return toNumber((timeoutOption as { default?: unknown } | undefined)?.default);
}

function resolveCredentialType(credentials: INodeCredentials | undefined): string | undefined {
	if (!credentials) return undefined;
	return Object.entries(credentials).find(([, value]) => value.id !== null)?.[0];
}

function resolveCredentialId(credentials: INodeCredentials | undefined): string | undefined {
	if (!credentials) return undefined;
	return Object.entries(credentials)
		.map(([, value]) => value.id)
		.find((id): id is string => typeof id === 'string' && id.length > 0);
}

function resolveAuthenticationFromNode(node: INode): string {
	const authentication = toStringValue(node.parameters.authentication);
	if (authentication) return authentication;

	const credentialType = resolveCredentialType(node.credentials);
	if (credentialType) return credentialType;

	return 'none';
}

function isMcpRegistryNodeType(nodeTypeName: string): boolean {
	return nodeTypeName.startsWith(MCP_REGISTRY_NODE_PREFIX);
}

function isMcpClientNodeType(nodeTypeName: string): boolean {
	return nodeTypeName === AI_MCP_TOOL_NODE_TYPE || nodeTypeName === 'mcpClientTool';
}

function resolveMetadata(
	nodeTypeName: string,
	original: AgentJsonMcpServerConfig | undefined,
): AgentJsonMcpServerConfig['metadata'] {
	const metadata = { ...(original?.metadata ?? {}) };

	if (isMcpRegistryNodeType(nodeTypeName)) {
		metadata.nodeTypeName = nodeTypeName;
	} else {
		delete metadata.nodeTypeName;
	}

	return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function resolveDefaultAuthentication(nodeType: INodeTypeDescription): string {
	const authentication = resolveDefaultParameter(nodeType, 'authentication');
	if (typeof authentication === 'string' && authentication.length > 0) {
		return authentication;
	}

	const credentialType = nodeType.credentials?.[0]?.name;
	if (typeof credentialType === 'string' && credentialType.length > 0) {
		return credentialType;
	}

	return 'none';
}

function resolveNodeToolFilter(
	toolFilter: AgentJsonMcpServerConfig['toolFilter'],
): Pick<INode['parameters'], 'include' | 'includeTools' | 'excludeTools'> {
	if (!toolFilter) {
		return { include: 'all', includeTools: [], excludeTools: [] };
	}

	if (toolFilter.mode === 'allow') {
		return { include: 'selected', includeTools: toolFilter.tools, excludeTools: [] };
	}

	return { include: 'except', includeTools: [], excludeTools: toolFilter.tools };
}

function resolveServerToolFilter(
	parameters: INode['parameters'],
): AgentJsonMcpServerConfig['toolFilter'] {
	const includeMode = parameters.include;
	const includeTools = toArray(parameters.includeTools);
	const excludeTools = toArray(parameters.excludeTools);

	if (includeMode === 'selected') {
		return { mode: 'allow', tools: includeTools };
	}

	if (includeMode === 'except') {
		return { mode: 'exclude', tools: excludeTools };
	}

	return undefined;
}

export function isMcpRelatedNodeType(nodeTypeName: string): boolean {
	return isMcpClientNodeType(nodeTypeName) || isMcpRegistryNodeType(nodeTypeName);
}

export function nodeTypeToNewMcpServer(nodeType: INodeTypeDescription): AgentJsonMcpServerConfig {
	const endpointUrlDefault = resolveDefaultParameter(nodeType, 'endpointUrl');
	const sseEndpointDefault = resolveDefaultParameter(nodeType, 'sseEndpoint');
	const endpointUrl = toStringValue(endpointUrlDefault) ?? toStringValue(sseEndpointDefault) ?? '';

	const authentication = resolveDefaultAuthentication(nodeType);
	const serverTransport = resolveDefaultParameter(nodeType, 'serverTransport');
	const metadata = isMcpRegistryNodeType(nodeType.name)
		? { nodeTypeName: nodeType.name }
		: undefined;

	return {
		name: slugify(nodeType.displayName.replace(/\s+tool$/i, '')),
		url: endpointUrl,
		transport: toServerTransport(serverTransport),
		authentication,
		connectionTimeoutMs: resolveDefaultTimeout(nodeType),
		metadata,
	};
}

export function mcpServerToNode(
	server: AgentJsonMcpServerConfig,
	nodeTypeDescription: INodeTypeDescription,
): INode {
	const credentialType =
		typeof server.authentication === 'string' && server.authentication !== 'none'
			? server.authentication
			: undefined;
	const credentials =
		credentialType && server.credential
			? {
					[credentialType]: {
						id: server.credential,
						name: server.credential,
					},
				}
			: undefined;
	const toolFilterParams = resolveNodeToolFilter(server.toolFilter);
	const options = server.connectionTimeoutMs ? { timeout: server.connectionTimeoutMs } : {};

	return {
		id: uuidv4(),
		name: server.name,
		type: nodeTypeDescription.name,
		typeVersion: pickLatestVersion(nodeTypeDescription.version),
		parameters: {
			endpointUrl: server.url,
			serverTransport: toNodeTransport(server.transport),
			authentication: server.authentication,
			...toolFilterParams,
			options,
		},
		credentials,
		position: [0, 0],
	};
}

export function nodeToMcpServer(
	node: INode,
	original?: AgentJsonMcpServerConfig,
): AgentJsonMcpServerConfig {
	const endpointUrl =
		toStringValue(node.parameters.endpointUrl) ??
		toStringValue(node.parameters.sseEndpoint) ??
		original?.url ??
		'';
	const credential = resolveCredentialId(node.credentials);
	const authentication = resolveAuthenticationFromNode(node);
	const timeout = toNumber((node.parameters.options as { timeout?: unknown } | undefined)?.timeout);

	return {
		name: node.name,
		url: endpointUrl,
		transport: toServerTransport(node.parameters.serverTransport),
		authentication,
		credential,
		toolFilter: resolveServerToolFilter(node.parameters),
		description: original?.description,
		approval: original?.approval,
		connectionTimeoutMs: timeout,
		metadata: resolveMetadata(node.type, original),
	};
}
