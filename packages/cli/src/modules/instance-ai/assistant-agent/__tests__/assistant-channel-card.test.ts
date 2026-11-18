import { InstanceAiConfirmRequestDto } from '@n8n/api-types';
import { buildResumeData, toConfirmationData } from '@n8n/instance-ai/confirmation-payload';

import { toAssistantChannelCard } from '../assistant-channel-card';

const context = { threadId: 'thread-1', editorBaseUrl: 'https://n8n.test/' };

function approvalPayload(overrides: Record<string, unknown> = {}) {
	return {
		requestId: 'req-1',
		toolCallId: 'call-1',
		toolName: 'update-workflow',
		args: {},
		severity: 'warning',
		message: 'Change the Slack channel of "Post stats"?',
		...overrides,
	};
}

function buttons(card: ReturnType<typeof toAssistantChannelCard>) {
	return (card?.components ?? []).filter((component) => component.type === 'button');
}

/** What `normalizeResumeData` of the provider does with a button value. */
function resumeDataOf(value: unknown) {
	const parsed = InstanceAiConfirmRequestDto.safeParse(JSON.parse(String(value)));
	if (!parsed.success) throw new Error('The button value is not a confirm request');
	return buildResumeData(toConfirmationData(parsed.data));
}

describe('toAssistantChannelCard', () => {
	describe('a plain approval', () => {
		it.each([
			['no input type', {}],
			['the approval input type', { inputType: 'approval' }],
			['the continue input type', { inputType: 'continue' }],
		])('gets Approve, Always allow in this thread and Deny for %s', (_name, extra) => {
			const card = toAssistantChannelCard(approvalPayload(extra), context);

			expect(card?.title).toBe('Change the Slack channel of "Post stats"?');
			expect(buttons(card).map((button) => button.label)).toEqual([
				'Approve',
				'Always allow in this thread',
				'Deny',
			]);
		});

		it('gives each button a value that is a valid confirm request', () => {
			const card = toAssistantChannelCard(approvalPayload(), context);
			const [approve, always, deny] = buttons(card);

			expect(resumeDataOf(approve.value)).toEqual({ approved: true });
			expect(resumeDataOf(always.value)).toEqual({ approved: true, scope: 'session' });
			expect(resumeDataOf(deny.value)).toEqual({ approved: false });
		});

		it('shows the name of the resource that the action applies to', () => {
			const card = toAssistantChannelCard(approvalPayload({ resourceName: 'Post stats' }), context);

			expect(card?.components[0]).toEqual({ type: 'section', text: '*Post stats*' });
		});

		it('cuts a long message for the card title', () => {
			const card = toAssistantChannelCard(approvalPayload({ message: 'x'.repeat(500) }), context);

			expect(card?.title?.length).toBe(200);
			expect(card?.title?.endsWith('…')).toBe(true);
		});
	});

	describe('a step that needs the editor', () => {
		it.each([
			[
				'questions',
				{ inputType: 'questions', questions: [{ id: 'q', question: 'Which?', type: 'text' }] },
			],
			['text input', { inputType: 'text' }],
			['resource decision', { inputType: 'resource-decision' }],
			['app blueprint', { inputType: 'app-blueprint' }],
			['credential requests', { credentialRequests: [{ credentialType: 'slackApi' }] }],
			['workflow setup', { setupRequests: [{ node: { name: 'Slack' } }] }],
			['domain access', { domainAccess: { url: 'https://example.com', host: 'example.com' } }],
			['MCP connect', { mcpConnectRequest: { servers: [] } }],
		])('links to the thread in the editor for %s', (_name, extra) => {
			const card = toAssistantChannelCard(approvalPayload(extra), context);

			expect(buttons(card)).toEqual([]);
			expect(card?.components).toContainEqual({
				type: 'link_button',
				label: 'Open in n8n',
				url: 'https://n8n.test/assistant/thread-1',
			});
		});
	});

	it('leaves a suspension that is not an Assistant confirmation to the generic card', () => {
		expect(toAssistantChannelCard({ type: 'approval', toolName: 'x' }, context)).toBeUndefined();
		expect(toAssistantChannelCard(undefined, context)).toBeUndefined();
	});
});
