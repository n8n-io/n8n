import { $d as init_runtime_core_esm_bundler, Rd as computed } from "./vendor-Hx42-oQF.js";
import { VA as isIconOrEmoji, jN as useI18n, vm as useProjectsStore, w_ as DEFAULT_PROJECT_ICON } from "./app-D5flEmb-.js";
//#region src/features/agents/composables/useAgentProjectBreadcrumb.ts
init_runtime_core_esm_bundler();
function useAgentProjectBreadcrumb(projectId) {
	const projectsStore = useProjectsStore();
	const i18n = useI18n();
	const isPersonalProject = computed(() => projectsStore.personalProject?.id === projectId.value);
	const project = computed(() => {
		if (isPersonalProject.value) return projectsStore.personalProject;
		if (projectsStore.currentProject?.id === projectId.value) return projectsStore.currentProject;
		return projectsStore.myProjects.find((item) => item.id === projectId.value);
	});
	return {
		projectName: computed(() => isPersonalProject.value ? i18n.baseText("projects.menu.personal") : project.value?.name ?? null),
		projectIcon: computed(() => {
			if (isPersonalProject.value) return {
				type: "icon",
				value: "user"
			};
			return isIconOrEmoji(project.value?.icon) ? project.value.icon : DEFAULT_PROJECT_ICON;
		})
	};
}
//#endregion
export { useAgentProjectBreadcrumb as t };
