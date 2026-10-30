<script lang="ts" setup>
import { computed, inject } from 'vue';

import { ResourceListColumnsKey } from './resourceListColumns';

const props = defineProps<{
	column: string;
}>();

const columns = inject(ResourceListColumnsKey, undefined);

const definition = computed(() => columns?.value?.find(({ key }) => key === props.column));

// Outside a column layout every cell renders. Inside one, only the declared columns do.
const isVisible = computed(() => !columns?.value || definition.value !== undefined);

const style = computed(() => {
	const width = definition.value?.width;
	return width ? { flexBasis: width, width } : undefined;
});
</script>

<template>
	<div
		v-if="isVisible"
		:class="[
			$style.cell,
			{ [$style.fill]: !definition?.width, [$style.end]: definition?.align === 'end' },
		]"
		:style="style"
		:data-column="column"
		:data-column-priority="definition?.priority"
	>
		<slot />
	</div>
</template>

<style lang="scss" module>
.cell {
	display: flex;
	flex: 0 0 auto;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.fill {
	flex: 1 1 0;
	// Ignore the content width, so a long name truncates instead of widening the row.
	contain: inline-size;
}

.end {
	justify-content: flex-end;
}
</style>
