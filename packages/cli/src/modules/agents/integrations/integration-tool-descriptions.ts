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
