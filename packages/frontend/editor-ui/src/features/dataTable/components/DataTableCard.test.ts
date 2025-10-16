import { createComponentRenderer } from '@/__tests__/render';
import DataTableCard from '@/features/dataTable/components/DataTableCard.vue';
import { createPinia, setActivePinia } from 'pinia';
import type { DataTableResource } from '@/features/dataTable/types';

vi.mock('@/features/projects/projects.store');

vi.mock('vue-router', async () => {
	const { reactive } = await import('vue');
	const mockRoute = reactive({
		params: {
			projectId: '1',
			id: '1',
		},
		query: {},
	});

	const push = vi.fn();
	const resolve = vi.fn().mockReturnValue({ href: '/projects/1/datatables/1' });
	return {
		useRouter: vi.fn().mockReturnValue({
			push,
			resolve,
		}),
		useRoute: vi.fn(() => mockRoute),
		RouterLink: vi.fn(),
	};
});

const DEFAULT_DATA_TABLE: DataTableResource = {
	id: '1',
	name: 'Test Data Table',
	sizeBytes: 1024,
	columns: [],
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	resourceType: 'dataTable',
	projectId: '1',
} as const satisfies DataTableResource;

const renderComponent = createComponentRenderer(DataTableCard, {
	props: {
		dataTable: DEFAULT_DATA_TABLE,
		readOnly: false,
		showOwnershipBadge: false,
	},
	global: {
		stubs: {
			N8nLink: {
				template: '<a :href="href" data-test-id="data-table-card-link"><slot /></a>',
				props: ['to'],
				computed: {
					href() {
						// Generate href from the route object
						if (this.to && typeof this.to === 'object') {
							return `/projects/${this.to.params.projectId}/datatables/${this.to.params.id}`;
						}
						return '#';
					},
				},
			},
			TimeAgo: {
				template: '<span>just now</span>',
			},
		},
	},
});

describe('DataTableCard', () => {
	let pinia: ReturnType<typeof createPinia>;

	beforeEach(async () => {
		pinia = createPinia();
		setActivePinia(pinia);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render data table info correctly', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('data-table-card-icon')).toBeInTheDocument();
		expect(getByTestId('data-table-card-name')).toHaveTextContent(DEFAULT_DATA_TABLE.name);
		expect(getByTestId('data-table-card-column-count')).toBeInTheDocument();
		expect(getByTestId('data-table-card-last-updated')).toHaveTextContent('Last updated');
		expect(getByTestId('data-table-card-created')).toHaveTextContent('Created');
	});

	it('should not render readonly badge when not readonly', () => {
		const { queryByText } = renderComponent();
		expect(queryByText('Read only')).not.toBeInTheDocument();
	});

	it('should render readonly badge when readonly', () => {
		const { getByText } = renderComponent({
			props: {
				readOnly: true,
			},
		});
		expect(getByText('Read only')).toBeInTheDocument();
	});

	it('should render correct route to data table details', () => {
		const wrapper = renderComponent();
		const link = wrapper.getByTestId('data-table-card-link');
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute(
			'href',
			`/projects/${DEFAULT_DATA_TABLE.projectId}/datatables/${DEFAULT_DATA_TABLE.id}`,
		);
	});

	it('should display column count information', () => {
		const { getByTestId } = renderComponent();
		const columnCountElement = getByTestId('data-table-card-column-count');
		expect(columnCountElement).toBeInTheDocument();
		expect(columnCountElement).toHaveTextContent(`${DEFAULT_DATA_TABLE.columns.length + 1}`);
	});
});
