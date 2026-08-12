<script lang="ts" setup>
import { MAIN_HEADER_TABS } from '@/app/constants';
import type { ITabBarItem } from '@/Interface';

import { N8nSegmentControl } from '@n8n/design-system';
withDefaults(
	defineProps<{
		items: ITabBarItem[];
		modelValue?: string;
		floating?: boolean;
	}>(),
	{
		modelValue: MAIN_HEADER_TABS.WORKFLOW,
		floating: false,
	},
);

const emit = defineEmits<{
	'update:modelValue': [tab: MAIN_HEADER_TABS, event: MouseEvent];
}>();

function onUpdateModelValue(tab: string, event: MouseEvent): void {
	emit('update:modelValue', tab as MAIN_HEADER_TABS, event);
}
</script>

<template>
	<div
		v-if="items"
		:class="{
			[$style.container]: true,
			[$style.floating]: floating,
			['tab-bar-container']: true,
		}"
	>
		<N8nSegmentControl
			:model-value="modelValue"
			:options="items"
			@update:model-value="onUpdateModelValue"
		/>
	</div>
</template>

<style module lang="scss">
.container {
	position: absolute;
	bottom: 0;
	left: 50%;
	transform: translateX(-50%) translateY(50%);
	min-height: 30px;
	display: flex;
	align-items: center;
	z-index: 100; // Should float above other layout components in any page
}

.floating {
	top: var(--spacing--4xs);
}

@media screen and (max-width: 430px) {
	.container {
		flex-direction: column;
	}
}
</style>
