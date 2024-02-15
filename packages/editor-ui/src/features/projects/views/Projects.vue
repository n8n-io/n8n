<script lang="ts" setup>
import { onBeforeMount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getPathAsRegexPattern } from '@/utils/routeUtils';
import { oldRoutesToProjectMap } from '@/features/projects/projects-constants';

const router = useRouter();
const route = useRoute();

onBeforeMount(async () => {
	const oldRoutePatterns = Object.keys(oldRoutesToProjectMap).map(getPathAsRegexPattern);
	if (oldRoutePatterns.some((pattern) => pattern.test(route.path))) {
		// Get the project id from backend
		const projectId = 'home';
		await router.push({ path: `/projects/${projectId}/${route.path}` });
	}
});
</script>

<template>
	<div>Projects</div>
</template>
