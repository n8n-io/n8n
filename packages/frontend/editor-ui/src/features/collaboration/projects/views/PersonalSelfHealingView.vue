<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { ProjectSelfHealingSection } from '@n8n/frontend-module-self-healing';
import PageViewLayout from '@/app/components/layouts/PageViewLayout.vue';
import ResourcesListSkeleton from '@/app/components/layouts/ResourcesListSkeleton.vue';
import ProjectHeader from '../components/ProjectHeader.vue';
import { useProjectsStore } from '../projects.store';

const route = useRoute();
const projectsStore = useProjectsStore();

const projectId = computed(() => {
	const id = projectsStore.currentProject?.id;
	return id && id === route.params.projectId ? id : undefined;
});
</script>

<template>
	<PageViewLayout>
		<template #header>
			<ProjectHeader main-button="selfHealing" />
		</template>
		<ProjectSelfHealingSection v-if="projectId" :project-id="projectId" variant="personalTab">
			<template #loading>
				<ResourcesListSkeleton />
			</template>
		</ProjectSelfHealingSection>
		<ResourcesListSkeleton v-else />
	</PageViewLayout>
</template>
