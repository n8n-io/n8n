<script setup lang="ts">
import { useMCPStore } from '@/features/ai/mcpAccess/mcp.store';
import { LOADING_INDICATOR_TIMEOUT } from '@/features/ai/mcpAccess/mcp.constants';
import { N8nIcon, N8nSelect, N8nOption } from '@n8n/design-system';
import { onMounted, ref } from 'vue';

type SelectRef = InstanceType<typeof N8nSelect>;
type SelectOption = { value: string; label: string };

defineProps<{
	placeholder?: string;
	disabled?: boolean;
}>();

const modelValue = defineModel<string>();

const mcpStore = useMCPStore();

const isLoading = ref(false);
const selectRef = ref<SelectRef | null>(null);
const workflowOptions = ref<SelectOption[]>([]);

async function searchWorkflows(query?: string) {
	isLoading.value = true;
	try {
		const response = await mcpStore.getMcpEligibleWorkflows({
			take: 10,
			query: query || undefined,
		});
		const workflows = response?.data ?? [];
		workflowOptions.value = workflows.map((workflow) => ({
			value: workflow.id,
			label: workflow.name,
		}));
	} finally {
		setTimeout(() => {
			isLoading.value = false;
		}, LOADING_INDICATOR_TIMEOUT);
	}
}

function focusOnInput() {
	selectRef.value?.focusOnInput();
}

function removeOption(value: string) {
	workflowOptions.value = workflowOptions.value.filter((option) => option.value !== value);
}

onMounted(async () => {
	await searchWorkflows();
});

defineExpose({
	focusOnInput,
	removeOption,
});
</script>

<template>
	<N8nSelect
		ref="selectRef"
		v-model="modelValue"
		data-test-id="mcp-workflows-select"
		:placeholder="placeholder"
		:disabled="disabled"
		:loading="isLoading"
		:filterable="true"
		:remote="true"
		:remote-method="searchWorkflows"
	>
		<template #prepend>
			<N8nIcon :class="$style['search-icon']" icon="search" size="large" color="text-light" />
		</template>
		<N8nOption
			v-for="option in workflowOptions"
			:key="option.value"
			:value="option.value"
			:label="option.label"
		/>
	</N8nSelect>
</template>

<style module lang="scss">
.search-icon {
	min-width: var(--spacing--lg);
}
</style>
