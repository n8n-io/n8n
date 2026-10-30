<script lang="ts" setup>
import { computed, inject } from 'vue';
import { N8nText } from '@n8n/design-system';

import ResourceListRow from './ResourceListRow.vue';
import { ResourceListColumnsKey } from './resourceListColumns';

defineProps<{
	/** Number of resources in the list. It shows next to the first column heading */
	count?: number;
}>();

const injectedColumns = inject(ResourceListColumnsKey, undefined);
const columns = computed(() => injectedColumns?.value ?? []);
</script>

<template>
	<div v-if="columns.length" :class="$style.header" data-test-id="resources-list-header">
		<ResourceListRow>
			<template v-for="(column, index) in columns" :key="column.key" #[column.key]>
				<N8nText v-if="column.label" size="small" color="text-light" :class="$style.label">
					{{ column.label }}
				</N8nText>
				<N8nText
					v-if="index === 0 && count !== undefined"
					size="small"
					color="text-xlight"
					data-test-id="resources-list-count"
				>
					{{ count }}
				</N8nText>
			</template>
		</ResourceListRow>
	</div>
</template>

<style lang="scss" module>
.header {
	// Rows have a transparent border, so add it to line the cells up.
	padding: var(--spacing--3xs) calc(var(--spacing--sm) + var(--border-width, 1px));
	border-bottom: var(--border-width, 1px) solid var(--border-color--subtle);
}

.label {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
</style>
