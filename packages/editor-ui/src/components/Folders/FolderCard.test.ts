import { createComponentRenderer } from '@/__tests__/render';
import userEvent from '@testing-library/user-event';
import FolderCard from './FolderCard.vue';
import { createPinia, setActivePinia } from 'pinia';
import type { FolderResource } from '../layouts/ResourcesListLayout.vue';
import type { UserAction } from '@/Interface';

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
	readOnly: false,
	workflowCount: 0,
	homeProject: {
		id: '1',
		name: 'Project 1',
		icon: null,
		type: 'personal',
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
} as const satisfies FolderResource;

const PARENT_FOLDER: FolderResource = {
	id: '2',
	name: 'Folder 2',
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	resourceType: 'folder',
	readOnly: false,
	workflowCount: 0,
	homeProject: {
		id: '1',
		name: 'Project 1',
		icon: null,
		type: 'team',
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
		] as const satisfies UserAction[],
	},
	global: {
		stubs: {
			'router-link': {
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
		expect(getByTestId('folder-card-workflow-count')).toHaveTextContent('0');
		expect(getByTestId('folder-card-last-updated')).toHaveTextContent('Last updated just now');
		expect(getByTestId('folder-card-created')).toHaveTextContent('Created just now');
	});

	it('should render breadcrumbs with personal folder', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('folder-card-icon')).toBeInTheDocument();
		expect(getByTestId('folder-card-breadcrumbs')).toHaveTextContent('Personal');
	});

	it('should render breadcrumbs with team project', () => {
		const { getByTestId } = renderComponent({
			props: {
				data: {
					...DEFAULT_FOLDER,
					homeProject: {
						id: '1',
						name: 'Project 1',
						icon: null,
						type: 'team',
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
					},
				},
			},
		});
		expect(getByTestId('folder-card-icon')).toBeInTheDocument();
		if (!DEFAULT_FOLDER.homeProject?.name) {
			throw new Error('homeProject should be defined for this test');
		}
		expect(getByTestId('folder-card-breadcrumbs')).toHaveTextContent(
			DEFAULT_FOLDER.homeProject.name,
		);
	});

	it('should render breadcrumbs with home project and parent folder', () => {
		const { getByTestId } = renderComponent({
			props: {
				data: {
					...DEFAULT_FOLDER,
					homeProject: {
						id: '1',
						name: 'Project 1',
						icon: null,
						type: 'team',
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
					},
					parentFolder: PARENT_FOLDER,
				},
			},
		});
		expect(getByTestId('folder-card-icon')).toBeInTheDocument();
		if (!DEFAULT_FOLDER.homeProject?.name) {
			throw new Error('homeProject should be defined for this test');
		}
		expect(getByTestId('folder-card-breadcrumbs')).toHaveTextContent(
			`${DEFAULT_FOLDER.homeProject.name}/.../${PARENT_FOLDER.name}`,
		);
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
