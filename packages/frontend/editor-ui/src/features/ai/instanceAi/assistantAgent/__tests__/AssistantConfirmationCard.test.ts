import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import { nextTick } from 'vue';

import { createComponentRenderer } from '@/__tests__/render';

import { ASSISTANT_AGENT_PROJECT_ID } from '../assistantAgentThreads';
import AssistantConfirmationCard from '../AssistantConfirmationCard.vue';
import type { AssistantConfirmationInput } from '../assistantConfirmation';
import { ASSISTANT_AGENT_THREAD_ID } from '../assistantAgentThreads';

const { telemetryTrack } = vi.hoisted(() => ({ telemetryTrack: vi.fn() }));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrack }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ instanceId: 'test-instance-id' }),
}));

const push = vi.hoisted(() => ({
	listeners: [] as Array<(event: { type: string; data: Record<string, unknown> }) => void>,
}));

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({
		addEventListener: (listener: (typeof push.listeners)[number]) => {
			push.listeners.push(listener);
			return () => {
				push.listeners = push.listeners.filter((l) => l !== listener);
			};
		},
	}),
}));

vi.mock('../../components/InstanceAiMcpConnectCard.vue', () => ({
	default: {
		props: ['servers', 'readOnly'],
		emits: ['resolve'],
		template:
			'<button data-test-id="stub-mcp-connect" @click="$emit(\'resolve\', { approved: true, connectedSlugs: [\'linear\'] })" />',
	},
}));

// The setup cards pull in many stores. These stubs check that the card hands them
// the project, and resumes with the answer that they emit.
function eventStub(testId: string, emitExpression: string) {
	return {
		default: {
			props: ['projectId', 'threadId', 'inputThreadId', 'outcome'],
			template: `<button data-test-id="${testId}" :data-project-id="projectId" @click="${emitExpression}" />`,
		},
	};
}

vi.mock('../../components/InstanceAiCredentialSetup.vue', () =>
	eventStub(
		'stub-credential-setup',
		"$emit('decide', { kind: 'credentialSelection', credentials: { slackApi: 'cred-1' } }, 'approved')",
	),
);
vi.mock('../../workflowSetup/InstanceAiWorkflowSetup.vue', () => ({
	default: {
		props: ['projectId', 'threadId', 'inputThreadId', 'outcome'],
		template: `<div>
			<button data-test-id="stub-workflow-setup" :data-project-id="projectId" @click="$emit('defer')" />
			<button data-test-id="stub-workflow-setup-apply" @click="$emit('apply', { nodeCredentials: { Slack: { slackApi: 'cred-1' } } })" />
			<span data-test-id="stub-workflow-setup-outcome">{{ outcome?.state }}</span>
		</div>`,
	},
}));
vi.mock('../../components/InstanceAiChannelSetup.vue', () =>
	eventStub('stub-channel-setup', "$emit('decide', true)"),
);

vi.mock('../../components/InstanceAiQuestions.vue', () => ({
	default: {
		props: ['questions', 'introMessage', 'disabled'],
		emits: ['submit'],
		template:
			"<button data-test-id=\"stub-questions\" @click=\"$emit('submit', [{ questionId: 'q1', question: 'Which?', selectedOptions: ['a'] }])\" />",
	},
}));

/** The resume data of each submit, without the `onAccepted` callback that the card passes along. */
function sent(submits: unknown[] | undefined) {
	return ((submits ?? []) as unknown[][]).map(([resumeData]) => [resumeData]);
}

const renderComponent = createComponentRenderer(AssistantConfirmationCard, {
	pinia: createTestingPinia(),
});

describe('AssistantConfirmationCard', () => {
	beforeEach(() => {
		push.listeners = [];
		telemetryTrack.mockReset();
	});

	it('submits the answers of a questions card', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				input: {
					requestId: 'req-q',
					message: 'A few questions',
					inputType: 'questions',
					questions: [{ id: 'q1', question: 'Which?', type: 'single', options: ['a', 'b'] }],
				},
			},
		});

		await fireEvent.click(getByTestId('assistant-agent-questions'));

		expect(sent(emitted().submit)).toEqual([
			[{ kind: 'questions', answers: [{ questionId: 'q1', selectedOptions: ['a'] }] }],
		]);
	});

	it('submits domain access through the resume data, not a thread', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				input: {
					requestId: 'req-1',
					message: 'Allow access?',
					domainAccess: { url: 'https://example.com/a', host: 'example.com' },
				},
			},
		});

		await fireEvent.click(getByTestId('domain-access-allow-once'));

		expect(sent(emitted().submit)).toEqual([
			[{ kind: 'domainAccessApprove', domainAccessAction: 'allow_once' }],
		]);
	});

	describe('a sent answer', () => {
		const continueInput = { requestId: 'req-2', message: 'Paused', inputType: 'continue' as const };

		it('submits the continue card as an approval, once while the chat sends it', async () => {
			const { getByTestId, emitted, rerender } = renderComponent({
				props: { input: continueInput },
			});

			await fireEvent.click(getByTestId('assistant-agent-continue'));
			// The chat marks the card resolved while it sends the answer.
			await rerender({ input: continueInput, disabled: true });
			await fireEvent.click(getByTestId('assistant-agent-continue'));

			expect(sent(emitted().submit)).toEqual([[{ kind: 'approval', approved: true }]]);
		});

		it('can be answered again when the chat is busy and refuses the answer', async () => {
			const { getByTestId, emitted } = renderComponent({ props: { input: continueInput } });

			await fireEvent.click(getByTestId('assistant-agent-continue'));
			await nextTick();

			expect(getByTestId('assistant-agent-continue')).toBeEnabled();
			await fireEvent.click(getByTestId('assistant-agent-continue'));
			expect(emitted().submit).toHaveLength(2);
		});

		it('resets the inner card when the chat refuses the answer', async () => {
			const questionsInput = {
				requestId: 'req-q2',
				message: 'A few questions',
				inputType: 'questions' as const,
				questions: [{ id: 'q1', question: 'Which?', type: 'single' as const, options: ['a', 'b'] }],
			};
			const { getByTestId, emitted } = renderComponent({ props: { input: questionsInput } });
			const firstQuestions = getByTestId('assistant-agent-questions');

			// The chat is busy: it keeps the card, so the inner card remounts with no answer.
			await fireEvent.click(firstQuestions);
			await nextTick();

			const secondQuestions = getByTestId('assistant-agent-questions');
			expect(secondQuestions).not.toBe(firstQuestions);
			await fireEvent.click(secondQuestions);
			expect(emitted().submit).toHaveLength(2);
		});
	});

	it('submits the typed answer of a text card', async () => {
		const { getByTestId, getByPlaceholderText, emitted } = renderComponent({
			props: { input: { requestId: 'req-t', message: 'What is the channel?', inputType: 'text' } },
		});

		await fireEvent.update(getByPlaceholderText('Type your answer...'), '#general');
		await fireEvent.click(getByTestId('assistant-agent-text-submit'));

		expect(sent(emitted().submit)).toEqual([
			[{ kind: 'approval', approved: true, userInput: '#general' }],
		]);
	});

	it('offers always allow for a scoped tool and submits a session approval', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				input: {
					requestId: 'req-aa',
					message: 'Run the workflow',
					severity: 'info',
					toolName: 'workflow_builder_executions',
					args: { action: 'run', workflowId: 'wf-1' },
				},
			},
		});

		await fireEvent.click(getByTestId('approval-card-always-allow'));

		expect(sent(emitted().submit)).toEqual([
			[{ kind: 'approval', approved: true, scope: 'session' }],
		]);
	});

	it('titles a plain approval with the tool phrase and shows the details, not the raw arguments', () => {
		const { getByTestId } = renderComponent({
			props: {
				input: {
					requestId: 'req-run',
					message: 'Run this workflow live',
					severity: 'warning',
					toolName: 'workflow_builder_executions',
					args: { action: 'run', workflowId: 'wf-1' },
					resourceName: 'Daily weather',
					approvalDetails: { action: 'run-workflow', summary: 'Fetch the forecast' },
				},
			},
		});

		const card = getByTestId('assistant-agent-approval');
		expect(card).toHaveTextContent('Assistant wants to run Daily weather');
		expect(card).toHaveTextContent('Fetch the forecast');
		expect(card).not.toHaveTextContent('workflowId');
	});

	it('does not offer always allow for a destructive action', () => {
		const { queryByTestId } = renderComponent({
			props: {
				input: {
					requestId: 'req-d',
					message: 'Delete the workflow',
					severity: 'destructive',
					toolName: 'workflow_builder_workflows',
					args: { action: 'delete', workflowId: 'wf-1' },
				},
			},
		});

		expect(queryByTestId('approval-card-always-allow')).not.toBeInTheDocument();
	});

	it('submits the MCP connect card as an mcpConnect body', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				input: {
					requestId: 'req-7',
					message: 'Connect tools',
					mcpConnectRequest: { servers: [] },
				},
			},
		});

		await fireEvent.click(getByTestId('assistant-agent-mcp-connect'));

		expect(sent(emitted().submit)).toEqual([
			[{ kind: 'mcpConnect', approved: true, connectedSlugs: ['linear'] }],
		]);
	});

	it('submits the credential destination decision with its origin', async () => {
		const { getByText, emitted } = renderComponent({
			props: {
				input: {
					requestId: 'req-10',
					message: 'Send credential',
					credentialDestination: { origin: 'https://api.example.com', nodeNames: ['HTTP Request'] },
				},
			},
		});

		await fireEvent.click(getByText('Use destination'));

		expect(sent(emitted().submit)).toEqual([
			[{ kind: 'credentialDestination', approved: true, origin: 'https://api.example.com' }],
		]);
	});

	// Minimal payloads: the card only needs each field to choose its setup variant.
	it.each<[string, string, Record<string, unknown>, Record<string, unknown>]>([
		[
			'workflow setup',
			'stub-workflow-setup',
			{ setupRequests: [{ id: 'x' }] },
			{ kind: 'approval', approved: false },
		],
		[
			'credential setup',
			'stub-credential-setup',
			{ credentialRequests: [{ credentialType: 'slackApi' }] },
			{ kind: 'credentialSelection', credentials: { slackApi: 'cred-1' } },
		],
		[
			'channel setup',
			'stub-channel-setup',
			{ channelConfig: { integrationType: 'slack', agentId: 'agent-1' } },
			{ kind: 'approval', approved: true },
		],
	])(
		'submits %s through the resume data, in the thread project',
		async (_name, testId, fields, body) => {
			const input = { requestId: 'req-s', message: 'Set up Slack', ...fields };
			const { getByTestId, emitted } = renderComponent({
				props: { input: input as AssistantConfirmationInput },
				global: { provide: { [ASSISTANT_AGENT_PROJECT_ID as symbol]: 'project-thread' } },
			});

			expect(getByTestId(testId)).toHaveAttribute('data-project-id', 'project-thread');
			await fireEvent.click(getByTestId(testId));

			expect(sent(emitted().submit)).toEqual([[body]]);
		},
	);

	it('resumes with the workflow setup apply, and settles the setup card', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				input: {
					requestId: 'req-w',
					message: 'Set up the workflow',
					setupRequests: [{ node: { name: 'Slack' } }],
				} as unknown as AssistantConfirmationInput,
			},
		});

		await fireEvent.click(getByTestId('stub-workflow-setup-apply'));

		expect(sent(emitted().submit)).toEqual([
			[{ kind: 'setupWorkflowApply', nodeCredentials: { Slack: { slackApi: 'cred-1' } } }],
		]);
		expect(getByTestId('stub-workflow-setup-outcome')).toHaveTextContent('applied');
	});

	it('submits a gateway resource decision', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				input: {
					requestId: 'req-9',
					message: 'Read a file',
					inputType: 'resource-decision',
					resourceDecision: {
						toolGroup: 'filesystem',
						resource: '/tmp/a.txt',
						description: 'Read /tmp/a.txt',
						options: ['denyOnce', 'allowOnce', 'allowForSession'],
					},
				},
			},
		});

		await fireEvent.click(getByTestId('gateway-decision-deny'));

		expect(sent(emitted().submit)).toEqual([
			[{ kind: 'resourceDecision', resourceDecision: 'denyOnce' }],
		]);
	});

	describe('test listener', () => {
		const testListenerInput = {
			requestId: 'req-11',
			message: 'Send a test request',
			testListener: {
				workflowId: 'wf-1',
				deadlineAt: new Date().toISOString(),
				triggers: [{ nodeName: 'Webhook', method: 'POST', url: 'https://n8n.test/webhook-test/a' }],
			},
		};

		it('submits a cancel as a denied approval', async () => {
			const { getByTestId, emitted } = renderComponent({ props: { input: testListenerInput } });

			await fireEvent.click(getByTestId('assistant-agent-test-listener-cancel'));

			expect(sent(emitted().submit)).toEqual([[{ kind: 'approval', approved: false }]]);
		});

		it('settles from the test webhook push event of its workflow', () => {
			const { emitted } = renderComponent({ props: { input: testListenerInput } });

			for (const listener of push.listeners) {
				listener({ type: 'testWebhookReceived', data: { workflowId: 'other', executionId: 'x' } });
				listener({ type: 'testWebhookReceived', data: { workflowId: 'wf-1', executionId: 'e-1' } });
			}

			expect(sent(emitted().submit)).toEqual([
				[{ kind: 'approval', approved: true, userInput: 'e-1' }],
			]);
		});
	});

	describe('telemetry', () => {
		/** Renders the card in the open thread. `accept` runs the callback that the chat runs once the server accepts the answer. */
		function renderInThread(input: AssistantConfirmationInput) {
			const result = renderComponent({
				props: { input },
				global: { provide: { [ASSISTANT_AGENT_THREAD_ID]: 'thread-1' } },
			});
			const lastOnAccepted = () => {
				const submits = result.emitted().submit as Array<[unknown, (() => void) | undefined]>;
				return submits.at(-1)?.[1];
			};
			return { ...result, lastOnAccepted, accept: () => lastOnAccepted()?.() };
		}

		const runApproval: AssistantConfirmationInput = {
			requestId: 'req-aa',
			inputThreadId: 'input-thread-1',
			message: 'Run the workflow',
			severity: 'info',
			toolName: 'workflow_builder_executions',
			args: { action: 'run', workflowId: 'wf-1' },
		};

		it('tracks an approval with the same event as the current Assistant once the server accepts it', async () => {
			const { getByTestId, accept } = renderInThread(runApproval);

			await fireEvent.click(getByTestId('approval-card-allow-once'));
			expect(telemetryTrack).not.toHaveBeenCalled();
			accept();

			expect(telemetryTrack).toHaveBeenCalledTimes(1);
			expect(telemetryTrack).toHaveBeenCalledWith('User finished providing input', {
				thread_id: 'thread-1',
				input_thread_id: 'input-thread-1',
				instance_id: 'test-instance-id',
				action_source: 'unknown',
				type: 'approval',
				runtime: 'agents',
				provided_inputs: [
					{
						label: 'Run the workflow',
						options: ['approve', 'deny', 'approve_always'],
						option_chosen: 'approve',
					},
				],
				skipped_inputs: [],
			});
		});

		it('tracks always allow as approve_always', async () => {
			const { getByTestId, accept } = renderInThread(runApproval);

			await fireEvent.click(getByTestId('approval-card-always-allow'));
			accept();

			expect(telemetryTrack).toHaveBeenCalledWith(
				'User finished providing input',
				expect.objectContaining({
					provided_inputs: [expect.objectContaining({ option_chosen: 'approve_always' })],
				}),
			);
		});

		it('tracks the answers of a questions card with the number of questions', async () => {
			const { getByTestId, accept } = renderInThread({
				requestId: 'req-q',
				message: 'A few questions',
				inputType: 'questions',
				questions: [{ id: 'q1', question: 'Which?', type: 'single', options: ['a', 'b'] }],
			});

			await fireEvent.click(getByTestId('assistant-agent-questions'));
			accept();

			expect(telemetryTrack).toHaveBeenCalledWith(
				'User finished providing input',
				expect.objectContaining({
					type: 'questions',
					provided_inputs: [
						{
							label: 'q1',
							question: 'Which?',
							input_type: 'single',
							options: ['a', 'b'],
							option_chosen: 'a',
						},
					],
					skipped_inputs: [],
					num_tasks: 1,
				}),
			);
		});

		it('tracks a skipped text card as a skipped input', async () => {
			const { getByText, accept } = renderInThread({
				requestId: 'req-t',
				message: 'What is the channel?',
				inputType: 'text',
			});

			await fireEvent.click(getByText('Skip'));
			accept();

			expect(telemetryTrack).toHaveBeenCalledWith(
				'User finished providing input',
				expect.objectContaining({
					type: 'text',
					provided_inputs: [],
					skipped_inputs: [
						{
							label: 'What is the channel?',
							question: 'What is the channel?',
							input_type: 'text',
							options: [],
						},
					],
				}),
			);
		});

		it('does not track an answer that the server has not accepted, such as a refused or failed send', async () => {
			const { getByTestId } = renderInThread({
				requestId: 'req-2',
				message: 'Paused',
				inputType: 'continue',
			});

			await fireEvent.click(getByTestId('assistant-agent-continue'));
			await nextTick();

			expect(telemetryTrack).not.toHaveBeenCalled();
		});

		it('does not track a test listener that a push event settles', () => {
			const { lastOnAccepted } = renderInThread({
				requestId: 'req-11',
				message: 'Send a test request',
				testListener: {
					workflowId: 'wf-1',
					deadlineAt: new Date().toISOString(),
					triggers: [
						{ nodeName: 'Webhook', method: 'POST', url: 'https://n8n.test/webhook-test/a' },
					],
				},
			});

			for (const listener of push.listeners) {
				listener({ type: 'testWebhookReceived', data: { workflowId: 'wf-1', executionId: 'e-1' } });
			}

			expect(lastOnAccepted()).toBeUndefined();
		});

		it('tracks the servers that an MCP connect card offered and connected', async () => {
			const { getByTestId, accept } = renderInThread({
				requestId: 'req-mcp',
				message: 'Connect Linear',
				mcpConnectRequest: {
					servers: [
						{
							serverSlug: 'linear',
							title: 'Linear',
							usesCredentials: [
								{ credentialType: 'linearOAuth2Api', name: 'OAuth2', value: 'oAuth2' },
							],
						},
					],
				},
			});

			await fireEvent.click(getByTestId('assistant-agent-mcp-connect'));
			accept();

			expect(telemetryTrack).toHaveBeenCalledWith(
				'User finished providing input',
				expect.objectContaining({
					type: 'mcp-connect',
					runtime: 'agents',
					provided_inputs: [
						{ label: 'mcp-connect', options: ['linear'], option_chosen: ['linear'] },
					],
					skipped_inputs: [],
				}),
			);
		});

		it('does not track domain access, like the current Assistant', async () => {
			const { getByTestId, lastOnAccepted } = renderInThread({
				requestId: 'req-1',
				message: 'Allow access?',
				domainAccess: { url: 'https://example.com/a', host: 'example.com' },
			});

			await fireEvent.click(getByTestId('domain-access-allow-once'));

			expect(lastOnAccepted()).toBeUndefined();
		});
	});
});
