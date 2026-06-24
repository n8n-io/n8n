<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import { N8nActionDropdown, N8nButton, N8nIcon } from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system';
import { useEnvironmentsStore } from '../environments.store';

const props = defineProps<{ projectId?: string }>();

const environmentsStore = useEnvironmentsStore();

const GLOBAL_ID = '';

const items = computed<Array<ActionDropdownItem<string>>>(() => [
	{ id: GLOBAL_ID, label: 'Global (no environment)' },
	...environmentsStore.environments.map((e) => ({ id: e.id, label: e.name })),
]);

const selectedLabel = computed(() => {
	if (!environmentsStore.selectedEnvironmentId) return 'Global';
	return (
		environmentsStore.environments.find((e) => e.id === environmentsStore.selectedEnvironmentId)
			?.name ?? 'Global'
	);
});

function onSelect(id: string) {
	environmentsStore.selectedEnvironmentId = id || null;
}

onMounted(async () => {
	if (props.projectId && environmentsStore.environments.length === 0) {
		await environmentsStore.fetchEnvironments(props.projectId);
	}
});
</script>

<template>
	<N8nActionDropdown
		v-if="environmentsStore.environments.length > 0"
		:items="items"
		data-test-id="canvas-environment-selector"
		@select="onSelect"
	>
		<template #activator>
			<N8nButton variant="ghost">
				<N8nIcon icon="tree" size="xsmall" />
				{{ selectedLabel }}
			</N8nButton>
		</template>
	</N8nActionDropdown>
</template>
