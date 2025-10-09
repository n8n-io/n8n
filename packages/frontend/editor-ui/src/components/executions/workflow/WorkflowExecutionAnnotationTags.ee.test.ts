import { describe, expect, vi } from 'vitest';

import userEvent from '@testing-library/user-event';
import { faker } from '@faker-js/faker';
import type { ExecutionSummary, AnnotationVote } from 'n8n-workflow';
import WorkflowExecutionAnnotationTags from '@/components/executions/workflow/WorkflowExecutionAnnotationTags.ee.vue';
import { EnterpriseEditionFeature } from '@/constants';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { STORES } from '@n8n/stores';
import { nextTick } from 'vue';

const showError = vi.fn();
vi.mock('@/composables/useToast', () => ({
	useToast: () => ({ showError }),
}));

const mockTrack = vi.fn();
vi.mock('@/composables/useTelemetry', () => ({
	useTelemetry: () => ({
		track: mockTrack,
	}),
}));

const executionDataFactory = (
	tags: Array<{ id: string; name: string }> = [],
): ExecutionSummary => ({
	id: faker.string.uuid(),
	finished: faker.datatype.boolean(),
	mode: faker.helpers.arrayElement(['manual', 'trigger']),
	createdAt: faker.date.past(),
	startedAt: faker.date.past(),
	stoppedAt: faker.date.past(),
	workflowId: faker.number.int().toString(),
	workflowName: faker.string.sample(),
	status: faker.helpers.arrayElement(['error', 'success']),
	nodeExecutionStatus: {},
	retryOf: null,
	retrySuccessId: null,
	annotation: { tags, vote: 'up' },
});

const renderComponent = createComponentRenderer(WorkflowExecutionAnnotationTags);

describe('WorkflowExecutionAnnotationTags.ee.vue', () => {
	const executionData: ExecutionSummary = executionDataFactory();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('displays existing tags', async () => {
		const executionWithTags = {
			...executionData,
			annotation: {
				tags: [
					{ id: 'tag1', name: 'Test Tag 1' },
					{ id: 'tag2', name: 'Test Tag 2' },
				],
				vote: 'up' as AnnotationVote,
			},
		};

		const pinia = createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: {
						enterprise: {
							[EnterpriseEditionFeature.AdvancedExecutionFilters]: true,
						},
					},
				},
			},
		});

		const { getByTestId, queryByTestId } = renderComponent({
			pinia,
			props: { execution: executionWithTags },
		});

		await nextTick();

		expect(getByTestId('annotation-tags-container')).toBeInTheDocument();
		expect(getByTestId('execution-annotation-tags')).toBeInTheDocument();
		expect(queryByTestId('workflow-tags-dropdown')).not.toBeInTheDocument();
		expect(getByTestId('execution-annotation-tags')).toHaveTextContent('Test Tag 1');
		expect(getByTestId('execution-annotation-tags')).toHaveTextContent('Test Tag 2');
	});

	it('shows add tag button when no tags exist', async () => {
		const executionWithoutTags = {
			...executionData,
			annotation: {
				tags: [],
				vote: 'up' as AnnotationVote,
			},
		};

		const pinia = createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: {
						enterprise: {
							[EnterpriseEditionFeature.AdvancedExecutionFilters]: true,
						},
					},
				},
			},
		});

		const { getByTestId, queryByTestId } = renderComponent({
			pinia,
			props: { execution: executionWithoutTags },
		});

		await nextTick();

		expect(getByTestId('new-tag-link')).toBeInTheDocument();
		expect(queryByTestId('execution-annotation-tags')).not.toBeInTheDocument();
	});

	it('shows existing tags with add button when tags exist', async () => {
		const executionWithTags = {
			...executionData,
			annotation: {
				tags: [{ id: 'tag1', name: 'Test Tag 1' }],
				vote: 'up' as AnnotationVote,
			},
		};

		const pinia = createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: {
						enterprise: {
							[EnterpriseEditionFeature.AdvancedExecutionFilters]: true,
						},
					},
				},
			},
		});

		const { getByTestId } = renderComponent({
			pinia,
			props: { execution: executionWithTags },
		});

		await nextTick();

		expect(getByTestId('execution-annotation-tags')).toBeInTheDocument();
		expect(getByTestId('new-tag-link')).toBeInTheDocument();
	});

	it('enables tag editing when add button is clicked', async () => {
		const executionWithoutTags = {
			...executionData,
			annotation: { tags: [], vote: 'up' as AnnotationVote },
		};

		const pinia = createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: {
						enterprise: {
							[EnterpriseEditionFeature.AdvancedExecutionFilters]: true,
						},
					},
				},
			},
		});

		const { getByTestId, queryByTestId } = renderComponent({
			pinia,
			props: { execution: executionWithoutTags },
		});

		await nextTick();

		const addTagButton = getByTestId('new-tag-link');
		expect(addTagButton).toBeInTheDocument();

		expect(queryByTestId('workflow-tags-dropdown')).not.toBeInTheDocument();

		await userEvent.click(addTagButton);

		expect(getByTestId('workflow-tags-dropdown')).toBeInTheDocument();
	});

	it('enables tag editing when existing tags are clicked', async () => {
		const executionWithTags = {
			...executionData,
			annotation: {
				tags: [{ id: 'tag1', name: 'Test Tag 1' }],
				vote: 'up' as AnnotationVote,
			},
		};

		const pinia = createTestingPinia({
			initialState: {
				[STORES.SETTINGS]: {
					settings: {
						enterprise: {
							[EnterpriseEditionFeature.AdvancedExecutionFilters]: true,
						},
					},
				},
			},
		});

		const { getByTestId, queryByTestId } = renderComponent({
			pinia,
			props: { execution: executionWithTags },
		});

		await nextTick();

		const tagsContainer = getByTestId('execution-annotation-tags');
		expect(tagsContainer).toBeInTheDocument();

		expect(queryByTestId('workflow-tags-dropdown')).not.toBeInTheDocument();

		await userEvent.click(tagsContainer);

		expect(getByTestId('workflow-tags-dropdown')).toBeInTheDocument();
	});
});
