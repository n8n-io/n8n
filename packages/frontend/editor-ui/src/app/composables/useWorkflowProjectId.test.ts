import { shallowRef } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useWorkflowProjectId } from './useWorkflowProjectId';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { Project } from '@/features/collaboration/projects/projects.types';
import { mockedStore } from '@/__tests__/utils';

const mockWorkflowDocumentStore = vi.hoisted(() => ({
	homeProject: null as { id: string } | null,
}));
vi.mock('@/app/stores/workflowDocument.store', () => ({
	injectWorkflowDocumentStore: () => shallowRef(mockWorkflowDocumentStore),
}));

describe('useWorkflowProjectId', () => {
	let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		projectsStore = mockedStore(useProjectsStore);
		projectsStore.personalProject = { id: 'personal-project' } as Project;
	});

	it.each([
		{
			homeProject: { id: 'home-project' },
			currentProjectId: 'current-project',
			expected: 'home-project',
		},
		{ homeProject: null, currentProjectId: 'current-project', expected: 'current-project' },
		{ homeProject: null, currentProjectId: null, expected: 'personal-project' },
	])('resolves $expected', ({ homeProject, currentProjectId, expected }) => {
		mockWorkflowDocumentStore.homeProject = homeProject;
		projectsStore.currentProjectId = currentProjectId as unknown as string;

		expect(useWorkflowProjectId().value).toBe(expected);
	});
});
