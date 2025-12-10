<script setup lang="ts">
import { N8nIcon, N8nInput, N8nOption, N8nSelect } from '@n8n/design-system';
import { computed, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { refDebounced } from '@vueuse/core';
import type { ChatAgentFilter } from '@/features/ai/chatHub/chat.types';

const props = defineProps<{
	modelValue: ChatAgentFilter;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: ChatAgentFilter];
}>();

const i18n = useI18n();

const sortOptions = computed(() => [
	{ label: i18n.baseText('chatHub.agents.sort.updatedAt'), value: 'updatedAt' as const },
	{ label: i18n.baseText('chatHub.agents.sort.createdAt'), value: 'createdAt' as const },
]);

const localSearch = ref(props.modelValue.search);
const debouncedSearch = refDebounced(localSearch, 300);

// Sync local search with incoming modelValue changes
watch(
	() => props.modelValue.search,
	(newSearch) => {
		if (newSearch !== localSearch.value) {
			localSearch.value = newSearch;
		}
	},
);

// Emit debounced search changes
watch(debouncedSearch, (newSearch) => {
	if (newSearch !== props.modelValue.search) {
		emit('update:modelValue', { ...props.modelValue, search: newSearch });
	}
});

function updateSortBy(value: 'updatedAt' | 'createdAt') {
	emit('update:modelValue', { ...props.modelValue, sortBy: value });
}
</script>

<template>
	<div :class="$style.controls">
		<N8nInput
			v-model="localSearch"
			:class="$style.search"
			:placeholder="i18n.baseText('chatHub.agents.search.placeholder')"
			clearable
		>
			<template #prefix>
				<N8nIcon icon="search" />
			</template>
		</N8nInput>

		<N8nSelect :model-value="modelValue.sortBy" :class="$style.sort" @update:model-value="updateSortBy">
			<N8nOption
				v-for="option in sortOptions"
				:key="option.value"
				:label="option.label"
				:value="option.value"
			/>
		</N8nSelect>
	</div>
</template>

<style lang="scss" module>
.controls {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: center;
}

.search {
	flex: 1;
	min-width: 200px;
}

.sort {
	width: 200px;
}
</style>
