<template>
	<div :class="$style.projectTabs">
		<n8n-tabs v-model="selectedTab" :options="options" @update:modelValue="onUpdateModelValue" />
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { VIEWS } from '@/constants';

type Props = {
	activeTab: string;
};

const props = defineProps<Props>();

const locale = useI18n();

const selectedTab = ref('');
const options = ref([
	{
		label: locale.baseText('mainSidebar.workflows'),
		value: VIEWS.WORKFLOWS,
		icon: 'network-wired',
		to: { name: VIEWS.WORKFLOWS },
	},
	{
		label: locale.baseText('mainSidebar.credentials'),
		value: VIEWS.CREDENTIALS,
		icon: 'key',
		to: { name: VIEWS.CREDENTIALS },
	},
]);

const onUpdateModelValue = (value: string) => {
	selectedTab.value = value;
};

onMounted(() => {
	selectedTab.value = props.activeTab;
});
</script>

<style module lang="scss">
.projectTabs {
	padding: var(--spacing-xl) 0;
}
</style>
