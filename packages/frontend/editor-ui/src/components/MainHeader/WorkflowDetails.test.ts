import WorkflowDetails from '@/components/MainHeader/WorkflowDetails.vue';
import { createComponentRenderer } from '@/__tests__/render';
import {
	EnterpriseEditionFeature,
	STORES,
	WORKFLOW_MENU_ACTIONS,
	WORKFLOW_SHARE_MODAL_KEY,
} from '@/constants';
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
	isArchived: false,
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

	describe('Workflow Menu', () => {
		beforeEach(() => {
			(useRoute as Mock).mockReturnValue({
				meta: {
					nodeView: true,
				},
				query: { parentFolderId: '1' },
			});
		});

		it("should have disabled 'Archive' option on new workflow", async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					...workflow,
					id: 'new',
					readOnly: false,
					isArchived: false,
					scopes: ['workflow:delete'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			expect(queryByTestId('workflow-menu-item-delete')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-unarchive')).not.toBeInTheDocument();
			expect(getByTestId('workflow-menu-item-archive')).toBeInTheDocument();
			expect(getByTestId('workflow-menu-item-archive')).toHaveClass('disabled');
		});

		it("should have 'Archive' option on non archived workflow", async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					...workflow,
					readOnly: false,
					isArchived: false,
					scopes: ['workflow:delete'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			expect(queryByTestId('workflow-menu-item-delete')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-unarchive')).not.toBeInTheDocument();
			expect(getByTestId('workflow-menu-item-archive')).toBeInTheDocument();
			expect(getByTestId('workflow-menu-item-archive')).not.toHaveClass('disabled');
		});

		it("should not have 'Archive' option on non archived readonly workflow", async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					...workflow,
					readOnly: true,
					isArchived: false,
					scopes: ['workflow:delete'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			expect(queryByTestId('workflow-menu-item-delete')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-unarchive')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-archive')).not.toBeInTheDocument();
		});

		it("should not have 'Archive' option on non archived workflow without permission", async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					...workflow,
					readOnly: false,
					isArchived: false,
					scopes: ['workflow:update'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			expect(queryByTestId('workflow-menu-item-delete')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-unarchive')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-archive')).not.toBeInTheDocument();
		});

		it("should have 'Unarchive' and 'Delete' options on archived workflow", async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					...workflow,
					isArchived: true,
					readOnly: false,
					scopes: ['workflow:delete'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			expect(queryByTestId('workflow-menu-item-archive')).not.toBeInTheDocument();
			expect(getByTestId('workflow-menu-item-delete')).toBeInTheDocument();
			expect(getByTestId('workflow-menu-item-delete')).not.toHaveClass('disabled');
			expect(getByTestId('workflow-menu-item-unarchive')).toBeInTheDocument();
			expect(getByTestId('workflow-menu-item-unarchive')).not.toHaveClass('disabled');
		});

		it("should not have 'Unarchive' or 'Delete' options on archived readonly workflow", async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					...workflow,
					isArchived: true,
					readOnly: true,
					scopes: ['workflow:delete'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			expect(queryByTestId('workflow-menu-item-archive')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-delete')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-unarchive')).not.toBeInTheDocument();
		});

		it("should not have 'Unarchive' or 'Delete' options on archived workflow without permission", async () => {
			const { getByTestId, queryByTestId } = renderComponent({
				props: {
					...workflow,
					isArchived: true,
					readOnly: false,
					scopes: ['workflow:update'],
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			expect(queryByTestId('workflow-menu-item-archive')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-delete')).not.toBeInTheDocument();
			expect(queryByTestId('workflow-menu-item-unarchive')).not.toBeInTheDocument();
		});

		it("should call onWorkflowMenuSelect on 'Archive' option click", async () => {
			const onWorkflowMenuSelect = vi.fn();
			const { getByTestId } = renderComponent({
				props: {
					...workflow,
					readOnly: false,
					isArchived: false,
					scopes: ['workflow:delete'],
				},
				global: {
					mocks: {
						onWorkflowMenuSelect,
					},
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			await userEvent.click(getByTestId('workflow-menu-item-archive'));
			expect(onWorkflowMenuSelect).toHaveBeenCalledWith(WORKFLOW_MENU_ACTIONS.ARCHIVE);
		});

		it("should call onWorkflowMenuSelect on 'Unarchive' option click", async () => {
			const onWorkflowMenuSelect = vi.fn();
			const { getByTestId } = renderComponent({
				props: {
					...workflow,
					readOnly: false,
					isArchived: true,
					scopes: ['workflow:delete'],
				},
				global: {
					mocks: {
						onWorkflowMenuSelect,
					},
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			await userEvent.click(getByTestId('workflow-menu-item-unarchive'));
			expect(onWorkflowMenuSelect).toHaveBeenCalledWith(WORKFLOW_MENU_ACTIONS.UNARCHIVE);
		});

		it("should call onWorkflowMenuSelect on 'Delete' option click", async () => {
			const onWorkflowMenuSelect = vi.fn();
			const { getByTestId } = renderComponent({
				props: {
					...workflow,
					readOnly: false,
					isArchived: true,
					scopes: ['workflow:delete'],
				},
				global: {
					mocks: {
						onWorkflowMenuSelect,
					},
				},
			});

			await userEvent.click(getByTestId('workflow-menu'));
			await userEvent.click(getByTestId('workflow-menu-item-delete'));
			expect(onWorkflowMenuSelect).toHaveBeenCalledWith(WORKFLOW_MENU_ACTIONS.DELETE);
		});
	});
});
