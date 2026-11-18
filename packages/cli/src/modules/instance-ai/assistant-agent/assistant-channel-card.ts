import type { SystemAgentChannelCard } from '@/modules/agents/system-agents/system-agent.types';

import { readAssistantConfirmationPayload } from '../builder-input-telemetry';

/**
 * The button values are JSON strings. They are `InstanceAiConfirmRequestDto`
 * bodies, which `normalizeResumeData` of the provider turns into resume data.
 */
const APPROVE = JSON.stringify({ kind: 'approval', approved: true });
const APPROVE_FOR_THREAD = JSON.stringify({ kind: 'approval', approved: true, scope: 'session' });
const DENY = JSON.stringify({ kind: 'approval', approved: false });

const MAX_TITLE_LENGTH = 200;

/**
 * Payload fields of a card that needs more than Approve or Deny. The chat
 * cannot show them, so the user finishes the step in the editor.
 */
const EDITOR_ONLY_FIELDS = [
	'questions',
	'setupRequests',
	'credentialRequests',
	'credentialDestination',
	'domainAccess',
	'resourceDecision',
	'channelConfig',
	'mcpConnectRequest',
	'testListener',
	'appBlueprint',
] as const;

function hasValue(value: unknown): boolean {
	return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null;
}

function truncate(text: string): string {
	return text.length > MAX_TITLE_LENGTH ? `${text.slice(0, MAX_TITLE_LENGTH - 1)}…` : text;
}

/**
 * Turn a suspension of the Assistant into a chat card. A plain approval gets
 * Approve, Always allow in this thread, and Deny. Any other step gets a card
 * with a link to the thread in the editor. Returns `undefined` for a suspension
 * that is not an Assistant confirmation, so the runtime uses its generic card.
 *
 * `/assistant/:threadId` is the editor route for threads of both Assistant
 * runtimes.
 */
export function toAssistantChannelCard(
	suspendPayload: unknown,
	context: { threadId: string; editorBaseUrl: string },
): SystemAgentChannelCard | undefined {
	const payload = readAssistantConfirmationPayload(suspendPayload);
	if (!payload) return undefined;

	const message = typeof payload.message === 'string' ? payload.message : '';
	const inputType = typeof payload.inputType === 'string' ? payload.inputType : undefined;
	const isPlainApproval =
		(inputType === undefined || inputType === 'approval' || inputType === 'continue') &&
		!EDITOR_ONLY_FIELDS.some((field) => hasValue(payload[field]));

	if (isPlainApproval) {
		const resourceName = typeof payload.resourceName === 'string' ? payload.resourceName : '';
		return {
			title: truncate(message || 'Approval required'),
			components: [
				...(resourceName ? [{ type: 'section', text: `*${resourceName}*` }] : []),
				{ type: 'button', label: 'Approve', value: APPROVE, style: 'primary' },
				{ type: 'button', label: 'Always allow in this thread', value: APPROVE_FOR_THREAD },
				{ type: 'button', label: 'Deny', value: DENY, style: 'danger' },
			],
		};
	}

	const base = context.editorBaseUrl.replace(/\/+$/, '');
	return {
		title: truncate(message || 'This step needs the n8n editor'),
		components: [
			{ type: 'section', text: 'This step needs the n8n editor. Open the thread to finish it.' },
			{
				type: 'link_button',
				label: 'Open in n8n',
				url: `${base}/assistant/${encodeURIComponent(context.threadId)}`,
			},
		],
	};
}
