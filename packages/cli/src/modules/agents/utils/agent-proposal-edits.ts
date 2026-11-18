import type {
	AgentJsonConfig,
	AgentProposalEdit,
	AgentProposalEditInput,
	AgentSkill,
} from '@n8n/api-types';
import { UserError } from '@n8n/errors';
import { nodeNameToToolName } from 'n8n-workflow';

import { sanitizeToolName } from '../json-config/agent-config-composition';

type ToolRef = NonNullable<AgentJsonConfig['tools']>[number];
type DescribedToolRef = Extract<ToolRef, { type: 'node' | 'workflow' }>;
type ToolDescriptionEdit = Extract<AgentProposalEditInput, { kind: 'toolDescription' }>;

/** The name of a node tool or a workflow tool as the model sees it. */
export function agentToolModelName(ref: DescribedToolRef): string {
	return ref.type === 'node'
		? nodeNameToToolName(ref.name)
		: sanitizeToolName(ref.name ?? ref.workflow);
}

function editToolDescription(tools: ToolRef[], edit: ToolDescriptionEdit): ToolRef[] {
	// A disabled tool does not reach the model, so an edit cannot name it.
	const matches = tools.flatMap((ref, index) =>
		ref.type !== 'custom' &&
		ref.enabled !== false &&
		ref.type === edit.toolType &&
		agentToolModelName(ref) === edit.toolName
			? [index]
			: [],
	);
	if (matches.length !== 1) {
		throw new UserError(
			matches.length === 0
				? `The agent has no ${edit.toolType} tool with the name "${edit.toolName}".`
				: `The agent has more than one ${edit.toolType} tool with the name "${edit.toolName}".`,
		);
	}
	return tools.map((ref, index) =>
		index === matches[0] ? { ...ref, description: edit.after } : ref,
	);
}

/**
 * Apply proposal edits to an agent document and to its skill bodies. The
 * function does not change its arguments. It reads only the target and the
 * `after` value of each edit.
 */
export function applyAgentEdits(
	config: AgentJsonConfig,
	skills: Record<string, AgentSkill>,
	edits: ReadonlyArray<AgentProposalEdit | AgentProposalEditInput>,
): { config: AgentJsonConfig; skills: Record<string, AgentSkill> } {
	const nextConfig: AgentJsonConfig = { ...config };
	const nextSkills: Record<string, AgentSkill> = { ...skills };
	for (const edit of edits) {
		if (edit.kind === 'instructions') {
			nextConfig.instructions = edit.after;
		} else if (edit.kind === 'toolDescription') {
			nextConfig.tools = editToolDescription(nextConfig.tools ?? [], edit);
		} else {
			const skill = nextSkills[edit.skillId];
			if (!skill) throw new UserError(`The agent has no skill with the ID "${edit.skillId}".`);
			nextSkills[edit.skillId] = { ...skill, [edit.field]: edit.after };
		}
	}
	return { config: nextConfig, skills: nextSkills };
}
