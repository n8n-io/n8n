import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import type { InstanceAiWorkflowSetupNode } from '@n8n/api-types';
import InstanceAiWorkflowSetup from '../components/InstanceAiWorkflowSetup.vue';
import { useInstanceAiStore } from '../instanceAi.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

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

vi.mock('@/features/credentials/components/CredentialIcon.vue', () => ({
	default: {
		template: '<span data-test-id="credential-icon" />',
		props: ['credentialTypeName', 'size'],
	},
}));

vi.mock('@/features/credentials/components/NodeCredentials.vue', () => ({
	default: {
		props: ['node', 'overrideCredType', 'projectId', 'standalone', 'hideIssues'],
		emits: ['credentialSelected'],
		setup(props: { overrideCredType: string }, { emit }: { emit: Function }) {
			const onClick = () => {
				emit('credentialSelected', {
					properties: {
						credentials: { [props.overrideCredType]: { id: 'cred-123', name: 'Test Cred' } },
					},
				});
			};
			return { onClick };
		},
		template: '<div data-test-id="credential-picker" @click="onClick" />',
	},
}));

vi.mock('@/features/ndv/parameters/components/ParameterInputList.vue', () => ({
	default: {
		template: '<div data-test-id="parameter-input-list" />',
		props: ['parameters', 'nodeValues', 'isReadOnly'],
		emits: ['valueChanged'],
	},
}));

vi.mock('@/app/api/workflows', () => ({
	getWorkflow: vi.fn().mockResolvedValue({ id: 'wf-1', name: 'Test', nodes: [], connections: {} }),
}));

vi.mock('@/app/composables/useNodeHelpers', () => ({
	useNodeHelpers: () => ({
		updateNodeParameterIssuesByName: vi.fn(),
		updateNodeCredentialIssuesByName: vi.fn(),
	}),
}));

vi.mock('@/features/workflows/canvas/experimental/composables/useExpressionResolveCtx', () => ({
	useExpressionResolveCtx: () => ({}),
}));

const renderComponent = createComponentRenderer(InstanceAiWorkflowSetup);

function makeSetupNode(
	overrides: Partial<InstanceAiWorkflowSetupNode> = {},
): InstanceAiWorkflowSetupNode {
	return {
		node: {
			id: `node-${Math.random().toString(36).slice(2, 8)}`,
			name: `Node ${Math.random().toString(36).slice(2, 6)}`,
			type: 'n8n-nodes-base.slack',
			typeVersion: 1,
			parameters: {},
			position: [0, 0],
		},
		isTrigger: false,
		needsAction: true,
		...overrides,
	};
}

function makeSetupNodeWithCredentials(
	credentialType: string,
	existingCredentials: Array<{ id: string; name: string }> = [],
	overrides: Partial<InstanceAiWorkflowSetupNode> = {},
): InstanceAiWorkflowSetupNode {
	return makeSetupNode({
		credentialType,
		existingCredentials,
		...overrides,
	});
}

describe('InstanceAiWorkflowSetup', () => {
	let store: ReturnType<typeof useInstanceAiStore>;

	beforeEach(() => {
		const pinia = createTestingPinia({ stubActions: false });
		setActivePinia(pinia);
		store = useInstanceAiStore();

		const credentialsStore = useCredentialsStore();
		vi.spyOn(credentialsStore, 'fetchAllCredentials').mockResolvedValue([]);
		vi.spyOn(credentialsStore, 'fetchCredentialTypes').mockResolvedValue(undefined);
		// @ts-expect-error Known pinia issue when spying on store getters
		vi.spyOn(credentialsStore, 'getUsableCredentialByType', 'get').mockReturnValue(() => []);

		const nodeTypesStore = useNodeTypesStore();
		vi.spyOn(nodeTypesStore, 'getNodesInformation').mockResolvedValue([]);

		const workflowsStore = useWorkflowsStore();
		workflowsStore.getNodeByName = vi.fn().mockReturnValue(undefined);
	});

	describe('handleLater in wizard mode', () => {
		it('clears selection for current card and advances to next step', async () => {
			const requests = [
				makeSetupNodeWithCredentials('slackApi', [
					{ id: 'cred-1', name: 'Slack Cred' },
					{ id: 'cred-2', name: 'Slack Cred 2' },
				]),
				makeSetupNodeWithCredentials('githubApi', [
					{ id: 'cred-3', name: 'GitHub Cred' },
					{ id: 'cred-4', name: 'GitHub Cred 2' },
				]),
				makeSetupNodeWithCredentials('notionApi', [
					{ id: 'cred-5', name: 'Notion Cred' },
					{ id: 'cred-6', name: 'Notion Cred 2' },
				]),
			];

			const { getByTestId, getByText } = renderComponent({
				props: {
					requestId: 'req-1',
					setupRequests: requests,
					workflowId: 'wf-1',
					message: 'Set up workflow',
				},
			});

			// Should be on step 1 of 3
			expect(getByText('1 of 3')).toBeTruthy();

			// Click Later — should skip step 1 and go to step 2
			await userEvent.click(getByTestId('instance-ai-workflow-setup-later'));

			expect(getByText('2 of 3')).toBeTruthy();
		});

		it('skips multiple steps when clicking Later repeatedly', async () => {
			const requests = [
				makeSetupNodeWithCredentials('slackApi', [
					{ id: 'cred-1', name: 'Slack' },
					{ id: 'cred-2', name: 'Slack 2' },
				]),
				makeSetupNodeWithCredentials('githubApi', [
					{ id: 'cred-3', name: 'GitHub' },
					{ id: 'cred-4', name: 'GitHub 2' },
				]),
				makeSetupNodeWithCredentials('notionApi', [
					{ id: 'cred-5', name: 'Notion' },
					{ id: 'cred-6', name: 'Notion 2' },
				]),
			];

			const { getByTestId, getByText } = renderComponent({
				props: {
					requestId: 'req-1',
					setupRequests: requests,
					workflowId: 'wf-1',
					message: 'Set up workflow',
				},
			});

			expect(getByText('1 of 3')).toBeTruthy();

			// Skip step 1
			await userEvent.click(getByTestId('instance-ai-workflow-setup-later'));
			expect(getByText('2 of 3')).toBeTruthy();

			// Skip step 2
			await userEvent.click(getByTestId('instance-ai-workflow-setup-later'));
			expect(getByText('3 of 3')).toBeTruthy();
		});

		it('defers the whole setup when clicking Later on the last step with no cards completed', async () => {
			const confirmSpy = vi.spyOn(store, 'confirmAction').mockResolvedValue(true);
			const resolveSpy = vi.spyOn(store, 'resolveConfirmation');

			const requests = [
				makeSetupNodeWithCredentials('slackApi', [
					{ id: 'cred-1', name: 'Slack' },
					{ id: 'cred-2', name: 'Slack 2' },
				]),
			];

			const { getByTestId, getByText } = renderComponent({
				props: {
					requestId: 'req-1',
					setupRequests: requests,
					workflowId: 'wf-1',
					message: 'Set up workflow',
				},
			});

			// Only 1 step, so clicking Later on last step with nothing completed should defer
			await userEvent.click(getByTestId('instance-ai-workflow-setup-later'));

			expect(resolveSpy).toHaveBeenCalledWith('req-1', 'deferred');
			expect(confirmSpy).toHaveBeenCalledWith('req-1', false);
			expect(getByText('instanceAi.workflowSetup.deferred')).toBeTruthy();
		});

		it('auto-applies partial set when clicking Later on last step with some cards completed', async () => {
			const confirmSpy = vi.spyOn(store, 'confirmAction').mockResolvedValue(true);
			vi.spyOn(store, 'findToolCallByRequestId').mockReturnValue({
				toolCallId: 'tc-1',
				toolName: 'test',
				args: {},
				isLoading: false,
				result: { success: true, partial: true, updatedNodes: [] },
			});

			const requests = [
				makeSetupNodeWithCredentials('slackApi', [{ id: 'cred-1', name: 'Slack' }]),
				makeSetupNodeWithCredentials('githubApi', [
					{ id: 'cred-3', name: 'GitHub' },
					{ id: 'cred-4', name: 'GitHub 2' },
				]),
			];

			const { getByTestId } = renderComponent({
				props: {
					requestId: 'req-1',
					setupRequests: requests,
					workflowId: 'wf-1',
					message: 'Set up workflow',
				},
			});

			// First card auto-selects (only 1 existing credential), auto-advances to step 2
			// We should be at step 2 now. Click Later to skip it.
			// Since card 1 is complete, it should auto-apply.
			await userEvent.click(getByTestId('instance-ai-workflow-setup-later'));

			expect(confirmSpy).toHaveBeenCalledWith(
				'req-1',
				true,
				undefined,
				undefined,
				undefined,
				undefined,
				undefined,
				expect.objectContaining({ action: 'apply' }),
			);
		});
	});

	describe('handleLater in confirm mode (allPreResolved)', () => {
		it('defers the whole setup when all items are pre-resolved', async () => {
			const confirmSpy = vi.spyOn(store, 'confirmAction').mockResolvedValue(true);
			const resolveSpy = vi.spyOn(store, 'resolveConfirmation');

			const requests = [
				makeSetupNodeWithCredentials('slackApi', [{ id: 'cred-1', name: 'Slack' }], {
					needsAction: false,
				}),
			];

			const { getByTestId, getByText } = renderComponent({
				props: {
					requestId: 'req-1',
					setupRequests: requests,
					workflowId: 'wf-1',
					message: 'Set up workflow',
				},
			});

			// In confirm mode, the "Later" button should defer everything
			await userEvent.click(getByTestId('instance-ai-workflow-setup-later'));

			expect(resolveSpy).toHaveBeenCalledWith('req-1', 'deferred');
			expect(confirmSpy).toHaveBeenCalledWith('req-1', false);
			expect(getByText('instanceAi.workflowSetup.deferred')).toBeTruthy();
		});
	});

	describe('wizard navigation', () => {
		it('shows step counter and navigates with arrows', async () => {
			const requests = [
				makeSetupNodeWithCredentials('slackApi', [
					{ id: 'cred-1', name: 'Slack' },
					{ id: 'cred-2', name: 'Slack 2' },
				]),
				makeSetupNodeWithCredentials('githubApi', [
					{ id: 'cred-3', name: 'GitHub' },
					{ id: 'cred-4', name: 'GitHub 2' },
				]),
			];

			const { getByTestId, getByText } = renderComponent({
				props: {
					requestId: 'req-1',
					setupRequests: requests,
					workflowId: 'wf-1',
					message: 'Set up workflow',
				},
			});

			expect(getByText('1 of 2')).toBeTruthy();

			await userEvent.click(getByTestId('instance-ai-workflow-setup-next'));
			expect(getByText('2 of 2')).toBeTruthy();

			await userEvent.click(getByTestId('instance-ai-workflow-setup-prev'));
			expect(getByText('1 of 2')).toBeTruthy();
		});

		it('disables apply button when no card is completed', () => {
			const requests = [
				makeSetupNodeWithCredentials('slackApi', [
					{ id: 'cred-1', name: 'Slack' },
					{ id: 'cred-2', name: 'Slack 2' },
				]),
			];

			const { getByTestId } = renderComponent({
				props: {
					requestId: 'req-1',
					setupRequests: requests,
					workflowId: 'wf-1',
					message: 'Set up workflow',
				},
			});

			expect(getByTestId('instance-ai-workflow-setup-apply-button')).toBeDisabled();
		});
	});

	describe('confirm mode', () => {
		it('shows confirm card when all items are pre-resolved', () => {
			const requests = [
				makeSetupNodeWithCredentials('slackApi', [{ id: 'cred-1', name: 'Slack' }], {
					needsAction: false,
				}),
			];

			const { getByTestId } = renderComponent({
				props: {
					requestId: 'req-1',
					setupRequests: requests,
					workflowId: 'wf-1',
					message: 'Set up workflow',
				},
			});

			expect(getByTestId('instance-ai-workflow-setup-confirm')).toBeTruthy();
		});

		it('switches to full wizard when "Review details" is clicked', async () => {
			const requests = [
				makeSetupNodeWithCredentials('slackApi', [{ id: 'cred-1', name: 'Slack' }], {
					needsAction: false,
				}),
			];

			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					requestId: 'req-1',
					setupRequests: requests,
					workflowId: 'wf-1',
					message: 'Set up workflow',
				},
			});

			expect(getByTestId('instance-ai-workflow-setup-confirm')).toBeTruthy();

			await userEvent.click(getByTestId('instance-ai-workflow-setup-review-details'));

			// Should now show the wizard card instead of confirm
			expect(queryByTestId('instance-ai-workflow-setup-confirm')).toBeNull();
			expect(getByTestId('instance-ai-workflow-setup-card')).toBeTruthy();
		});

		it('clicking Later in review-details wizard mode skips only the current step', async () => {
			const requests = [
				makeSetupNodeWithCredentials(
					'slackApi',
					[
						{ id: 'cred-1', name: 'Slack' },
						{ id: 'cred-2', name: 'Slack 2' },
					],
					{ needsAction: false },
				),
				makeSetupNodeWithCredentials(
					'githubApi',
					[
						{ id: 'cred-3', name: 'GitHub' },
						{ id: 'cred-4', name: 'GitHub 2' },
					],
					{ needsAction: false },
				),
			];

			const { getByTestId, getByText } = renderComponent({
				props: {
					requestId: 'req-1',
					setupRequests: requests,
					workflowId: 'wf-1',
					message: 'Set up workflow',
				},
			});

			// Switch to full wizard
			await userEvent.click(getByTestId('instance-ai-workflow-setup-review-details'));

			expect(getByText('1 of 2')).toBeTruthy();

			// Click Later — should advance to step 2, not defer
			await userEvent.click(getByTestId('instance-ai-workflow-setup-later'));
			expect(getByText('2 of 2')).toBeTruthy();
		});
	});
});
