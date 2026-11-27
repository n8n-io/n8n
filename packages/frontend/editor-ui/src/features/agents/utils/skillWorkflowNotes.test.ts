import {
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
} from 'n8n-workflow';

import type { INodeUi } from '@/Interface';
import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';
import { getSkillWorkflowNotes, type SkillWorkflowNoteData } from './skillWorkflowNotes';

const node = (type: string, disabled = false) => ({ type, name: type, disabled }) as INodeUi;

const project = (id: string) => ({ id }) as ProjectSharingData;

const workflow = (
	nodes: INodeUi[],
	{ published = true, availableInMCP = true, archived = false, sharedWith = ['p1'] } = {},
): SkillWorkflowNoteData => ({
	nodes,
	activeVersionId: published ? 'v1' : null,
	settings: { executionOrder: 'v1', availableInMCP },
	isArchived: archived,
	homeProject: project('home'),
	sharedWithProjects: sharedWith.map(project),
});

const PROJECT_SKILL = { instanceSkill: false, availableToMCP: false };
const MCP_SKILL = { instanceSkill: false, availableToMCP: true };
const HUB_PROJECT_SKILL = { ...PROJECT_SKILL, projectId: 'p1' };

describe('getSkillWorkflowNotes', () => {
	it.each([
		[
			'a published workflow with the agent trigger',
			workflow([node(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE)]),
			PROJECT_SKILL,
			[],
		],
		[
			'a workflow without the agent trigger',
			workflow([node(WEBHOOK_NODE_TYPE)]),
			PROJECT_SKILL,
			['agentTrigger'],
		],
		[
			'a disabled agent trigger, which agents still use',
			workflow([node(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, true)]),
			PROJECT_SKILL,
			[],
		],
		[
			'an unpublished workflow',
			workflow([node(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE)], { published: false }),
			PROJECT_SKILL,
			['unpublished'],
		],
		[
			'an instance skill',
			workflow([node(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE)]),
			{ instanceSkill: true, availableToMCP: false },
			['instanceAccess'],
		],
		[
			'MCP with a production trigger',
			workflow([node(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE), node(WEBHOOK_NODE_TYPE)]),
			MCP_SKILL,
			[],
		],
		[
			'MCP with only a manual trigger',
			workflow([node(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE), node(MANUAL_TRIGGER_NODE_TYPE)]),
			MCP_SKILL,
			['mcpTrigger'],
		],
		[
			'MCP with a disabled production trigger',
			workflow([node(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE), node(WEBHOOK_NODE_TYPE, true)]),
			MCP_SKILL,
			['mcpTrigger'],
		],
		[
			'MCP with a workflow that is not available in MCP',
			workflow([node(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE), node(WEBHOOK_NODE_TYPE)], {
				availableInMCP: false,
			}),
			MCP_SKILL,
			['mcpUnavailable'],
		],
		[
			'a workflow that is not available in MCP, in a skill that MCP does not see',
			workflow([node(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE)], { availableInMCP: false }),
			PROJECT_SKILL,
			[],
		],
		['a workflow that the request does not return', null, MCP_SKILL, ['notFound']],
		[
			'an archived workflow, with only the restore note',
			workflow([node(WEBHOOK_NODE_TYPE)], { published: false, archived: true }),
			MCP_SKILL,
			['archived'],
		],
		[
			'a workflow outside the project of the skill',
			workflow([node(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE)], { sharedWith: [] }),
			HUB_PROJECT_SKILL,
			['outsideProject'],
		],
		[
			'a workflow shared with the project of the skill',
			workflow([node(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE)]),
			HUB_PROJECT_SKILL,
			[],
		],
		[
			'a workflow whose home project is the project of the skill',
			workflow([node(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE)], { sharedWith: [] }),
			{ ...PROJECT_SKILL, projectId: 'home' },
			[],
		],
	])('%s', (_case, data, options, expected) => {
		expect(getSkillWorkflowNotes(data, options)).toEqual(expected);
	});
});
