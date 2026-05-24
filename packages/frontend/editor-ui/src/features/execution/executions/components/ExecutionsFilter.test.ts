import { reactive } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import { mockedStore, getTooltip, hoverTooltipTrigger } from '@/__tests__/utils';
import { useSettingsStore } from '@/app/stores/settings.store';
import type { FrontendSettings } from '@n8n/api-types';
import userEvent from '@testing-library/user-event';
import { faker } from '@faker-js/faker';
import ExecutionsFilter from '../components/ExecutionsFilter.vue';
import type { IWorkflowShortResponse } from '@/Interface';
import type { ExecutionFilterType } from '../executions.types';
import { createComponentRenderer } from '@/__tests__/render';
import * as telemetryModule from '@/app/composables/useTelemetry';
import type { Telemetry } from '@/app/plugins/telemetry';
import type { MockInstance } from 'vitest';
import * as restApiClient from '@n8n/rest-api-client';

vi.mock('@n8n/rest-api-client');

vi.mock('vue-router', () => ({
	useRoute: () =>
		reactive({
			location: {},
		}),
	RouterLink: vi.fn(),
}));

vi.mock('@/app/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: () => ({
		goToUpgrade: vi.fn(),
	}),
}));

vi.mock('@/features/shared/tags/components/AnnotationTagsDropdown.ee.vue', () => ({
	default: {
		name: 'AnnotationTagsDropdown',
		template: '<div data-test-id="executions-filter-annotation-tags-select"></div>',
	},
}));

vi.mock('@/features/shared/tags/components/WorkflowTagsDropdown.vue', () => ({
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
	workflowVersionId: 'all',
};

const workflowDataFactory = (): IWorkflowShortResponse => ({
	createdAt: faker.date.past().toDateString(),
	updatedAt: faker.date.past().toDateString(),
	id: faker.string.uuid(),
	name: faker.string.sample(),
	active: false,
	activeVersionId: null,
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
				expect(queryByTestId('executions-filter-view-plans-link')).not.toBeInTheDocument();
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

		// Initial state: no active filters
		expect(queryByTestId('execution-filter-form')).not.toBeInTheDocument();
		expect(queryByTestId('executions-filter-reset-button')).not.toBeInTheDocument();
		expect(queryByTestId('execution-filter-badge')).not.toBeInTheDocument();

		// Open filter popover
		await userEvent.click(getByTestId('executions-filter-button'));
		expect(getByTestId('execution-filter-form')).toBeInTheDocument();

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

		// Verify the input field is present
		const keyInput = getByTestId('execution-filter-saved-data-key-input');
		expect(keyInput).toBeInTheDocument();

		// Hover and verify tooltip shows upgrade message
		await hoverTooltipTrigger(keyInput);
		await waitFor(() => {
			const tooltip = getTooltip();
			expect(tooltip).toHaveTextContent('Upgrade plan to filter executions by custom data');
			expect(tooltip).toHaveTextContent('View plans');
		});
	});

	describe('version filter', () => {
		const workflowId = faker.string.uuid();

		type ExecutionVersion = { versionId: string; name: string | null; createdAt: string };
		const makeVersions = (count: number): ExecutionVersion[] =>
			Array.from({ length: count }, (_, i) => ({
				versionId: faker.string.uuid(),
				createdAt: `2025-10-${String(10 + i).padStart(2, '0')}T10:00:00.000Z`,
				name: i === 0 ? 'Named version' : null,
			}));

		let makeRestApiRequestSpy: MockInstance;

		beforeEach(() => {
			makeRestApiRequestSpy = vi.spyOn(restApiClient, 'makeRestApiRequest');
		});

		it('should not show version select when no workflowId is provided', async () => {
			const { getByTestId, queryByTestId } = renderComponent();

			await userEvent.click(getByTestId('executions-filter-button'));

			expect(queryByTestId('executions-filter-version-select')).not.toBeInTheDocument();
		});

		it('should show version select when workflowId is provided and versions exist', async () => {
			makeRestApiRequestSpy.mockResolvedValue(makeVersions(3));

			const { getByTestId } = renderComponent({
				props: { workflowId },
			});

			await userEvent.click(getByTestId('executions-filter-button'));
			await waitFor(() => {
				expect(getByTestId('executions-filter-version-select')).toBeInTheDocument();
			});
		});

		it('should show disabled version select when version fetch returns empty', async () => {
			makeRestApiRequestSpy.mockResolvedValue([]);

			const { getByTestId } = renderComponent({
				props: { workflowId },
			});

			await userEvent.click(getByTestId('executions-filter-button'));
			await waitFor(() => {
				expect(makeRestApiRequestSpy).toHaveBeenCalled();
			});
			await waitFor(() => {
				const select = getByTestId('executions-filter-version-select');
				expect(select).toBeInTheDocument();
				expect(select.querySelector('.is-disabled')).toBeTruthy();
			});
		});

		it('should emit filter with workflowVersionId when a version is selected', async () => {
			const versions = makeVersions(2);
			makeRestApiRequestSpy.mockResolvedValue(versions);

			const { getByTestId, emitted } = renderComponent({
				props: { workflowId },
			});

			await userEvent.click(getByTestId('executions-filter-button'));
			await waitFor(() => {
				expect(getByTestId('executions-filter-version-select')).toBeInTheDocument();
			});

			await userEvent.click(getByTestId('executions-filter-version-select'));
			const options = getByTestId('executions-filter-version-select').querySelectorAll('li');
			// First option is "Any version"
			await userEvent.click(options[1]);

			const filterChangedEvents = emitted().filterChanged;
			expect(filterChangedEvents).toBeDefined();
			const lastEvent = filterChangedEvents[filterChangedEvents.length - 1] as [
				ExecutionFilterType,
			];
			expect(lastEvent[0].workflowVersionId).toBe(versions[0].versionId);
		});

		it('should show loading spinner while versions are being fetched', async () => {
			const { promise, resolve } = Promise.withResolvers<ExecutionVersion[]>();
			makeRestApiRequestSpy.mockReturnValue(promise);

			const { getByTestId } = renderComponent({
				props: { workflowId },
			});

			await userEvent.click(getByTestId('executions-filter-button'));

			// While loading: select should be disabled with a spinner
			await waitFor(() => {
				const select = getByTestId('executions-filter-version-select');
				expect(select).toBeInTheDocument();
				expect(select.querySelector('.is-disabled')).toBeTruthy();
				expect(select.querySelector('.n8n-icon')).toBeInTheDocument();
			});

			// Resolve the request
			resolve(makeVersions(2));

			// After loading: select should be enabled without spinner
			await waitFor(() => {
				const select = getByTestId('executions-filter-version-select');
				expect(select.querySelector('.is-disabled')).toBeFalsy();
			});
		});

		it('should not fetch versions until filter popover is opened', () => {
			makeRestApiRequestSpy.mockResolvedValue(makeVersions(2));

			renderComponent({
				props: { workflowId },
			});

			expect(makeRestApiRequestSpy).not.toHaveBeenCalled();
		});

		it('should fetch versions only once across multiple popover opens after success', async () => {
			makeRestApiRequestSpy.mockResolvedValue(makeVersions(2));

			const { getByTestId } = renderComponent({
				props: { workflowId },
			});

			// Open popover — triggers fetch
			await userEvent.click(getByTestId('executions-filter-button'));
			await waitFor(() => {
				expect(makeRestApiRequestSpy).toHaveBeenCalledTimes(1);
			});

			// Close and reopen popover — should not fetch again
			await userEvent.click(getByTestId('executions-filter-button'));
			await userEvent.click(getByTestId('executions-filter-button'));

			expect(makeRestApiRequestSpy).toHaveBeenCalledTimes(1);
		});

		it('should show enabled select when versions are loaded', async () => {
			makeRestApiRequestSpy.mockResolvedValue(makeVersions(3));

			const { getByTestId } = renderComponent({
				props: { workflowId },
			});

			await userEvent.click(getByTestId('executions-filter-button'));
			await waitFor(() => {
				const select = getByTestId('executions-filter-version-select');
				expect(select).toBeInTheDocument();
				expect(select.querySelector('.is-disabled')).toBeFalsy();
			});
		});

		it('should show disabled version select when version fetch fails', async () => {
			makeRestApiRequestSpy.mockRejectedValue(new Error('Not found'));

			const { getByTestId } = renderComponent({
				props: { workflowId },
			});

			await userEvent.click(getByTestId('executions-filter-button'));
			await waitFor(() => {
				expect(makeRestApiRequestSpy).toHaveBeenCalled();
			});
			await waitFor(() => {
				const select = getByTestId('executions-filter-version-select');
				expect(select).toBeInTheDocument();
				expect(select.querySelector('.is-disabled')).toBeTruthy();
			});
		});

		it('should retry fetching versions after a failed attempt', async () => {
			makeRestApiRequestSpy.mockRejectedValueOnce(new Error('Not found'));

			const { getByTestId } = renderComponent({
				props: { workflowId },
			});

			// First open — fetch fails
			await userEvent.click(getByTestId('executions-filter-button'));
			await waitFor(() => {
				expect(makeRestApiRequestSpy).toHaveBeenCalledTimes(1);
			});

			// Close and reopen — should retry
			makeRestApiRequestSpy.mockResolvedValue(makeVersions(2));
			await userEvent.click(getByTestId('executions-filter-button'));
			await userEvent.click(getByTestId('executions-filter-button'));

			await waitFor(() => {
				expect(makeRestApiRequestSpy).toHaveBeenCalledTimes(2);
			});
			await waitFor(() => {
				const select = getByTestId('executions-filter-version-select');
				expect(select.querySelector('.is-disabled')).toBeFalsy();
			});
		});
	});
});
