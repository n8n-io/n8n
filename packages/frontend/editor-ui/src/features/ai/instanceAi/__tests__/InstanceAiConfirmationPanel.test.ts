import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import type {
	InstanceAiConfirmation,
	InstanceAiToolCallState,
	InstanceAiAgentNode,
} from '@n8n/api-types';
import InstanceAiConfirmationPanel from '../components/InstanceAiConfirmationPanel.vue';
import { useInstanceAiStore } from '../instanceAi.store';
import type { QuestionAnswer } from '../components/InstanceAiQuestions.vue';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string, opts?: { interpolate?: Record<string, string> }) => {
			if (opts?.interpolate) {
				return Object.entries(opts.interpolate).reduce(
					(str, [k, v]) => str.replace(`{${k}}`, v),
					key,
				);
			}
			return key;
		},
	}),
}));

const mockTelemetryTrack = vi.fn();
vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: mockTelemetryTrack }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ instanceId: 'test-instance-id' }),
}));

vi.mock('../toolLabels', () => ({
	useToolLabel: () => ({ getToolLabel: (name: string) => name }),
}));

// Stub heavy child components
let capturedQuestionsSubmit: ((answers: QuestionAnswer[]) => void) | undefined;

vi.mock('../components/InstanceAiQuestions.vue', () => ({
	default: {
		props: ['questions', 'introMessage'],
		emits: ['submit'],
		setup(
			_props: Record<string, unknown>,
			{ emit }: { emit: (e: string, ...args: unknown[]) => void },
		) {
			capturedQuestionsSubmit = (answers: QuestionAnswer[]) => emit('submit', answers);
		},
		template: '<div data-test-id="mock-questions" />',
	},
}));

vi.mock('../components/DomainAccessApproval.vue', () => ({
	default: { template: '<div />', props: ['requestId', 'url', 'host', 'severity'] },
}));
vi.mock('../components/GatewayResourceDecision.vue', () => ({
	default: {
		template: '<div />',
		props: ['requestId', 'resource', 'description', 'options'],
	},
}));
vi.mock('../components/InstanceAiCredentialSetup.vue', () => ({
	default: {
		template: '<div />',
		props: ['requestId', 'credentialRequests', 'message', 'projectId', 'credentialFlow'],
	},
}));
vi.mock('../components/InstanceAiWorkflowSetup.vue', () => ({
	default: {
		template: '<div />',
		props: ['requestId', 'setupRequests', 'workflowId', 'message', 'projectId', 'credentialFlow'],
	},
}));
vi.mock('../components/PlanReviewPanel.vue', () => ({
	default: { template: '<div />', props: ['plannedTasks', 'message', 'readOnly'] },
}));

const renderComponent = createComponentRenderer(InstanceAiConfirmationPanel);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeToolCall(
	confirmation: InstanceAiConfirmation,
	args: Record<string, unknown> = {},
): InstanceAiToolCallState & { confirmation: InstanceAiConfirmation } {
	return {
		toolCallId: `tc-${confirmation.requestId}`,
		toolName: 'test-tool',
		args,
		isLoading: true,
		confirmation,
		confirmationStatus: 'pending',
	} as InstanceAiToolCallState & { confirmation: InstanceAiConfirmation };
}

function makeAgentNode(toolCalls: InstanceAiToolCallState[]): InstanceAiAgentNode {
	return {
		agentId: 'agent-1',
		role: 'orchestrator',
		status: 'active',
		textContent: '',
		reasoning: '',
		toolCalls,
		children: [],
		timeline: [],
	};
}

function injectPendingConfirmation(
	store: ReturnType<typeof useInstanceAiStore>,
	confirmation: InstanceAiConfirmation,
	args: Record<string, unknown> = {},
) {
	const tc = makeToolCall(confirmation, args);
	const agentNode = makeAgentNode([tc]);
	store.messages.push({
		id: 'msg-1',
		role: 'assistant',
		createdAt: new Date().toISOString(),
		content: '',
		reasoning: '',
		isStreaming: false,
		agentTree: agentNode,
	});
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InstanceAiConfirmationPanel telemetry', () => {
	let store: ReturnType<typeof useInstanceAiStore>;

	beforeEach(() => {
		vi.clearAllMocks();
		capturedQuestionsSubmit = undefined;
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
		store = useInstanceAiStore();
		store.currentThreadId = 'thread-abc';
	});

	describe('approval confirmation', () => {
		it('tracks approve with correct payload', async () => {
			injectPendingConfirmation(store, {
				requestId: 'req-1',
				severity: 'info',
				message: 'Run this workflow?',
			});
			vi.spyOn(store, 'confirmAction').mockResolvedValue(true);

			const { getByTestId } = renderComponent();
			await userEvent.click(getByTestId('instance-ai-panel-confirm-approve'));

			expect(mockTelemetryTrack).toHaveBeenCalledWith(
				'User finished providing input',
				expect.objectContaining({
					thread_id: 'thread-abc',
					instance_id: 'test-instance-id',
					type: 'approval',
					provided_inputs: [
						{
							label: 'Run this workflow?',
							options: ['approve', 'deny'],
							option_chosen: 'approve',
						},
					],
					skipped_inputs: [],
				}),
			);
		});

		it('tracks deny with correct payload', async () => {
			injectPendingConfirmation(store, {
				requestId: 'req-2',
				severity: 'info',
				message: 'Delete this file?',
			});
			vi.spyOn(store, 'confirmAction').mockResolvedValue(true);

			const { getByTestId } = renderComponent();
			await userEvent.click(getByTestId('instance-ai-panel-confirm-deny'));

			expect(mockTelemetryTrack).toHaveBeenCalledWith(
				'User finished providing input',
				expect.objectContaining({
					type: 'approval',
					provided_inputs: [
						{
							label: 'Delete this file?',
							options: ['approve', 'deny'],
							option_chosen: 'deny',
						},
					],
				}),
			);
		});
	});

	describe('text input confirmation', () => {
		it('tracks text submit with input_type and question', async () => {
			injectPendingConfirmation(store, {
				requestId: 'req-text',
				severity: 'info',
				message: 'What name for the workflow?',
				inputType: 'text',
			});
			vi.spyOn(store, 'confirmAction').mockResolvedValue(true);

			const { container } = renderComponent();
			const input = container.querySelector('input[type="text"]') as HTMLInputElement;
			await userEvent.type(input, 'My Workflow');
			await userEvent.keyboard('{Enter}');

			expect(mockTelemetryTrack).toHaveBeenCalledWith(
				'User finished providing input',
				expect.objectContaining({
					type: 'text',
					provided_inputs: [
						{
							label: 'What name for the workflow?',
							question: 'What name for the workflow?',
							input_type: 'text',
							options: [],
							option_chosen: 'My Workflow',
						},
					],
					skipped_inputs: [],
				}),
			);
		});

		it('tracks text skip with input_type and question', async () => {
			injectPendingConfirmation(store, {
				requestId: 'req-text-skip',
				severity: 'info',
				message: 'Any preferences?',
				inputType: 'text',
			});
			vi.spyOn(store, 'confirmAction').mockResolvedValue(true);

			const { container } = renderComponent();
			// Find the skip button (shown when input is empty)
			const buttons = container.querySelectorAll('button');
			const skipBtn = Array.from(buttons).find(
				(b) => b.textContent?.trim() === 'instanceAi.askUser.skip',
			);
			expect(skipBtn).toBeTruthy();
			await userEvent.click(skipBtn!);

			expect(mockTelemetryTrack).toHaveBeenCalledWith(
				'User finished providing input',
				expect.objectContaining({
					type: 'text',
					provided_inputs: [],
					skipped_inputs: [
						{
							label: 'Any preferences?',
							question: 'Any preferences?',
							input_type: 'text',
							options: [],
						},
					],
				}),
			);
		});
	});

	describe('questions confirmation', () => {
		const questionsConfirmation: InstanceAiConfirmation = {
			requestId: 'req-q',
			severity: 'info',
			message: 'Answer questions',
			inputType: 'questions',
			questions: [
				{
					id: 'interface',
					question: 'What kind of interface?',
					type: 'single',
					options: ['Web app', 'Mobile app', 'CLI tool'],
				},
				{
					id: 'features',
					question: 'Which features do you need?',
					type: 'multi',
					options: ['Auth', 'Payments', 'Notifications', 'Analytics'],
				},
				{
					id: 'design',
					question: 'Describe the design you want',
					type: 'text',
				},
			],
		};

		it('includes all available options and correct option_chosen for single-select', () => {
			injectPendingConfirmation(store, questionsConfirmation);
			vi.spyOn(store, 'confirmAction').mockResolvedValue(true);

			renderComponent();

			const answers: QuestionAnswer[] = [
				{
					questionId: 'interface',
					question: 'What kind of interface?',
					selectedOptions: ['Web app'],
					customText: '',
				},
				{
					questionId: 'features',
					question: 'Which features do you need?',
					selectedOptions: ['Auth', 'Payments'],
					customText: '',
				},
				{
					questionId: 'design',
					question: 'Describe the design you want',
					selectedOptions: [],
					customText: 'Minimal and clean',
				},
			];

			capturedQuestionsSubmit!(answers);

			expect(mockTelemetryTrack).toHaveBeenCalledWith(
				'User finished providing input',
				expect.objectContaining({
					thread_id: 'thread-abc',
					type: 'questions',
					provided_inputs: [
						{
							label: 'interface',
							question: 'What kind of interface?',
							input_type: 'single',
							options: ['Web app', 'Mobile app', 'CLI tool'],
							option_chosen: 'Web app',
						},
						{
							label: 'features',
							question: 'Which features do you need?',
							input_type: 'multi',
							options: ['Auth', 'Payments', 'Notifications', 'Analytics'],
							option_chosen: ['Auth', 'Payments'],
						},
						{
							label: 'design',
							question: 'Describe the design you want',
							input_type: 'text',
							options: [],
							option_chosen: 'Minimal and clean',
						},
					],
					skipped_inputs: [],
				}),
			);
		});

		it('uses customText for single-select "something else"', () => {
			injectPendingConfirmation(store, questionsConfirmation);
			vi.spyOn(store, 'confirmAction').mockResolvedValue(true);

			renderComponent();

			const answers: QuestionAnswer[] = [
				{
					questionId: 'interface',
					question: 'What kind of interface?',
					selectedOptions: [],
					customText: 'Desktop Electron app',
				},
				{
					questionId: 'features',
					question: 'Which features do you need?',
					selectedOptions: [],
					skipped: true,
				},
				{
					questionId: 'design',
					question: 'Describe the design you want',
					selectedOptions: [],
					skipped: true,
				},
			];

			capturedQuestionsSubmit!(answers);

			const call = mockTelemetryTrack.mock.calls[0];
			const props = call[1];

			expect(props.provided_inputs).toEqual([
				{
					label: 'interface',
					question: 'What kind of interface?',
					input_type: 'single',
					options: ['Web app', 'Mobile app', 'CLI tool'],
					option_chosen: 'Desktop Electron app',
				},
			]);
		});

		it('includes customText in multi-select array', () => {
			injectPendingConfirmation(store, questionsConfirmation);
			vi.spyOn(store, 'confirmAction').mockResolvedValue(true);

			renderComponent();

			const answers: QuestionAnswer[] = [
				{
					questionId: 'interface',
					question: 'What kind of interface?',
					selectedOptions: ['Web app'],
					customText: '',
				},
				{
					questionId: 'features',
					question: 'Which features do you need?',
					selectedOptions: ['Auth'],
					customText: 'Custom SSO',
				},
				{
					questionId: 'design',
					question: 'Describe the design you want',
					selectedOptions: [],
					customText: 'Dark mode',
				},
			];

			capturedQuestionsSubmit!(answers);

			const call = mockTelemetryTrack.mock.calls[0];
			const features = call[1].provided_inputs[1];

			expect(features).toEqual({
				label: 'features',
				question: 'Which features do you need?',
				input_type: 'multi',
				options: ['Auth', 'Payments', 'Notifications', 'Analytics'],
				option_chosen: ['Auth', 'Custom SSO'],
			});
		});

		it('puts skipped questions in skipped_inputs with all options', () => {
			injectPendingConfirmation(store, questionsConfirmation);
			vi.spyOn(store, 'confirmAction').mockResolvedValue(true);

			renderComponent();

			const answers: QuestionAnswer[] = [
				{
					questionId: 'interface',
					question: 'What kind of interface?',
					selectedOptions: ['CLI tool'],
					customText: '',
				},
				{
					questionId: 'features',
					question: 'Which features do you need?',
					selectedOptions: [],
					skipped: true,
				},
				{
					questionId: 'design',
					question: 'Describe the design you want',
					selectedOptions: [],
					skipped: true,
				},
			];

			capturedQuestionsSubmit!(answers);

			const call = mockTelemetryTrack.mock.calls[0];
			expect(call[1].skipped_inputs).toEqual([
				{
					label: 'features',
					question: 'Which features do you need?',
					input_type: 'multi',
					options: ['Auth', 'Payments', 'Notifications', 'Analytics'],
				},
				{
					label: 'design',
					question: 'Describe the design you want',
					input_type: 'text',
					options: [],
				},
			]);
		});
	});
});
