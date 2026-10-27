import { ref, readonly } from 'vue';
import { createEventHook } from '@vueuse/core';
import type { ProjectSharingData } from '@/features/collaboration/projects/projects.types';
import { CHANGE_ACTION } from './types';
import type { ChangeAction, ChangeEvent } from './types';

export type HomeProjectChangeEvent = ChangeEvent<ProjectSharingData | null>;

export function useWorkflowDocumentHomeProject() {
	const homeProject = ref<ProjectSharingData | null>(null);

	const onHomeProjectChange = createEventHook<HomeProjectChangeEvent>();

	function applyHomeProject(
		data: ProjectSharingData | null,
		action: ChangeAction = CHANGE_ACTION.UPDATE,
	) {
		homeProject.value = data;
		void onHomeProjectChange.trigger({ action, payload: data });
	}

	function setHomeProject(data: ProjectSharingData | null) {
		applyHomeProject(data);
	}

	return {
		homeProject: readonly(homeProject),
		setHomeProject,
		onHomeProjectChange: onHomeProjectChange.on,
	};
}
