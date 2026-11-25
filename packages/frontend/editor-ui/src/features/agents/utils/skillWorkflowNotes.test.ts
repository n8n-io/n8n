import {
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
} from 'n8n-workflow';

import type { INodeUi } from '@/Interface';
import { getSkillWorkflowNotes, type SkillWorkflowNoteData } from './skillWorkflowNotes';

const node = (type: string, disabled = false) => ({ type, name: type, disabled }) as INodeUi;

const workflow = (
	nodes: INodeUi[],
	{ published = true, availableInMCP = true } = {},
): SkillWorkflowNoteData => ({
	nodes,
	activeVersionId: published ? 'v1' : null,
	settings: { executionOrder: 'v1', availableInMCP },
});

const PROJECT_SKILL = { instanceSkill: false, availableToMCP: false };
const MCP_SKILL = { instanceSkill: false, availableToMCP: true };

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
	])('%s', (_case, data, options, expected) => {
		expect(getSkillWorkflowNotes(data, options)).toEqual(expected);
	});
});
