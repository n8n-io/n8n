import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiConfirmationCard from '../agentsChat/InstanceAiConfirmationCard.vue';

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

// The setup cards pull in many stores. These stubs only check that the card
// hands them its submit callback and forwards what they send.
function submitStub(testId: string, body: Record<string, unknown>) {
	return {
		default: {
			props: ['submit', 'projectId'],
			template: `<button data-test-id="${testId}" :data-project-id="projectId" @click="submit(${JSON.stringify(body).replace(/"/g, "'")})" />`,
		},
	};
}

vi.mock('../InstanceAiCredentialSetup.vue', () =>
	submitStub('stub-credential-setup', {
		kind: 'credentialSelection',
		credentials: { slackApi: 'cred-1' },
	}),
);
vi.mock('../../workflowSetup/InstanceAiWorkflowSetup.vue', () =>
	submitStub('stub-workflow-setup', { kind: 'approval', approved: false }),
);
vi.mock('../InstanceAiChannelSetup.vue', () =>
	submitStub('stub-channel-setup', { kind: 'approval', approved: true }),
);
vi.mock('../InstanceAiMcpConnectCard.vue', () => ({
	default: {
		props: ['servers', 'readOnly'],
		emits: ['resolve'],
		template:
			"<button @click=\"$emit('resolve', { approved: true, connectedSlugs: ['linear'] })\" />",
	},
}));

const renderComponent = createComponentRenderer(InstanceAiConfirmationCard, {
	pinia: createTestingPinia(),
});

describe('InstanceAiConfirmationCard', () => {
	it('submits domain access through the resume callback', async () => {
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

		expect(emitted().submit).toEqual([
			[{ kind: 'domainAccessApprove', domainAccessAction: 'allow_once' }],
		]);
	});

	it('submits the continue card as an approval', async () => {
		const { getByRole, emitted } = renderComponent({
			props: {
				input: { requestId: 'req-2', message: 'Paused', inputType: 'continue' },
			},
		});

		await fireEvent.click(getByRole('button'));

		expect(emitted().submit).toEqual([[{ kind: 'approval', approved: true }]]);
	});

	it('submits only once', async () => {
		const { getByRole, emitted } = renderComponent({
			props: {
				input: { requestId: 'req-3', message: 'Paused', inputType: 'continue' },
			},
		});

		await fireEvent.click(getByRole('button'));
		await fireEvent.click(getByRole('button'));

		expect(emitted().submit).toHaveLength(1);
	});

	it('renders the approval card when no card field is set', () => {
		const { getByTestId } = renderComponent({
			props: {
				input: {
					requestId: 'req-4',
					message: 'Set up credentials',
					credentialRequests: [],
				},
			},
		});

		expect(getByTestId('instance-ai-agents-chat-approval')).toBeInTheDocument();
	});

	it('submits credential setup through the resume callback', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				input: {
					requestId: 'req-5',
					message: 'Set up credentials',
					projectId: 'project-1',
					credentialRequests: [
						{ credentialType: 'slackApi', reason: 'Post', existingCredentials: [] },
					],
				},
			},
		});

		expect(getByTestId('stub-credential-setup')).toHaveAttribute('data-project-id', 'project-1');
		await fireEvent.click(getByTestId('stub-credential-setup'));

		expect(emitted().submit).toEqual([
			[{ kind: 'credentialSelection', credentials: { slackApi: 'cred-1' } }],
		]);
	});

	it('submits workflow setup through the resume callback', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				input: {
					requestId: 'req-6',
					message: 'Set up the workflow',
					setupRequests: [
						{
							node: {
								id: 'n1',
								name: 'Slack',
								type: 'n8n-nodes-base.slack',
								typeVersion: 2,
								parameters: {},
								position: [0, 0],
							},
							isTrigger: false,
						},
					],
				},
			},
		});

		await fireEvent.click(getByTestId('stub-workflow-setup'));

		expect(emitted().submit).toEqual([[{ kind: 'approval', approved: false }]]);
	});

	it('submits the MCP connect card as an mcpConnect body', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				input: {
					requestId: 'req-7',
					message: 'Connect tools',
					mcpConnectRequest: {
						servers: [
							{
								serverSlug: 'linear',
								title: 'Linear',
								usesCredentials: [{ credentialType: 'linearOAuth2Api', name: 'OAuth', value: 'x' }],
							},
						],
					},
				},
			},
		});

		await fireEvent.click(getByTestId('instance-ai-agents-chat-mcp-connect'));

		expect(emitted().submit).toEqual([
			[{ kind: 'mcpConnect', approved: true, connectedSlugs: ['linear'] }],
		]);
	});

	it('submits channel setup through the resume callback', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				input: {
					requestId: 'req-8',
					message: 'Connect Slack',
					channelConfig: { integrationType: 'slack', agentId: 'agent-1' },
				},
			},
		});

		await fireEvent.click(getByTestId('stub-channel-setup'));

		expect(emitted().submit).toEqual([[{ kind: 'approval', approved: true }]]);
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

		expect(emitted().submit).toEqual([
			[{ kind: 'resourceDecision', resourceDecision: 'denyOnce' }],
		]);
	});

	it('submits the credential destination decision with its origin', async () => {
		const { getByText, emitted } = renderComponent({
			props: {
				input: {
					requestId: 'req-10',
					message: 'Send credential',
					credentialDestination: {
						origin: 'https://api.example.com',
						nodeNames: ['HTTP Request'],
					},
				},
			},
		});

		await fireEvent.click(getByText('Use destination'));

		expect(emitted().submit).toEqual([
			[{ kind: 'credentialDestination', approved: true, origin: 'https://api.example.com' }],
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

		beforeEach(() => {
			push.listeners = [];
		});

		it('submits a cancel as a denied approval', async () => {
			const { getByTestId, emitted } = renderComponent({ props: { input: testListenerInput } });

			await fireEvent.click(getByTestId('instance-ai-agents-chat-test-listener-cancel'));

			expect(emitted().submit).toEqual([[{ kind: 'approval', approved: false }]]);
		});

		it('settles from the test webhook push event', () => {
			const { emitted } = renderComponent({ props: { input: testListenerInput } });

			for (const listener of push.listeners) {
				listener({ type: 'testWebhookReceived', data: { workflowId: 'other', executionId: 'x' } });
				listener({ type: 'testWebhookReceived', data: { workflowId: 'wf-1', executionId: 'e-1' } });
			}

			expect(emitted().submit).toEqual([[{ kind: 'approval', approved: true, userInput: 'e-1' }]]);
		});
	});
});
