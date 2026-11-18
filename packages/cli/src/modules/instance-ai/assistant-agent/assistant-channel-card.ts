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
/** A section of a card holds up to 3000 characters of text in Slack. */
const MAX_SUMMARY_LENGTH = 2500;

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

function truncate(text: string, max = MAX_TITLE_LENGTH): string {
	return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** The change that the Assistant describes in a workflow edit approval. */
function readEditSummary(payload: Record<string, unknown>): string | undefined {
	const details = payload.approvalDetails;
	if (typeof details !== 'object' || details === null) return undefined;
	const { action, summary } = details as { action?: unknown; summary?: unknown };
	if (action !== 'edit-workflow' || typeof summary !== 'string') return undefined;
	return summary.trim() || undefined;
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
		const editSummary = readEditSummary(payload);
		const workflowId = typeof payload.workflowId === 'string' ? payload.workflowId : '';
		const base = context.editorBaseUrl.replace(/\/+$/, '');
		return {
			// The message of a workflow edit is the whole summary on one line. The card
			// shows the summary in its own section under a short title.
			title: editSummary
				? truncate(`Save changes to ${resourceName || 'this workflow'}?`)
				: truncate(message || 'Approval required'),
			components: [
				...(resourceName && !editSummary ? [{ type: 'section', text: `*${resourceName}*` }] : []),
				...(editSummary
					? [{ type: 'section', text: truncate(editSummary, MAX_SUMMARY_LENGTH) }]
					: []),
				...(editSummary && workflowId
					? [
							{
								type: 'link_button',
								label: 'Open workflow',
								url: `${base}/workflow/${encodeURIComponent(workflowId)}`,
							},
						]
					: []),
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
