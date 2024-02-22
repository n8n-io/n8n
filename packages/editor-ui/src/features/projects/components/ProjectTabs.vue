<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { RouteRecordName } from 'vue-router';
import { useRoute } from 'vue-router';
import { VIEWS } from '@/constants';
import { useI18n } from '@/composables/useI18n';

const locale = useI18n();
const route = useRoute();

const selectedTab = ref<RouteRecordName | null | undefined>('');
const options = computed(() => {
	const isProject = (route?.name ?? '').toString().toLowerCase().startsWith('project');
	const name = isProject
		? {
				workflows: VIEWS.PROJECTS_WORKFLOWS,
				credentials: VIEWS.PROJECTS_CREDENTIALS,
		  }
		: {
				workflows: VIEWS.WORKFLOWS,
				credentials: VIEWS.CREDENTIALS,
		  };
	const tabs = [
		{
			label: locale.baseText('mainSidebar.workflows'),
			value: name.workflows,
			to: { name: name.workflows },
		},
		{
			label: locale.baseText('mainSidebar.credentials'),
			value: name.credentials,
			to: { name: name.credentials },
		},
	];

	return tabs;
});
const onUpdateModelValue = (value: string) => {
	selectedTab.value = value;
};
onMounted(() => {
	selectedTab.value = route?.name;
});
</script>

<template>
	<div :class="$style.projectTabs">
		<n8n-tabs v-model="selectedTab" :options="options" @update:model-value="onUpdateModelValue" />
	</div>
</template>

<style module lang="scss">
.projectTabs {
	padding: var(--spacing-m) 0 var(--spacing-2xl);
}
</style>
