<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from '@/composables/useI18n';
import { ProjectTypes } from '@/types/projects.types';
import { useProjectsStore } from '@/stores/projects.store';
import ProjectTabs from '@/components/Projects/ProjectTabs.vue';
import { getResourcePermissions } from '@/permissions';

const route = useRoute();
const i18n = useI18n();
const projectsStore = useProjectsStore();

const headerIcon = computed(() => {
	if (projectsStore.currentProject?.type === ProjectTypes.Personal) {
		return 'user';
	} else if (projectsStore.currentProject?.name) {
		return 'layer-group';
	} else {
		return 'home';
	}
});

const projectName = computed(() => {
	if (!projectsStore.currentProject) {
		return i18n.baseText('projects.menu.overview');
	} else if (projectsStore.currentProject.type === ProjectTypes.Personal) {
		return i18n.baseText('projects.menu.personal');
	} else {
		return projectsStore.currentProject.name;
	}
});

const projectPermissions = computed(
	() => getResourcePermissions(projectsStore.currentProject?.scopes).project,
);

const showSettings = computed(
	() =>
		!!route?.params?.projectId &&
		!!projectPermissions.value.update &&
		projectsStore.currentProject?.type === ProjectTypes.Team,
);
</script>

<template>
	<div>
		<div :class="[$style.projectHeader]">
			<div :class="[$style.icon]">
				<N8nIcon :icon="headerIcon" color="text-light"></N8nIcon>
			</div>
			<div>
				<N8nHeading bold tag="h2" size="xlarge">{{ projectName }}</N8nHeading>
				<N8nText v-if="$slots.subtitle" size="small" color="text-light">
					<slot name="subtitle" />
				</N8nText>
			</div>
			<div v-if="$slots.actions" :class="[$style.actions]">
				<slot name="actions"></slot>
			</div>
		</div>
		<ProjectTabs :show-settings="showSettings" />
	</div>
</template>

<style lang="scss" module>
.projectHeader {
	display: flex;
	align-items: center;
	gap: 8px;
	padding-bottom: var(--spacing-m);
	min-height: 64px;
}

.icon {
	border: 1px solid var(--color-foreground-light);
	padding: 6px;
	border-radius: var(--border-radius-base);
}

.actions {
	margin-left: auto;
}
</style>
