<template>
	<n8n-node-creator-node
		:class="$style.subCategory"
		:title="$locale.baseText(`nodeCreator.subcategoryNames.${subcategoryName}`)"
		:isTrigger="false"
		:description="$locale.baseText(`nodeCreator.subcategoryDescriptions.${subcategoryName}`)"
		:showActionArrow="true"
	>
		<template #icon>
			<n8n-node-icon type="icon" :name="item.icon" :circle="false" :showTooltip="false" />
		</template>
	</n8n-node-creator-node>
</template>

<script setup lang="ts">
import { ISubcategoryItemProps } from '@/Interface';
import { camelCase } from 'lodash-es';
import { computed } from 'vue';
export interface Props {
	item: ISubcategoryItemProps;
}

const props = defineProps<Props>();
const subcategoryName = computed(() => camelCase(props.item.subcategory));
</script>

<style lang="scss" module>
.subCategory {
	--action-arrow-color: var(--color-text-light);
	margin-left: 15px;
	margin-right: 12px;
}
.withTopBorder {
	border-top: 1px solid var(--color-foreground-base);
	margin-top: var(--spacing-m);
	padding-top: var(--spacing-l);
}
</style>
