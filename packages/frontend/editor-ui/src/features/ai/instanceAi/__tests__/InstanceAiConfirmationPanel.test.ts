import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { fireEvent, waitFor } from '@testing-library/vue';
import { createThreadComponentRenderer } from './createThreadComponentRenderer';
import type {
	InstanceAiConfirmation,
	InstanceAiToolCallState,
	InstanceAiAgentNode,
	PushMessage,
} from '@n8n/api-types';
import InstanceAiConfirmationPanel from '../components/InstanceAiConfirmationPanel.vue';
import { useInstanceAiStore, type ThreadRuntime } from '../instanceAi.store';
import type { QuestionAnswer } from '../components/InstanceAiQuestions.vue';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string, opts?: { interpolate?: Record<string, string> }) => {
			const translations: Record<string, string> = {
				'instanceAi.confirmation.credentialDestination.title': 'Send credential data to {origin}?',
				'instanceAi.confirmation.credentialDestination.description':
					"The '{nodeName}' node will send credentials here for tests and executions.",
				'instanceAi.confirmation.credentialDestination.descriptionMultiple':
					'These nodes will send credentials here for tests and executions: {nodeNames}.',
				'instanceAi.confirmation.credentialDestination.approve': 'Use destination',
				'instanceAi.confirmation.credentialDestination.deny': "Don't use destination",
				'instanceAi.confirmation.allowPrompt': 'Allow n8n Assistant to {action}?',
				'instanceAi.confirmation.details': 'Approval details',
				'instanceAi.approval.deleteTable': 'Eliminar la tabla y todas sus filas',
				'instanceAi.confirmation.resourcePrompt': 'Assistant wants to {action} {name}',
				'instanceAi.tools.archive_workflow.imperative': 'archive workflow',
				'instanceAi.tools.restore_workflow_version.imperativeWithResource': 'restore a version of',
				'instanceAi.tools.update_workflow_version.imperativeWithResource': 'update a version of',
				'instanceAi.tools.unpublish_workflow.imperativeWithResource': 'unpublish',
				'instanceAi.tools.unarchive_workflow.imperativeWithResource': 'restore',
				'instanceAi.tools.archive_workflow.imperativeWithResource': 'archive',
				'instanceAi.tools.workflow_builder_build_workflow.imperative': 'edit workflow',
				'instanceAi.tools.workflow_builder_build_workflow.imperativeWithResource': 'edit',
				'instanceAi.tools.data_tables.add-column.imperative': 'add column',
				'instanceAi.tools.data_tables.add-column.imperativeWithResource': 'add a column to',
				'instanceAi.tools.workflow_builder_nodes.execute.imperativeWithResource': 'execute the',
			};
			if (key === 'agents.chat.approval.description') {
				return `The agent wants to run the ${opts?.interpolate?.toolName ?? ''} tool.`;
			}
			const value = translations[key] ?? key;
			if (opts?.interpolate) {
				return Object.entries(opts.interpolate).reduce(
					(str, [k, v]) => str.replace(`{${k}}`, v),
					value,
				);
			}
			return value;
		},
	}),
}));

const mockTelemetryTrack = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: mockTelemetryTrack }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ instanceId: 'test-instance-id' }),
}));

vi.mock('../toolLabels', () => ({
	useToolLabel: () => ({ getToolLabel: (name: string) => name }),
}));

let capturedPushListener: ((event: PushMessage) => void) | undefined;
const mockRemovePushListener = vi.fn();
vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({
		addEventListener: (handler: (event: PushMessage) => void) => {
			capturedPushListener = handler;
			return mockRemovePushListener;
		},
	}),
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
	default: {
		props: ['url', 'host', 'query', 'severity'],
		emits: ['decide'],
		template: `<div>
			<button data-test-id="domain-access-allow-once" @click="$emit('decide', { kind: 'domainAccessApprove', domainAccessAction: 'allow_once' })" />
			<button data-test-id="domain-access-deny" @click="$emit('decide', { kind: 'domainAccessDeny' })" />
		</div>`,
	},
}));
vi.mock('../components/GatewayResourceDecision.vue', () => ({
	default: {
		props: ['resource', 'description', 'options', 'threadId', 'inputThreadId'],
		emits: ['decide'],
		template:
			'<button data-test-id="mock-resource-decision" :data-thread-id="threadId" @click="$emit(\'decide\', \'allowOnce\')" />',
	},
}));
vi.mock('../components/InstanceAiCredentialSetup.vue', () => ({
	default: {
		props: [
			'credentialRequests',
			'message',
			'projectId',
			'credentialFlow',
			'requireUserSelection',
			'threadId',
			'inputThreadId',
			'failedAttempts',
		],
		emits: ['decide'],
		template: `<div>
			<div data-test-id="mock-credential-setup" :data-project-id="projectId" :data-require-user-selection="String(requireUserSelection)" :data-failed-attempts="String(failedAttempts)" />
			<button data-test-id="mock-credential-setup-continue" @click="$emit('decide', { kind: 'credentialSelection', credentials: { slackApi: 'cred-1' } }, 'approved')" />
		</div>`,
	},
}));
vi.mock('../workflowSetup/InstanceAiWorkflowSetup.vue', () => ({
	default: {
		props: [
			'requestId',
			'setupRequests',
			'workflowId',
			'projectId',
			'credentialFlow',
			'threadId',
			'inputThreadId',
			'outcome',
		],
		emits: ['apply', 'defer'],
		template: `<div>
			<div data-test-id="mock-workflow-setup" :data-outcome="outcome?.state ?? ''" />
			<button data-test-id="mock-workflow-setup-defer" @click="$emit('defer')" />
		</div>`,
	},
}));
vi.mock('../components/InstanceAiChannelSetup.vue', () => ({
	default: {
		props: ['integrationType', 'agentId', 'projectId'],
		emits: ['decide'],
		template: '<button data-test-id="mock-channel-setup" @click="$emit(\'decide\', true)" />',
	},
}));

const renderComponent = createThreadComponentRenderer(InstanceAiConfirmationPanel);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeToolCall(
	confirmation: InstanceAiConfirmation,
	args: Record<string, unknown> = {},
	toolName = 'test-tool',
): InstanceAiToolCallState & { confirmation: InstanceAiConfirmation } {
	return {
		toolCallId: `tc-${confirmation.requestId}`,
		toolName,
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
	thread: ThreadRuntime,
	confirmation: InstanceAiConfirmation,
	args: Record<string, unknown> = {},
	toolName = 'test-tool',
) {
	const tc = makeToolCall(confirmation, args, toolName);
	const agentNode = makeAgentNode([tc]);
	thread.messages.push({
		id: 'msg-1',
		role: 'assistant',
		createdAt: new Date().toISOString(),
		content: '',
		reasoning: '',
		isStreaming: false,
		agentTree: agentNode,
	});
	return tc;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InstanceAiConfirmationPanel telemetry', () => {
	let store: ReturnType<typeof useInstanceAiStore>;
	let thread: ThreadRuntime;

	beforeEach(() => {
		vi.clearAllMocks();
		capturedQuestionsSubmit = undefined;
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
		store = useInstanceAiStore();
		thread = store.getOrCreateRuntime('thread-1');
		thread.messages = [];
	});

	describe('approval confirmation', () => {
		it.each([true, false])(
			'restores a legacy approval and submits approved=%s with its original request ID',
			async (approved) => {
				const message = 'Edit Target workflow (ID: wf-1)?';
				injectPendingConfirmation(
					thread,
					{
						requestId: 'saved-request',
						severity: 'warning',
						message,
					},
					{ filePath: 'src/workflows/orders.workflow.ts', workflowId: 'wf-1' },
					'build-workflow',
				);
				const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);
				const { getByText, getByTestId } = renderComponent({ props: { kind: 'floating' } });

				expect(getByText(message)).toBeVisible();
				await userEvent.click(
					getByTestId(approved ? 'approval-card-allow-once' : 'approval-card-deny'),
				);
				expect(confirmSpy).toHaveBeenCalledWith('saved-request', { kind: 'approval', approved });
			},
		);

		it('names the asset in the title and shows only the summary below it', () => {
			injectPendingConfirmation(
				thread,
				{
					requestId: 'named-edit',
					severity: 'warning',
					message:
						'Renamed nodes with action-oriented labels and updated every expression that referenced the old names.',
					resourceName: 'CRM Lead enrichment',
				},
				{ filePath: 'src/workflows/crm.workflow.ts', workflowId: 'wf-1' },
				'workflow_builder_build_workflow',
			);
			const { getByText } = renderComponent({ props: { kind: 'floating' } });

			expect(getByText('Assistant wants to edit CRM Lead enrichment')).toBeVisible();
			expect(
				getByText(
					'Renamed nodes with action-oriented labels and updated every expression that referenced the old names.',
				),
			).toBeVisible();
		});

		it('resolves the title for a persisted card that carries a legacy tool name', () => {
			injectPendingConfirmation(
				thread,
				{
					requestId: 'legacy-name-edit',
					severity: 'warning',
					message: 'Updated the trigger.',
					resourceName: 'CRM Lead enrichment',
				},
				{ filePath: 'src/workflows/crm.workflow.ts', workflowId: 'wf-1' },
				'build-workflow',
			);
			const { getByText } = renderComponent({ props: { kind: 'floating' } });

			expect(getByText('Assistant wants to edit CRM Lead enrichment')).toBeVisible();
		});

		it('uses the resource phrase for data table column actions', () => {
			injectPendingConfirmation(
				thread,
				{
					requestId: 'named-column',
					severity: 'warning',
					message: 'Add column "age" (number)',
					resourceName: 'Contacts',
				},
				{ action: 'add-column', dataTableId: 'dt-1' },
				'data_tables',
			);
			const { getByText } = renderComponent({ props: { kind: 'floating' } });

			expect(getByText('Assistant wants to add a column to Contacts')).toBeVisible();
		});

		it('renders translated details instead of the legacy backend message', () => {
			injectPendingConfirmation(
				thread,
				{
					requestId: 'localized',
					severity: 'destructive',
					message: 'Permanently delete the table and all its rows',
					approvalDetails: { action: 'delete-table' },
					resourceName: 'Contacts',
				},
				{ action: 'delete', dataTableId: 'dt-1' },
				'data_tables',
			);
			const { getByRole } = renderComponent({ props: { kind: 'floating' } });
			expect(getByRole('region', { name: 'Approval details' }).textContent).toBe(
				'Eliminar la tabla y todas sus filas',
			);
		});

		it('keeps the full description in a keyboard-accessible region', async () => {
			const message = `Add 5 rows\n\nRow 1: set ${'"notes" to a detailed value, '.repeat(30)}\n\n2 more rows`;
			injectPendingConfirmation(
				thread,
				{ requestId: 'long-summary', severity: 'warning', message, resourceName: 'Contacts' },
				{ action: 'add-column', dataTableId: 'dt-1' },
				'data_tables',
			);
			const { getByRole, getByTestId } = renderComponent({ props: { kind: 'floating' } });
			const description = getByRole('region', {
				name: 'Approval details',
			});

			expect(description.textContent).toBe(message);
			await waitFor(() => expect(getByTestId('approval-card-always-allow')).toHaveFocus());
			getByRole('button', { expanded: true }).focus();
			await userEvent.tab();
			expect(description).toHaveFocus();
			expect(getByTestId('approval-card-allow-once')).toBeVisible();
		});

		it.each([
			['delete', 'archive'],
			['unarchive', 'restore'],
			['unpublish', 'unpublish'],
			['update-version', 'update a version of'],
			['restore-version', 'restore a version of'],
		])('names the workflow for %s approvals', (action, phrase) => {
			injectPendingConfirmation(
				thread,
				{
					requestId: 'archive',
					severity: 'warning',
					message: 'Archive this workflow',
					resourceName: 'Orders',
				},
				{ action, workflowId: 'wf-1' },
				'workflow_builder_workflows',
			);
			const { getByText } = renderComponent({ props: { kind: 'floating' } });
			expect(getByText(`Assistant wants to ${phrase} Orders`)).toBeVisible();
		});

		it('falls back to the tool label for an unknown approval action', () => {
			injectPendingConfirmation(
				thread,
				{
					requestId: 'unknown',
					severity: 'warning',
					message: 'Perform the action',
					resourceName: 'Orders',
				},
				{ action: 'custom-action' },
				'custom-tool',
			);
			const { getByText } = renderComponent({ props: { kind: 'floating' } });
			expect(getByText('custom-tool')).toBeVisible();
		});

		it('keeps the generic title for a saved approval without a resource name', () => {
			injectPendingConfirmation(
				thread,
				{
					requestId: 'legacy-edit',
					severity: 'warning',
					message: 'Edit Target workflow (ID: wf-1)?',
				},
				{ filePath: 'src/workflows/orders.workflow.ts', workflowId: 'wf-1' },
				'workflow_builder_build_workflow',
			);
			const { getByText } = renderComponent({ props: { kind: 'floating' } });

			expect(getByText('Allow n8n Assistant to edit workflow?')).toBeVisible();
		});

		it('names the node in the title when the assistant executes one', () => {
			injectPendingConfirmation(
				thread,
				{
					requestId: 'execute-node',
					severity: 'warning',
					message: 'Document > Create',
					resourceName: 'Google Sheets node',
				},
				{ action: 'execute', type: 'n8n-nodes-base.googleSheets' },
				'workflow_builder_nodes',
			);
			const { getByText } = renderComponent({ props: { kind: 'floating' } });

			expect(getByText('Assistant wants to execute the Google Sheets node')).toBeVisible();
			expect(getByText('Document > Create')).toBeVisible();
		});

		it('preserves the saved description after a question mark', () => {
			const message =
				'Save changes to workflow "Paid?": Add a Slack notification after the payment check and update the daily report';
			injectPendingConfirmation(thread, {
				requestId: 'saved-summary',
				severity: 'warning',
				message,
			});
			const { getByText } = renderComponent({ props: { kind: 'floating' } });

			expect(getByText(message)).toBeVisible();
		});

		it('renders a saved approval without a description', () => {
			injectPendingConfirmation(thread, {
				requestId: 'saved-empty',
				severity: 'warning',
				message: '',
			});
			const { getByTestId } = renderComponent({ props: { kind: 'floating' } });
			expect(getByTestId('approval-card-allow-once')).toBeVisible();
			expect(getByTestId('approval-card-deny')).toBeVisible();
		});

		it.each(['approved', 'denied'] as const)(
			'does not reopen a saved %s approval',
			(confirmationStatus) => {
				const toolCall = injectPendingConfirmation(thread, {
					requestId: 'saved-complete',
					severity: 'warning',
					message: 'Edit workflow (ID: wf-1)?',
				});
				toolCall.confirmationStatus = confirmationStatus;
				const { queryByTestId } = renderComponent({ props: { kind: 'floating' } });
				expect(queryByTestId('approval-card-allow-once')).not.toBeInTheDocument();
			},
		);

		it('requires a specific decision for the credential destination', async () => {
			injectPendingConfirmation(
				thread,
				{
					requestId: 'req-destination',
					severity: 'warning',
					message: 'Review where this credential will be used',
					workflowId: 'workflow-1',
					credentialDestination: {
						origin: 'https://api.example.com',
						nodeNames: ['Fetch account'],
					},
				},
				{ action: 'setup', workflowId: 'workflow-1' },
				'workflow_builder_workflows',
			);
			const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

			const { getByText, getByTestId, queryByTestId } = renderComponent({
				props: { kind: 'floating' },
			});

			expect(getByText('Send credential data to https://api.example.com?')).toBeVisible();
			expect(
				getByText("The 'Fetch account' node will send credentials here for tests and executions."),
			).toBeVisible();
			expect(getByText('Use destination')).toBeVisible();
			expect(getByText("Don't use destination")).toBeVisible();
			expect(queryByTestId('approval-card-always-allow')).toBeNull();

			await userEvent.click(getByTestId('approval-card-allow-once'));

			expect(confirmSpy).toHaveBeenCalledWith('req-destination', {
				kind: 'credentialDestination',
				approved: true,
				origin: 'https://api.example.com',
			});
			expect(mockTelemetryTrack).toHaveBeenCalledWith(
				'User finished providing input',
				expect.objectContaining({
					type: 'credential-destination',
					runtime: 'instance-ai',
					provided_inputs: [
						{
							label: 'Review where this credential will be used',
							options: ['approve', 'deny'],
							option_chosen: 'approve',
						},
					],
				}),
			);
		});

		it('tracks approve with correct payload', async () => {
			injectPendingConfirmation(thread, {
				requestId: 'req-1',
				severity: 'info',
				message: 'Run this workflow?',
			});
			vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

			const { getByTestId } = renderComponent({ props: { kind: 'floating' } });
			await userEvent.click(getByTestId('approval-card-allow-once'));

			expect(mockTelemetryTrack).toHaveBeenCalledWith(
				'User finished providing input',
				expect.objectContaining({
					thread_id: 'thread-1',
					instance_id: 'test-instance-id',
					type: 'approval',
					provided_inputs: [
						{
							label: 'Run this workflow?',
							options: ['approve', 'deny', 'approve_always'],
							option_chosen: 'approve',
						},
					],
					skipped_inputs: [],
				}),
			);
		});

		it('renders explicit approval input type as generic approval', async () => {
			injectPendingConfirmation(thread, {
				requestId: 'req-explicit-approval',
				severity: 'info',
				message: 'Approve this action?',
				inputType: 'approval',
			});
			const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

			const { getByTestId } = renderComponent({ props: { kind: 'floating' } });
			await userEvent.click(getByTestId('approval-card-allow-once'));

			expect(confirmSpy).toHaveBeenCalledWith('req-explicit-approval', {
				kind: 'approval',
				approved: true,
			});
		});

		it('tracks deny with correct payload', async () => {
			injectPendingConfirmation(thread, {
				requestId: 'req-2',
				severity: 'info',
				message: 'Delete this file?',
			});
			vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

			const { getByTestId } = renderComponent({ props: { kind: 'floating' } });
			await userEvent.click(getByTestId('approval-card-deny'));

			expect(mockTelemetryTrack).toHaveBeenCalledWith(
				'User finished providing input',
				expect.objectContaining({
					type: 'approval',
					provided_inputs: [
						{
							label: 'Delete this file?',
							options: ['approve', 'deny', 'approve_always'],
							option_chosen: 'deny',
						},
					],
				}),
			);
		});

		it('tracks always-allow click and records the key on the runtime', async () => {
			injectPendingConfirmation(
				thread,
				{
					requestId: 'req-always',
					severity: 'info',
					message: 'Run this workflow?',
				},
				{ action: 'run' },
			);
			const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);
			const addKeySpy = vi.spyOn(thread, 'addAlwaysAllowKey');

			const { getByTestId } = renderComponent({ props: { kind: 'floating' } });
			await userEvent.click(getByTestId('approval-card-always-allow'));

			expect(confirmSpy).toHaveBeenCalledWith('req-always', {
				kind: 'approval',
				approved: true,
				scope: 'session',
			});
			expect(addKeySpy).toHaveBeenCalledWith('test-tool', { action: 'run' }, undefined);
			expect(mockTelemetryTrack).toHaveBeenCalledWith(
				'User finished providing input',
				expect.objectContaining({
					type: 'approval',
					provided_inputs: [
						{
							label: 'Run this workflow?',
							options: ['approve', 'deny', 'approve_always'],
							option_chosen: 'approve_always',
						},
					],
				}),
			);
		});

		it('does not grant the session-allow key when always-allow POST fails', async () => {
			injectPendingConfirmation(
				thread,
				{
					requestId: 'req-always-fail',
					severity: 'info',
					message: 'Run this workflow?',
				},
				{ action: 'run' },
			);
			vi.spyOn(thread, 'confirmAction').mockResolvedValue(false);
			const addKeySpy = vi.spyOn(thread, 'addAlwaysAllowKey');
			const resolveSpy = vi.spyOn(thread, 'resolveConfirmation');

			const { getByTestId } = renderComponent({ props: { kind: 'floating' } });
			await userEvent.click(getByTestId('approval-card-always-allow'));

			expect(addKeySpy).not.toHaveBeenCalled();
			expect(resolveSpy).not.toHaveBeenCalled();
			expect(mockTelemetryTrack).not.toHaveBeenCalled();
		});

		it('scopes always-allow for build-workflow to confirmation.workflowId', async () => {
			injectPendingConfirmation(
				thread,
				{
					requestId: 'req-build-always',
					severity: 'warning',
					message: 'Edit Target workflow (ID: wf-1)?',
					workflowId: 'wf-1',
				},
				{ filePath: 'src/workflows/main.workflow.ts' },
				'workflow_builder_build_workflow',
			);
			const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);
			const addKeySpy = vi.spyOn(thread, 'addAlwaysAllowKey');

			const { getByTestId } = renderComponent({ props: { kind: 'floating' } });
			await userEvent.click(getByTestId('approval-card-always-allow'));

			expect(confirmSpy).toHaveBeenCalledWith('req-build-always', {
				kind: 'approval',
				approved: true,
				scope: 'session',
			});
			expect(addKeySpy).toHaveBeenCalledWith(
				'workflow_builder_build_workflow',
				{ filePath: 'src/workflows/main.workflow.ts' },
				'wf-1',
			);
		});

		it('hides always-allow for unscoped build-workflow edits', () => {
			injectPendingConfirmation(
				thread,
				{
					requestId: 'req-build-unscoped',
					severity: 'warning',
					message: 'Edit workflow?',
				},
				{ filePath: 'src/workflows/main.workflow.ts' },
				'workflow_builder_build_workflow',
			);

			const { getByTestId, queryByTestId } = renderComponent({ props: { kind: 'floating' } });

			expect(queryByTestId('approval-card-always-allow')).toBeNull();
			expect(getByTestId('approval-card-allow-once')).toBeVisible();
			expect(getByTestId('approval-card-deny')).toBeVisible();
		});

		it('does not record a session key on allow-once for workflow edits', async () => {
			injectPendingConfirmation(
				thread,
				{
					requestId: 'req-build-once',
					severity: 'warning',
					message: 'Edit Target workflow (ID: wf-1)?',
					workflowId: 'wf-1',
				},
				{ filePath: 'src/workflows/main.workflow.ts' },
				'workflow_builder_build_workflow',
			);
			const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);
			const addKeySpy = vi.spyOn(thread, 'addAlwaysAllowKey');

			const { getByTestId } = renderComponent({ props: { kind: 'floating' } });
			await userEvent.click(getByTestId('approval-card-allow-once'));

			expect(confirmSpy).toHaveBeenCalledWith('req-build-once', {
				kind: 'approval',
				approved: true,
			});
			expect(addKeySpy).not.toHaveBeenCalled();
		});

		it('does not resolve the confirmation when an approve POST fails', async () => {
			injectPendingConfirmation(thread, {
				requestId: 'req-approve-fail',
				severity: 'info',
				message: 'Run this workflow?',
			});
			vi.spyOn(thread, 'confirmAction').mockResolvedValue(false);
			const resolveSpy = vi.spyOn(thread, 'resolveConfirmation');

			const { getByTestId } = renderComponent({ props: { kind: 'floating' } });
			await userEvent.click(getByTestId('approval-card-allow-once'));

			expect(resolveSpy).not.toHaveBeenCalled();
			expect(mockTelemetryTrack).not.toHaveBeenCalled();
		});

		it('ignores repeated clicks while the confirm POST is in flight', async () => {
			injectPendingConfirmation(thread, {
				requestId: 'req-double-click',
				severity: 'info',
				message: 'Run this workflow?',
			});
			let resolvePost: (value: boolean) => void = () => {};
			const confirmSpy = vi.spyOn(thread, 'confirmAction').mockReturnValue(
				new Promise<boolean>((resolve) => {
					resolvePost = resolve;
				}),
			);

			const { getByTestId } = renderComponent({ props: { kind: 'floating' } });
			const approveButton = getByTestId('approval-card-allow-once');
			await userEvent.click(approveButton);
			await userEvent.click(approveButton);
			await userEvent.click(approveButton);

			expect(confirmSpy).toHaveBeenCalledTimes(1);

			resolvePost(true);
		});

		it('hides always-allow on destructive confirmations and narrows the option set', async () => {
			injectPendingConfirmation(thread, {
				requestId: 'req-destructive',
				severity: 'destructive',
				message: 'Delete workflow?',
			});
			vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

			const { getByTestId, queryByTestId } = renderComponent({ props: { kind: 'floating' } });

			expect(queryByTestId('approval-card-always-allow')).toBeNull();

			await userEvent.click(getByTestId('approval-card-allow-once'));

			expect(mockTelemetryTrack).toHaveBeenCalledWith(
				'User finished providing input',
				expect.objectContaining({
					provided_inputs: [
						{
							label: 'Delete workflow?',
							options: ['approve', 'deny'],
							option_chosen: 'approve',
						},
					],
				}),
			);
		});

		it('shows target approval details and only submits a one-time decision', async () => {
			injectPendingConfirmation(thread, {
				requestId: 'req-target',
				severity: 'warning',
				message: 'Confirmation required',
				targetApproval: {
					toolName: 'delete_record',
					displayName: 'Delete record',
					args: { id: 'record-1' },
				},
			});
			const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);
			const addKeySpy = vi.spyOn(thread, 'addAlwaysAllowKey');

			const { getByTestId, getByText, queryByTestId } = renderComponent({
				props: { kind: 'floating' },
			});

			expect(getByText('The agent wants to run the Delete record tool.')).toBeVisible();
			expect(getByTestId('approval-card-args')).toBeVisible();
			expect(getByTestId('approval-card-args')).toHaveTextContent('"id": "record-1"');
			expect(queryByTestId('approval-card-always-allow')).toBeNull();

			await userEvent.click(getByTestId('approval-card-allow-once'));

			expect(confirmSpy).toHaveBeenCalledWith('req-target', {
				kind: 'approval',
				approved: true,
			});
			expect(addKeySpy).not.toHaveBeenCalled();
			expect(mockTelemetryTrack).toHaveBeenCalledWith(
				'User finished providing input',
				expect.objectContaining({
					provided_inputs: [
						expect.objectContaining({
							options: ['approve', 'deny'],
							option_chosen: 'approve',
						}),
					],
				}),
			);
		});

		it('renders nothing when mounted as inline for a floating-eligible confirmation', () => {
			injectPendingConfirmation(thread, {
				requestId: 'req-inline-skip',
				severity: 'info',
				message: 'Run this workflow?',
			});

			const { queryByTestId } = renderComponent({ props: { kind: 'inline' } });
			expect(queryByTestId('approval-card-allow-once')).toBeNull();
			expect(queryByTestId('instance-ai-confirmation-panel')).toBeNull();
		});
	});

	describe('credential setup', () => {
		it('passes requireUserSelection and falls back to the thread project', () => {
			thread.projectId = 'thread-project';
			injectPendingConfirmation(thread, {
				requestId: 'req-credential',
				severity: 'info',
				message: 'Set up credentials',
				credentialRequests: [
					{
						credentialType: 'slackApi',
						reason: 'Post a message',
						existingCredentials: [],
					},
				],
				requireUserSelection: true,
			});

			const { getByTestId } = renderComponent({ props: { kind: 'inline' } });
			const credentialSetup = getByTestId('mock-credential-setup');

			expect(credentialSetup).toHaveAttribute('data-require-user-selection', 'true');
			expect(credentialSetup).toHaveAttribute('data-project-id', 'thread-project');
		});

		const credentialConfirmation = {
			requestId: 'req-credential',
			severity: 'info' as const,
			message: 'Set up credentials',
			credentialRequests: [
				{ credentialType: 'slackApi', reason: 'Post a message', existingCredentials: [] },
			],
		};

		it('sends the answer of the card through the thread and resolves it', async () => {
			injectPendingConfirmation(thread, credentialConfirmation);
			const confirmAction = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);
			const resolveConfirmation = vi.spyOn(thread, 'resolveConfirmation');

			const { getByTestId } = renderComponent({ props: { kind: 'inline' } });
			await userEvent.click(getByTestId('mock-credential-setup-continue'));

			expect(confirmAction).toHaveBeenCalledWith('req-credential', {
				kind: 'credentialSelection',
				credentials: { slackApi: 'cred-1' },
			});
			expect(resolveConfirmation).toHaveBeenCalledWith('req-credential', 'approved');
		});

		it('tells the card when the answer failed to send, so the user can try again', async () => {
			injectPendingConfirmation(thread, credentialConfirmation);
			vi.spyOn(thread, 'confirmAction').mockResolvedValue(false);
			const resolveConfirmation = vi.spyOn(thread, 'resolveConfirmation');

			const { getByTestId } = renderComponent({ props: { kind: 'inline' } });
			expect(getByTestId('mock-credential-setup')).toHaveAttribute('data-failed-attempts', '0');
			await userEvent.click(getByTestId('mock-credential-setup-continue'));

			expect(resolveConfirmation).not.toHaveBeenCalled();
			expect(getByTestId('mock-credential-setup')).toHaveAttribute('data-failed-attempts', '1');
		});
	});

	describe('setup card decisions', () => {
		it('sends a resource decision through the thread', async () => {
			injectPendingConfirmation(thread, {
				requestId: 'req-resource',
				severity: 'info',
				message: 'Read a file',
				inputType: 'resource-decision',
				resourceDecision: {
					toolGroup: 'filesystem',
					resource: '/tmp/a.txt',
					description: 'Read /tmp/a.txt',
					options: ['denyOnce', 'allowOnce', 'allowForSession'],
				},
			});
			const confirmResourceDecision = vi
				.spyOn(thread, 'confirmResourceDecision')
				.mockResolvedValue(undefined);

			const { getByTestId } = renderComponent({ props: { kind: 'inline' } });
			// The panel's own test id replaces the one of the card.
			const card = getByTestId('instance-ai-gateway-confirmation-panel');
			expect(card).toHaveAttribute('data-thread-id', 'thread-1');
			await userEvent.click(card);

			expect(confirmResourceDecision).toHaveBeenCalledWith('req-resource', 'allowOnce');
		});

		it('confirms a channel setup through the thread and resolves it', async () => {
			injectPendingConfirmation(thread, {
				requestId: 'req-channel',
				severity: 'info',
				message: 'Set up Slack',
				channelConfig: { integrationType: 'slack', agentId: 'agent-1' },
			});
			const confirmAction = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);
			const resolveConfirmation = vi.spyOn(thread, 'resolveConfirmation');

			const { getByTestId } = renderComponent({ props: { kind: 'inline' } });
			await userEvent.click(getByTestId('mock-channel-setup'));

			expect(confirmAction).toHaveBeenCalledWith('req-channel', {
				kind: 'approval',
				approved: true,
			});
			expect(resolveConfirmation).toHaveBeenCalledWith('req-channel', 'approved');
		});

		const channelConfirmation = {
			requestId: 'req-channel',
			severity: 'info' as const,
			message: 'Set up Slack',
			channelConfig: { integrationType: 'slack', agentId: 'agent-1' },
		};

		it('retries a failed channel setup confirm once before resolving', async () => {
			injectPendingConfirmation(thread, channelConfirmation);
			const confirmAction = vi
				.spyOn(thread, 'confirmAction')
				.mockResolvedValueOnce(false)
				.mockResolvedValueOnce(true);
			const resolveConfirmation = vi.spyOn(thread, 'resolveConfirmation');

			const { getByTestId } = renderComponent({ props: { kind: 'inline' } });
			await userEvent.click(getByTestId('mock-channel-setup'));

			await waitFor(() =>
				expect(resolveConfirmation).toHaveBeenCalledWith('req-channel', 'approved'),
			);
			expect(confirmAction).toHaveBeenCalledTimes(2);
		});

		it('resolves a channel setup locally when every confirm attempt fails', async () => {
			injectPendingConfirmation(thread, channelConfirmation);
			const confirmAction = vi.spyOn(thread, 'confirmAction').mockResolvedValue(false);
			const resolveConfirmation = vi.spyOn(thread, 'resolveConfirmation');

			const { getByTestId } = renderComponent({ props: { kind: 'inline' } });
			await userEvent.click(getByTestId('mock-channel-setup'));

			await waitFor(() =>
				expect(resolveConfirmation).toHaveBeenCalledWith('req-channel', 'approved'),
			);
			expect(confirmAction).toHaveBeenCalledTimes(2);
		});

		it('ignores a channel setup answer for a request that is already resolved', async () => {
			injectPendingConfirmation(thread, channelConfirmation);
			const confirmAction = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

			const { getByTestId } = renderComponent({ props: { kind: 'inline' } });
			// Another path resolves the request in the same tick as the click, before the
			// panel removes the card.
			thread.resolvedConfirmationIds.set('req-channel', 'approved');
			await fireEvent.click(getByTestId('mock-channel-setup'));

			expect(confirmAction).not.toHaveBeenCalled();
		});

		it('defers a workflow setup through the thread', async () => {
			injectPendingConfirmation(thread, {
				requestId: 'req-setup',
				severity: 'info',
				message: 'Set up the workflow',
				setupRequests: [{ node: { name: 'Slack' } }],
			} as unknown as InstanceAiConfirmation);
			const confirmAction = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);
			const resolveConfirmation = vi.spyOn(thread, 'resolveConfirmation');

			const { getByTestId } = renderComponent({ props: { kind: 'inline' } });
			await userEvent.click(getByTestId('mock-workflow-setup-defer'));

			expect(confirmAction).toHaveBeenCalledWith('req-setup', {
				kind: 'approval',
				approved: false,
			});
			expect(resolveConfirmation).toHaveBeenCalledWith('req-setup', 'deferred');
		});
	});

	describe('text input confirmation', () => {
		it('tracks text submit with input_type and question', async () => {
			injectPendingConfirmation(thread, {
				requestId: 'req-text',
				severity: 'info',
				message: 'What name for the workflow?',
				inputType: 'text',
			});
			vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

			const { container } = renderComponent({ props: { kind: 'inline' } });
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

		it('scrubs secrets and PII from the typed answer and the question', async () => {
			injectPendingConfirmation(thread, {
				requestId: 'req-text-pii',
				severity: 'info',
				message: 'Which address should the invoice go to, jane.doe@example.com?',
				inputType: 'text',
			});
			vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

			const { container } = renderComponent({ props: { kind: 'inline' } });
			const input = container.querySelector('input[type="text"]') as HTMLInputElement;
			await userEvent.type(input, 'use billing@acme.com');
			await userEvent.keyboard('{Enter}');

			expect(mockTelemetryTrack).toHaveBeenCalledWith(
				'User finished providing input',
				expect.objectContaining({
					provided_inputs: [
						{
							label: 'Which address should the invoice go to, [REDACTED]?',
							question: 'Which address should the invoice go to, [REDACTED]?',
							input_type: 'text',
							options: [],
							option_chosen: 'use [REDACTED]',
						},
					],
				}),
			);
		});

		it('keeps the thread and instance identifiers the dashboards join on', async () => {
			injectPendingConfirmation(thread, {
				requestId: 'req-text-ids',
				severity: 'info',
				message: 'What name for the workflow?',
				inputType: 'text',
			});
			vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

			const { container } = renderComponent({ props: { kind: 'inline' } });
			const input = container.querySelector('input[type="text"]') as HTMLInputElement;
			await userEvent.type(input, 'My Workflow');
			await userEvent.keyboard('{Enter}');

			expect(mockTelemetryTrack).toHaveBeenCalledWith(
				'User finished providing input',
				expect.objectContaining({ thread_id: 'thread-1', instance_id: 'test-instance-id' }),
			);
		});

		it('tracks text skip with input_type and question', async () => {
			injectPendingConfirmation(thread, {
				requestId: 'req-text-skip',
				severity: 'info',
				message: 'Any preferences?',
				inputType: 'text',
			});
			vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

			const { container } = renderComponent({ props: { kind: 'inline' } });
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

	describe('domain access confirmation', () => {
		it('sends the decision of the domain access card through the thread', async () => {
			injectPendingConfirmation(thread, {
				requestId: 'req-domain',
				severity: 'info',
				message: 'Fetch https://example.com/a',
				domainAccess: { url: 'https://example.com/a', host: 'example.com' },
			});
			const confirmAction = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);
			const resolveConfirmation = vi.spyOn(thread, 'resolveConfirmation');

			const { getByTestId } = renderComponent({ props: { kind: 'floating' } });
			await userEvent.click(getByTestId('domain-access-allow-once'));

			expect(resolveConfirmation).toHaveBeenCalledWith('req-domain', 'approved');
			expect(confirmAction).toHaveBeenCalledWith('req-domain', {
				kind: 'domainAccessApprove',
				domainAccessAction: 'allow_once',
			});
		});

		it('resolves a denied web search as denied', async () => {
			injectPendingConfirmation(thread, {
				requestId: 'req-search',
				severity: 'info',
				message: 'Search the web',
				webSearch: { query: 'n8n release notes' },
			});
			const confirmAction = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);
			const resolveConfirmation = vi.spyOn(thread, 'resolveConfirmation');

			const { getByTestId } = renderComponent({ props: { kind: 'floating' } });
			await userEvent.click(getByTestId('domain-access-deny'));

			expect(resolveConfirmation).toHaveBeenCalledWith('req-search', 'denied');
			expect(confirmAction).toHaveBeenCalledWith('req-search', { kind: 'domainAccessDeny' });
		});
	});

	describe('continue confirmation', () => {
		it('renders a single primary button and resolves as approved', async () => {
			injectPendingConfirmation(thread, {
				requestId: 'req-continue',
				severity: 'info',
				message: 'Enter the values privately into n8n.',
				inputType: 'continue',
			});
			const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

			const { getByTestId, queryByTestId } = renderComponent({ props: { kind: 'inline' } });

			expect(queryByTestId('approval-card-allow-once')).toBeNull();
			expect(queryByTestId('approval-card-deny')).toBeNull();

			await userEvent.click(getByTestId('instance-ai-panel-continue'));

			expect(confirmSpy).toHaveBeenCalledWith('req-continue', {
				kind: 'approval',
				approved: true,
			});
			expect(mockTelemetryTrack).toHaveBeenCalledWith(
				'User finished providing input',
				expect.objectContaining({
					type: 'continue',
					provided_inputs: [
						{
							label: 'Enter the values privately into n8n.',
							options: ['continue'],
							option_chosen: 'continue',
						},
					],
					skipped_inputs: [],
				}),
			);
		});
	});

	describe('test listener confirmation', () => {
		const listenerConfirmation: InstanceAiConfirmation = {
			requestId: 'req-listen',
			severity: 'info',
			message: 'Waiting for a test request to Intake',
			testListener: {
				workflowId: 'wf-1',
				triggers: [
					{
						nodeName: 'Webhook',
						url: 'http://localhost:5678/webhook-test/abc/intake',
						method: 'POST',
					},
				],
				deadlineAt: '2026-01-01T00:10:00.000Z',
			},
		};

		it('shows the exact test URL and method with no generic approve/deny buttons', () => {
			injectPendingConfirmation(thread, listenerConfirmation);

			const { getByTestId, getByText, queryByTestId } = renderComponent({
				props: { kind: 'inline' },
			});

			expect(getByTestId('instance-ai-test-listener-url').textContent).toContain(
				'http://localhost:5678/webhook-test/abc/intake',
			);
			expect(getByText('POST')).toBeTruthy();
			expect(queryByTestId('instance-ai-panel-confirm-approve')).toBeNull();
			expect(queryByTestId('instance-ai-panel-confirm-deny')).toBeNull();
		});

		it('resumes the tool as approved when the user says the request was sent', async () => {
			injectPendingConfirmation(thread, listenerConfirmation);
			const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

			const { getByTestId } = renderComponent({ props: { kind: 'inline' } });
			await userEvent.click(getByTestId('instance-ai-test-listener-sent'));

			expect(confirmSpy).toHaveBeenCalledWith('req-listen', { kind: 'approval', approved: true });
			expect(mockTelemetryTrack).toHaveBeenCalledWith(
				'User finished providing input',
				expect.objectContaining({
					type: 'test-listener',
					provided_inputs: [
						{
							label: 'Waiting for a test request to Intake',
							options: ['sent', 'cancel'],
							option_chosen: 'sent',
						},
					],
				}),
			);
		});

		it('resumes the tool as denied when the user cancels the listener', async () => {
			injectPendingConfirmation(thread, listenerConfirmation);
			const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

			const { getByTestId } = renderComponent({ props: { kind: 'inline' } });
			await userEvent.click(getByTestId('instance-ai-test-listener-cancel'));

			expect(confirmSpy).toHaveBeenCalledWith('req-listen', { kind: 'approval', approved: false });
		});

		it('settles the card with the execution id when the test webhook push event arrives', async () => {
			injectPendingConfirmation(thread, listenerConfirmation);
			const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);
			const resolveSpy = vi.spyOn(thread, 'resolveConfirmation');
			renderComponent({ props: { kind: 'inline' } });

			capturedPushListener?.({
				type: 'testWebhookReceived',
				data: { workflowId: 'wf-other', executionId: 'exec-other' },
			});
			expect(confirmSpy).not.toHaveBeenCalled();

			capturedPushListener?.({
				type: 'testWebhookReceived',
				data: { workflowId: 'wf-1', executionId: 'exec-9' },
			});
			capturedPushListener?.({
				type: 'testWebhookReceived',
				data: { workflowId: 'wf-1', executionId: 'exec-10' },
			});

			expect(confirmSpy).toHaveBeenCalledTimes(1);
			expect(confirmSpy).toHaveBeenCalledWith('req-listen', {
				kind: 'approval',
				approved: true,
				userInput: 'exec-9',
			});
			// Telemetry and resolution run after the awaited POST, so flush it first.
			await flushPromises();
			expect(resolveSpy).toHaveBeenCalledWith('req-listen', 'approved');
			// The user made no choice, so no input telemetry is recorded.
			expect(mockTelemetryTrack).not.toHaveBeenCalledWith(
				'User finished providing input',
				expect.anything(),
			);
		});

		it('settles the card as not cancelled when the test webhook is deleted', () => {
			injectPendingConfirmation(thread, listenerConfirmation);
			const confirmSpy = vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);
			renderComponent({ props: { kind: 'inline' } });

			capturedPushListener?.({ type: 'testWebhookDeleted', data: { workflowId: 'wf-1' } });

			// No execution id: the tool reads received vs timed out from durable state.
			expect(confirmSpy).toHaveBeenCalledWith('req-listen', { kind: 'approval', approved: true });
		});

		it('keeps the card and records no input when confirmAction fails', async () => {
			injectPendingConfirmation(thread, listenerConfirmation);
			vi.spyOn(thread, 'confirmAction').mockResolvedValue(false);
			const resolveSpy = vi.spyOn(thread, 'resolveConfirmation');

			const { getByTestId } = renderComponent({ props: { kind: 'inline' } });
			await userEvent.click(getByTestId('instance-ai-test-listener-sent'));

			expect(resolveSpy).not.toHaveBeenCalled();
			expect(mockTelemetryTrack).not.toHaveBeenCalled();
			expect(getByTestId('instance-ai-test-listener')).toBeVisible();
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

		it('renders questions only in the floating mount', () => {
			injectPendingConfirmation(thread, questionsConfirmation);

			const floating = renderComponent({ props: { kind: 'floating' } });
			expect(floating.getByTestId('mock-questions')).toBeVisible();
			floating.unmount();

			const inline = renderComponent({ props: { kind: 'inline' } });
			expect(inline.queryByTestId('mock-questions')).toBeNull();
		});

		it('keeps setup metadata on the inline setup renderer', () => {
			injectPendingConfirmation(thread, {
				...questionsConfirmation,
				setupRequests: [
					{
						node: {
							name: 'Slack',
							type: 'n8n-nodes-base.slack',
							typeVersion: 2,
							parameters: {},
							position: [0, 0],
							id: 'node-1',
						},
						isTrigger: false,
					},
				],
			});

			const inline = renderComponent({ props: { kind: 'inline' } });

			expect(inline.getByTestId('mock-workflow-setup')).toBeVisible();
			expect(inline.queryByTestId('mock-questions')).toBeNull();
		});

		it('includes all available options and correct option_chosen for single-select', () => {
			injectPendingConfirmation(thread, questionsConfirmation);
			vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

			renderComponent({ props: { kind: 'floating' } });

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
					thread_id: 'thread-1',
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
			injectPendingConfirmation(thread, questionsConfirmation);
			vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

			renderComponent({ props: { kind: 'floating' } });

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
			injectPendingConfirmation(thread, questionsConfirmation);
			vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

			renderComponent({ props: { kind: 'floating' } });

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
			injectPendingConfirmation(thread, questionsConfirmation);
			vi.spyOn(thread, 'confirmAction').mockResolvedValue(true);

			renderComponent({ props: { kind: 'floating' } });

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
