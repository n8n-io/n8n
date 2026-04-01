import { mapMastraChunkToEvent } from '../map-chunk';

describe('mapMastraChunkToEvent', () => {
	it('preserves template-choice confirmation payloads', () => {
		const event = mapMastraChunkToEvent('run-1', 'agent-1', {
			type: 'tool-call-suspended',
			payload: {
				toolCallId: 'tc-1',
				toolName: 'choose-workflow-template',
				args: {},
				suspendPayload: {
					requestId: 'req-1',
					severity: 'info',
					message: 'Pick one of these templates',
					inputType: 'template-choice',
					templates: [
						{
							templateId: 101,
							name: 'Slack alert triage',
							description: 'Route inbound leads to Slack for qualification',
						},
					],
					totalResults: 4,
					introMessage: 'I found a few close matches.',
				},
			},
		});

		expect(event).toEqual({
			type: 'confirmation-request',
			runId: 'run-1',
			agentId: 'agent-1',
			payload: {
				requestId: 'req-1',
				toolCallId: 'tc-1',
				toolName: 'choose-workflow-template',
				args: {},
				severity: 'info',
				message: 'Pick one of these templates',
				inputType: 'template-choice',
				templates: [
					{
						templateId: 101,
						name: 'Slack alert triage',
						description: 'Route inbound leads to Slack for qualification',
					},
				],
				totalResults: 4,
				introMessage: 'I found a few close matches.',
			},
		});
	});

	it('preserves selected template choice on chooser follow-up questions', () => {
		const event = mapMastraChunkToEvent('run-1', 'agent-1', {
			type: 'tool-call-suspended',
			payload: {
				toolCallId: 'tc-1',
				toolName: 'choose-workflow-template',
				args: {},
				suspendPayload: {
					requestId: 'req-2',
					severity: 'info',
					message: 'What would you like to change?',
					inputType: 'questions',
					questions: [
						{
							id: 'template_changes',
							question: 'What would you like to change?',
							type: 'text',
						},
					],
					selectedTemplateChoice: {
						action: 'adapt_with_agent',
						templateId: 101,
						templateName: 'Slack alert triage',
					},
				},
			},
		});

		expect(event).toEqual({
			type: 'confirmation-request',
			runId: 'run-1',
			agentId: 'agent-1',
			payload: {
				requestId: 'req-2',
				toolCallId: 'tc-1',
				toolName: 'choose-workflow-template',
				args: {},
				severity: 'info',
				message: 'What would you like to change?',
				inputType: 'questions',
				questions: [
					{
						id: 'template_changes',
						question: 'What would you like to change?',
						type: 'text',
					},
				],
				selectedTemplateChoice: {
					action: 'adapt_with_agent',
					templateId: 101,
					templateName: 'Slack alert triage',
				},
			},
		});
	});
});
