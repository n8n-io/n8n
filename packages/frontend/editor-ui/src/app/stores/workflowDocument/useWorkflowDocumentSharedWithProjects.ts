import { ref, readonly } from 'vue';
import { createEventHook } from '@vueuse/core';
import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';
import { CHANGE_ACTION } from './types';
import type { ChangeAction, ChangeEvent } from './types';

export type SharedWithProjectsPayload = {
	sharedWithProjects: ProjectSharingData[];
};

export type SharedWithProjectsChangeEvent = ChangeEvent<SharedWithProjectsPayload>;

export function useWorkflowDocumentSharedWithProjects() {
	const sharedWithProjects = ref<ProjectSharingData[] | null>(null);

	const onSharedWithProjectsChange = createEventHook<SharedWithProjectsChangeEvent>();

	function applySharedWithProjects(
		projects: ProjectSharingData[],
		action: ChangeAction = CHANGE_ACTION.UPDATE,
	) {
		sharedWithProjects.value = projects;
		void onSharedWithProjectsChange.trigger({
			action,
			payload: { sharedWithProjects: projects },
		});
	}

	function setSharedWithProjects(projects: ProjectSharingData[]) {
		applySharedWithProjects(projects);
	}

	return {
		sharedWithProjects: readonly(sharedWithProjects),
		setSharedWithProjects,
		onSharedWithProjectsChange: onSharedWithProjectsChange.on,
	};
}
