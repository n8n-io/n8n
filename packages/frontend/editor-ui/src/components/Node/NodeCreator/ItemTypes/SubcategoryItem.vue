<script setup lang="ts">
import type { SubcategoryItemProps } from '@/Interface';
import { camelCase } from 'lodash-es';
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';

export interface Props {
	item: SubcategoryItemProps;
}

const props = defineProps<Props>();
const i18n = useI18n();
const subcategoryName = computed(() => camelCase(props.item.subcategory || props.item.title));

const shouldResolveToFile = computed(() => props.item.icon?.split(':')[0] === 'file');
const fileSrc = computed(() => {
	if (shouldResolveToFile.value) {
		return `/static/${props.item.icon?.split(':')[1]}`;
	}
	return undefined;
});
</script>

<template>
	<n8n-node-creator-node
		:class="$style.subCategory"
		:title="i18n.baseText(`nodeCreator.subcategoryNames.${subcategoryName}` as BaseTextKey)"
		:is-trigger="false"
		:description="
			i18n.baseText(`nodeCreator.subcategoryDescriptions.${subcategoryName}` as BaseTextKey)
		"
		:show-action-arrow="true"
	>
		<template #icon>
			<n8n-node-icon
				:type="shouldResolveToFile ? 'file' : 'icon'"
				:name="item.icon"
				:circle="false"
				:show-tooltip="false"
				:src="shouldResolveToFile ? fileSrc : undefined"
				v-bind="item.iconProps"
			/>
		</template>
	</n8n-node-creator-node>
</template>

<style lang="scss" module>
.subCategory {
	--action-arrow-color: var(--color-text-light);
	margin-left: 15px;
	margin-right: 12px;
}
</style>
