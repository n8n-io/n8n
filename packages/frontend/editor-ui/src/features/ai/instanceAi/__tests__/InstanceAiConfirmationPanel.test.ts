import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, screen } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import InstanceAiConfirmationPanel from '../components/InstanceAiConfirmationPanel.vue';
import { useInstanceAiStore } from '../instanceAi.store';

vi.mock('../instanceAi.store', () => ({
	useInstanceAiStore: vi.fn(),
}));

vi.mock('../toolLabels', () => ({
	useToolLabel: () => ({
		getToolLabel: (toolName: string) => toolName,
	}),
}));

const renderComponent = createComponentRenderer(InstanceAiConfirmationPanel, {
	global: {
		plugins: [createTestingPinia()],
		stubs: {
			N8nButton: {
				props: ['label'],
				template: '<button>{{ label }}</button>',
			},
			DomainAccessApproval: { template: '<div data-test-id="domain-access-approval" />' },
			InstanceAiCredentialSetup: { template: '<div data-test-id="credential-setup" />' },
			InstanceAiWorkflowSetup: { template: '<div data-test-id="workflow-setup" />' },
			InstanceAiQuestions: {
				template:
					'<div data-test-id="questions-panel"><button data-test-id="submit-questions" @click="$emit(`submit`, [{ questionId: `template_changes`, question: `What would you like to change?`, selectedOptions: [], customText: `Nothing` }])">submit</button></div>',
			},
			PlanReviewPanel: { template: '<div data-test-id="plan-review-panel" />' },
			TemplateChoicePanel: {
				props: ['templates', 'totalResults', 'introMessage'],
				template:
					'<div data-test-id="template-choice-panel">{{ introMessage }}|{{ templates.length }}|{{ totalResults }}<button data-test-id="submit-choice" @click="$emit(`submit`, { action: `adapt_with_agent`, templateId: 101, templateName: `Slack alert triage` })">submit</button></div>',
			},
		},
	},
});

describe('InstanceAiConfirmationPanel', () => {
	it('renders the template chooser for legacy template-choice confirmations', () => {
		vi.mocked(useInstanceAiStore).mockReturnValue({
			pendingConfirmations: [
				{
					toolCall: {
						toolCallId: 'tc-choose',
						toolName: 'choose-workflow-template',
						args: {
							templates: [{ templateId: 101, name: 'Slack alert triage' }],
							totalResults: 4,
							introMessage: 'Pick one',
						},
						isLoading: true,
						confirmation: {
							requestId: 'req-1',
							severity: 'info',
							message: 'Pick one',
						},
					},
					agentNode: {
						agentId: 'agent-1',
						role: 'orchestrator',
					},
					messageId: 'msg-1',
				},
			],
			resolvedConfirmationIds: new Map(),
			resolveConfirmation: vi.fn(),
			confirmAction: vi.fn(),
		} as never);

		renderComponent();

		expect(screen.getByTestId('template-choice-panel')).toHaveTextContent('Pick one|1|4');
		expect(screen.queryByTestId('instance-ai-panel-confirm-approve')).not.toBeInTheDocument();
	});

	it('keeps the template chooser pending when confirmation POST fails', async () => {
		const resolveConfirmation = vi.fn();
		const confirmAction = vi.fn().mockResolvedValue(false);

		vi.mocked(useInstanceAiStore).mockReturnValue({
			pendingConfirmations: [
				{
					toolCall: {
						toolCallId: 'tc-choose',
						toolName: 'choose-workflow-template',
						args: {
							templates: [{ templateId: 101, name: 'Slack alert triage' }],
							totalResults: 4,
							introMessage: 'Pick one',
						},
						isLoading: true,
						confirmation: {
							requestId: 'req-1',
							severity: 'info',
							message: 'Pick one',
						},
					},
					agentNode: {
						agentId: 'agent-1',
						role: 'orchestrator',
					},
					messageId: 'msg-1',
				},
			],
			resolvedConfirmationIds: new Map(),
			resolveConfirmation,
			confirmAction,
		} as never);

		renderComponent();
		await fireEvent.click(screen.getByTestId('submit-choice'));

		expect(confirmAction).toHaveBeenCalledWith(
			'req-1',
			true,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			{
				action: 'adapt_with_agent',
				templateId: 101,
				templateName: 'Slack alert triage',
			},
		);
		expect(resolveConfirmation).not.toHaveBeenCalled();
	});

	it('forwards the selected template when chooser follow-up questions are submitted', async () => {
		const resolveConfirmation = vi.fn();
		const confirmAction = vi.fn().mockResolvedValue(true);

		vi.mocked(useInstanceAiStore).mockReturnValue({
			pendingConfirmations: [
				{
					toolCall: {
						toolCallId: 'tc-choose',
						toolName: 'choose-workflow-template',
						args: {
							templates: [{ templateId: 101, name: 'Slack alert triage' }],
							totalResults: 4,
						},
						isLoading: true,
						confirmation: {
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
					agentNode: {
						agentId: 'agent-1',
						role: 'orchestrator',
					},
					messageId: 'msg-1',
				},
			],
			resolvedConfirmationIds: new Map(),
			resolveConfirmation,
			confirmAction,
		} as never);

		renderComponent();
		await fireEvent.click(screen.getByTestId('submit-questions'));

		expect(confirmAction).toHaveBeenCalledWith(
			'req-2',
			true,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			[
				{
					questionId: 'template_changes',
					question: 'What would you like to change?',
					selectedOptions: [],
					customText: 'Nothing',
				},
			],
			{
				action: 'adapt_with_agent',
				templateId: 101,
				templateName: 'Slack alert triage',
			},
		);
	});
});
