import { vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { faker } from '@faker-js/faker';
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowHistoryList from '@/components/WorkflowHistory/WorkflowHistoryList.vue';
import type { WorkflowHistory, WorkflowHistoryActionTypes } from '@/types/workflowHistory';

vi.stubGlobal(
	'IntersectionObserver',
	vi.fn(() => ({
		disconnect: vi.fn(),
		observe: vi.fn(),
		takeRecords: vi.fn(),
		unobserve: vi.fn(),
	})),
);

const workflowHistoryDataFactory: () => WorkflowHistory = () => ({
	versionId: faker.string.nanoid(),
	createdAt: faker.date.past().toDateString(),
	authors: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, faker.person.fullName).join(
		', ',
	),
});

const actionTypes: WorkflowHistoryActionTypes = ['restore', 'clone', 'open', 'download'];

const renderComponent = createComponentRenderer(WorkflowHistoryList);

let pinia: ReturnType<typeof createPinia>;

describe('WorkflowHistoryList', () => {
	beforeEach(() => {
		pinia = createPinia();
		setActivePinia(pinia);
	});

	it('should render empty workflow history list', () => {
		const { getByText } = renderComponent({
			pinia,
			props: {
				items: [],
				actionTypes,
				activeItem: null,
				requestNumberOfItems: 20,
			},
		});

		expect(getByText(/No versions yet/)).toBeInTheDocument();
	});

	it('should render workflow history list', () => {
		const numberOfItems = Math.floor(Math.random() * 20) + 1;
		const items = Array.from({ length: numberOfItems }, workflowHistoryDataFactory);

		const { getAllByTestId } = renderComponent({
			pinia,
			props: {
				items,
				actionTypes,
				activeItem: null,
				requestNumberOfItems: 20,
			},
		});

		expect(getAllByTestId('workflow-history-list-item')).toHaveLength(numberOfItems);
	});
});
