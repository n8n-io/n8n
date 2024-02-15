<script lang="ts" setup>
import { onBeforeMount, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getPathAsRegexPattern } from '@/utils/routeUtils';
import { oldRoutesToProjectMap } from '@/features/projects/projects-constants';

const router = useRouter();
const route = useRoute();

const redirectionSuccess = ref(false);

onBeforeMount(async () => {
	const oldRoutePatterns = Object.keys(oldRoutesToProjectMap).map(getPathAsRegexPattern);
	if (oldRoutePatterns.some((pattern) => pattern.test(route.path))) {
		// Get the project id from backend
		const projectId = 'home';
		await router.replace({ path: `/projects/${projectId}/${route.path}` });
		redirectionSucccess.value = true;
	}
});
</script>

<template>
	<router-view v-if="redirectionSuccess" />
</template>
