<script lang="ts" setup>
import { onBeforeMount, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getPathAsRegexPattern } from '@/utils/routeUtils';
import { oldRoutesToRedirectToProjects } from '@/features/projects/projects-constants';

const router = useRouter();
const route = useRoute();

const redirectionSuccess = ref(false);
const projectId = ref('home');

onBeforeMount(async () => {
	// TODO: Get the project id from the store
	const oldRoutePatterns = oldRoutesToRedirectToProjects.map(getPathAsRegexPattern);
	if (oldRoutePatterns.some((pattern) => pattern.test(route.path))) {
		await router.replace({ path: `/projects/${projectId.value}/${route.path}` });
		redirectionSuccess.value = true;
	}
});
</script>

<template>
	<router-view v-if="redirectionSuccess" />
</template>
