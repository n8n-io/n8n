import { getResourcePermissions } from '@n8n/permissions';
import { useUsersStore } from '@n8n/stores/users.store';
import { createSharedComposable } from '@vueuse/core';
import { computed, watch } from 'vue';

import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { usePromotionsEnabled } from '@/features/shared/promotions/usePromotionsEnabled';

import { useInstancePromotionConnection } from './useInstancePromotionConnection';
import { usePromotionChangeCount } from './usePromotionChangeCount';

/**
 * When the project header offers promote and apply, and how many changes each has. The banners
 * and the header badges share one instance, so each direction loads its preview once.
 */
export const usePromotionEntryPoints = createSharedComposable(() => {
	const usersStore = useUsersStore();
	const projectsStore = useProjectsStore();
	const { isEnabled: isPromotionsEnabled } = usePromotionsEnabled();

	const currentProjectId = computed(() => projectsStore.currentProject?.id);
	const isTeamProject = computed(() => projectsStore.currentProject?.type === ProjectTypes.Team);
	const projectPermissions = computed(
		() => getResourcePermissions(projectsStore.currentProject?.scopes).project,
	);
	const gitConnectionPermissions = computed(
		() => getResourcePermissions(usersStore.currentUser?.globalScopes).gitConnection,
	);

	// Each direction needs its configuration on the instance connection, so a source never
	// asks for incoming changes and a destination never asks for outgoing ones.
	const {
		hasPromoteConfig,
		hasApplyConfig,
		load: loadConnection,
	} = useInstancePromotionConnection();

	const canPreviewChanges = computed(
		() =>
			isTeamProject.value &&
			isPromotionsEnabled.value &&
			!!projectPermissions.value.export &&
			// `list` loads the connection. `read` loads the preview, as on the preview page.
			!!gitConnectionPermissions.value.list &&
			!!gitConnectionPermissions.value.read &&
			(!!gitConnectionPermissions.value.push || !!gitConnectionPermissions.value.pull),
	);
	const showPromote = computed(
		() =>
			canPreviewChanges.value && hasPromoteConfig.value && !!gitConnectionPermissions.value.push,
	);
	const showApply = computed(
		() => canPreviewChanges.value && hasApplyConfig.value && !!gitConnectionPermissions.value.pull,
	);

	watch(
		[canPreviewChanges, currentProjectId],
		async ([canPreview]) => {
			if (canPreview) await loadConnection();
		},
		{ immediate: true },
	);

	return {
		currentProjectId,
		showPromote,
		showApply,
		promote: usePromotionChangeCount(currentProjectId, 'promote', showPromote),
		apply: usePromotionChangeCount(currentProjectId, 'apply', showApply),
	};
});
