import {
	MAX_CHANNEL_SEND_FILE_BYTES,
	MAX_FILE_MESSAGES_PER_SEND,
	type FileUploadLimits,
} from './agent-chat-integration';
import { MAX_BATCH_OPERATIONS } from './integration-tool-schema';
import type { IntegrationToolConnectionDescriptor } from './integration-tool-types';

export function buildContextToolDescription(
	descriptor: IntegrationToolConnectionDescriptor,
): string {
	return [
		`Read context from the ${descriptor.integration.type} integration connection.`,
		`Available queries: ${descriptor.contextQueries.join(', ')}.`,
		...(descriptor.contextToolGuidance ?? []),
		'Query inputs:',
		...descriptor.contextToolDefinitions.map((definition) => `- ${definition.description}`),
		`Batch form: pass queries as an array of up to ${MAX_BATCH_OPERATIONS} { query, input } objects to fetch multiple pieces of context in one tool call.`,
		'Use this tool for read-only lookup before choosing an action target.',
	].join('\n\n');
}

export function buildActionToolDescription(
	descriptor: IntegrationToolConnectionDescriptor,
): string {
	return [
		`Take actions in the ${descriptor.integration.type} integration connection.`,
		`Available actions: ${descriptor.actions.join(', ')}.`,
		...(descriptor.actionToolGuidance ?? []),
		'Action inputs:',
		...descriptor.actionToolDefinitions.map((definition) => `- ${definition.description}`),
		`Batch form: pass actions as an array of up to ${MAX_BATCH_OPERATIONS} { action, input } objects. Batch actions run sequentially and cannot include cards that wait for a user response.`,
		'respond uses the latest message context for this integration connection.',
		'Never state that an action has been performed before its tool call returns. Before calling an action, describe what you intend to do, not a completed outcome. Only report an action as done after the tool returns ok. If a tool fails, report the failure honestly.',
		'If this turn was triggered by an inbound chat message, your final reply text is posted to that conversation automatically — do not duplicate it with a text-only respond. Call respond only with message.card, or after switching to a different target.',
		...(descriptor.actions.includes('do_not_respond')
			? [
					'Always reply to direct messages and direct mentions. For messages in subscribed group channels or threads where you have nothing useful to add, or when explicitly asked not to reply, call do_not_respond as your final action and end the turn without writing any text.',
				]
			: []),
		'Use message.card for cards, images, key-value summaries, and feedback requests. Include components such as section, fields, image, divider, button, select, or radio_select.',
		'For fields components, use { type: "fields", fields: [{ label: "Account", value: "Acme" }] }. The key items is also accepted as a fields alias.',
		'For button components, use { type: "button", label: "Approve", value: "approve" }. If label is omitted, text is used as the button label.',
		'For radio-style choices, use { type: "radio_select", label: "Next step", options: [{ label: "Approve", value: "approve" }] }.',
		'Use only the generic shape: message.text plus optional message.card. Do not provide platform-native component payloads, formatted text objects, or attachments; rendering is handled internally.',
		...buildGenericCardGuidance(),
		'Interactive message.card components (button, select, or radio_select) send the message first, then suspend this action until the user responds.',
		'Display-only message.card components without buttons/selects render the card and let the agent continue immediately.',
	].join('\n\n');
}

/** A platform that streams the reply posts the queued files after it, so the reply text is not their message. */
export function buildFileUploadGuidance(limits: FileUploadLimits, streamsReply: boolean): string {
	const maxFileBytes = Math.min(limits.maxFileBytes, MAX_CHANNEL_SEND_FILE_BYTES);
	const maxMegabytes = Math.floor(maxFileBytes / (1024 * 1024));
	const sendLimit = `Send up to ${limits.maxFiles * MAX_FILE_MESSAGES_PER_SEND} files of up to ${maxMegabytes} MB each with one action.`;
	if (streamsReply) {
		return `To send files, add input.fileIds to respond, send_dm or send_channel_message. Use fileIds from tool results or user uploads. In the conversation that you reply to, respond with fileIds posts nothing at once: the files are posted after your final reply as their own message. Other sends post message.text with the files. You can mix file types. The platform can send the files as more than one message. For the other sends, the text goes with the first.${captionGuidance(limits.maxCaptionLength)} ${sendLimit}`;
	}
	return `To send files, add input.fileIds to respond, send_dm or send_channel_message. Use fileIds from tool results or user uploads. In the conversation that you reply to, respond with fileIds posts nothing at once: the files go with your final reply, and your reply text is their message. Other sends post message.text with the files. You can mix file types. The platform can send the files as more than one message, and the text goes with the first.${captionGuidance(limits.maxCaptionLength)} ${sendLimit}`;
}

function captionGuidance(maxCaptionLength: number | undefined): string {
	if (maxCaptionLength === undefined) return '';
	return ` Text longer than ${maxCaptionLength} characters goes as its own message before the files.`;
}

function buildGenericCardGuidance(): string[] {
	return [
		'Generic card examples:',
		[
			'Radio choice card:',
			'```json',
			JSON.stringify(
				{
					action: 'respond',
					input: {
						message: {
							text: 'Acme Executive Briefing — Next Steps',
							card: {
								title: 'Acme Corporation — Executive Briefing Next Steps',
								components: [
									{
										type: 'section',
										text: '30X Expansion Briefing ($3.75M) — Internal owner: Paul G | Briefing contact: Mike D\n\nWhat should happen next?',
									},
									{ type: 'divider' },
									{
										type: 'radio_select',
										id: 'next_step_selection',
										label: 'Next step',
										options: [
											{
												label: 'Schedule exec briefing prep call with Paul G',
												value: 'schedule_prep_call',
											},
											{
												label: 'Draft briefing agenda doc for Mike D',
												value: 'draft_briefing_doc',
											},
										],
									},
								],
							},
						},
					},
				},
				null,
				2,
			),
			'```',
		].join('\n'),
		[
			'Button card:',
			'```json',
			JSON.stringify(
				{
					action: 'respond',
					input: {
						message: {
							text: 'Approve or revise the briefing draft',
							card: {
								components: [
									{ type: 'section', text: 'Review the briefing draft.' },
									{ type: 'button', label: 'Approve', value: 'approve', style: 'primary' },
									{ type: 'button', label: 'Revise', value: 'revise', style: 'default' },
								],
							},
						},
					},
				},
				null,
				2,
			),
			'```',
		].join('\n'),
		'Never send message.blocks, components of type actions, elements arrays, action_id, radio_buttons, or formatted text objects such as { type: "plain_text", text: "..." } or { type: "mrkdwn", text: "..." }.',
	];
}
