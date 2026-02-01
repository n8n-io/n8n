import { createComponentRenderer } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';
import FolderCard from './FolderCard.vue';
import { createPinia, setActivePinia } from 'pinia';
import type { FolderResource, UserAction } from '@/Interface';
import type { IUser } from 'n8n-workflow';

vi.mock('vue-router', () => {
	const push = vi.fn();
	const resolve = vi.fn().mockReturnValue({ href: '/projects/1/folders/1' });
	return {
		useRouter: vi.fn().mockReturnValue({
			push,
			resolve,
		}),
		useRoute: vi.fn().mockReturnValue({
			params: {
				projectId: '1',

				folderId: '1',
			},
			query: {},
		}),
		RouterLink: vi.fn(),
	};
});

const DEFAULT_FOLDER: FolderResource = {
	id: '1',
	name: 'Folder 1',
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	resourceType: 'folder',
	workflowCount: 2,
	subFolderCount: 2,
	homeProject: {
		id: '1',
		name: 'Project 1',
		icon: null,
		type: 'personal',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
} as const satisfies FolderResource;

const renderComponent = createComponentRenderer(FolderCard, {
	props: {
		data: DEFAULT_FOLDER,
		actions: [
			{ label: 'Open', value: 'open', disabled: false },
			{ label: 'Delete', value: 'delete', disabled: false },
		] as const satisfies Array<UserAction<IUser>>,
	},
	global: {
		stubs: {
			RouterLink: {
				template: '<div data-test-id="folder-card-link"><slot /></div>',
			},
		},
	},
});

describe('FolderCard', () => {
	let pinia: ReturnType<typeof createPinia>;

	beforeEach(async () => {
		pinia = createPinia();
		setActivePinia(pinia);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render folder info correctly', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('folder-card-icon')).toBeInTheDocument();
		expect(getByTestId('folder-card-name')).toHaveTextContent(DEFAULT_FOLDER.name);
		expect(getByTestId('folder-card-workflow-count')).toHaveTextContent('2');
		expect(getByTestId('folder-card-folder-count')).toHaveTextContent('2');
		expect(getByTestId('folder-card-last-updated')).toHaveTextContent('Last updated just now');
		expect(getByTestId('folder-card-created')).toHaveTextContent('Created just now');
	});

	it('should not render workflow & folder count if they are 0', () => {
		const { queryByTestId } = renderComponent({
			props: {
				data: {
					...DEFAULT_FOLDER,
					workflowCount: 0,
					subFolderCount: 0,
				},
			},
		});
		expect(queryByTestId('folder-card-workflow-count')).not.toBeInTheDocument();
		expect(queryByTestId('folder-card-folder-count')).not.toBeInTheDocument();
	});

	it('should not render action dropdown if no actions are provided', () => {
		const { queryByTestId } = renderComponent({
			props: {
				actions: [],
			},
		});
		expect(queryByTestId('folder-card-actions')).not.toBeInTheDocument();
	});

	it('should render action dropdown if actions are provided', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('folder-card-actions')).toBeInTheDocument();
	});

	it('should emit action event when action is clicked', async () => {
		const { getByTestId, emitted } = renderComponent();
		const actionButton = getByTestId('folder-card-actions').querySelector('[role=button]');
		if (!actionButton) {
			throw new Error('Action button not found');
		}
		await userEvent.click(actionButton);
		const actionToggleId = actionButton.getAttribute('aria-controls');
		const actionDropdown = document.getElementById(actionToggleId as string) as HTMLElement;
		expect(actionDropdown).toBeInTheDocument();
		const deleteAction = getByTestId('action-delete');
		expect(deleteAction).toBeInTheDocument();
		await userEvent.click(deleteAction);
		expect(emitted('action')).toEqual([[{ action: 'delete', folderId: '1' }]]);
	});

	it('should emit folder-open action', async () => {
		const { getByTestId, emitted } = renderComponent();
		const actionButton = getByTestId('folder-card-actions').querySelector('[role=button]');
		if (!actionButton) {
			throw new Error('Action button not found');
		}
		await userEvent.click(actionButton);
		const actionToggleId = actionButton.getAttribute('aria-controls');
		const actionDropdown = document.getElementById(actionToggleId as string) as HTMLElement;
		expect(actionDropdown).toBeInTheDocument();
		const deleteAction = getByTestId('action-open');
		expect(deleteAction).toBeInTheDocument();
		await userEvent.click(deleteAction);
		expect(emitted('folderOpened')).toEqual([[{ folder: DEFAULT_FOLDER }]]);
	});
});
