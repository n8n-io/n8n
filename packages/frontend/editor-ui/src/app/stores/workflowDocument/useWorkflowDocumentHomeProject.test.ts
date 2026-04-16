import { describe, it, expect, vi } from 'vitest';
import { useWorkflowDocumentHomeProject } from './useWorkflowDocumentHomeProject';
import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';

const mockProject: ProjectSharingData = {
	id: 'project-1',
	name: 'Test Project',
	icon: null,
	type: 'team',
	createdAt: '2024-01-01',
	updatedAt: '2024-01-01',
};

const mockPersonalProject: ProjectSharingData = {
	id: 'project-2',
	name: 'Personal',
	icon: null,
	type: 'personal',
	createdAt: '2024-01-01',
	updatedAt: '2024-01-01',
};

function createHomeProject() {
	return useWorkflowDocumentHomeProject();
}

describe('useWorkflowDocumentHomeProject', () => {
	describe('initial state', () => {
		it('should start with null homeProject', () => {
			const { homeProject } = createHomeProject();
			expect(homeProject.value).toBeNull();
		});
	});

	describe('setHomeProject', () => {
		it('should set homeProject and fire event hook', () => {
			const { homeProject, setHomeProject, onHomeProjectChange } = createHomeProject();
			const hookSpy = vi.fn();
			onHomeProjectChange(hookSpy);

			setHomeProject(mockProject);

			expect(homeProject.value).toEqual(mockProject);
			expect(hookSpy).toHaveBeenCalledWith({
				action: 'update',
				payload: mockProject,
			});
		});

		it('should clear homeProject', () => {
			const { homeProject, setHomeProject } = createHomeProject();
			setHomeProject(mockProject);

			setHomeProject(null);

			expect(homeProject.value).toBeNull();
		});

		it('should replace existing homeProject', () => {
			const { homeProject, setHomeProject } = createHomeProject();
			setHomeProject(mockProject);

			setHomeProject(mockPersonalProject);

			expect(homeProject.value).toEqual(mockPersonalProject);
		});

		it('should fire event hook on every call', () => {
			const { setHomeProject, onHomeProjectChange } = createHomeProject();
			const hookSpy = vi.fn();
			onHomeProjectChange(hookSpy);

			setHomeProject(mockProject);
			setHomeProject(null);

			expect(hookSpy).toHaveBeenCalledTimes(2);
		});
	});
});
