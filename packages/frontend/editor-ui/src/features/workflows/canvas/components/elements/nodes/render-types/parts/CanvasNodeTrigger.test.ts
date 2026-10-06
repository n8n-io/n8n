import { shallowRef } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import { getTooltip, hoverTooltipTrigger } from '@/__tests__/utils';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { useSettingsStore } from '@n8n/stores/settings.store';
import CanvasNodeTrigger from './CanvasNodeTrigger.vue';

const runEntireWorkflow = vi.fn();

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

const renderWithCredentials = (currentUserCanUse: boolean, sharingEnabled = true) => {
	const pinia = createTestingPinia({ stubActions: false });
	setActivePinia(pinia);
	useSettingsStore().settings.granularCredentialSharing = sharingEnabled;

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

		it('should keep the button enabled when credential sharing is off', () => {
			const { getByTestId } = renderWithCredentials(false, false);

			expect(getByTestId('execute-workflow-button-Schedule Trigger')).toBeEnabled();
		});
	});
});
