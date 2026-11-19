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
	recordUsage: 'Record Agent Usage',
	reply: 'Post Agent Reply',
	hasFields: 'Severity or Tags Returned?',
	updateFields: 'Set Severity and Tags',
	isHandoff: 'Hand-Off Requested?',
	finish: 'Move by Outcome',
	handoff: 'Hand Off Task',
	limitReached: 'Hand-Off Limit Reached?',
	limitComment: 'Report Hand-Off Limit',
	errorComment: 'Report Agent Error',
	errorMove: 'Move to Needs Input',
} as const;

const MESSAGE_AN_AGENT_VERSION = 3.1;
const IF_VERSION = 2.2;

const AGENT_INSTRUCTIONS = [
	'You are working on a task from a task board as its assignee.',
	'Read the task and the whole comment thread below.',
	'If you are missing information you need, ask ONE clear question in the comment and set outcome to "needs_input".',
	'If a human has answered your earlier question, use the answer and do the work.',
	'When the work is finished, put the full result in the comment and set outcome to "done".',
	'The comment is posted on the task as your reply. Write it in Markdown.',
	'When you can judge them, set severity (how urgent the task is) and tags (a few short labels for the topic). Omit them when you are not sure.',
].join('\n');

/** Added to the message only when the task has a team. */
const HANDOFF_INSTRUCTIONS = [
	'You work in a team. You may hand the task to a teammate from the list below when the teammate fits the work better than you.',
	'To hand off, set outcome to "handoff" and set handoffTo to the id or the name of the teammate.',
	'In the comment, say why you hand the task off and what the teammate must do.',
	'Do not hand off a task that you can finish, and do not hand it back without new information.',
	'',
	'Your teammates:',
	'',
].join('\n');

const OUTPUT_SCHEMA = {
	type: 'object',
	properties: {
		comment: { type: 'string', description: 'Your reply on the task, in Markdown' },
		outcome: {
			type: 'string',
			enum: ['needs_input', 'done', 'handoff'],
			description:
				'needs_input when you asked a question, done when the work is finished, handoff when a teammate must take the task over. Use handoff only when the message lists teammates.',
		},
		handoffTo: {
			type: 'string',
			description:
				'The id or the name of the teammate that takes the task over. Required when outcome is handoff. Omit it for every other outcome.',
		},
		severity: {
			type: 'string',
			enum: ['low', 'medium', 'high', 'critical'],
			description: 'Optional. How urgent the task is.',
		},
		tags: {
			type: 'array',
			items: { type: 'string' },
			description: 'Optional. A few short labels for the topic of the task.',
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
	extra: Partial<INode> = {},
): INode {
	return node(
		name,
		'n8n-nodes-base.taskBoard',
		1,
		position,
		{ resource: 'task', ...parameters },
		extra,
	);
}

/** An If node that sends an item to its first output when the expression is true. */
function ifNode(name: string, position: [number, number], expression: string): INode {
	return node(name, 'n8n-nodes-base.if', IF_VERSION, position, {
		conditions: {
			options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
			conditions: [
				{
					id: randomUUID(),
					leftValue: `={{ ${expression} }}`,
					rightValue: '',
					operator: { type: 'boolean', operation: 'true', singleValue: true },
				},
			],
			combinator: 'and',
		},
		options: {},
	});
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
 * A hand-off is the exception: it acts as the workflow, so it starts a run for the new assignee.
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
	const agentJson = `$('${names.agent}').item.json`;
	const output = `${agentJson}.structuredOutput`;
	// The team is empty when the board has no other agent. Then the message does not offer a hand-off.
	const teamSection = `{{ ${trigger}.teamText ? ${JSON.stringify(HANDOFF_INSTRUCTIONS)} + ${trigger}.teamText + '\\n\\n' : '' }}`;

	const nodes: INode[] = [
		stickyNote(
			'Sticky Note',
			[-80, -500],
			[
				`## ${boardName} – dispatcher`,
				"This workflow is the board's brain. It runs when a task assigned to an agent is created, assigned or commented on by a person or a workflow.",
				'',
				'Change it to change how agents work on this board: route by label, add approvals, notify Slack…',
				'',
				'An agent can hand the task off to another agent of the board. The hand-off acts as the workflow, so this workflow runs again for the new assignee. After too many hand-offs the task moves to Needs input and a person decides.',
				'',
				'Other changes made by the agent do not start this workflow again.',
			].join('\n'),
			{ width: 520, height: 320 },
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
			[480, -340],
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
				message: `=${AGENT_INSTRUCTIONS}\n\n${teamSection}---\n\n{{ ${trigger}.threadText }}`,
				useStructuredOutput: true,
				schemaType: 'manual',
				outputSchema: JSON.stringify(OUTPUT_SCHEMA, null, 2),
				advanced: { invokeMode: 'perItem' },
			},
			{ onError: 'continueErrorOutput' },
		),
		// The usage is extra data. A failure here must not lose the reply of the agent.
		taskBoardAction(
			names.recordUsage,
			[760, -100],
			{
				operation: 'recordUsage',
				taskId,
				usageAgentId: actor,
				promptTokens: '={{ $json.usage?.promptTokens ?? 0 }}',
				completionTokens: '={{ $json.usage?.completionTokens ?? 0 }}',
				totalTokens: '={{ $json.usage?.totalTokens ?? 0 }}',
				options: { cost: '={{ $json.usage?.cost ?? null }}' },
			},
			{ onError: 'continueRegularOutput' },
		),
		taskBoardAction(names.reply, [1000, -100], {
			operation: 'addComment',
			taskId,
			body: `={{ ${output}.comment }}`,
			...asAgent,
		}),
		ifNode(names.hasFields, [1240, -100], `!!(${output}.severity || ${output}.tags?.length)`),
		// An expression without a value leaves that field as it is.
		taskBoardAction(
			names.updateFields,
			[1480, -200],
			{
				operation: 'update',
				taskId,
				updateFields: {
					severity: `={{ ${output}.severity ?? undefined }}`,
					tags: `={{ ${output}.tags?.length ? ${output}.tags : undefined }}`,
				},
				...asAgent,
			},
			{ onError: 'continueRegularOutput' },
		),
		ifNode(names.isHandoff, [1720, -100], `${output}.outcome === 'handoff'`),
		// Act as the workflow: the trigger ignores an assignment made by an agent, and the new
		// assignee would not start.
		taskBoardAction(
			names.handoff,
			[1960, -200],
			{
				operation: 'handoff',
				taskId,
				handoffTo: `={{ ${output}.handoffTo }}`,
				actAs: 'workflow',
			},
			{ onError: 'continueErrorOutput' },
		),
		ifNode(names.limitReached, [2200, -200], '$json.handedOff === false'),
		// The task is in the needs-input column now. Act as the agent: a workflow-authored comment
		// would start this workflow again.
		taskBoardAction(names.limitComment, [2440, -200], {
			operation: 'addComment',
			taskId,
			body: 'I could not hand this task off, because the hand-off limit was reached. A person must decide who works on it next. Assign the task or reply here to continue.',
			...asAgent,
		}),
		taskBoardAction(names.finish, [1960, 0], {
			operation: 'move',
			taskId,
			moveTo: 'role',
			columnRoleTarget: `={{ ${output}.outcome }}`,
			...asAgent,
		}),
		// Act as the agent here too: a workflow-authored comment would start this workflow again.
		taskBoardAction(names.errorComment, [760, 200], {
			operation: 'addComment',
			taskId,
			body: '=I could not finish this task because of an error:\n\n> {{ $json.error }}\n\nFix the problem, then reply to this comment to try again.',
			...asAgent,
		}),
		taskBoardAction(names.errorMove, [1000, 200], {
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
		link(names.agent, names.recordUsage),
		link(names.recordUsage, names.reply),
		link(names.reply, names.hasFields),
		link(names.hasFields, names.updateFields),
		link(names.hasFields, names.isHandoff, 1),
		link(names.updateFields, names.isHandoff),
		link(names.isHandoff, names.handoff),
		link(names.isHandoff, names.finish, 1),
		link(names.handoff, names.limitReached),
		// A failed hand-off, for example to an unknown agent, uses the error branch of the agent.
		link(names.handoff, names.errorComment, 1),
		link(names.limitReached, names.limitComment),
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
