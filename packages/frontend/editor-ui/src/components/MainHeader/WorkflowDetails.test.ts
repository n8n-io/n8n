import WorkflowDetails from '@/components/MainHeader/WorkflowDetails.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { EnterpriseEditionFeature, STORES, WORKFLOW_SHARE_MODAL_KEY } from '@/constants';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { useUIStore } from '@/stores/ui.store';
import { useRoute } from 'vue-router';
import type { Mock } from 'vitest';

vi.mock('vue-router', async (importOriginal) => ({
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	...(await importOriginal<typeof import('vue-router')>()),
	useRoute: vi.fn().mockReturnValue({}),
	useRouter: vi.fn(() => ({
		replace: vi.fn(),
	})),
}));

vi.mock('@/stores/pushConnection.store', () => ({
	usePushConnectionStore: vi.fn().mockReturnValue({
		isConnected: true,
	}),
}));

const initialState = {
	[STORES.SETTINGS]: {
		settings: {
			enterprise: {
				[EnterpriseEditionFeature.Sharing]: true,
				[EnterpriseEditionFeature.WorkflowHistory]: true,
			},
		},
		areTagsEnabled: true,
	},
	[STORES.TAGS]: {
		tagsById: {
			1: {
				id: '1',
				name: 'tag1',
			},
			2: {
				id: '2',
				name: 'tag2',
			},
		},
	},
};

const renderComponent = createComponentRenderer(WorkflowDetails, {
	pinia: createTestingPinia({ initialState }),
	global: {
		stubs: {
			RouterLink: true,
			FolderBreadcrumbs: {
				template: '<div><slot name="append" /></div>',
			},
		},
	},
});

let uiStore: ReturnType<typeof useUIStore>;
const workflow = {
	id: '1',
	name: 'Test Workflow',
	tags: ['1', '2'],
	active: false,
};

describe('WorkflowDetails', () => {
	beforeEach(() => {
		uiStore = useUIStore();
	});
	it('renders workflow name and tags', async () => {
		(useRoute as Mock).mockReturnValue({
			query: { parentFolderId: '1' },
		});
		const { getByTestId, getByText } = renderComponent({
			props: {
				...workflow,
				readOnly: false,
			},
		});

		const workflowName = getByTestId('workflow-name-input');
		const workflowNameInput = workflowName.querySelector('input');

		expect(workflowNameInput).toHaveValue('Test Workflow');
		expect(getByText('tag1')).toBeInTheDocument();
		expect(getByText('tag2')).toBeInTheDocument();
	});

	it('calls save function on save button click', async () => {
		const onSaveButtonClick = vi.fn();
		const { getByTestId } = renderComponent({
			props: {
				...workflow,
				readOnly: false,
			},
			global: {
				mocks: {
					onSaveButtonClick,
				},
			},
		});

		await userEvent.click(getByTestId('workflow-save-button'));
		expect(onSaveButtonClick).toHaveBeenCalled();
	});

	it('opens share modal on share button click', async () => {
		const openModalSpy = vi.spyOn(uiStore, 'openModalWithData');

		const { getByTestId } = renderComponent({
			props: {
				...workflow,
				readOnly: false,
			},
		});

		await userEvent.click(getByTestId('workflow-share-button'));
		expect(openModalSpy).toHaveBeenCalledWith({
			name: WORKFLOW_SHARE_MODAL_KEY,
			data: { id: '1' },
		});
	});
});
