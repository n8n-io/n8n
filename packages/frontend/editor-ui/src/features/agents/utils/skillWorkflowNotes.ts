import { SUPPORTED_PRODUCTION_MCP_TRIGGERS } from '@n8n/api-types';

import type { IWorkflowDb } from '@/Interface';
import { detectWorkflowToolTrigger } from '@/features/agents/utils/workflowToolInputFields';

export type SkillWorkflowNote =
	| 'agentTrigger'
	| 'mcpTrigger'
	| 'mcpUnavailable'
	| 'unpublished'
	| 'instanceAccess';

export const AGENT_BLOCKING_NOTES: readonly SkillWorkflowNote[] = ['agentTrigger', 'unpublished'];

export type SkillWorkflowNoteData = Pick<IWorkflowDb, 'nodes' | 'activeVersionId' | 'settings'>;

const MCP_TRIGGER_TYPES = new Set(Object.keys(SUPPORTED_PRODUCTION_MCP_TRIGGERS));

export function getSkillWorkflowNotes(
	workflow: SkillWorkflowNoteData,
	{ instanceSkill, availableToMCP }: { instanceSkill: boolean; availableToMCP: boolean },
): SkillWorkflowNote[] {
	const nodes = workflow.nodes ?? [];
	const notes: SkillWorkflowNote[] = [];
	if (!detectWorkflowToolTrigger(workflow)) notes.push('agentTrigger');
	if (availableToMCP) {
		if (!nodes.some(({ type, disabled }) => !disabled && MCP_TRIGGER_TYPES.has(type))) {
			notes.push('mcpTrigger');
		}
		if (!workflow.settings?.availableInMCP) notes.push('mcpUnavailable');
	}
	if (!workflow.activeVersionId) notes.push('unpublished');
	if (instanceSkill) notes.push('instanceAccess');
	return notes;
}
