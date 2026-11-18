import { toolPolicySelectorMatches, type ToolPolicySelector } from '@n8n/api-types';

import type { AgentJsonConfig } from '../types';
import type { ToolPolicyOptionSource } from './tool-policy-config';

/** One selectable row. An option that the agent no longer has has no source. */
export interface ToolPickerOption {
	key: string;
	label: string;
	selector: ToolPolicySelector;
	source?: ToolPolicyOptionSource;
}

export interface ToolPickerServer {
	name: string;
	/** The option for every tool of the server. */
	all: ToolPickerOption;
	/** One option for each tool that the list of the server has, or that a rule names. */
	tools: ToolPickerOption[];
}

export interface ToolPickerGroups {
	categories: ToolPickerOption[];
	tools: ToolPickerOption[];
	servers: ToolPickerServer[];
	nodeTypes: ToolPickerOption[];
	/** Selected options that the agent no longer has. */
	other: ToolPickerOption[];
}

function mcpRef(option: ToolPickerOption) {
	const { selector } = option;
	return selector.kind === 'tool' && selector.ref.type === 'mcpServer' ? selector.ref : undefined;
}

/**
 * Sorts the flat option list into the groups of the picker. The tools of an MCP server go
 * under their server, also a tool that a rule names while the list of the server is not
 * loaded.
 */
export function groupToolPickerOptions(options: ToolPickerOption[]): ToolPickerGroups {
	const groups: ToolPickerGroups = {
		categories: [],
		tools: [],
		servers: [],
		nodeTypes: [],
		other: [],
	};
	const servers = new Map<string, ToolPickerServer>();
	for (const option of options) {
		const ref = mcpRef(option);
		if (ref && ref.tool === undefined && option.source) {
			const server = { name: ref.name, all: option, tools: [] };
			servers.set(ref.name, server);
			groups.servers.push(server);
		}
	}

	for (const option of options) {
		const ref = mcpRef(option);
		if (ref) {
			const server = servers.get(ref.name);
			if (ref.tool === undefined) {
				if (!server) groups.other.push(option);
			} else if (server) server.tools.push(option);
			else groups.other.push(option);
			continue;
		}
		const { kind } = option.selector;
		if (kind === 'category') groups.categories.push(option);
		else if (kind === 'nodeType' || kind === 'package') groups.nodeTypes.push(option);
		else if (option.source) groups.tools.push(option);
		else groups.other.push(option);
	}
	return groups;
}

export interface McpServerSelection {
	state: 'none' | 'some' | 'all';
	/** How many tools of the server are selected one by one. */
	count: number;
	/** How many tools the list of the server has. 0 when the list is not loaded. */
	listed: number;
}

/** The tools that come from the list of the server, and not only from a saved rule. */
function listedTools(server: ToolPickerServer): ToolPickerOption[] {
	return server.tools.filter((tool) => tool.source !== undefined);
}

export function mcpServerSelection(
	keys: readonly string[],
	server: ToolPickerServer,
): McpServerSelection {
	const listed = listedTools(server).length;
	if (keys.includes(server.all.key)) return { state: 'all', count: listed, listed };
	const count = server.tools.filter((tool) => keys.includes(tool.key)).length;
	return { state: count > 0 ? 'some' : 'none', count, listed };
}

function withoutServer(keys: readonly string[], server: ToolPickerServer): string[] {
	const ofServer = new Set([server.all.key, ...server.tools.map((tool) => tool.key)]);
	return keys.filter((key) => !ofServer.has(key));
}

/** The selection after the row of the whole server was toggled. */
export function toggleMcpServer(keys: readonly string[], server: ToolPickerServer): string[] {
	const rest = withoutServer(keys, server);
	return keys.includes(server.all.key) ? rest : [...rest, server.all.key];
}

/**
 * The selection after one tool of a server was toggled. The whole server is one selection, so
 * a tool that is taken out of it leaves the other tools one by one. When every tool of the
 * list is selected, the selection becomes the whole server again, which also covers tools
 * that the server adds later. Without a loaded list the tools stay one by one, because the
 * known tools are then only the ones that a rule names.
 */
export function toggleMcpServerTool(
	keys: readonly string[],
	server: ToolPickerServer,
	toolKey: string,
): string[] {
	const toolKeys = server.tools.map((tool) => tool.key);
	const selected = keys.includes(server.all.key)
		? toolKeys.filter((key) => key !== toolKey)
		: keys.includes(toolKey)
			? toolKeys.filter((key) => key !== toolKey && keys.includes(key))
			: toolKeys.filter((key) => key === toolKey || keys.includes(key));

	const rest = withoutServer(keys, server);
	const isWholeList =
		selected.length === toolKeys.length && listedTools(server).length === toolKeys.length;
	return isWholeList ? [...rest, server.all.key] : [...rest, ...selected];
}

export interface ToolPolicyChip {
	id: string;
	label: string;
	/**
	 * For an MCP server: the tools that are selected, or `all` for the whole server. `total` is
	 * 0 when the list of the server is not loaded.
	 */
	server?: 'all' | { selected: number; total: number };
	/** The selected keys that the chip stands for. */
	keys: string[];
}

/** One chip for each selection, with the tools of an MCP server in one chip. */
export function toolPolicyChips(
	keys: readonly string[],
	options: ToolPickerOption[],
): ToolPolicyChip[] {
	const byKey = new Map(options.map((option) => [option.key, option]));
	const servers = new Map(
		groupToolPickerOptions(options).servers.map((server) => [server.name, server]),
	);
	const chips: ToolPolicyChip[] = [];
	const serverChips = new Map<string, ToolPolicyChip>();

	for (const key of keys) {
		const option = byKey.get(key);
		if (!option) continue;
		const ref = mcpRef(option);
		const server = ref ? servers.get(ref.name) : undefined;
		if (!ref || !server) {
			chips.push({ id: key, label: option.label, keys: [key] });
			continue;
		}

		let chip = serverChips.get(server.name);
		if (!chip) {
			chip = { id: `mcpServer:${server.name}`, label: server.name, keys: [] };
			serverChips.set(server.name, chip);
			chips.push(chip);
		}
		chip.keys.push(key);
		const { state, count, listed } = mcpServerSelection(keys, server);
		chip.server = state === 'all' ? 'all' : { selected: count, total: listed };
	}
	return chips;
}

/**
 * The names of the agent's tools and MCP servers that the selectors cover. A selector for one
 * tool of an MCP server counts as its server, because the config does not list the tools.
 */
export function coveredAgentTools(
	config: Pick<AgentJsonConfig, 'tools' | 'mcpServers'> | null,
	selectors: ToolPolicySelector[],
): string[] {
	const wide = selectors.map(
		(selector): ToolPolicySelector =>
			selector.kind === 'tool' && selector.ref.type === 'mcpServer'
				? { kind: 'tool', ref: { type: 'mcpServer', name: selector.ref.name } }
				: selector,
	);
	const covered: string[] = [];
	for (const tool of config?.tools ?? []) {
		if (tool.type === 'node') {
			const identity = { type: 'node', name: tool.name, nodeType: tool.node.nodeType } as const;
			if (wide.some((selector) => toolPolicySelectorMatches(selector, identity))) {
				covered.push(tool.name);
			}
		} else if (tool.type === 'workflow' && tool.workflowId) {
			const identity = { type: 'workflow', workflowId: tool.workflowId } as const;
			if (wide.some((selector) => toolPolicySelectorMatches(selector, identity))) {
				covered.push(tool.name ?? tool.workflow);
			}
		}
	}
	for (const server of config?.mcpServers ?? []) {
		const identity = { type: 'mcpServer', name: server.name } as const;
		if (wide.some((selector) => toolPolicySelectorMatches(selector, identity))) {
			covered.push(server.name);
		}
	}
	return covered;
}
