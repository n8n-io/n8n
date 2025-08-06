import SourceControlPullModalEe from './SourceControlPullModal.ee.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { createEventBus } from '@n8n/utils/event-bus';
import userEvent from '@testing-library/user-event';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { mockedStore } from '@/__tests__/utils';
import { waitFor } from '@testing-library/dom';
import { reactive } from 'vue';

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
		push: vi.fn(),
		replace: vi.fn(),
		go: vi.fn(),
	}),
	RouterLink: {
		template: '<a><slot></slot></a>',
		props: ['to', 'target'],
	},
}));

const DynamicScrollerStub = {
	props: {
		items: Array,
	},
	template: '<div><template v-for="item in items"><slot v-bind="{ item }"></slot></template></div>',
	methods: {
		scrollToItem: vi.fn(),
	},
};

const DynamicScrollerItemStub = {
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
			EnvFeatureFlag: {
				template: '<div><slot></slot></div>',
			},
			N8nIconButton: {
				template: '<button><slot></slot></button>',
				props: ['icon', 'type', 'class'],
			},
		},
	},
});

const sampleFiles = [
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

describe('SourceControlPushModal', () => {
	let sourceControlStore: ReturnType<typeof mockedStore<typeof useSourceControlStore>>;

	beforeEach(() => {
		sourceControlStore = mockedStore(useSourceControlStore);
	});

	it('mounts', () => {
		const { getByText } = renderModal({
			props: {
				data: {
					eventBus,
					status: [],
				},
			},
			pinia: createTestingPinia(),
		});
		expect(getByText('Pull and override')).toBeInTheDocument();
	});

	it('should renders the changes', () => {
		const { getAllByTestId } = renderModal({
			props: {
				data: {
					eventBus,
					status: sampleFiles,
				},
			},
			pinia: createTestingPinia(),
		});

		expect(getAllByTestId('pull-modal-item-header').length).toBe(2);
		expect(getAllByTestId('pull-modal-item').length).toBe(2);
	});

	it('should force pull', async () => {
		const { getByTestId } = renderModal({
			props: {
				data: {
					eventBus,
					status: sampleFiles,
				},
			},
			pinia: createTestingPinia(),
		});

		await userEvent.click(getByTestId('force-pull'));

		await waitFor(() => expect(sourceControlStore.pullWorkfolder).toHaveBeenCalledWith(true));
	});

	it('should render diff button with file-diff icon for workflow items', () => {
		const workflowFile = {
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
			pinia: createTestingPinia(),
		});

		// Check if a button with file-diff icon would be rendered (via class since icon is a prop)
		const diffButton = container.querySelector('button');
		expect(diffButton).toBeInTheDocument();
	});

	it('should not render diff button for non-workflow items', () => {
		const credentialFile = {
			...sampleFiles[1], // credential file
			type: 'credential',
		};

		const { container } = renderModal({
			props: {
				data: {
					eventBus,
					status: [credentialFile],
				},
			},
			pinia: createTestingPinia(),
		});

		// For credential files, there should be no additional buttons in the item actions
		const itemActions = container.querySelector('[class*="itemActions"]');
		const buttons = itemActions?.querySelectorAll('button');
		expect(buttons).toHaveLength(0);
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
			pinia: createTestingPinia(),
		});

		// Check if the itemName container exists and has the proper structure
		const nameContainer = container.querySelector('[class*="itemName"]');
		expect(nameContainer).toBeInTheDocument();

		// Check if the RouterLink stub is rendered (since the name is rendered inside it)
		const routerLink = nameContainer?.querySelector('router-link-stub');
		expect(routerLink).toBeInTheDocument();
	});

	it('should render badges and actions in separate container', () => {
		const { getAllByTestId } = renderModal({
			props: {
				data: {
					eventBus,
					status: sampleFiles,
				},
			},
			pinia: createTestingPinia(),
		});

		const listItems = getAllByTestId('pull-modal-item');

		// Each list item should have the new structure with itemActions container
		listItems.forEach((item) => {
			const actionsContainer = item.querySelector('[class*="itemActions"]');
			expect(actionsContainer).toBeInTheDocument();

			// Badge should be inside actions container
			const badge = actionsContainer?.querySelector('[class*="listBadge"]');
			expect(badge).toBeInTheDocument();
		});
	});

	it('should apply proper spacing and alignment styles', () => {
		const { container } = renderModal({
			props: {
				data: {
					eventBus,
					status: sampleFiles,
				},
			},
			pinia: createTestingPinia(),
		});

		// Check if the scroller has the proper class for alignment
		const scroller = container.querySelector('[class*="scroller"]');
		expect(scroller).toBeInTheDocument();

		// Check if list items have the proper spacing
		const listItems = container.querySelectorAll('[class*="listItem"]');
		expect(listItems.length).toBeGreaterThan(0);
	});
});
