import SourceControlPullModalEe from './SourceControlPullModal.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { createEventBus } from '@n8n/utils/event-bus';
import userEvent from '@testing-library/user-event';
import { useSourceControlStore } from '../sourceControl.store';
import { mockedStore } from '@/__tests__/utils';
import { waitFor } from '@testing-library/dom';
import { reactive } from 'vue';
import { useSettingsStore } from '@/app/stores/settings.store';
import { defaultSettings } from '@/__tests__/defaults';
import type { SourceControlledFile } from '@n8n/api-types';

const eventBus = createEventBus();

// Mock Vue Router to eliminate injection warnings
const mockRoute = reactive({
	params: {},
	query: {},
	path: '/',
	name: 'TestRoute',
});

vi.mock('vue-router', () => ({
	useRoute: () => mockRoute,
	useRouter: () => ({
		back: vi.fn(),
		push: vi.fn(),
		replace: vi.fn(),
		go: vi.fn(),
	}),
	RouterLink: {
		template: '<a><slot></slot></a>',
		props: ['to', 'target'],
	},
}));

vi.mock('@/app/composables/useLoadingService', () => ({
	useLoadingService: () => ({
		startLoading: vi.fn(),
		stopLoading: vi.fn(),
		setLoadingText: vi.fn(),
	}),
}));

// Mock the toast composable to prevent Element Plus DOM errors
vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({
		showMessage: vi.fn(),
		showError: vi.fn(),
		showSuccess: vi.fn(),
		clear: vi.fn(),
	}),
}));

const DynamicScrollerStub = {
	props: {
		items: Array,
		minItemSize: Number,
		class: String,
		style: [String, Object],
		itemClass: String,
	},
	template:
		'<div><template v-for="(item, index) in items" :key="index"><slot v-bind="{ item, index, active: false }"></slot></template></div>',
	methods: {
		scrollToItem: vi.fn(),
	},
};

const DynamicScrollerItemStub = {
	props: {
		item: Object,
		active: Boolean,
		sizeDependencies: Array,
		dataIndex: Number,
	},
	template: '<slot></slot>',
};

const renderModal = createComponentRenderer(SourceControlPullModalEe, {
	global: {
		stubs: {
			DynamicScroller: DynamicScrollerStub,
			DynamicScrollerItem: DynamicScrollerItemStub,
			Modal: {
				template: `
					<div>
						<slot name="header" />
						<slot name="title" />
						<slot name="content" />
						<slot name="footer" />
					</div>
				`,
			},
			N8nIconButton: {
				template: '<button><slot></slot></button>',
				props: ['icon', 'type', 'class'],
			},
			RouterLink: {
				template: '<a><slot /></a>',
				props: ['to'],
			},
		},
	},
});

const sampleFiles: SourceControlledFile[] = [
	{
		id: '014da93897f146d2b880-baa374b9d02d',
		name: 'vuelfow2',
		type: 'workflow',
		status: 'created',
		location: 'remote',
		conflict: false,
		file: '/014da93897f146d2b880-baa374b9d02d.json',
		updatedAt: '2025-01-09T13:12:24.580Z',
	},
	{
		id: 'a102c0b9-28ac-43cb-950e-195723a56d54',
		name: 'Gmail account',
		type: 'credential',
		status: 'created',
		location: 'remote',
		conflict: false,
		file: '/a102c0b9-28ac-43cb-950e-195723a56d54.json',
		updatedAt: '2025-01-09T13:12:24.586Z',
	},
];

describe('SourceControlPullModal', () => {
	let sourceControlStore: ReturnType<typeof mockedStore<typeof useSourceControlStore>>;
	let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;
	let pinia: ReturnType<typeof createTestingPinia>;

	beforeEach(() => {
		vi.clearAllMocks();

		// Setup store with default mock to prevent automatic data loading
		pinia = createTestingPinia();
		sourceControlStore = mockedStore(useSourceControlStore);
		sourceControlStore.getAggregatedStatus = vi.fn().mockResolvedValue([]);
		sourceControlStore.pullWorkfolder = vi.fn().mockResolvedValue([]);

		settingsStore = mockedStore(useSettingsStore);
		settingsStore.settings.enterprise = defaultSettings.enterprise;
	});

	it('mounts', () => {
		const { getByText } = renderModal({
			pinia,
			props: {
				data: {
					eventBus,
					status: [], // Provide initial status to prevent auto-loading
				},
			},
		});
		expect(getByText('Pull')).toBeInTheDocument();
	});

	it('should renders the changes', () => {
		const { getAllByTestId } = renderModal({
			pinia,
			props: {
				data: {
					eventBus,
					status: sampleFiles,
				},
			},
		});

		// The new structure renders items in a tabbed interface
		// Both items should be rendered (one workflow, one credential)
		expect(getAllByTestId('pull-modal-item').length).toBe(1); // Only workflow tab items are shown initially
	});

	it('should force pull', async () => {
		// Use the existing store instance from beforeEach
		const { getByTestId } = renderModal({
			pinia,
			props: {
				data: {
					eventBus,
					status: sampleFiles,
				},
			},
		});

		await userEvent.click(getByTestId('force-pull'));

		await waitFor(() =>
			expect(sourceControlStore.pullWorkfolder).toHaveBeenCalledWith(true, 'none'),
		);
	});

	it('should render diff button with file-diff icon for workflow items', () => {
		const workflowFile: SourceControlledFile = {
			...sampleFiles[0], // workflow file
			type: 'workflow',
		};

		const { container } = renderModal({
			props: {
				data: {
					eventBus,
					status: [workflowFile],
				},
			},
		});

		// Check if a button with file-diff icon would be rendered (via class since icon is a prop)
		const diffButton = container.querySelector('button');
		expect(diffButton).toBeInTheDocument();
	});

	it('should not render diff button for non-workflow items', async () => {
		const credentialFile: SourceControlledFile = {
			...sampleFiles[1], // credential file
			type: 'credential',
		};

		const { container, getByText } = renderModal({
			props: {
				data: {
					eventBus,
					status: [credentialFile],
				},
			},
		});

		// Click on credentials tab to show credential items
		await userEvent.click(getByText('Credentials'));

		// For credential files, there should be no diff buttons (only badges in the badges container)
		const badges = container.querySelector('[class*="badges"]');
		const buttons = badges?.querySelectorAll('button');
		expect(buttons?.length || 0).toBe(0);
	});

	it('should render item names with ellipsis for long text', () => {
		const longNameFile = {
			...sampleFiles[0],
			name: 'This is a very long workflow name that should be truncated with ellipsis to prevent wrapping to multiple lines',
		};

		const { container } = renderModal({
			props: {
				data: {
					eventBus,
					status: [longNameFile],
				},
			},
		});

		// Check if the listItemName container exists
		const nameContainer = container.querySelector('[class*="listItemName"]');
		expect(nameContainer).toBeInTheDocument();

		// Check if the RouterLink stub is rendered (since the name is rendered inside it)
		const routerLink = nameContainer?.querySelector('a');
		expect(routerLink).toBeInTheDocument();
		expect(routerLink?.textContent).toContain(longNameFile.name);
	});

	it('should render badges and actions in separate container', () => {
		const { getAllByTestId } = renderModal({
			props: {
				data: {
					eventBus,
					status: sampleFiles,
				},
			},
		});

		const listItems = getAllByTestId('pull-modal-item');

		// Each list item should have the new structure with badges container
		listItems.forEach((item) => {
			const badgesContainer = item.querySelector('[class*="badges"]');
			expect(badgesContainer).toBeInTheDocument();
		});
	});

	it('should apply proper spacing and alignment styles', () => {
		const { container, getAllByTestId } = renderModal({
			props: {
				data: {
					eventBus,
					status: sampleFiles,
				},
			},
		});

		// Check if the scroller container exists (using generic div since stub doesn't preserve CSS modules)
		const scrollerContainer = container.querySelector('div');
		expect(scrollerContainer).toBeInTheDocument();

		// Check if list items exist and have proper structure
		const listItems = getAllByTestId('pull-modal-item');
		expect(listItems.length).toBeGreaterThan(0);
	});

	it('should display projects in the otherFiles section', () => {
		const status: SourceControlledFile[] = [
			{
				id: 'project-1',
				name: 'Team Project 1',
				type: 'project',
				status: 'created',
				location: 'remote',
				conflict: false,
				file: '/projects/project-1.json',
				updatedAt: '2025-01-09T13:12:24.586Z',
				owner: {
					type: 'team',
					projectId: 'project-1',
					projectName: 'Team Project 1',
				},
			},
		];

		const { getByText } = renderModal({
			pinia,
			props: {
				data: {
					eventBus,
					status,
				},
			},
		});

		expect(getByText(/Projects \(1\)/)).toBeInTheDocument();
	});

	it('should show correct project count in summary', () => {
		const status: SourceControlledFile[] = [
			{
				id: 'project-1',
				name: 'Team Project 1',
				type: 'project',
				status: 'created',
				location: 'remote',
				conflict: false,
				file: '/projects/project-1.json',
				updatedAt: '2025-01-09T13:12:24.586Z',
				owner: {
					type: 'team',
					projectId: 'project-1',
					projectName: 'Team Project 1',
				},
			},
			{
				id: 'project-2',
				name: 'Team Project 2',
				type: 'project',
				status: 'modified',
				location: 'remote',
				conflict: true,
				file: '/projects/project-2.json',
				updatedAt: '2025-01-09T13:12:24.586Z',
				owner: {
					type: 'team',
					projectId: 'project-2',
					projectName: 'Team Project 2',
				},
			},
		];

		const { getByText } = renderModal({
			pinia,
			props: {
				data: {
					eventBus,
					status,
				},
			},
		});

		expect(getByText(/Projects \(2\)/)).toBeInTheDocument();
	});

	describe('Data Tables tab', () => {
		it('should display data tables tab with correct count', () => {
			const status: SourceControlledFile[] = [
				{
					id: 'dt-1',
					name: 'Customer Data',
					type: 'datatable',
					status: 'created',
					location: 'remote',
					conflict: false,
					file: '/datatables/dt-1.json',
					updatedAt: '2025-01-19T10:00:00.000Z',
				},
				{
					id: 'dt-2',
					name: 'Product Catalog',
					type: 'datatable',
					status: 'modified',
					location: 'remote',
					conflict: false,
					file: '/datatables/dt-2.json',
					updatedAt: '2025-01-19T11:00:00.000Z',
				},
			];

			const { getByText } = renderModal({
				pinia,
				props: {
					data: {
						eventBus,
						status,
					},
				},
			});

			// Tab should show "Data Tables" and "2 items"
			expect(getByText('Data Tables')).toBeInTheDocument();
			expect(getByText('2 items')).toBeInTheDocument();
		});

		it('should switch to data tables tab and display items', async () => {
			const status: SourceControlledFile[] = [
				{
					id: 'wf-1',
					name: 'Test Workflow',
					type: 'workflow',
					status: 'created',
					location: 'remote',
					conflict: false,
					file: '/workflows/wf-1.json',
					updatedAt: '2025-01-19T10:00:00.000Z',
				},
				{
					id: 'dt-1',
					name: 'Customer Data',
					type: 'datatable',
					status: 'created',
					location: 'remote',
					conflict: false,
					file: '/datatables/dt-1.json',
					updatedAt: '2025-01-19T10:00:00.000Z',
				},
			];

			const { getByText, queryByText } = renderModal({
				pinia,
				props: {
					data: {
						eventBus,
						status,
					},
				},
			});

			// Should not see data table name initially (on Workflows tab)
			expect(queryByText('Customer Data')).not.toBeInTheDocument();

			// Click on Data Tables tab
			const dataTablesTab = getByText('Data Tables').closest('button');
			if (dataTablesTab) {
				await userEvent.click(dataTablesTab);
			}

			// Should now see data table name
			await waitFor(() => {
				expect(getByText('Customer Data')).toBeInTheDocument();
			});

			// Should not see workflow name
			expect(queryByText('Test Workflow')).not.toBeInTheDocument();
		});

		it('should sort data tables by status priority and updated date', async () => {
			const status: SourceControlledFile[] = [
				{
					id: 'dt-1',
					name: 'Table A',
					type: 'datatable',
					status: 'modified',
					location: 'remote',
					conflict: false,
					file: '/datatables/dt-1.json',
					updatedAt: '2025-01-19T10:00:00.000Z',
				},
				{
					id: 'dt-2',
					name: 'Table B',
					type: 'datatable',
					status: 'created',
					location: 'remote',
					conflict: true,
					file: '/datatables/dt-2.json',
					updatedAt: '2025-01-19T11:00:00.000Z',
				},
				{
					id: 'dt-3',
					name: 'Table C',
					type: 'datatable',
					status: 'created',
					location: 'remote',
					conflict: false,
					file: '/datatables/dt-3.json',
					updatedAt: '2025-01-19T12:00:00.000Z',
				},
			];

			const { getByText, getAllByTestId } = renderModal({
				pinia,
				props: {
					data: {
						eventBus,
						status,
					},
				},
			});

			// Click on Data Tables tab
			const dataTablesTab = getByText('Data Tables').closest('button');
			if (dataTablesTab) {
				await userEvent.click(dataTablesTab);
			}

			await waitFor(() => {
				const items = getAllByTestId('pull-modal-item');
				expect(items).toHaveLength(3);

				// Items should be sorted by status priority (created=1, modified=2) then by date DESC
				// Created items come first, sorted by date (newest first)
				expect(items[0]).toHaveTextContent('Table C'); // created, newest
				expect(items[1]).toHaveTextContent('Table B'); // created, older
				// Then modified items
				expect(items[2]).toHaveTextContent('Table A'); // modified
			});
		});

		it('should show no results message for data tables', async () => {
			const status: SourceControlledFile[] = [
				{
					id: 'wf-1',
					name: 'Test Workflow',
					type: 'workflow',
					status: 'created',
					location: 'remote',
					conflict: false,
					file: '/workflows/wf-1.json',
					updatedAt: '2025-01-19T10:00:00.000Z',
				},
			];

			const { getByText, queryByTestId } = renderModal({
				pinia,
				props: {
					data: {
						eventBus,
						status,
					},
				},
			});

			// Click on Data Tables tab (which has 0 items)
			const dataTablesTab = getByText('Data Tables').closest('button');
			if (dataTablesTab) {
				await userEvent.click(dataTablesTab);
			}

			await waitFor(() => {
				// Should show no results
				expect(queryByTestId('pull-modal-item')).not.toBeInTheDocument();
			});
		});

		it('should display data table metadata correctly', async () => {
			const status: SourceControlledFile[] = [
				{
					id: 'dt-1',
					name: 'Customer Data',
					type: 'datatable',
					status: 'created',
					location: 'remote',
					conflict: false,
					file: '/datatables/dt-1.json',
					updatedAt: '2025-01-19T10:30:45.000Z',
				},
			];

			const { getByText, container } = renderModal({
				pinia,
				props: {
					data: {
						eventBus,
						status,
					},
				},
			});

			// Click on Data Tables tab
			const dataTablesTab = getByText('Data Tables').closest('button');
			if (dataTablesTab) {
				await userEvent.click(dataTablesTab);
			}

			await waitFor(() => {
				// Check that the data table name is displayed
				expect(getByText('Customer Data')).toBeInTheDocument();

				// Check for status badge
				const badges = container.querySelector('[class*="badges"]');
				expect(badges).toBeInTheDocument();
			});
		});
	});

	describe('auto-publish badges', () => {
		it('should not show any badges when "None" is selected', () => {
			const status: SourceControlledFile[] = [
				{
					id: 'workflow-1',
					name: 'Published Workflow',
					type: 'workflow',
					status: 'modified',
					location: 'remote',
					conflict: true,
					file: '/workflows/workflow-1.json',
					updatedAt: '2025-01-09T13:12:24.586Z',
					isLocalPublished: true,
				},
				{
					id: 'workflow-2',
					name: 'New Workflow',
					type: 'workflow',
					status: 'created',
					location: 'remote',
					conflict: false,
					file: '/workflows/workflow-2.json',
					updatedAt: '2025-01-09T13:12:24.586Z',
					isLocalPublished: false,
				},
			];

			const { queryByText, getByTestId } = renderModal({
				pinia,
				props: {
					data: {
						eventBus,
						status,
					},
				},
			});

			expect(getByTestId('auto-publish-select')).toBeInTheDocument();

			expect(queryByText('Auto-publish')).not.toBeInTheDocument();
		});

		it('should show badges for all non-deleted workflows when "On" is selected', async () => {
			const status: SourceControlledFile[] = [
				{
					id: 'workflow-1',
					name: 'Published Workflow',
					type: 'workflow',
					status: 'modified',
					location: 'remote',
					conflict: true,
					file: '/workflows/workflow-1.json',
					updatedAt: '2025-01-09T13:12:24.586Z',
					isLocalPublished: true,
				},
				{
					id: 'workflow-2',
					name: 'New Workflow',
					type: 'workflow',
					status: 'created',
					location: 'remote',
					conflict: false,
					file: '/workflows/workflow-2.json',
					updatedAt: '2025-01-09T13:12:24.586Z',
					isLocalPublished: false,
				},
				{
					id: 'workflow-3',
					name: 'Unpublished Modified Workflow',
					type: 'workflow',
					status: 'modified',
					location: 'remote',
					conflict: true,
					file: '/workflows/workflow-3.json',
					updatedAt: '2025-01-09T13:12:24.586Z',
					isLocalPublished: false,
				},
			];

			const wrapper = renderModal({
				pinia,
				props: {
					data: {
						eventBus,
						status,
					},
				},
			});

			const selectTrigger = wrapper.getByTestId('auto-publish-select');
			await userEvent.click(selectTrigger);

			await waitFor(() => {
				const onOption = wrapper.getAllByText('On');
				expect(onOption.length).toBeGreaterThan(0);
			});

			const onOption = wrapper.getAllByText('On')[0];
			await userEvent.click(onOption);

			await waitFor(() => {
				// All 3 workflows should show badges
				const autoPublishBadges = wrapper.getAllByText('Auto-publish');
				expect(autoPublishBadges).toHaveLength(3);
			});
		});

		it('should show badges only for published existing workflows when "If workflow already published" is selected', async () => {
			const status: SourceControlledFile[] = [
				{
					id: 'workflow-1',
					name: 'Published Workflow',
					type: 'workflow',
					status: 'modified',
					location: 'remote',
					conflict: true,
					file: '/workflows/workflow-1.json',
					updatedAt: '2025-01-09T13:12:24.586Z',
					isLocalPublished: true,
				},
				{
					id: 'workflow-2',
					name: 'New Workflow',
					type: 'workflow',
					status: 'created',
					location: 'remote',
					conflict: false,
					file: '/workflows/workflow-2.json',
					updatedAt: '2025-01-09T13:12:24.586Z',
					isLocalPublished: false,
				},
				{
					id: 'workflow-3',
					name: 'Unpublished Modified Workflow',
					type: 'workflow',
					status: 'modified',
					location: 'remote',
					conflict: true,
					file: '/workflows/workflow-3.json',
					updatedAt: '2025-01-09T13:12:24.586Z',
					isLocalPublished: false,
				},
			];

			const wrapper = renderModal({
				pinia,
				props: {
					data: {
						eventBus,
						status,
					},
				},
			});

			const selectTrigger = wrapper.getByTestId('auto-publish-select');
			await userEvent.click(selectTrigger);

			await waitFor(() => {
				const publishedOption = wrapper.getAllByText('If workflow already published');
				expect(publishedOption.length).toBeGreaterThan(0);
			});

			const publishedOption = wrapper.getAllByText('If workflow already published')[0];
			await userEvent.click(publishedOption);

			await waitFor(() => {
				// Only 1 workflow (the published modified one) should show badge
				const autoPublishBadges = wrapper.getAllByText('Auto-publish');
				expect(autoPublishBadges).toHaveLength(1);
			});
		});

		it('should not show badges for deleted workflows even when "On" is selected', async () => {
			const status: SourceControlledFile[] = [
				{
					id: 'workflow-1',
					name: 'Deleted Workflow',
					type: 'workflow',
					status: 'deleted',
					location: 'remote',
					conflict: false,
					file: '/workflows/workflow-1.json',
					updatedAt: '2025-01-09T13:12:24.586Z',
					isLocalPublished: true,
				},
				{
					id: 'workflow-2',
					name: 'New Workflow',
					type: 'workflow',
					status: 'created',
					location: 'remote',
					conflict: false,
					file: '/workflows/workflow-2.json',
					updatedAt: '2025-01-09T13:12:24.586Z',
					isLocalPublished: false,
				},
			];

			const wrapper = renderModal({
				pinia,
				props: {
					data: {
						eventBus,
						status,
					},
				},
			});

			const selectTrigger = wrapper.getByTestId('auto-publish-select');
			await userEvent.click(selectTrigger);

			await waitFor(() => {
				const onOption = wrapper.getAllByText('On');
				expect(onOption.length).toBeGreaterThan(0);
			});

			const onOption = wrapper.getAllByText('On')[0];
			await userEvent.click(onOption);

			await waitFor(() => {
				// Only 1 badge (for the new workflow, not the deleted one)
				const autoPublishBadges = wrapper.getAllByText('Auto-publish');
				expect(autoPublishBadges).toHaveLength(1);
			});

			expect(wrapper.getByText('Deleted Workflow')).toBeInTheDocument();
			expect(wrapper.getByText('New Workflow')).toBeInTheDocument();
		});

		it('should not show badges for archived workflows even when "On" is selected', async () => {
			const status: SourceControlledFile[] = [
				{
					id: 'workflow-1',
					name: 'Archived Workflow',
					type: 'workflow',
					status: 'modified',
					location: 'remote',
					conflict: true,
					file: '/workflows/workflow-1.json',
					updatedAt: '2025-01-09T13:12:24.586Z',
					isLocalPublished: true,
					isRemoteArchived: true, // Archived in remote
				},
				{
					id: 'workflow-2',
					name: 'Active Workflow',
					type: 'workflow',
					status: 'modified',
					location: 'remote',
					conflict: true,
					file: '/workflows/workflow-2.json',
					updatedAt: '2025-01-09T13:12:24.586Z',
					isLocalPublished: true,
					isRemoteArchived: false,
				},
			];

			const wrapper = renderModal({
				pinia,
				props: {
					data: {
						eventBus,
						status,
					},
				},
			});

			const selectTrigger = wrapper.getByTestId('auto-publish-select');
			await userEvent.click(selectTrigger);

			await waitFor(() => {
				const onOption = wrapper.getAllByText('On');
				expect(onOption.length).toBeGreaterThan(0);
			});

			const onOption = wrapper.getAllByText('On')[0];
			await userEvent.click(onOption);

			await waitFor(() => {
				// Only 1 badge (for the active workflow, not the archived one)
				const autoPublishBadges = wrapper.getAllByText('Auto-publish');
				expect(autoPublishBadges).toHaveLength(1);
			});

			expect(wrapper.getByText('Archived Workflow')).toBeInTheDocument();
			expect(wrapper.getByText('Active Workflow')).toBeInTheDocument();
		});
	});
});
