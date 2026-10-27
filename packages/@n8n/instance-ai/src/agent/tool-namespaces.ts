import type { BuiltTool, DynamicToolNamespace } from '@n8n/agents';

import { DOMAIN_TOOL_IDS, ORCHESTRATION_TOOL_IDS } from '../tools/tool-ids';
import type { InstanceAiToolRegistry } from '../types';

interface ProductNamespaceDefinition {
	name: string;
	description: string;
	instructions?: string;
	tools: readonly string[];
}

/**
 * Product tools that the model reaches through `get_tools` and `call_tool`.
 * Product tools that are not listed here stay attached to the model. That
 * default is on purpose: a new tool stays visible until someone places it.
 * Namespace names are part of the cached prompt and of persisted calls, so
 * keep them stable.
 */
export const PRODUCT_TOOL_NAMESPACES: readonly ProductNamespaceDefinition[] = [
	{
		name: 'workflow_builder',
		description: 'Follow-up steps for a workflow build: credentials, verification and task control',
		tools: [
			ORCHESTRATION_TOOL_IDS.APPLY_WORKFLOW_CREDENTIALS,
			ORCHESTRATION_TOOL_IDS.REPORT_VERIFICATION_VERDICT,
			ORCHESTRATION_TOOL_IDS.TASK_CONTROL,
		],
	},
	{
		name: 'agent_builder',
		description: 'Agent preview sessions',
		tools: [ORCHESTRATION_TOOL_IDS.GET_SESSION],
	},
	{
		name: 'executions',
		description: 'Run workflows and read their executions',
		tools: [DOMAIN_TOOL_IDS.EXECUTIONS],
	},
	{
		name: 'data_tables',
		description: 'Create, read and change n8n data tables',
		tools: [DOMAIN_TOOL_IDS.DATA_TABLES],
	},
	{
		name: 'research',
		description: 'n8n documentation, web search and URL fetch',
		instructions:
			'For questions about n8n itself, prefer `n8n-docs` over web search. Use web search for third-party services and APIs.',
		tools: [DOMAIN_TOOL_IDS.RESEARCH, DOMAIN_TOOL_IDS.N8N_DOCS],
	},
	{
		name: 'instance',
		description: 'Projects, tags, folders, MCP server connections and evaluation config',
		instructions:
			'Use `mcp-servers` when the user asks for a service that no connected MCP namespace covers, before you say it is unavailable.',
		tools: [DOMAIN_TOOL_IDS.WORKSPACE, DOMAIN_TOOL_IDS.MCP_SERVERS, DOMAIN_TOOL_IDS.EVAL_CONFIG],
	},
	{
		name: 'user_context',
		description:
			'Past conversations, recent activity, user preferences, attached files and onboarding',
		instructions:
			'Use `save_user_preference` when the user states a lasting preference. Use `activity` to expand ids from the instance context.',
		tools: [
			DOMAIN_TOOL_IDS.CONVERSATION_HISTORY,
			DOMAIN_TOOL_IDS.ACTIVITY,
			DOMAIN_TOOL_IDS.SAVE_USER_PREFERENCE,
			DOMAIN_TOOL_IDS.PARSE_FILE,
			DOMAIN_TOOL_IDS.LEAVE_ONBOARDING,
		],
	},
];

const BROWSER_NAMESPACE = 'browser';
const MCP_NAMESPACE_PREFIX = 'mcp_';

/** A stable namespace name for an MCP server. */
export function mcpNamespaceName(serverName: string): string {
	const slug = serverName
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
	return `${MCP_NAMESPACE_PREFIX}${slug || 'server'}`;
}

export interface SplitToolNamespacesInput {
	/** Every orchestrator tool, after tracing and disabled-tool filtering. */
	tools: InstanceAiToolRegistry;
	/** Names of external MCP tools. */
	mcpToolNames: ReadonlySet<string>;
	/** Names of local / Browser Use MCP tools. */
	localMcpToolNames: ReadonlySet<string>;
}

export interface SplitToolNamespacesResult {
	/** Tools attached to the model on every call. */
	attachedTools: BuiltTool[];
	/** Tools behind `get_tools` and `call_tool`. Empty namespaces are left out. */
	namespaces: DynamicToolNamespace[];
}

/**
 * Split the orchestrator tools into attached tools and namespaces. Product
 * tools go to their namespace or stay attached. External MCP tools get one
 * namespace per server. Local MCP tools share the `browser` namespace.
 */
export function splitToolNamespaces({
	tools,
	mcpToolNames,
	localMcpToolNames,
}: SplitToolNamespacesInput): SplitToolNamespacesResult {
	const productNamespaceByTool = new Map<string, string>();
	for (const namespace of PRODUCT_TOOL_NAMESPACES) {
		for (const toolName of namespace.tools) productNamespaceByTool.set(toolName, namespace.name);
	}

	const toolsByNamespace = new Map<string, BuiltTool[]>();
	const mcpServerByNamespace = new Map<string, string>();
	const attachedTools: BuiltTool[] = [];
	const addToNamespace = (namespace: string, tool: BuiltTool) => {
		const list = toolsByNamespace.get(namespace);
		if (list) list.push(tool);
		else toolsByNamespace.set(namespace, [tool]);
	};

	for (const [name, tool] of tools) {
		if (localMcpToolNames.has(name)) {
			addToNamespace(BROWSER_NAMESPACE, tool);
		} else if (mcpToolNames.has(name)) {
			const serverName = tool.mcpServerName ?? 'server';
			const namespace = mcpNamespaceName(serverName);
			mcpServerByNamespace.set(namespace, serverName);
			addToNamespace(namespace, tool);
		} else {
			const namespace = productNamespaceByTool.get(name);
			if (namespace) addToNamespace(namespace, tool);
			else attachedTools.push(tool);
		}
	}

	// Product namespaces first, in a fixed order, so the catalog text is stable.
	const namespaces: DynamicToolNamespace[] = [];
	for (const definition of PRODUCT_TOOL_NAMESPACES) {
		const namespaceTools = toolsByNamespace.get(definition.name);
		if (!namespaceTools?.length) continue;
		namespaces.push({
			name: definition.name,
			description: definition.description,
			...(definition.instructions ? { instructions: definition.instructions } : {}),
			tools: namespaceTools,
		});
	}
	const browserTools = toolsByNamespace.get(BROWSER_NAMESPACE);
	if (browserTools?.length) {
		namespaces.push({
			name: BROWSER_NAMESPACE,
			description: "Browser Use tools that act in the user's own browser",
			tools: browserTools,
		});
	}
	for (const namespace of [...mcpServerByNamespace.keys()].sort()) {
		namespaces.push({
			name: namespace,
			description: `Tools from the connected MCP server "${mcpServerByNamespace.get(namespace)}"`,
			tools: toolsByNamespace.get(namespace) ?? [],
		});
	}

	return { attachedTools, namespaces };
}
