import type { AgentJsonConfig } from '@n8n/api-types';
import { classifyMcpTool } from '@n8n/ai-utilities/agent-config';

import type { AgentStakes, AgentToolProfile, ToolAction } from './types';

const SAFE_DEFAULT = { action: 'acts', basis: 'default' } as const;

/**
 * Words the MCP lists do not know, found in the spike's real agents. Kept here
 * rather than in the MCP lists, which also decide MCP approval policy.
 */
const EXTRA_READ = new Set(['check', 'track', 'calculate', 'scrape', 'crawl', 'verify', 'browse']);
const EXTRA_ACT = new Set(['refund', 'book', 'reply', 'mark', 'post', 'charge', 'pay', 'schedule']);

function nameWords(name: string): string[] {
	return name
		.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter(Boolean);
}

/**
 * Sort a name by its words: the word lists the MCP permissions use, plus the
 * extra words above. An acting word wins over a reading one. `classifyMcpTool`
 * answers `write` both for a write word and for no known word at all;
 * appending a read word tells the two apart, because only a write word still
 * wins over it. Returns null when the name has no known word.
 */
function actionFromWords(name: string): ToolAction | null {
	const words = nameWords(name);
	if (words.some((w) => EXTRA_ACT.has(w))) return 'acts';
	if (classifyMcpTool({ name: `${name}_get` }) === 'write') return 'acts';
	if (words.some((w) => EXTRA_READ.has(w))) return 'reads';
	if (classifyMcpTool({ name }) === 'read') return 'reads';
	return null;
}

function sortByName(name: string) {
	const action = actionFromWords(name);
	return action ? { action, basis: 'name' as const } : SAFE_DEFAULT;
}

function sortNodeTool(nodeParameters: Record<string, unknown> | undefined) {
	const operation = nodeParameters?.operation;
	if (typeof operation !== 'string') return SAFE_DEFAULT;
	const action = actionFromWords(operation);
	return action ? { action, basis: 'operation' as const } : SAFE_DEFAULT;
}

/**
 * What each tool of an agent does, decided without a model call. An MCP server
 * appears once: its tools are only known after connecting, so it counts as
 * acting unless its writes are blocked.
 */
export function profileAgentTools(config: AgentJsonConfig): AgentToolProfile[] {
	const profiles: AgentToolProfile[] = [];

	for (const tool of config.tools ?? []) {
		if (tool.enabled === false) continue;
		const requireApproval = tool.requireApproval === true;

		if (tool.type === 'node') {
			profiles.push({
				name: tool.name,
				source: 'node',
				...sortNodeTool(tool.node.nodeParameters),
				requireApproval,
			});
		} else if (tool.type === 'workflow') {
			const name = tool.name ?? tool.workflow;
			profiles.push({ name, source: 'workflow', ...sortByName(name), requireApproval });
		} else {
			profiles.push({ name: tool.id, source: 'custom', ...sortByName(tool.id), requireApproval });
		}
	}

	for (const server of config.mcpServers ?? []) {
		const permissions = server.toolPermissions?.categories;
		const writesBlocked = permissions?.write === 'blocked';
		profiles.push({
			name: server.name,
			source: 'mcp',
			action: writesBlocked ? 'reads' : 'acts',
			basis: 'default',
			requireApproval: writesBlocked
				? permissions?.read === 'require_approval'
				: permissions?.write === 'require_approval',
		});
	}

	return profiles;
}

export function summarizeStakes(profiles: AgentToolProfile[]): AgentStakes {
	if (profiles.length === 0) return 'no-tools';
	const acting = profiles.filter((p) => p.action === 'acts');
	if (acting.length === 0) return 'reads-only';
	return acting.every((p) => p.requireApproval) ? 'acts-with-approval' : 'acts-on-its-own';
}
