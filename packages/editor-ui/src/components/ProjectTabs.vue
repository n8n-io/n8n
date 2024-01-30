<template>
	<div :class="$style.projectTabs">
		<n8n-tabs v-model="selectedTab" :options="options" @update:modelValue="onUpdateModelValue" />
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

type Props = {
	activeTab: string;
};

const props = defineProps<Props>();

const selectedTab = ref('');
const options = ref([
	{ label: 'Workflows', value: 'workflows', icon: 'network-wired' },
	{ label: 'Credentials', value: 'credentials', icon: 'key' },
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
