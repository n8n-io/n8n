import { v4 as uuidv4 } from 'uuid';
import { NodeHelpers, isMcpGatewayAuthentication } from 'n8n-workflow';
import type { INode, INodeCredentials, INodeParameters, INodeTypeDescription } from 'n8n-workflow';

import { AI_MCP_TOOL_NODE_TYPE } from '@/app/constants/nodeTypes';
import type { AgentJsonMcpServerConfig } from '../types';
import { AI_GATEWAY_MCP_CONNECTION_MODE, type McpAuthenticationSchemaType } from '@n8n/api-types';

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

/**
 * Materializes the node type's default parameter values at its latest version.
 * Several node properties are declared multiple times under the same name, each
 * gated to a different `@version` range (e.g. the MCP `serverTransport` default
 * is `sse` on v1.1 but `httpStreamable` from v1.2 on); `getNodeParameters`
 * resolves which declaration applies. `returnNoneDisplayed` keeps defaults of
 * parameters hidden behind other conditions (e.g. `sseEndpoint`).
 */
function resolveDefaultParameters(nodeType: INodeTypeDescription): INodeParameters {
	return (
		NodeHelpers.getNodeParameters(
			nodeType.properties,
			{},
			true,
			true,
			{ typeVersion: pickLatestVersion(nodeType.version) },
			nodeType,
		) ?? {}
	);
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

/**
 * Maps an MCP `authentication` option value to the n8n credential type name
 * that the node registers under `node.credentials`. The two do not always
 * match: `bearerAuth` uses the `httpBearerAuth` credential type, etc.
 * OAuth2 variants use their own name as-is (e.g. `mcpOAuth2Api`).
 */
const AUTHENTICATION_TO_CREDENTIAL_TYPE: Record<string, string | undefined> = {
	bearerAuth: 'httpBearerAuth',
	headerAuth: 'httpHeaderAuth',
	multipleHeadersAuth: 'httpMultipleHeadersAuth',
	mcpOAuth2Api: 'mcpOAuth2Api',
	none: 'none',
} satisfies Record<McpAuthenticationSchemaType, string | undefined>;

const CREDENTIAL_TYPE_TO_AUTHENTICATION: Record<string, string | undefined> = {
	httpBearerAuth: 'bearerAuth',
	httpHeaderAuth: 'headerAuth',
	httpMultipleHeadersAuth: 'multipleHeadersAuth',
	mcpOAuth2Api: 'mcpOAuth2Api',
	none: 'none',
} satisfies Record<string, McpAuthenticationSchemaType | undefined>;

function authenticationToCredentialType(authentication: string): string | undefined {
	return AUTHENTICATION_TO_CREDENTIAL_TYPE[authentication] ?? authentication;
}

function resolveCredentialType(credentials: INodeCredentials | undefined): string | undefined {
	if (!credentials) return undefined;
	return Object.entries(credentials).find(([, value]) => toStringValue(value.id))?.[0];
}

function resolveCredentialId(credentials: INodeCredentials | undefined): string | undefined {
	if (!credentials) return undefined;
	return Object.entries(credentials)
		.map(([, value]) => value.id)
		.find((id): id is string => typeof id === 'string' && id.length > 0);
}

function resolveAuthenticationFromNode(node: INode): string {
	const authentication = toStringValue(node.parameters.authentication);
	// for mcp registry nodes use credential name directly
	if (authentication && !isMcpRegistryNodeType(node.type)) return authentication;

	const credentialType = resolveCredentialType(node.credentials);
	if (credentialType) return CREDENTIAL_TYPE_TO_AUTHENTICATION[credentialType] ?? credentialType;

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
	connectionMode?: string,
): AgentJsonMcpServerConfig['metadata'] {
	const metadata = { ...(original?.metadata ?? {}) };

	if (isMcpRegistryNodeType(nodeTypeName)) {
		metadata.nodeTypeName = nodeTypeName;
		if (connectionMode) metadata.connectionMode = connectionMode;
		else delete metadata.connectionMode;
	} else {
		delete metadata.nodeTypeName;
		delete metadata.connectionMode;
	}

	return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function resolveDefaultAuthentication(
	nodeType: INodeTypeDescription,
	defaults: INodeParameters,
): string {
	const authentication = toStringValue(defaults.authentication);
	if (authentication) {
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
	const defaults = resolveDefaultParameters(nodeType);
	const endpointUrl =
		toStringValue(defaults.endpointUrl) ?? toStringValue(defaults.sseEndpoint) ?? '';

	const isAiGatewayOnly =
		nodeType.credentials?.length === 1 &&
		isMcpGatewayAuthentication(nodeType.credentials[0]?.name ?? '');
	const connectionMode =
		toStringValue(defaults.authentication) ??
		(isAiGatewayOnly ? AI_GATEWAY_MCP_CONNECTION_MODE : undefined);
	const selectedCredential = nodeType.credentials?.find((credential) =>
		credential.displayOptions?.show?.authentication?.includes(connectionMode ?? ''),
	);
	const authentication =
		connectionMode === AI_GATEWAY_MCP_CONNECTION_MODE
			? 'none'
			: (selectedCredential?.name ?? resolveDefaultAuthentication(nodeType, defaults));
	const serverTransport = defaults.serverTransport;
	const metadata = isMcpRegistryNodeType(nodeType.name)
		? {
				nodeTypeName: nodeType.name,
				...(connectionMode && (selectedCredential || isAiGatewayOnly) ? { connectionMode } : {}),
			}
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

function resolveAuthenticationParameterFromCredentialType(
	credentialType: string,
	nodeTypeDescription: INodeTypeDescription,
) {
	const credentials = nodeTypeDescription.credentials;
	const credential = credentials?.find((credential) => credential.name === credentialType);
	const showCondition = credential?.displayOptions?.show?.authentication?.[0];
	// node type with authentication selector store the authentication option in the displayOptions.show.authentication
	// single auth method nodes don't have "authentication" parameter
	return showCondition ? showCondition : undefined;
}

/**
 * An n8n Connect MCP registry node declares its credential as a `*McpGatewayApi`
 * type. Such a credential is managed by the AI Gateway and has no stored id, so
 * the round-tripped config carries no `credential`. Return the type so we can
 * rebuild the managed slot on the node.
 */
function resolveAiGatewayCredentialType(nodeType: INodeTypeDescription): string | undefined {
	return nodeType.credentials?.find(({ name }) => isMcpGatewayAuthentication(name))?.name;
}

export function mcpServerToNode(
	server: AgentJsonMcpServerConfig,
	nodeTypeDescription: INodeTypeDescription,
): INode {
	const credentialType = authenticationToCredentialType(server.authentication);
	const aiGatewayCredentialType = resolveAiGatewayCredentialType(nodeTypeDescription);
	const isAiGatewaySelected =
		server.metadata?.connectionMode === AI_GATEWAY_MCP_CONNECTION_MODE ||
		(!server.metadata?.connectionMode &&
			aiGatewayCredentialType &&
			nodeTypeDescription.credentials?.length === 1 &&
			!server.credential);
	let credentials: INodeCredentials | undefined;
	if (aiGatewayCredentialType && isAiGatewaySelected) {
		// Restore the managed slot so the modal keeps the n8n Connect selection.
		credentials = {
			[aiGatewayCredentialType]: { id: null, name: '', __aiGatewayManaged: true },
		};
	} else if (credentialType && server.credential) {
		credentials = {
			[credentialType]: { id: server.credential, name: server.credential },
		};
	}
	const toolFilterParams = resolveNodeToolFilter(server.toolFilter);
	const options = server.connectionTimeoutMs ? { timeout: server.connectionTimeoutMs } : {};
	const authentication = isMcpRegistryNodeType(nodeTypeDescription.name)
		? (server.metadata?.connectionMode ??
			resolveAuthenticationParameterFromCredentialType(server.authentication, nodeTypeDescription))
		: server.authentication;

	return {
		id: uuidv4(),
		name: server.name,
		type: nodeTypeDescription.name,
		typeVersion: pickLatestVersion(nodeTypeDescription.version),
		parameters: {
			endpointUrl: server.url,
			serverTransport: toNodeTransport(server.transport),
			authentication,
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
	const hasAiGatewayCredential = Object.entries(node.credentials ?? {}).some(
		([type, credential]) =>
			isMcpGatewayAuthentication(type) && credential.__aiGatewayManaged === true,
	);
	const connectionMode = isMcpRegistryNodeType(node.type)
		? (toStringValue(node.parameters.authentication) ??
			(hasAiGatewayCredential ? AI_GATEWAY_MCP_CONNECTION_MODE : undefined))
		: undefined;
	const credential =
		connectionMode === AI_GATEWAY_MCP_CONNECTION_MODE
			? undefined
			: resolveCredentialId(node.credentials);
	const authentication =
		connectionMode === AI_GATEWAY_MCP_CONNECTION_MODE
			? 'none'
			: resolveAuthenticationFromNode(node);
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
		metadata: resolveMetadata(node.type, original, connectionMode),
	};
}
