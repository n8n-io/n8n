<script setup lang="ts">
import { computed, type Ref, ref } from 'vue';
import { useRoute } from 'vue-router';
import { N8nNavigationDropdown } from 'n8n-design-system';
import { onClickOutside, type VueInstance } from '@vueuse/core';
import { useI18n } from '@/composables/useI18n';
import { ProjectTypes } from '@/types/projects.types';
import { useProjectsStore } from '@/stores/projects.store';
import ProjectTabs from '@/components/Projects/ProjectTabs.vue';
import { getResourcePermissions } from '@/permissions';
import { useGlobalEntityCreation } from '@/composables/useGlobalEntityCreation';

const route = useRoute();
const i18n = useI18n();
const projectsStore = useProjectsStore();

const createBtn = ref<InstanceType<typeof N8nNavigationDropdown>>();

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

const { menu, handleSelect } = useGlobalEntityCreation(
	computed(() => !Boolean(projectsStore.currentProject)),
);

const createLabel = computed(() => {
	if (!projectsStore.currentProject) {
		return i18n.baseText('projects.create');
	} else if (projectsStore.currentProject.type === ProjectTypes.Personal) {
		return i18n.baseText('projects.create.personal');
	} else {
		return i18n.baseText('projects.create.team');
	}
});

onClickOutside(createBtn as Ref<VueInstance>, () => {
	createBtn.value?.close();
});
</script>

<template>
	<div>
		<div :class="[$style.projectHeader]">
			<div :class="[$style.icon]">
				<N8nIcon :icon="headerIcon" color="text-light"></N8nIcon>
			</div>
			<div>
				<N8nHeading bold tag="h2" size="xlarge">{{ projectName }}</N8nHeading>
				<N8nText color="text-light">
					<slot name="subtitle">
						<span v-if="!projectsStore.currentProject">{{
							i18n.baseText('projects.header.subtitle')
						}}</span>
					</slot>
				</N8nText>
			</div>
		</div>
		<div :class="$style.actions">
			<ProjectTabs :show-settings="showSettings" />
			<N8nNavigationDropdown
				ref="createBtn"
				data-test-id="resource-add"
				:menu="menu"
				@select="handleSelect"
			>
				<N8nIconButton :label="createLabel" icon="plus" style="width: auto" />
			</N8nNavigationDropdown>
		</div>
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
	display: flex;
	justify-content: space-between;
	align-items: flex-end;
	padding: var(--spacing-2xs) 0 var(--spacing-l);
}
</style>
