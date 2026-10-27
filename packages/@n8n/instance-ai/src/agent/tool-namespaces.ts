import type { BuiltTool, DynamicToolNamespace } from '@n8n/agents';
import { WORKFLOW_TOOL_NAMES } from '@n8n/api-types';

import {
	AGENT_BUILDER_ORCHESTRATOR_TOOL_NAMES,
	DOMAIN_TOOL_IDS,
	ORCHESTRATION_TOOL_IDS,
} from '../tools/tool-ids';
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
 * Do not list tools from `ALWAYS_LOADED_TOOL_NAMES` that carry a reason to
 * stay visible (research, n8n-docs, mcp-servers, activity, ...).
 * Namespace names are part of the cached prompt and of persisted calls, so
 * keep them stable.
 */
export const PRODUCT_TOOL_NAMESPACES: readonly ProductNamespaceDefinition[] = [
	{
		name: 'workflow_builder',
		description:
			'Read, create, build and verify n8n workflows, look up node types, and pick AI models',
		instructions:
			'Load this namespace before you read or change a workflow. Use `workflow_builder_build_workflow` to create or edit one.',
		tools: [
			...WORKFLOW_TOOL_NAMES,
			DOMAIN_TOOL_IDS.BUILD_WORKFLOW,
			ORCHESTRATION_TOOL_IDS.VERIFY_BUILT_WORKFLOW,
			DOMAIN_TOOL_IDS.SEARCH_MODELS,
			DOMAIN_TOOL_IDS.NODES,
			ORCHESTRATION_TOOL_IDS.APPLY_WORKFLOW_CREDENTIALS,
			ORCHESTRATION_TOOL_IDS.REPORT_VERIFICATION_VERDICT,
			ORCHESTRATION_TOOL_IDS.TASK_CONTROL,
		],
	},
	{
		name: 'agent_builder',
		description:
			'Read, create, configure, test and publish standalone n8n Agents, and inspect their preview sessions',
		instructions:
			'Load this namespace for any request about an Agent. Use `agent-context` to read an Agent before you change it.',
		tools: [
			DOMAIN_TOOL_IDS.AGENT_CONTEXT,
			...AGENT_BUILDER_ORCHESTRATOR_TOOL_NAMES,
			ORCHESTRATION_TOOL_IDS.GET_SESSION,
		],
	},
	{
		name: 'instance',
		description: 'Projects, tags, folders and evaluation config',
		tools: [DOMAIN_TOOL_IDS.WORKSPACE, DOMAIN_TOOL_IDS.EVAL_CONFIG],
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
