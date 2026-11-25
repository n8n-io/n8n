import { Oa as v4 } from "./vendor-Hx42-oQF.js";
import { pk as getNodeParameters } from "./app-D5flEmb-.js";
//#region src/features/agents/composables/useAgentToolRefAdapter.ts
/**
* Two-way adapter between the agent's persisted tool shape (`AgentJsonToolRef`
* with `type: 'node'`) and the richer `INode` shape that the NDV parameter
* form and Chat Hub's ToolListItem component both operate on.
*
* The agent config stores node tools as a flat ref:
*   { type: 'node', name, description, node: { nodeType, nodeTypeVersion,
*     nodeParameters, credentials }, requireApproval }
*
* Rendering a row in the tools list only needs `INode.type`, `typeVersion`,
* `name`, and — for the settings/config panel — `parameters` and
* `credentials`.
*/
function pickLatestVersion$1(version) {
	if (Array.isArray(version)) return [...version].sort((a, b) => b - a)[0] ?? 1;
	return version;
}
/**
* Convert the config's credential map to `INodeCredentials` for rendering,
* carrying the n8n Connect managed marker through.
*/
function toINodeCredentials(credentials) {
	if (!credentials) return void 0;
	const out = {};
	for (const [credType, value] of Object.entries(credentials)) out[credType] = "__aiGatewayManaged" in value ? {
		id: null,
		name: value.name,
		__aiGatewayManaged: true
	} : {
		id: value.id,
		name: value.name
	};
	return out;
}
/**
* Convert `INodeCredentials` back to the config shape. Drops entries whose
* credential is not yet persisted (null id), except n8n Connect managed slots.
*/
function toConfigCredentials(credentials) {
	if (!credentials) return void 0;
	const out = {};
	for (const [credType, value] of Object.entries(credentials)) {
		if (value.__aiGatewayManaged) {
			out[credType] = {
				id: null,
				name: value.name,
				__aiGatewayManaged: true
			};
			continue;
		}
		if (value.id === null) continue;
		out[credType] = {
			id: value.id,
			name: value.name
		};
	}
	return Object.keys(out).length > 0 ? out : void 0;
}
/** Shape a node-type `AgentJsonToolRef` as an `INode` for list rendering. */
function toolRefToNode(ref) {
	if (ref.type !== "node" || !ref.node) return null;
	return {
		id: v4(),
		name: ref.name ?? ref.node.nodeType,
		type: ref.node.nodeType,
		typeVersion: ref.node.nodeTypeVersion,
		parameters: ref.node.nodeParameters ?? {},
		credentials: toINodeCredentials(ref.node.credentials),
		position: [0, 0]
	};
}
/** Build a new `AgentJsonToolRef` for a node type the user just connected. */
function nodeTypeToNewToolRef(nodeType) {
	const version = pickLatestVersion$1(nodeType.version);
	return {
		type: "node",
		name: nodeType.displayName.replace(/ Tool$/, ""),
		node: {
			nodeType: nodeType.name,
			nodeTypeVersion: version,
			nodeParameters: {}
		}
	};
}
/**
* Merge edits made to an `INode` back into the original ref (preserving extra
* fields).
*/
function updateToolRefFromNode(original, node) {
	if (original.type !== "node" || !original.node) return original;
	return {
		...original,
		name: node.name,
		node: {
			...original.node,
			nodeType: node.type,
			nodeTypeVersion: node.typeVersion,
			nodeParameters: node.parameters,
			credentials: toConfigCredentials(node.credentials)
		}
	};
}
/**
* Build a new `AgentJsonToolRef` of type `workflow` from the user's chosen
* workflow. The id is the stable lookup key; the name remains display data and
* the fallback for legacy refs.
*/
function workflowToNewToolRef(workflow) {
	return {
		type: "workflow",
		workflowId: workflow.id,
		workflow: workflow.name,
		name: workflow.name,
		description: workflow.description ?? "",
		allOutputs: false
	};
}
/**
* Collect the display names of every tool in the list, optionally excluding
* the one currently being edited. Feeds the config form's name-uniqueness
* check from both the sidebar gear path and the tools-modal connect / gear
* paths so they stay in sync.
*/
function getExistingToolNames(tools, exclude) {
	return tools.filter((t) => t !== exclude && t.type !== "custom" && Boolean(t.name)).map((t) => t.name);
}
/** Merge edits from the workflow config form back into the ref. */
function updateWorkflowToolRef(original, edits) {
	if (original.type !== "workflow") return original;
	const next = {
		...original,
		name: edits.name,
		description: edits.description,
		allOutputs: edits.allOutputs,
		workflow: edits.workflow,
		...edits.workflowId !== void 0 ? { workflowId: edits.workflowId } : {}
	};
	if ("inputs" in edits) {
		if (edits.inputs && Object.keys(edits.inputs).length > 0) next.inputs = edits.inputs;
		else delete next.inputs;
	}
	return next;
}
//#endregion
//#region src/features/agents/composables/useMcpServerAdapter.ts
var MCP_REGISTRY_NODE_PREFIX = "@n8n/mcp-registry.";
var HTTP_STREAMABLE_TRANSPORT = "httpStreamable";
function pickLatestVersion(version) {
	if (Array.isArray(version)) return [...version].sort((a, b) => b - a)[0] ?? 1;
	return version;
}
function toNodeTransport(transport) {
	return transport === "sse" ? "sse" : HTTP_STREAMABLE_TRANSPORT;
}
function toServerTransport(transport) {
	return transport === "sse" ? "sse" : "streamableHttp";
}
function toNumber(value) {
	return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : void 0;
}
function toStringValue(value) {
	return typeof value === "string" && value.length > 0 ? value : void 0;
}
function slugify(value) {
	return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "mcp-server";
}
/**
* Materializes the node type's default parameter values at its latest version.
* Several node properties are declared multiple times under the same name, each
* gated to a different `@version` range (e.g. the MCP `serverTransport` default
* is `sse` on v1.1 but `httpStreamable` from v1.2 on); `getNodeParameters`
* resolves which declaration applies. `returnNoneDisplayed` keeps defaults of
* parameters hidden behind other conditions (e.g. `sseEndpoint`).
*/
function resolveDefaultParameters(nodeType) {
	return getNodeParameters(nodeType.properties, {}, true, true, { typeVersion: pickLatestVersion(nodeType.version) }, nodeType) ?? {};
}
function resolveDefaultTimeout(nodeType) {
	const optionsProperty = nodeType.properties.find((property) => property.name === "options");
	if (!optionsProperty || optionsProperty.type !== "collection" || !Array.isArray(optionsProperty.options)) return;
	return toNumber(optionsProperty.options.find((option) => option.name === "timeout")?.default);
}
/**
* Maps an MCP `authentication` option value to the n8n credential type name
* that the node registers under `node.credentials`. The two do not always
* match: `bearerAuth` uses the `httpBearerAuth` credential type, etc.
* OAuth2 variants use their own name as-is (e.g. `mcpOAuth2Api`).
*/
var AUTHENTICATION_TO_CREDENTIAL_TYPE = {
	bearerAuth: "httpBearerAuth",
	headerAuth: "httpHeaderAuth",
	multipleHeadersAuth: "httpMultipleHeadersAuth",
	mcpOAuth2Api: "mcpOAuth2Api",
	none: "none"
};
var CREDENTIAL_TYPE_TO_AUTHENTICATION = {
	httpBearerAuth: "bearerAuth",
	httpHeaderAuth: "headerAuth",
	httpMultipleHeadersAuth: "multipleHeadersAuth",
	mcpOAuth2Api: "mcpOAuth2Api",
	none: "none"
};
function authenticationToCredentialType(authentication) {
	return AUTHENTICATION_TO_CREDENTIAL_TYPE[authentication] ?? authentication;
}
function resolveCredentialType(credentials) {
	if (!credentials) return void 0;
	return Object.entries(credentials).find(([, value]) => toStringValue(value.id))?.[0];
}
function resolveCredentialId(credentials) {
	if (!credentials) return void 0;
	return Object.entries(credentials).map(([, value]) => value.id).find((id) => typeof id === "string" && id.length > 0);
}
function resolveAuthenticationFromNode(node) {
	const authentication = toStringValue(node.parameters.authentication);
	if (authentication && !isMcpRegistryNodeType(node.type)) return authentication;
	const credentialType = resolveCredentialType(node.credentials);
	if (credentialType) return CREDENTIAL_TYPE_TO_AUTHENTICATION[credentialType] ?? credentialType;
	return "none";
}
function isMcpRegistryNodeType(nodeTypeName) {
	return nodeTypeName.startsWith(MCP_REGISTRY_NODE_PREFIX);
}
function isMcpClientNodeType(nodeTypeName) {
	return nodeTypeName === "@n8n/n8n-nodes-langchain.mcpClientTool" || nodeTypeName === "mcpClientTool";
}
function resolveMetadata(nodeTypeName, original) {
	const metadata = { ...original?.metadata ?? {} };
	if (isMcpRegistryNodeType(nodeTypeName)) metadata.nodeTypeName = nodeTypeName;
	else delete metadata.nodeTypeName;
	return Object.keys(metadata).length > 0 ? metadata : void 0;
}
function resolveDefaultAuthentication(nodeType, defaults) {
	const authentication = toStringValue(defaults.authentication);
	if (authentication) return authentication;
	const credentialType = nodeType.credentials?.[0]?.name;
	if (typeof credentialType === "string" && credentialType.length > 0) return credentialType;
	return "none";
}
function isMcpRelatedNodeType(nodeTypeName) {
	return isMcpClientNodeType(nodeTypeName) || isMcpRegistryNodeType(nodeTypeName);
}
function defaultAgentMcpToolPermissions(supportsApproval = true) {
	return { categories: {
		read: "always_allow",
		write: supportsApproval ? "require_approval" : "always_allow"
	} };
}
function nodeTypeToNewMcpServer(nodeType, supportsApproval = true) {
	const defaults = resolveDefaultParameters(nodeType);
	const endpointUrl = toStringValue(defaults.endpointUrl) ?? toStringValue(defaults.sseEndpoint) ?? "";
	const authentication = resolveDefaultAuthentication(nodeType, defaults);
	const serverTransport = defaults.serverTransport;
	const metadata = isMcpRegistryNodeType(nodeType.name) ? { nodeTypeName: nodeType.name } : void 0;
	return {
		name: slugify(nodeType.displayName.replace(/\s+tool$/i, "")),
		url: endpointUrl,
		transport: toServerTransport(serverTransport),
		authentication,
		connectionTimeoutMs: resolveDefaultTimeout(nodeType),
		metadata,
		toolPermissions: defaultAgentMcpToolPermissions(supportsApproval)
	};
}
function resolveAuthenticationParameterFromCredentialType(credentialType, nodeTypeDescription) {
	const showCondition = (nodeTypeDescription.credentials?.find((credential) => credential.name === credentialType))?.displayOptions?.show?.authentication?.[0];
	return showCondition ? showCondition : void 0;
}
function mcpServerToNode(server, nodeTypeDescription) {
	const credentialType = authenticationToCredentialType(server.authentication);
	const credentials = credentialType && server.credential ? { [credentialType]: {
		id: server.credential,
		name: server.credential
	} } : void 0;
	const options = server.connectionTimeoutMs ? { timeout: server.connectionTimeoutMs } : {};
	const authentication = isMcpRegistryNodeType(nodeTypeDescription.name) ? resolveAuthenticationParameterFromCredentialType(server.authentication, nodeTypeDescription) : server.authentication;
	return {
		id: v4(),
		name: server.name,
		type: nodeTypeDescription.name,
		typeVersion: pickLatestVersion(nodeTypeDescription.version),
		parameters: {
			endpointUrl: server.url,
			serverTransport: toNodeTransport(server.transport),
			authentication,
			options
		},
		credentials,
		position: [0, 0]
	};
}
function nodeToMcpServer(node, original) {
	const endpointUrl = toStringValue(node.parameters.endpointUrl) ?? toStringValue(node.parameters.sseEndpoint) ?? original?.url ?? "";
	const credential = resolveCredentialId(node.credentials);
	const authentication = resolveAuthenticationFromNode(node);
	const timeout = toNumber(node.parameters.options?.timeout);
	return {
		name: node.name,
		url: endpointUrl,
		transport: toServerTransport(node.parameters.serverTransport),
		authentication,
		credential,
		description: original?.description,
		toolPermissions: original?.toolPermissions ?? defaultAgentMcpToolPermissions(),
		connectionTimeoutMs: timeout,
		metadata: resolveMetadata(node.type, original)
	};
}
//#endregion
export { nodeToMcpServer as a, nodeTypeToNewToolRef as c, updateWorkflowToolRef as d, workflowToNewToolRef as f, mcpServerToNode as i, toolRefToNode as l, isMcpRegistryNodeType as n, nodeTypeToNewMcpServer as o, isMcpRelatedNodeType as r, getExistingToolNames as s, defaultAgentMcpToolPermissions as t, updateToolRefFromNode as u };
