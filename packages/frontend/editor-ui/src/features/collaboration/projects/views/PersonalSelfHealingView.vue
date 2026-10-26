<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { ProjectSelfHealingSection } from '@n8n/frontend-module-self-healing';
import PageViewLayout from '@/app/components/layouts/PageViewLayout.vue';
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
			<ProjectHeader />
		</template>
		<ProjectSelfHealingSection
			v-if="projectId"
			:class="$style.section"
			:project-id="projectId"
			variant="personalTab"
		/>
	</PageViewLayout>
</template>

<style lang="scss" module>
.section {
	align-self: start;
}
</style>
