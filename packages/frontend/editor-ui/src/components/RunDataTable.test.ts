import { createComponentRenderer } from '@/__tests__/render';
import RunDataTable from '@/components/RunDataTable.vue';
import { createTestingPinia } from '@pinia/testing';
import { cleanup } from '@testing-library/vue';

vi.mock('vue-router', () => {
	const push = vi.fn();
	const resolve = vi.fn().mockReturnValue({ href: 'https://test.com' });
	return {
		useRouter: () => ({
			push,
			resolve,
		}),
		useRoute: () => ({}),
		RouterLink: vi.fn(),
	};
});

const { trackOpeningRelatedExecution, resolveRelatedExecutionUrl } = vi.hoisted(() => ({
	trackOpeningRelatedExecution: vi.fn(),
	resolveRelatedExecutionUrl: vi.fn().mockReturnValue('https://test.com'),
}));

vi.mock('@/composables/useExecutionHelpers', () => ({
	useExecutionHelpers: () => ({
		trackOpeningRelatedExecution,
		resolveRelatedExecutionUrl,
	}),
}));

const renderComponent = createComponentRenderer(RunDataTable, {
	props: {
		node: {
			parameters: {
				keepOnlySet: false,
				values: {},
				options: {},
			},
			id: '820ea733-d8a6-4379-8e73-88a2347ea003',
			name: 'Set',
			type: 'n8n-nodes-base.set',
			typeVersion: 1,
			position: [380, 1060],
			disabled: false,
		},
		distanceFromActive: 0,
		pageOffset: 0,
		runIndex: 0,
		totalRuns: 0,
		mappingEnabled: false,
		hasDefaultHoverState: false,
		search: '',
	},
	global: {
		plugins: [createTestingPinia()],
	},
});

describe('RunDataTable.vue', () => {
	beforeEach(cleanup);

	it('renders empty table correctly', () => {
		const emptyInputData = [
			{
				json: {},
				index: 0,
				pairedItem: { item: 0 },
				metadata: { subExecution: { executionId: '123', workflowId: '123abcd' } },
			},
			,
		];
		const emptyMessage = "This is an item, but it's empty.";

		const { getByTestId, getByText } = renderComponent({
			props: {
				inputData: emptyInputData,
			},
		});
		expect(getByText(emptyMessage)).toBeInTheDocument();
		// Sub-execution button should be link (ADO-3057)
		expect(getByTestId('debug-sub-execution')).toBeInTheDocument();
		expect(getByTestId('debug-sub-execution').tagName).toBe('A');
		expect(getByTestId('debug-sub-execution').getAttribute('href')).toBe('https://test.com');
	});

	it('renders table with items correctly', () => {
		const inputData = {
			json: { firstName: 'John', lastName: 'Doe' },
			index: 0,
			pairedItem: { item: 0 },
			metadata: { subExecution: { executionId: '123', workflowId: '123abcd' } },
		};
		const { getByTestId, getAllByText } = renderComponent({
			props: {
				inputData: [inputData],
			},
		});
		expect(getByTestId('debug-sub-execution')).toBeInTheDocument();
		expect(getByTestId('debug-sub-execution').tagName).toBe('A');
		expect(getByTestId('debug-sub-execution').getAttribute('href')).toBe('https://test.com');
		// All keys from the input data should be rendered
		Object.keys(inputData.json).forEach((key) => {
			expect(getAllByText(key)).not.toHaveLength(0);
		});
		// Also, all values from the input data should be rendered
		Object.values(inputData.json).forEach((value) => {
			expect(getAllByText(value)).not.toHaveLength(0);
		});
	});
});
