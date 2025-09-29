import { reactive } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { mockedStore } from '@/__tests__/utils';
import { useSettingsStore } from '@/stores/settings.store';
import type { FrontendSettings } from '@n8n/api-types';
import userEvent from '@testing-library/user-event';
import { faker } from '@faker-js/faker';
import ExecutionsFilter from '@/components/executions/ExecutionsFilter.vue';
import type { IWorkflowShortResponse, ExecutionFilterType } from '@/Interface';
import { createComponentRenderer } from '@/__tests__/render';
import * as telemetryModule from '@/composables/useTelemetry';
import type { Telemetry } from '@/plugins/telemetry';

vi.mock('vue-router', () => ({
	useRoute: () =>
		reactive({
			location: {},
		}),
	RouterLink: vi.fn(),
}));

vi.mock('@/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: () => ({
		goToUpgrade: vi.fn(),
	}),
}));

vi.mock('@/components/AnnotationTagsDropdown.ee.vue', () => ({
	default: {
		name: 'AnnotationTagsDropdown',
		template: '<div data-test-id="executions-filter-annotation-tags-select"></div>',
	},
}));

vi.mock('@/components/WorkflowTagsDropdown.vue', () => ({
	default: {
		name: 'WorkflowTagsDropdown',
		template: '<div data-test-id="executions-filter-tags-select"></div>',
	},
}));

const defaultFilterState: ExecutionFilterType = {
	status: 'all',
	workflowId: 'all',
	tags: [],
	annotationTags: [],
	startDate: '',
	endDate: '',
	metadata: [{ key: '', value: '', exactMatch: false }],
	vote: 'all',
};

const workflowDataFactory = (): IWorkflowShortResponse => ({
	createdAt: faker.date.past().toDateString(),
	updatedAt: faker.date.past().toDateString(),
	id: faker.string.uuid(),
	name: faker.string.sample(),
	active: faker.datatype.boolean(),
	tags: [],
});

const workflowsData = Array.from({ length: 10 }, workflowDataFactory);

let renderComponent: ReturnType<typeof createComponentRenderer>;
let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;

describe('ExecutionsFilter', () => {
	beforeEach(() => {
		renderComponent = createComponentRenderer(ExecutionsFilter, {
			props: {
				teleported: false,
			},
			pinia: createTestingPinia(),
		});

		settingsStore = mockedStore(useSettingsStore);

		settingsStore.settings = {
			enterprise: {
				advancedExecutionFilters: true,
			},
		} as FrontendSettings;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	test('telemetry sent only once after component is mounted', async () => {
		const track = vi.fn();
		const spy = vi.spyOn(telemetryModule, 'useTelemetry');
		spy.mockImplementation(
			() =>
				({
					track,
				}) as unknown as Telemetry,
		);

		const { getByTestId } = renderComponent();
		await userEvent.click(getByTestId('executions-filter-button'));

		const customDataKeyInput = getByTestId('execution-filter-saved-data-key-input');

		await userEvent.type(customDataKeyInput, 'test');
		await userEvent.type(customDataKeyInput, 'key');

		expect(track).toHaveBeenCalledTimes(1);
	});

	test.each([
		['development', 'default', false, workflowsData],
		['development', 'default', true, workflowsData],
		['development', 'cloud', false, undefined],
		['development', 'cloud', true, undefined],
		['production', 'cloud', false, workflowsData],
		['production', 'cloud', true, undefined],
		['production', 'default', false, undefined],
		['production', 'default', true, workflowsData],
	])(
		'renders in %s environment on %s deployment with advancedExecutionFilters %s',
		async (_, __, advancedExecutionFilters, workflows) => {
			settingsStore.settings.enterprise.advancedExecutionFilters = advancedExecutionFilters;

			const { getByTestId, queryByTestId } = renderComponent({
				props: { workflows },
			});

			await userEvent.click(getByTestId('executions-filter-button'));
			await userEvent.hover(getByTestId('execution-filter-saved-data-key-input'));

			if (advancedExecutionFilters) {
				expect(queryByTestId('executions-filter-view-plans-link')).not.toBeVisible();
			}

			expect(queryByTestId('executions-filter-reset-button')).not.toBeInTheDocument();

			const select = queryByTestId('executions-filter-workflows-select');
			if (workflows && workflows.length > 0) {
				expect(select).toBeVisible();
			} else {
				expect(select).not.toBeInTheDocument();
			}
		},
	);

	test('state change', async () => {
		const { getByTestId, queryByTestId, emitted } = renderComponent();

		let filterChangedEvent = emitted().filterChanged;

		expect(getByTestId('execution-filter-form')).not.toBeVisible();
		expect(queryByTestId('executions-filter-reset-button')).not.toBeInTheDocument();
		expect(queryByTestId('execution-filter-badge')).not.toBeInTheDocument();

		await userEvent.click(getByTestId('executions-filter-button'));
		expect(getByTestId('execution-filter-form')).toBeVisible();

		await userEvent.click(getByTestId('executions-filter-status-select'));

		await userEvent.click(getByTestId('executions-filter-status-select').querySelectorAll('li')[1]);
		filterChangedEvent = emitted().filterChanged;

		expect(filterChangedEvent).toHaveLength(1);
		expect(filterChangedEvent[0]).toEqual([{ ...defaultFilterState, status: 'error' }]);
		expect(getByTestId('executions-filter-reset-button')).toBeInTheDocument();
		expect(getByTestId('execution-filter-badge')).toBeInTheDocument();

		await userEvent.click(getByTestId('executions-filter-reset-button'));
		filterChangedEvent = emitted().filterChanged;

		expect(filterChangedEvent).toHaveLength(2);
		expect(filterChangedEvent[1]).toEqual([defaultFilterState]);
		expect(queryByTestId('executions-filter-reset-button')).not.toBeInTheDocument();
		expect(queryByTestId('execution-filter-badge')).not.toBeInTheDocument();
	});

	test('shows annotation filters when advanced filters are enabled', async () => {
		const { getByTestId, queryByTestId } = renderComponent();

		await userEvent.click(getByTestId('executions-filter-button'));

		expect(queryByTestId('executions-filter-annotation-tags-select')).toBeInTheDocument();
		expect(queryByTestId('executions-filter-annotation-vote-select')).toBeInTheDocument();
	});

	test('hides annotation filters when advanced filters are disabled', async () => {
		settingsStore.settings.enterprise.advancedExecutionFilters = false;

		const { getByTestId, queryByTestId } = renderComponent();

		await userEvent.click(getByTestId('executions-filter-button'));

		expect(queryByTestId('executions-filter-annotation-tags-select')).not.toBeInTheDocument();
		expect(queryByTestId('executions-filter-annotation-vote-select')).not.toBeInTheDocument();
	});

	test('tracks telemetry for custom data filter usage', async () => {
		const track = vi.fn();
		const spy = vi.spyOn(telemetryModule, 'useTelemetry');
		spy.mockImplementation(
			() =>
				({
					track,
				}) as unknown as Telemetry,
		);

		const { getByTestId } = renderComponent();

		await userEvent.click(getByTestId('executions-filter-button'));

		const keyInput = getByTestId('execution-filter-saved-data-key-input');

		// Verify the input is not disabled
		expect(keyInput).not.toBeDisabled();

		await userEvent.type(keyInput, 'custom-key');

		expect(track).toHaveBeenCalledWith('User filtered executions with custom data');
		expect(track).toHaveBeenCalledTimes(1);
	});

	test('handles metadata value input changes', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('executions-filter-button'));

		const valueInput = getByTestId('execution-filter-saved-data-value-input');
		await userEvent.type(valueInput, 'test-value');

		const filterChangedEvents = emitted().filterChanged;
		expect(filterChangedEvents).toBeDefined();
		expect(filterChangedEvents.length).toBeGreaterThan(0);
	});

	test('handles exact match checkbox changes', async () => {
		const { getByTestId, emitted } = renderComponent();

		await userEvent.click(getByTestId('executions-filter-button'));

		const checkbox = getByTestId('execution-filter-saved-data-exact-match-checkbox');
		await userEvent.click(checkbox);

		const filterChangedEvents = emitted().filterChanged;
		expect(filterChangedEvents).toBeDefined();
		expect(filterChangedEvents.length).toBeGreaterThan(0);
	});

	test('shows upgrade link when advanced filters disabled', async () => {
		settingsStore.settings.enterprise.advancedExecutionFilters = false;

		const { getByTestId } = renderComponent();

		await userEvent.click(getByTestId('executions-filter-button'));
		await userEvent.hover(getByTestId('execution-filter-saved-data-key-input'));

		const upgradeLink = getByTestId('executions-filter-view-plans-link');
		expect(upgradeLink).toBeInTheDocument();
		expect(upgradeLink).toHaveAttribute('href', '#');
	});
});
