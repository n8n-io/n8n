<script lang="ts" setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import type { IMenuItem } from 'n8n-design-system/types';
import { useI18n } from '@/composables/useI18n';
import { VIEWS } from '@/constants';
import { useProjectsStore } from '@/features/projects/projects.store';
import type { ProjectListItem } from '@/features/projects/projects.types';
import { useToast } from '@/composables/useToast';
import { useUIStore } from '@/stores/ui.store';

type Props = {
	collapsed: boolean;
	planName?: string;
};

const props = defineProps<Props>();

const router = useRouter();
const locale = useI18n();
const toast = useToast();
const projectsStore = useProjectsStore();
const uiStore = useUIStore();

const isCreatingProject = ref(false);
const isComponentMounted = ref(false);
const home = computed<IMenuItem>(() => ({
	id: 'home',
	label: locale.baseText('projects.menu.home'),
	icon: 'home',
	route: {
		to: { name: VIEWS.HOMEPAGE },
	},
}));
const addProject = computed<IMenuItem>(() => ({
	id: 'addProject',
	label: locale.baseText('projects.menu.addProject'),
	icon: 'plus',
	disabled:
		!isComponentMounted.value || isCreatingProject.value || !projectsStore.canCreateProjects,
	isLoading: isCreatingProject.value,
}));

const getProjectMenuItem = (project: ProjectListItem) => ({
	id: project.id,
	label: project.name,
	route: {
		to: {
			name: VIEWS.PROJECTS_WORKFLOWS,
			params: { projectId: project.id },
		},
	},
});

const homeClicked = () => {};
const projectClicked = () => {};
const addProjectClicked = async () => {
	isCreatingProject.value = true;

	try {
		const newProject = await projectsStore.createProject({
			name: locale.baseText('projects.settings.newProjectName'),
		});
		await router.push({ name: VIEWS.PROJECT_SETTINGS, params: { projectId: newProject.id } });
		toast.showMessage({
			title: locale.baseText('projects.settings.save.successful.title', {
				interpolate: { projectName: newProject.name ?? '' },
			}),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, locale.baseText('projects.error.title'));
	} finally {
		isCreatingProject.value = false;
	}
};

const displayProjects = computed(() => {
	return projectsStore.myProjects
		.filter((p) => p.type === 'team')
		.toSorted((a, b) => {
			if (!a.name || !b.name) {
				return 0;
			}
			if (a.name > b.name) {
				return 1;
			} else if (a.name < b.name) {
				return -1;
			}
			return 0;
		});
});

const goToUpgrade = async () => {
	await uiStore.goToUpgrade('rbac', 'upgrade-rbac');
};

onMounted(async () => {
	await nextTick();
	isComponentMounted.value = true;
});
</script>

<template>
	<div :class="$style.projects">
		<ElMenu :collapse="props.collapsed" class="home">
			<N8nMenuItem
				:item="home"
				:compact="props.collapsed"
				:handle-select="homeClicked"
				:active-tab="projectsStore.projectNavActiveId"
				mode="tabs"
				data-test-id="project-home-menu-item"
			/>
		</ElMenu>
		<hr
			v-if="
				displayProjects.length ||
				(projectsStore.hasPermissionToCreateProjects && projectsStore.teamProjectsAvailable)
			"
			class="mt-m mb-m"
		/>
		<ElMenu v-if="displayProjects.length" :collapse="props.collapsed" :class="$style.projectItems">
			<N8nMenuItem
				v-for="project in displayProjects"
				:key="project.id"
				:item="getProjectMenuItem(project)"
				:compact="props.collapsed"
				:handle-select="projectClicked"
				:active-tab="projectsStore.projectNavActiveId"
				mode="tabs"
				data-test-id="project-menu-item"
			/>
		</ElMenu>
		<N8nTooltip placement="right" :disabled="projectsStore.canCreateProjects">
			<ElMenu
				v-if="projectsStore.hasPermissionToCreateProjects && projectsStore.teamProjectsAvailable"
				:collapse="props.collapsed"
				class="pl-xs pr-xs"
			>
				<N8nMenuItem
					:item="addProject"
					:compact="props.collapsed"
					:handle-select="addProjectClicked"
					mode="tabs"
					data-test-id="add-project-menu-item"
				/>
			</ElMenu>
			<template #content>
				<i18n-t keypath="projects.create.limitReached">
					<template #planName>{{ props.planName }}</template>
					<template #limit>
						{{
							locale.baseText('projects.create.limit', {
								adjustToNumber: projectsStore.teamProjectsLimit,
								interpolate: { num: String(projectsStore.teamProjectsLimit) },
							})
						}}
					</template>
					<template #link>
						<a :class="$style.upgradeLink" href="#" @click="goToUpgrade">
							{{ locale.baseText('projects.create.limitReached.link') }}
						</a>
					</template>
				</i18n-t>
			</template>
		</N8nTooltip>
		<hr
			v-if="
				displayProjects.length ||
				(projectsStore.hasPermissionToCreateProjects && projectsStore.teamProjectsAvailable)
			"
			class="mt-m mb-m"
		/>
	</div>
</template>

<style lang="scss" module>
.projects {
	display: grid;
	grid-auto-rows: auto;
	width: 100%;
	overflow: hidden;
	align-items: start;
}

.projectItems {
	height: 100%;
	padding: 0 var(--spacing-xs) var(--spacing-s);
	overflow: auto;
}

.upgradeLink {
	color: var(--color-primary);
	cursor: pointer;
}
</style>

<style lang="scss" scoped>
.home {
	padding: 0 var(--spacing-xs);

	:deep(.el-menu-item) {
		padding: var(--spacing-m) var(--spacing-xs) !important;
	}
}
</style>
