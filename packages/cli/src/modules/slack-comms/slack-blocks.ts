import type {
	InstanceAiConfirmationRequestPayload,
	InstanceAiCredentialRequest,
	TaskItem,
} from '@n8n/api-types';

export const SLACK_ACTION_IDS = {
	approve: 'slack_approve',
	reject: 'slack_reject',
	credentialSubmit: 'slack_credential_submit',
	domainApprove: 'slack_domain_approve',
	domainDeny: 'slack_domain_deny',
	planApprove: 'slack_plan_approve',
	planRequestChanges: 'slack_plan_request_changes',
	questionsSubmit: 'slack_questions_submit',
	debug: 'slack_debug',
	inviteUser: 'slack_invite_user',
	inviteIgnore: 'slack_invite_ignore',
	runWorkflow: 'slack_run_workflow',
	link: 'slack_link',
} as const;

export interface ConfirmationBlocksContext {
	baseUrl: string;
}

export interface ErrorBlocksParams {
	workflowName: string;
	workflowId: string;
	executionId: string;
	reason: string;
	baseUrl: string;
	stoppedAt?: string;
}

export interface InvitePromptBlocksParams {
	requesterName: string;
	requesterEmail: string;
	channelName: string;
	resolution?: 'invited' | 'ignored';
}

type ConfirmationQuestion = NonNullable<InstanceAiConfirmationRequestPayload['questions']>[number];

function hasItems<T>(items: T[] | undefined): items is [T, ...T[]] {
	return Array.isArray(items) && items.length > 0;
}

export function toMrkdwn(standardMarkdown: string): string {
	const escaped = standardMarkdown
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');

	return escaped
		.replace(/\*\*(.+?)\*\*/g, '*$1*')
		.replace(/\[(.+?)\]\((.+?)\)/g, '<$2|$1>')
		.replace(/^#{1,6}\s+(.+)$/gm, '*$1*');
}

function statusGlyph(status: TaskItem['status']): string {
	switch (status) {
		case 'done':
			return '✅';
		case 'in_progress':
			return '🔄';
		case 'failed':
			return '❌';
		case 'cancelled':
			return '➖';
		case 'todo':
		default:
			return '⬜';
	}
}

function setupRequestBlocks(
	event: InstanceAiConfirmationRequestPayload,
	ctx: ConfirmationBlocksContext,
): unknown[] {
	const blocks: unknown[] = [
		{
			type: 'section',
			text: {
				type: 'mrkdwn',
				text: toMrkdwn(event.message || 'This workflow needs some setup finished in n8n.'),
			},
		},
	];

	if (event.workflowId) {
		blocks.push({
			type: 'actions',
			block_id: `setup:${event.requestId}`,
			elements: [
				{
					type: 'button',
					action_id: SLACK_ACTION_IDS.link,
					text: { type: 'plain_text', text: 'Finish setup in n8n' },
					url: `${ctx.baseUrl}/workflow/${event.workflowId}`,
				},
			],
		});
	}

	return blocks;
}

function credentialRequestSection(
	request: InstanceAiCredentialRequest,
	ctx: ConfirmationBlocksContext,
): unknown {
	if (request.existingCredentials.length === 0) {
		return {
			type: 'section',
			text: {
				type: 'mrkdwn',
				text: `${toMrkdwn(request.reason)}\nNo existing credential for this. <${ctx.baseUrl}/home/credentials|Add one in n8n> first.`,
			},
		};
	}

	return {
		type: 'section',
		block_id: `credential:${request.credentialType}`,
		text: { type: 'mrkdwn', text: toMrkdwn(request.reason) },
		accessory: {
			type: 'static_select',
			action_id: 'select',
			placeholder: { type: 'plain_text', text: 'Choose a credential' },
			options: request.existingCredentials.map((credential) => ({
				text: { type: 'plain_text', text: credential.name },
				value: credential.id,
			})),
		},
	};
}

function credentialRequestBlocks(
	event: InstanceAiConfirmationRequestPayload,
	ctx: ConfirmationBlocksContext,
): unknown[] {
	const requests = event.credentialRequests ?? [];
	const blocks = requests.map((request) => credentialRequestSection(request, ctx));

	if (requests.some((request) => request.existingCredentials.length > 0)) {
		blocks.push({
			type: 'actions',
			block_id: `credential_submit:${event.requestId}`,
			elements: [
				{
					type: 'button',
					action_id: SLACK_ACTION_IDS.credentialSubmit,
					text: { type: 'plain_text', text: 'Submit' },
					style: 'primary',
					value: event.requestId,
				},
			],
		});
	}

	return blocks;
}

function domainAccessBlocks(event: InstanceAiConfirmationRequestPayload): unknown[] {
	const domainAccess = event.domainAccess;
	if (!domainAccess) return [];

	const isDestructive = event.severity === 'destructive';
	const approveButton: Record<string, unknown> = {
		type: 'button',
		action_id: SLACK_ACTION_IDS.domainApprove,
		text: { type: 'plain_text', text: 'Approve' },
		style: isDestructive ? 'danger' : 'primary',
		value: event.requestId,
	};
	if (isDestructive) {
		approveButton.confirm = {
			title: { type: 'plain_text', text: 'Allow this request?' },
			text: { type: 'plain_text', text: 'This action cannot be undone.' },
			confirm: { type: 'plain_text', text: 'Approve' },
			deny: { type: 'plain_text', text: 'Cancel' },
		};
	}

	return [
		{
			type: 'section',
			text: {
				type: 'mrkdwn',
				text: toMrkdwn(event.message || `This wants to reach ${domainAccess.host}.`),
			},
		},
		{
			type: 'actions',
			block_id: `domain:${event.requestId}`,
			elements: [
				approveButton,
				{
					type: 'button',
					action_id: SLACK_ACTION_IDS.domainDeny,
					text: { type: 'plain_text', text: 'Deny' },
					value: event.requestId,
				},
			],
		},
	];
}

function channelConfigRefusalBlocks(): unknown[] {
	return [
		{
			type: 'section',
			text: {
				type: 'mrkdwn',
				text: "Setting up a chat channel isn't supported from Slack yet. Finish this in n8n.",
			},
		},
	];
}

function approvalBlocks(
	event: InstanceAiConfirmationRequestPayload,
	ctx: ConfirmationBlocksContext,
): unknown[] {
	const isDestructive = event.severity === 'destructive';
	const approveButton: Record<string, unknown> = {
		type: 'button',
		action_id: SLACK_ACTION_IDS.approve,
		text: { type: 'plain_text', text: 'Turn it on' },
		style: isDestructive ? 'danger' : 'primary',
		value: event.requestId,
	};
	if (isDestructive) {
		approveButton.confirm = {
			title: { type: 'plain_text', text: 'Are you sure?' },
			text: { type: 'plain_text', text: 'This action cannot be undone.' },
			confirm: { type: 'plain_text', text: 'Turn it on' },
			deny: { type: 'plain_text', text: 'Cancel' },
		};
	}

	const elements: unknown[] = [
		approveButton,
		{
			type: 'button',
			action_id: SLACK_ACTION_IDS.reject,
			text: { type: 'plain_text', text: 'Not now' },
			value: event.requestId,
		},
	];

	if (event.workflowId) {
		elements.push({
			type: 'button',
			action_id: SLACK_ACTION_IDS.link,
			text: { type: 'plain_text', text: 'Review in n8n' },
			url: `${ctx.baseUrl}/workflow/${event.workflowId}`,
		});
	}

	return [
		{
			type: 'section',
			text: { type: 'mrkdwn', text: toMrkdwn(event.message || 'Approval needed.') },
		},
		{ type: 'actions', block_id: `approval:${event.requestId}`, elements },
	];
}

function textInputBlocks(event: InstanceAiConfirmationRequestPayload): unknown[] {
	const blocks: unknown[] = [];
	if (event.message) {
		blocks.push({ type: 'section', text: { type: 'mrkdwn', text: toMrkdwn(event.message) } });
	}
	blocks.push({
		type: 'context',
		elements: [{ type: 'mrkdwn', text: 'Reply in this thread with your answer.' }],
	});
	return blocks;
}

function questionBlock(question: ConfirmationQuestion): unknown {
	const blockId = `question:${question.id}`;

	if (question.type === 'text') {
		return {
			type: 'section',
			block_id: blockId,
			text: {
				type: 'mrkdwn',
				text: `${toMrkdwn(question.question)}\n_Reply in this thread with your answer._`,
			},
		};
	}

	const options = (question.options ?? []).map((option) => ({
		text: { type: 'plain_text', text: option },
		value: option,
	}));

	return {
		type: 'section',
		block_id: blockId,
		text: { type: 'mrkdwn', text: toMrkdwn(question.question) },
		accessory:
			question.type === 'multi'
				? { type: 'checkboxes', action_id: 'answer', options }
				: { type: 'radio_buttons', action_id: 'answer', options },
	};
}

function questionsBlocks(event: InstanceAiConfirmationRequestPayload): unknown[] {
	const blocks: unknown[] = [];
	if (event.introMessage) {
		blocks.push({ type: 'section', text: { type: 'mrkdwn', text: toMrkdwn(event.introMessage) } });
	}

	for (const question of event.questions ?? []) {
		blocks.push(questionBlock(question));
	}

	blocks.push({
		type: 'actions',
		block_id: `questions_submit:${event.requestId}`,
		elements: [
			{
				type: 'button',
				action_id: SLACK_ACTION_IDS.questionsSubmit,
				text: { type: 'plain_text', text: 'Submit' },
				style: 'primary',
				value: event.requestId,
			},
		],
	});

	return blocks;
}

function planReviewBlocks(event: InstanceAiConfirmationRequestPayload): unknown[] {
	const tasks = event.tasks?.tasks ?? [];
	const checklist = tasks
		.map((task) => `${statusGlyph(task.status)} ${toMrkdwn(task.description)}`)
		.join('\n');
	const intro = event.introMessage ? `${toMrkdwn(event.introMessage)}\n\n` : '';
	const body = checklist.length > 0 ? checklist : toMrkdwn(event.message || 'Here is the plan.');

	return [
		{ type: 'section', text: { type: 'mrkdwn', text: `${intro}${body}` } },
		{
			type: 'actions',
			block_id: `plan:${event.requestId}`,
			elements: [
				{
					type: 'button',
					action_id: SLACK_ACTION_IDS.planApprove,
					text: { type: 'plain_text', text: 'Approve plan' },
					style: 'primary',
					value: event.requestId,
				},
				{
					type: 'button',
					action_id: SLACK_ACTION_IDS.planRequestChanges,
					text: { type: 'plain_text', text: 'Request changes' },
					value: event.requestId,
				},
			],
		},
	];
}

function unsupportedConfirmationBlocks(event: InstanceAiConfirmationRequestPayload): unknown[] {
	return [
		{
			type: 'section',
			text: {
				type: 'mrkdwn',
				text: toMrkdwn(
					event.message || "This needs a decision I can't show here yet. Continue in n8n.",
				),
			},
		},
	];
}

export function confirmationBlocks(
	event: InstanceAiConfirmationRequestPayload,
	ctx: ConfirmationBlocksContext,
): unknown[] {
	if (hasItems(event.setupRequests)) return setupRequestBlocks(event, ctx);
	if (hasItems(event.credentialRequests)) return credentialRequestBlocks(event, ctx);
	if (event.domainAccess) return domainAccessBlocks(event);
	if (event.channelConfig) return channelConfigRefusalBlocks();

	switch (event.inputType ?? 'approval') {
		case 'approval':
		case 'continue':
			return approvalBlocks(event, ctx);
		case 'text':
			return textInputBlocks(event);
		case 'questions':
			return questionsBlocks(event);
		case 'plan-review':
			return planReviewBlocks(event);
		case 'resource-decision':
		default:
			return unsupportedConfirmationBlocks(event);
	}
}

export function errorBlocks(params: ErrorBlocksParams): unknown[] {
	const { workflowName, workflowId, executionId, reason, baseUrl, stoppedAt } = params;

	return [
		{
			type: 'section',
			text: { type: 'mrkdwn', text: `*${toMrkdwn(workflowName)}* failed to run.` },
		},
		{
			type: 'section',
			fields: [
				{ type: 'mrkdwn', text: `*Stopped at:*\n${stoppedAt ? toMrkdwn(stoppedAt) : 'unknown'}` },
				{ type: 'mrkdwn', text: `*Error:*\n${toMrkdwn(reason)}` },
				{ type: 'mrkdwn', text: `*Run:*\n#${executionId}` },
			],
		},
		{
			type: 'actions',
			block_id: `error:${workflowId}:${executionId}`,
			elements: [
				{
					type: 'button',
					action_id: SLACK_ACTION_IDS.link,
					text: { type: 'plain_text', text: 'View this run' },
					url: `${baseUrl}/workflow/${workflowId}/executions/${executionId}`,
				},
				{
					type: 'button',
					action_id: SLACK_ACTION_IDS.debug,
					text: { type: 'plain_text', text: 'Debug this run' },
					style: 'primary',
					value: `${workflowId}:${executionId}`,
				},
			],
		},
	];
}

export function invitePromptBlocks(params: InvitePromptBlocksParams): unknown[] {
	if (params.resolution === 'invited') {
		return [
			{
				type: 'section',
				text: { type: 'mrkdwn', text: `Invited ${toMrkdwn(params.requesterEmail)}.` },
			},
		];
	}

	if (params.resolution === 'ignored') {
		return [{ type: 'section', text: { type: 'mrkdwn', text: 'Ignored. Nothing was sent.' } }];
	}

	return [
		{
			type: 'section',
			text: {
				type: 'mrkdwn',
				text: `*${toMrkdwn(params.requesterName)}* (${toMrkdwn(params.requesterEmail)}) tried to use n8n from Slack in ${params.channelName}. Approving sends them an invite to your instance.`,
			},
		},
		{
			type: 'actions',
			elements: [
				{
					type: 'button',
					action_id: SLACK_ACTION_IDS.inviteUser,
					text: { type: 'plain_text', text: 'Send invite' },
					style: 'primary',
					value: params.requesterEmail,
				},
				{
					type: 'button',
					action_id: SLACK_ACTION_IDS.inviteIgnore,
					text: { type: 'plain_text', text: 'Ignore' },
					value: params.requesterEmail,
				},
			],
		},
	];
}
