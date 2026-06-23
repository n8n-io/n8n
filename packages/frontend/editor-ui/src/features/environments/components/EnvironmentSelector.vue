<script lang="ts" setup>
import { computed } from 'vue';
import { useEnvironmentsStore } from '../environments.store';

const environmentsStore = useEnvironmentsStore();

const options = computed(() => [
	{ value: null, label: 'No environment (global)' },
	...environmentsStore.environments.map((e) => ({ value: e.id, label: e.name })),
]);

function onSelect(value: string | null) {
	environmentsStore.selectedEnvironmentId = value;
}
</script>

<template>
	<select
		v-if="environmentsStore.environments.length > 0"
		:value="environmentsStore.selectedEnvironmentId"
		data-test-id="canvas-environment-selector"
		@change="onSelect(($event.target as HTMLSelectElement).value || null)"
	>
		<option v-for="opt in options" :key="String(opt.value)" :value="opt.value ?? ''">
			{{ opt.label }}
		</option>
	</select>
</template>
