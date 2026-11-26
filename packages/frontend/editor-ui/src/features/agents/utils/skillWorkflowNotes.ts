import { SUPPORTED_PRODUCTION_MCP_TRIGGERS } from '@n8n/api-types';

import type { IWorkflowDb } from '@/Interface';
import { detectWorkflowToolTrigger } from '@/features/agents/utils/workflowToolInputFields';

export type SkillWorkflowNote =
	| 'notFound'
	| 'archived'
	| 'agentTrigger'
	| 'mcpTrigger'
	| 'mcpUnavailable'
	| 'unpublished'
	| 'outsideProject'
	| 'instanceAccess';

export const AGENT_BLOCKING_NOTES: readonly SkillWorkflowNote[] = [
	'notFound',
	'archived',
	'agentTrigger',
	'unpublished',
];

export type SkillWorkflowNoteData = Pick<
	IWorkflowDb,
	'nodes' | 'activeVersionId' | 'settings' | 'isArchived' | 'homeProject' | 'sharedWithProjects'
>;

const MCP_TRIGGER_TYPES = new Set(Object.keys(SUPPORTED_PRODUCTION_MCP_TRIGGERS));

function isInProject(workflow: SkillWorkflowNoteData, projectId: string): boolean {
	return [workflow.homeProject, ...(workflow.sharedWithProjects ?? [])].some(
		(project) => project?.id === projectId,
	);
}

export function getSkillWorkflowNotes(
	workflow: SkillWorkflowNoteData | null,
	{
		instanceSkill,
		availableToMCP,
		projectId,
	}: { instanceSkill: boolean; availableToMCP: boolean; projectId?: string },
): SkillWorkflowNote[] {
	if (workflow === null) return ['notFound'];
	if (workflow.isArchived) return ['archived'];
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
	if (projectId && !isInProject(workflow, projectId)) notes.push('outsideProject');
	if (instanceSkill) notes.push('instanceAccess');
	return notes;
}
