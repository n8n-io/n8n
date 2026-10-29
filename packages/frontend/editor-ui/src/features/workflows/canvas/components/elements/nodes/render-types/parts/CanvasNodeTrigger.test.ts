import { shallowRef } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import { getTooltip, hoverTooltipTrigger } from '@/__tests__/utils';
import { CHAT_TRIGGER_NODE_TYPE } from '@/app/constants';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { useTypeAvailabilityPoliciesStore } from '@n8n/frontend-module-type-availability-policies';
import { createCanvasNodeProvide } from '@/features/workflows/canvas/__tests__/utils';
import CanvasNodeTrigger from './CanvasNodeTrigger.vue';

const runEntireWorkflow = vi.hoisted(() => vi.fn());

vi.mock('@/app/composables/useRunWorkflow', () => ({
	useRunWorkflow: () => ({ runEntireWorkflow }),
}));

vi.mock('@/app/composables/useCanvasOperations', () => ({
	useCanvasOperations: () => ({ startChat: vi.fn() }),
}));

vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({}),
}));

const renderComponent = createComponentRenderer(CanvasNodeTrigger);

const renderWithCredentials = (currentUserCanUse: boolean) => {
	const pinia = createTestingPinia({ stubActions: false });
	setActivePinia(pinia);

	const documentStore = {
		documentId: 'workflow-1',
		usedCredentials: {
			'cred-1': {
				id: 'cred-1',
				name: "Alice's Gmail",
				credentialType: 'gmailOAuth2',
				currentUserCanUse,
				homeProject: { id: 'p1', name: 'Alice Chen <alice@n8n.io>', type: 'personal' },
			},
		},
		allNodes: [
			{ name: 'Gmail', credentials: { gmailOAuth2: { id: 'cred-1', name: "Alice's Gmail" } } },
		],
	};

	return renderComponent({
		pinia,
		props: {
			name: 'Schedule Trigger',
			type: 'n8n-nodes-base.scheduleTrigger',
			isExperimentalNdvActive: false,
		},
		global: {
			provide: { [WorkflowDocumentStoreKey as symbol]: shallowRef(documentStore) },
		},
	});
};

describe('CanvasNodeTrigger', () => {
	beforeEach(() => {
		runEntireWorkflow.mockReset();
	});

	describe('when the workflow uses a credential the user cannot use', () => {
		it('should disable the execute workflow button', () => {
			const { getByTestId } = renderWithCredentials(false);

			expect(getByTestId('execute-workflow-button-Schedule Trigger')).toBeDisabled();
		});

		it('should show the reason in a tooltip', async () => {
			const { getByTestId } = renderWithCredentials(false);

			await hoverTooltipTrigger(getByTestId('execute-workflow-button-Schedule Trigger'));

			await waitFor(() => expect(getTooltip()).toHaveTextContent(/Alice's Gmail/));
		});

		it('should not run the workflow when the button is clicked', async () => {
			const { getByTestId } = renderWithCredentials(false);

			await userEvent.click(getByTestId('execute-workflow-button-Schedule Trigger'));

			expect(runEntireWorkflow).not.toHaveBeenCalled();
		});
	});

	describe('when the user can run the workflow', () => {
		it('should run the workflow from this trigger when the user can use every credential', async () => {
			const { getByTestId } = renderWithCredentials(true);
			const button = getByTestId('execute-workflow-button-Schedule Trigger');

			expect(button).toBeEnabled();

			await userEvent.click(button);

			expect(runEntireWorkflow).toHaveBeenCalledWith('node', 'Schedule Trigger');
		});
	});

	describe('when the node type is restricted', () => {
		const renderRestricted = (type = 'n8n-nodes-base.slack', scope = 'instance') => {
			const pinia = createTestingPinia({ stubActions: false });
			setActivePinia(pinia);
			vi.spyOn(useTypeAvailabilityPoliciesStore(pinia), 'getNodeTypeAvailability').mockReturnValue({
				name: type,
				available: false,
				scope,
			} as never);

			return renderComponent({
				pinia,
				props: { name: 'Trigger', type, isExperimentalNdvActive: false },
				global: {
					provide: {
						...createCanvasNodeProvide({ data: { type } }),
						[WorkflowDocumentStoreKey as symbol]: shallowRef({
							documentId: 'workflow-1',
							usedCredentials: {},
							allNodes: [],
						}),
					},
				},
			});
		};

		it('should disable the execute button and not run the workflow', async () => {
			const { getByTestId } = renderRestricted();
			const button = getByTestId('execute-workflow-button-Trigger');

			expect(button).toBeDisabled();

			await userEvent.click(button);

			expect(runEntireWorkflow).not.toHaveBeenCalled();
		});

		it('should disable Open chat on a restricted chat trigger and show the scope in a tooltip', async () => {
			const { getByTestId } = renderRestricted(CHAT_TRIGGER_NODE_TYPE);
			const button = getByTestId('execute-workflow-button-Trigger');

			expect(button).toBeDisabled();

			await hoverTooltipTrigger(button);

			await waitFor(() => expect(getTooltip()).toHaveTextContent('Restricted on this instance'));
		});

		it('should show the scope in a tooltip', async () => {
			const { getByTestId } = renderRestricted('n8n-nodes-base.slack', 'project');

			await hoverTooltipTrigger(getByTestId('execute-workflow-button-Trigger'));

			await waitFor(() => expect(getTooltip()).toHaveTextContent('Restricted in this project'));
		});
	});
});
