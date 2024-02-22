<script lang="ts" setup>
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { IMenuItem } from 'n8n-design-system/types';
import { useI18n } from '@/composables/useI18n';
import { VIEWS } from '@/constants';
import { useProjectsStore } from '@/features/projects/projects.store';

type Props = {
	collapsed: boolean;
};

const props = defineProps<Props>();

const route = useRoute();
const router = useRouter();
const locale = useI18n();
const projectsStore = useProjectsStore();

const isCreatingProject = ref(false);
const home = ref<IMenuItem>({
	id: 'home',
	label: locale.baseText('projects.menu.home'),
	icon: 'home',
	route: {
		to: { name: VIEWS.HOMEPAGE },
	},
});
const addProject = ref<IMenuItem>({
	id: 'addProject',
	label: locale.baseText('projects.menu.addProject'),
	icon: 'plus',
});

const activeTab = computed(() =>
	route.name === VIEWS.HOMEPAGE ||
	route.name === VIEWS.WORKFLOWS ||
	route.name === VIEWS.CREDENTIALS
		? 'home'
		: undefined,
);

const homeClicked = () => {};
const addProjectClicked = async () => {
	isCreatingProject.value = true;
	addProject.value.isLoading = true;
	addProject.value.disabled = true;
	const newProject = await projectsStore.createProject({
		name: locale.baseText('projects.settings.newProjectName'),
	});
	isCreatingProject.value = false;
	addProject.value.isLoading = false;
	addProject.value.disabled = false;
	await router.push({ name: VIEWS.PROJECT_SETTINGS, params: { projectId: newProject.id } });
};
</script>

<template>
	<div :class="$style.projects">
		<ElMenu :collapse="props.collapsed" class="home">
			<n8n-menu-item
				:item="home"
				:compact="props.collapsed"
				:handle-select="homeClicked"
				:active-tab="activeTab"
				mode="tabs"
			/>
		</ElMenu>
		<hr class="mt-m mb-m" />
		<ElMenu :collapse="props.collapsed" class="pl-xs pr-xs">
			<n8n-menu-item
				:item="addProject"
				:compact="props.collapsed"
				:handle-select="addProjectClicked"
				mode="tabs"
			/>
		</ElMenu>
		<hr class="mt-m mb-m" />
	</div>
</template>

<style lang="scss" module>
.projects {
	display: grid;
	width: 100%;
	overflow: hidden;
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
