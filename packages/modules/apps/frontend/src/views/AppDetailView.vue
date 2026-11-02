<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { PROJECT_APPS } from '../apps.constants';
import AppView from '../components/AppView.vue';

const route = useRoute();
const router = useRouter();

const projectId = computed(() => String(route.params.projectId));
const appId = computed(() => String(route.params.appId));
const section = computed({
	get: () => (typeof route.query.section === 'string' ? route.query.section : 'preview'),
	set: (value: string) => {
		void router.replace({
			query: { ...route.query, section: value === 'preview' ? undefined : value },
		});
	},
});

function onDeleted() {
	void router.push({ name: PROJECT_APPS, params: { projectId: projectId.value } });
}
</script>

<template>
	<div :class="$style.page">
		<AppView
			v-model:section="section"
			:project-id="projectId"
			:app-id="appId"
			@deleted="onDeleted"
		/>
	</div>
</template>

<style lang="scss" module>
.page {
	width: 100%;
	height: 100%;
	min-height: 0;
}
</style>
