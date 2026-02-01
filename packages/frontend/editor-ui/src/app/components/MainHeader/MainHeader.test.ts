import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { createTestingPinia } from '@pinia/testing';
import MainHeader from '@/app/components/MainHeader/MainHeader.vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useCollaborationStore } from '@/features/collaboration/collaboration/collaboration.store';
import { STORES } from '@n8n/stores';

vi.mock('@n8n/permissions', () => ({
	getResourcePermissions: vi.fn(() => ({
		workflow: {
			update: true,
			execute: true,
		},
	})),
}));

vi.mock('vue-router', async (importOriginal) => ({
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	...(await importOriginal<typeof import('vue-router')>()),
	useRoute: vi.fn().mockReturnValue({
		params: { name: 'test' },
		query: {},
		meta: {
			nodeView: true,
		},
	}),
	useRouter: vi.fn().mockReturnValue({
		push: vi.fn(),
		replace: vi.fn(),
		currentRoute: {
			value: {
				params: { name: 'test' },
				query: {},
			},
		},
	}),
}));

vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: vi.fn().mockReturnValue({
		isConnected: true,
		addEventListener: vi.fn().mockReturnValue(() => {}),
	}),
}));

vi.mock('@/app/composables/useToast', () => {
	const showError = vi.fn();
	const showMessage = vi.fn();
	const showToast = vi.fn();
	return {
		useToast: () => ({
			showError,
			showMessage,
			showToast,
		}),
	};
});

const initialState = {
	[STORES.SETTINGS]: {
		settings: {
			enterprise: {},
		},
	},
};

const renderComponent = createComponentRenderer(MainHeader, {
	pinia: createTestingPinia({ initialState }),
	global: {
		stubs: {
			WorkflowDetails: {
				props: [
					'id',
					'tags',
					'name',
					'meta',
					'scopes',
					'active',
					'currentFolder',
					'isArchived',
					'description',
				],
				template: '<div data-test-id="workflow-details-stub"></div>',
			},
			GithubButton: { template: '<div></div>' },
			TabBar: { template: '<div></div>' },
		},
	},
});

describe('MainHeader', () => {
	let workflowsStore: MockedStore<typeof useWorkflowsStore>;
	let sourceControlStore: MockedStore<typeof useSourceControlStore>;
	let collaborationStore: MockedStore<typeof useCollaborationStore>;

	beforeEach(() => {
		workflowsStore = mockedStore(useWorkflowsStore);
		sourceControlStore = mockedStore(useSourceControlStore);
		collaborationStore = mockedStore(useCollaborationStore);

		workflowsStore.workflow = {
			id: '1',
			name: 'Test Workflow',
			active: false,
			activeVersionId: null,
			activeVersion: null,
			versionId: 'version-1',
			scopes: ['workflow:read', 'workflow:update'],
			isArchived: false,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			nodes: [],
			connections: {},
			tags: [],
			meta: {},
		};

		sourceControlStore.preferences.branchReadOnly = false;
		vi.spyOn(collaborationStore, 'shouldBeReadOnly', 'get').mockReturnValue(false);
	});

	it('should render WorkflowDetails component', () => {
		const { getByTestId } = renderComponent();

		const workflowDetails = getByTestId('workflow-details-stub');
		expect(workflowDetails).toBeInTheDocument();
	});
});
