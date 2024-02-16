<script lang="ts" setup>
import { onBeforeMount, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getPathAsRegexPattern } from '@/utils/routeUtils';
import {
	projectsBaseRoute,
	oldRoutesToRedirectToProjects,
} from '@/features/projects/projects-constants';
import { VIEWS } from '@/constants';

const router = useRouter();
const route = useRoute();

const redirectionSuccess = ref(false);
const projectId = ref('home');

onBeforeMount(async () => {
	// TODO: Get the project id from the store
	const oldRoutePatterns = oldRoutesToRedirectToProjects.map(getPathAsRegexPattern);
	if (
		oldRoutePatterns.some((pattern) => pattern.test(route.path)) &&
		!route.path.includes(projectsBaseRoute)
	) {
		await router.replace({
			path: `${projectsBaseRoute}/${projectId.value}${route.path}`,
			query: route.query,
		});
	}
	if (route.name === VIEWS.PROJECTS) {
		await router.replace({ name: VIEWS.WORKFLOWS, params: { projectId: projectId.value } });
	}
	redirectionSuccess.value = true;
});
</script>

<template>
	<router-view v-if="redirectionSuccess" />
</template>
