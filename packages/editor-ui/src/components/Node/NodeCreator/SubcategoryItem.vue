<template>
	<n8n-node-creator-node
		:class="{
			[$style.subCategory]: true,
		}"
		:title="$locale.baseText(`nodeCreator.subcategoryNames.${subcategoryName}`)"
		:isTrigger="false"
		:description="$locale.baseText(`nodeCreator.subcategoryDescriptions.${subcategoryName}`)"
		:showActionArrow="true"
	>
		<template #icon>
			<n8n-node-icon
				type="icon"
				:name="item.icon"
				:color="item.color"
				:circle="false"
				:showTooltip="false"
			></n8n-node-icon>
		</template>
	</n8n-node-creator-node>
</template>

<script setup lang="ts">
import camelcase from 'lodash.camelcase';
import { computed } from 'vue';
export interface Props {
	item: Record<string, unknown>;
}

const props = defineProps<Props>();
const subcategoryName = computed(() => camelcase(props.item.subcategory));
</script>

<style lang="scss" module>
.subCategory {
	--action-arrow-color: var(--color-text-light);
	margin-left: 15px;
	margin-right: 12px;
	padding: 11px 4px 11px 0;
}
.withTopBorder {
	border-top: 1px solid var(--color-foreground-base);
	margin-top: var(--spacing-m);
	padding-top: var(--spacing-l);
}
</style>
