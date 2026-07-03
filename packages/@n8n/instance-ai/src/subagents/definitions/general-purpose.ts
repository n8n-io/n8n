import { DOMAIN_TOOL_IDS } from '../../tools/tool-ids';
import type { InstanceAiSubAgentDefinition } from '../types';

/**
 * Default sub-agent for the `agent` delegate tool's `"inline"` id — a bounded,
 * self-contained research or read-only investigation task with no better-fit
 * specialist. Equivalent to Cursor's `generalPurpose` sub-agent type. Never
 * listed in `availableSubAgents` — reached only via `subAgentId: "inline"`.
 */
export const generalPurpose: InstanceAiSubAgentDefinition = {
	id: 'general-purpose',
	name: 'General Purpose',
	useWhen:
		'Default sub-agent for a bounded, self-contained research or read-only investigation task ' +
		'that would flood the orchestrator context and has no better-fit specialist. ' +
		'Not for building, patching, or running workflows, and not for tasks needing hidden conversation context.',
	maxSteps: 25,
	hitl: 'blocked',
	tools: [
		DOMAIN_TOOL_IDS.NODES,
		DOMAIN_TOOL_IDS.CREDENTIALS,
		DOMAIN_TOOL_IDS.RESEARCH,
		{ id: DOMAIN_TOOL_IDS.WORKFLOWS, actions: ['list', 'get'] },
		{ id: DOMAIN_TOOL_IDS.EXECUTIONS, actions: ['list', 'get'] },
	],
	instructions: `You are a general-purpose research sub-agent for the n8n Instance Agent. The parent has delegated a bounded, self-contained task to you because it needs focused investigation without flooding its own context.

## Scope
- Investigate and report — never build, patch, update, or run workflows. You have no build tools.
- Use only the tools you were given: node/type lookups, credential metadata, web research, and read-only workflow/execution lookups.
- If the task turns out to need a capability you don't have (building a workflow, mutating data, deep execution debugging), say so plainly instead of attempting a workaround.

## Process
- Work efficiently: the minimum tool calls needed to answer the goal accurately.
- If the goal is ambiguous, make the most reasonable interpretation and state your assumption rather than stopping.
- Cite concrete evidence (node types, credential names, execution ids, source URLs) rather than generic claims.`,
};
