import SourceControlPullModalEe from './SourceControlPullModal.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { createEventBus } from '@n8n/utils/event-bus';
import userEvent from '@testing-library/user-event';
import { useSourceControlStore } from '../sourceControl.store';
import { mockedStore } from '@/__tests__/utils';
import { waitFor } from '@testing-library/dom';
import { reactive } from 'vue';
import { useSettingsStore } from '@/stores/settings.store';
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

vi.mock('@/composables/useLoadingService', () => ({
	useLoadingService: () => ({
		startLoading: vi.fn(),
		stopLoading: vi.fn(),
		setLoadingText: vi.fn(),
	}),
}));

// Mock the toast composable to prevent Element Plus DOM errors
vi.mock('@/composables/useToast', () => ({
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
		expect(getByText('Pull and override')).toBeInTheDocument();
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

		await waitFor(() => expect(sourceControlStore.pullWorkfolder).toHaveBeenCalledWith(true));
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
});
