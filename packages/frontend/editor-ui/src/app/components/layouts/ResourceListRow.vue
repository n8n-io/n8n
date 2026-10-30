<script lang="ts" setup>
import { computed, inject, useSlots } from 'vue';

import ResourceListCell from './ResourceListCell.vue';
import { ResourceListColumnsKey } from './resourceListColumns';

const columns = inject(ResourceListColumnsKey, undefined);
const slots = useSlots();

// Every declared column gets a cell, empty or not, so the cells line up across rows.
// Outside a column layout, the row shows its slots in template order.
const columnKeys = computed(
	() =>
		columns?.value?.map(({ key }) => key) ?? Object.keys(slots).filter((key) => key !== 'default'),
);
</script>

<template>
	<div :class="$style.row">
		<ResourceListCell v-for="key in columnKeys" :key="key" :column="key">
			<slot :name="key" />
		</ResourceListCell>
	</div>
</template>

<style lang="scss" module>
// The column header and every list row share this box, so their cells line up.
.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	width: 100%;
	min-width: 0;
}
</style>
