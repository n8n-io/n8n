import { describe, it, expect, vi } from 'vitest';
import { useWorkflowDocumentSharedWithProjects } from './useWorkflowDocumentSharedWithProjects';
import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';

function createSharedWithProjects() {
	return useWorkflowDocumentSharedWithProjects();
}

function createProject(overrides: Partial<ProjectSharingData> = {}): ProjectSharingData {
	return {
		id: 'project-1',
		name: 'Test Project',
		icon: null,
		type: 'team',
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
		...overrides,
	};
}

describe('useWorkflowDocumentSharedWithProjects', () => {
	describe('initial state', () => {
		it('should start with null', () => {
			const { sharedWithProjects } = createSharedWithProjects();
			expect(sharedWithProjects.value).toBeNull();
		});
	});

	describe('setSharedWithProjects', () => {
		it('should set projects and fire event hook', () => {
			const { sharedWithProjects, setSharedWithProjects, onSharedWithProjectsChange } =
				createSharedWithProjects();
			const hookSpy = vi.fn();
			onSharedWithProjectsChange(hookSpy);

			const projects = [createProject({ id: 'p1' }), createProject({ id: 'p2' })];
			setSharedWithProjects(projects);

			expect(sharedWithProjects.value).toEqual(projects);
			expect(hookSpy).toHaveBeenCalledWith({
				action: 'update',
				payload: { sharedWithProjects: projects },
			});
		});

		it('should replace existing projects entirely', () => {
			const { sharedWithProjects, setSharedWithProjects } = createSharedWithProjects();
			setSharedWithProjects([createProject({ id: 'p1' })]);

			const newProjects = [createProject({ id: 'p2' }), createProject({ id: 'p3' })];
			setSharedWithProjects(newProjects);

			expect(sharedWithProjects.value).toEqual(newProjects);
		});

		it('should allow setting empty array', () => {
			const { sharedWithProjects, setSharedWithProjects } = createSharedWithProjects();
			setSharedWithProjects([createProject({ id: 'p1' })]);

			setSharedWithProjects([]);

			expect(sharedWithProjects.value).toEqual([]);
		});
	});
});
