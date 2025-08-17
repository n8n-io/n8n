import { createComponentRenderer } from '@/__tests__/render';
import DataStoreCard from '@/features/dataStore/components/DataStoreCard.vue';
import { createPinia, setActivePinia } from 'pinia';
import type { DataStoreResource } from '@/features/dataStore/types';
import type { UserAction } from '@/Interface';
import type { IUser } from '@n8n/rest-api-client/api/users';

vi.mock('vue-router', () => {
	const push = vi.fn();
	const resolve = vi.fn().mockReturnValue({ href: '/projects/1/datastores/1' });
	return {
		useRouter: vi.fn().mockReturnValue({
			push,
			resolve,
		}),
		useRoute: vi.fn().mockReturnValue({
			params: {
				projectId: '1',
				id: '1',
			},
			query: {},
		}),
		RouterLink: vi.fn(),
	};
});

const DEFAULT_DATA_STORE: DataStoreResource = {
	id: '1',
	name: 'Test Data Store',
	sizeBytes: 1024,
	recordCount: 100,
	columns: [],
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	resourceType: 'datastore',
	projectId: '1',
} as const satisfies DataStoreResource;

const renderComponent = createComponentRenderer(DataStoreCard, {
	props: {
		dataStore: DEFAULT_DATA_STORE,
		actions: [
			{ label: 'Open', value: 'open', disabled: false },
			{ label: 'Delete', value: 'delete', disabled: false },
		] as const satisfies Array<UserAction<IUser>>,
		readOnly: false,
		showOwnershipBadge: false,
	},
	global: {
		stubs: {
			N8nLink: {
				template: '<div data-test-id="data-store-card-link"><slot /></div>',
			},
			TimeAgo: {
				template: '<span>just now</span>',
			},
		},
	},
});

describe('DataStoreCard', () => {
	let pinia: ReturnType<typeof createPinia>;

	beforeEach(async () => {
		pinia = createPinia();
		setActivePinia(pinia);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render data store info correctly', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('data-store-card-icon')).toBeInTheDocument();
		expect(getByTestId('datastore-name-input')).toHaveTextContent(DEFAULT_DATA_STORE.name);
		expect(getByTestId('data-store-card-record-count')).toBeInTheDocument();
		expect(getByTestId('data-store-card-column-count')).toBeInTheDocument();
		expect(getByTestId('data-store-card-last-updated')).toHaveTextContent('Last updated');
		expect(getByTestId('data-store-card-created')).toHaveTextContent('Created');
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

	it('should render correct route to data store details', () => {
		const wrapper = renderComponent();
		const link = wrapper.getByTestId('data-store-card-link');
		expect(link).toBeInTheDocument();
	});

	it('should display record count information', () => {
		const { getByTestId } = renderComponent();
		const recordCountElement = getByTestId('data-store-card-record-count');
		expect(recordCountElement).toBeInTheDocument();
	});

	it('should display column count information', () => {
		const { getByTestId } = renderComponent();
		const columnCountElement = getByTestId('data-store-card-column-count');
		expect(columnCountElement).toBeInTheDocument();
	});

	it('should display last updated information', () => {
		const { getByTestId } = renderComponent();
		const lastUpdatedElement = getByTestId('data-store-card-last-updated');
		expect(lastUpdatedElement).toBeInTheDocument();
	});

	it('should display created information', () => {
		const { getByTestId } = renderComponent();
		const createdElement = getByTestId('data-store-card-created');
		expect(createdElement).toBeInTheDocument();
	});
});
