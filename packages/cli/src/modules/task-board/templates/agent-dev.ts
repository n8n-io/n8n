import type { IConnections, INode, IWorkflowSettings } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import type { NewTaskBoardColumnRow } from '../database/repositories/task-board-column.repository';

/** Columns of the "agent-dev" template, from left to right. */
export const agentDevColumns: NewTaskBoardColumnRow[] = [
	{ name: 'Backlog', role: 'backlog' },
	{ name: 'To do', role: 'todo' },
	{ name: 'In progress', role: 'in_progress' },
	{ name: 'Needs input', role: 'needs_input' },
	{ name: 'Done', role: 'done' },
];

export type TemplateWorkflow = {
	name: string;
	nodes: INode[];
	connections: IConnections;
	settings: IWorkflowSettings;
};

export type AgentDevWorkflowInput = {
	boardId: string;
	boardName: string;
	/** Agent for tasks whose assignee is not an agent. Must be a plain id. */
	agentId?: string;
};

export const DISPATCHER_NODE_NAMES = {
	trigger: 'Task Board Trigger',
	startWork: 'Move to In Progress',
	agent: 'Message an Agent',
	reply: 'Post Agent Reply',
	finish: 'Move by Outcome',
	errorComment: 'Report Agent Error',
	errorMove: 'Move to Needs Input',
} as const;

const MESSAGE_AN_AGENT_VERSION = 3.1;

const AGENT_INSTRUCTIONS = [
	'You are working on a task from a task board as its assignee.',
	'Read the task and the whole comment thread below.',
	'If you are missing information you need, ask ONE clear question in the comment and set outcome to "needs_input".',
	'If a human has answered your earlier question, use the answer and do the work.',
	'When the work is finished, put the full result in the comment and set outcome to "done".',
	'The comment is posted on the task as your reply. Write it in Markdown.',
].join('\n');

const OUTPUT_SCHEMA = {
	type: 'object',
	properties: {
		comment: { type: 'string', description: 'Your reply on the task, in Markdown' },
		outcome: {
			type: 'string',
			enum: ['needs_input', 'done'],
			description: 'needs_input when you asked a question, done when the work is finished',
		},
	},
	required: ['comment', 'outcome'],
	additionalProperties: false,
};

const SETTINGS: IWorkflowSettings = { executionOrder: 'v1' };

const WORKFLOW_NAME_MAX_LENGTH = 128;

/** Workflow names are limited to 128 characters, and board names can use all of them. */
function workflowName(boardName: string, suffix: string) {
	const tail = ` – ${suffix}`;
	return `${boardName.slice(0, WORKFLOW_NAME_MAX_LENGTH - tail.length)}${tail}`;
}

const trigger = `$('${DISPATCHER_NODE_NAMES.trigger}').item.json`;

/**
 * The agent that works on the task: the assignee when it is an agent, else the fallback.
 * The fallback id is inlined into an expression, so the caller must validate it.
 */
function agentIdExpression(fallbackAgentId?: string) {
	if (!fallbackAgentId) return `={{ ${trigger}.assignee.id }}`;
	return `={{ ${trigger}.assignee?.type === 'agent' ? ${trigger}.assignee.id : '${fallbackAgentId}' }}`;
}

function node(
	name: string,
	type: string,
	typeVersion: number,
	position: [number, number],
	parameters: INode['parameters'],
	extra: Partial<INode> = {},
): INode {
	return { id: randomUUID(), name, type, typeVersion, position, parameters, ...extra };
}

function stickyNote(
	name: string,
	position: [number, number],
	content: string,
	size: { width: number; height: number },
	color?: number,
): INode {
	return node(name, 'n8n-nodes-base.stickyNote', 1, position, {
		content,
		...size,
		...(color === undefined ? {} : { color }),
	});
}

function taskBoardAction(
	name: string,
	position: [number, number],
	parameters: INode['parameters'],
): INode {
	return node(name, 'n8n-nodes-base.taskBoard', 1, position, { resource: 'task', ...parameters });
}

type Link = { from: string; to: string; fromOutput: number };

function link(from: string, to: string, fromOutput = 0): Link {
	return { from, to, fromOutput };
}

function toConnections(links: Link[]): IConnections {
	const connections: IConnections = {};
	for (const { from, to, fromOutput } of links) {
		const main = (connections[from] ??= { main: [] }).main;
		while (main.length <= fromOutput) main.push([]);
		(main[fromOutput] ??= []).push({ node: to, type: 'main', index: 0 });
	}
	return connections;
}

/**
 * The board's dispatcher: on each task event it runs the assigned agent, posts its reply
 * and moves the task by the outcome. Writes act as the agent, so the trigger ignores them.
 */
export function buildAgentDevDispatcherWorkflow({
	boardId,
	boardName,
	agentId,
}: AgentDevWorkflowInput): TemplateWorkflow {
	const names = DISPATCHER_NODE_NAMES;
	const actor = agentIdExpression(agentId);
	const taskId = `={{ ${trigger}.taskId }}`;
	const asAgent = { actAs: 'agent', actorAgentId: actor };

	const nodes: INode[] = [
		stickyNote(
			'Sticky Note',
			[-80, -320],
			[
				`## ${boardName} – dispatcher`,
				"This workflow is the board's brain. It runs when a task assigned to an agent is created, assigned or commented on by a person or a workflow.",
				'',
				'Change it to change how agents work on this board: route by label, add approvals, notify Slack…',
				'',
				'Changes made by the agent do not start this workflow again.',
			].join('\n'),
			{ width: 520, height: 240 },
		),
		node(names.trigger, 'n8n-nodes-base.taskBoardTrigger', 1, [0, 0], {
			boardId,
			events: ['task.created', 'task.assigned', 'task.commented'],
			options: { ignoreAgentAuthored: true, onlyAgentAssignee: !agentId },
		}),
		taskBoardAction(names.startWork, [240, 0], {
			operation: 'move',
			taskId,
			moveTo: 'role',
			columnRoleTarget: 'in_progress',
			...asAgent,
		}),
		stickyNote(
			'Coding Runner Note',
			[480, -280],
			'### Coding runner seam\nReplace or follow this step with Execute Command to run a coding CLI in a git worktree for a dev agent.',
			{ width: 300, height: 200 },
			5,
		),
		node(
			names.agent,
			'n8n-nodes-base.messageAnAgent',
			MESSAGE_AN_AGENT_VERSION,
			[480, 0],
			{
				agentSource: 'referenced',
				agentId: { __rl: true, mode: 'id', value: actor },
				message: `=${AGENT_INSTRUCTIONS}\n\n---\n\n{{ ${trigger}.threadText }}`,
				useStructuredOutput: true,
				schemaType: 'manual',
				outputSchema: JSON.stringify(OUTPUT_SCHEMA, null, 2),
				advanced: { invokeMode: 'perItem' },
			},
			{ onError: 'continueErrorOutput' },
		),
		taskBoardAction(names.reply, [760, -100], {
			operation: 'addComment',
			taskId,
			body: '={{ $json.structuredOutput.comment }}',
			...asAgent,
		}),
		taskBoardAction(names.finish, [1000, -100], {
			operation: 'move',
			taskId,
			moveTo: 'role',
			columnRoleTarget: `={{ $('${names.agent}').item.json.structuredOutput.outcome }}`,
			...asAgent,
		}),
		// Act as the agent here too: a workflow-authored comment would start this workflow again.
		taskBoardAction(names.errorComment, [760, 160], {
			operation: 'addComment',
			taskId,
			body: '=I could not finish this task because of an error:\n\n> {{ $json.error }}\n\nFix the problem, then reply to this comment to try again.',
			...asAgent,
		}),
		taskBoardAction(names.errorMove, [1000, 160], {
			operation: 'move',
			taskId,
			moveTo: 'role',
			columnRoleTarget: 'needs_input',
			...asAgent,
		}),
	];

	const connections = toConnections([
		link(names.trigger, names.startWork),
		link(names.startWork, names.agent),
		link(names.agent, names.reply),
		link(names.reply, names.finish),
		link(names.agent, names.errorComment, 1),
		link(names.errorComment, names.errorMove),
	]);

	return { name: workflowName(boardName, 'dispatcher'), nodes, connections, settings: SETTINGS };
}

/** A manual workflow that creates one example task on the board. */
export function buildAgentDevExampleIntakeWorkflow({
	boardId,
	boardName,
	agentId,
}: AgentDevWorkflowInput): TemplateWorkflow {
	const triggerName = 'When clicking ‘Execute workflow’';
	const createName = 'Create Example Task';

	const nodes: INode[] = [
		node(triggerName, 'n8n-nodes-base.manualTrigger', 1, [0, 0], {}),
		taskBoardAction(createName, [240, 0], {
			operation: 'create',
			boardId,
			title: 'Draft a launch checklist for the new feature',
			description:
				'We are launching the new feature soon and need a checklist for launch day.\nCover docs, announcements and support.',
			columnRole: 'todo',
			assigneeType: 'agent',
			assigneeId: agentId ?? '',
			actAs: 'workflow',
		}),
	];
	if (!agentId) {
		nodes.push(
			stickyNote(
				'Sticky Note',
				[180, -220],
				'Set the assignee agent id here, or create tasks from the board UI.',
				{ width: 280, height: 180 },
				3,
			),
		);
	}

	return {
		name: workflowName(boardName, 'example intake'),
		nodes,
		connections: toConnections([link(triggerName, createName)]),
		settings: SETTINGS,
	};
}
