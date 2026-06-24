<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import { N8nActionDropdown, N8nButton, N8nIcon } from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system';
import { useEnvironmentsStore } from '../environments.store';

const props = defineProps<{ projectId?: string }>();

const environmentsStore = useEnvironmentsStore();

const items = computed<Array<ActionDropdownItem<string>>>(() =>
	environmentsStore.environments.map((e) => ({ id: e.id, label: e.name })),
);

const selectedLabel = computed(
	() =>
		environmentsStore.environments.find((e) => e.id === environmentsStore.selectedEnvironmentId)
			?.name ??
		environmentsStore.environments[0]?.name ??
		'',
);

function onSelect(id: string) {
	environmentsStore.selectedEnvironmentId = id || null;
}

onMounted(async () => {
	if (props.projectId && environmentsStore.environments.length === 0) {
		await environmentsStore.fetchEnvironments(props.projectId);
	}
	if (environmentsStore.environments.length > 0 && !environmentsStore.selectedEnvironmentId) {
		environmentsStore.selectedEnvironmentId = environmentsStore.environments[0].id;
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
