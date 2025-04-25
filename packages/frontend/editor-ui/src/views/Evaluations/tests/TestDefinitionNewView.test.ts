import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import TestDefinitionNewView from '@/views/Evaluations/TestDefinitionNewView.vue';
import { ref } from 'vue';
import { mockedStore } from '@/__tests__/utils';
import { useTestDefinitionStore } from '@/stores/testDefinition.store.ee';
import { useAnnotationTagsStore } from '@/stores/tags.store';
import { useRoute } from 'vue-router';
import { useExecutionsStore } from '@/stores/executions.store';
import { waitFor } from '@testing-library/vue';

const workflowId = 'workflow_id';
const testId = 'test_id';

const mockedForm = {
	state: ref({ tags: { value: [] }, name }),
	createTest: vi.fn().mockResolvedValue({
		id: testId,
		name: 'test_name',
		workflowId,
		createdAt: '',
	}),
	updateTest: vi.fn().mockResolvedValue({}),
};
vi.mock('@/components/Evaluations/composables/useTestDefinitionForm', () => ({
	useTestDefinitionForm: vi.fn().mockImplementation(() => mockedForm),
}));

const mockReplace = vi.fn();
vi.mock('vue-router', async (importOriginal) => ({
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	...(await importOriginal<typeof import('vue-router')>()),
	useRoute: vi.fn().mockReturnValue({}),
	useRouter: vi.fn(() => ({
		replace: mockReplace,
	})),
}));

describe('TestDefinitionRootView', () => {
	const renderComponent = createComponentRenderer(TestDefinitionNewView);

	beforeEach(() => {
		createTestingPinia();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should create a test adn redirect', async () => {
		const testDefinitionStore = mockedStore(useTestDefinitionStore);
		const annotationTagsStore = mockedStore(useAnnotationTagsStore);

		annotationTagsStore.create.mockResolvedValueOnce({ id: 'tag_id', name: 'tag_name' });
		renderComponent({ props: { name: workflowId } });

		expect(mockedForm.createTest).toHaveBeenCalledWith(workflowId);
		await waitFor(() =>
			expect(testDefinitionStore.updateRunFieldIssues).toHaveBeenCalledWith(testId),
		);

		expect(mockReplace).toHaveBeenCalledWith(
			expect.objectContaining({
				params: {
					testId,
				},
			}),
		);
	});

	it('should assign an execution to a test', async () => {
		(useRoute as Mock).mockReturnValue({
			query: { executionId: 'execution_id', annotationTags: ['2', '3'] },
		});
		const annotationTagsStore = mockedStore(useAnnotationTagsStore);
		const executionsStore = mockedStore(useExecutionsStore);

		annotationTagsStore.create.mockResolvedValueOnce({ id: 'tag_id', name: 'tag_name' });
		renderComponent({ props: { name: workflowId } });

		await waitFor(() =>
			expect(executionsStore.annotateExecution).toHaveBeenCalledWith('execution_id', {
				tags: ['2', '3', 'tag_id'],
			}),
		);
	});
});
