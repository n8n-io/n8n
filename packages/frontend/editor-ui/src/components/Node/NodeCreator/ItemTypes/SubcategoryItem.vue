<script setup lang="ts">
import type { SubcategoryItemProps } from '@/Interface';
import camelCase from 'lodash/camelCase';
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';

import { N8nNodeCreatorNode, N8nNodeIcon } from '@n8n/design-system';
export interface Props {
	item: SubcategoryItemProps;
}

const props = defineProps<Props>();
const i18n = useI18n();
const subcategoryName = computed(() => camelCase(props.item.subcategory || props.item.title));
</script>

<template>
	<N8nNodeCreatorNode
		:class="$style.subCategory"
		:title="i18n.baseText(`nodeCreator.subcategoryNames.${subcategoryName}` as BaseTextKey)"
		:is-trigger="false"
		:description="
			i18n.baseText(`nodeCreator.subcategoryDescriptions.${subcategoryName}` as BaseTextKey)
		"
		:show-action-arrow="true"
	>
		<template #icon>
			<N8nNodeIcon
				type="icon"
				:name="item.icon"
				:circle="false"
				:show-tooltip="false"
				v-bind="item.iconProps"
			/>
		</template>
	</N8nNodeCreatorNode>
</template>

<style lang="scss" module>
.subCategory {
	--action-arrow-color: var(--color--text--tint-1);
	margin-left: 15px;
	margin-right: 12px;
}
</style>
