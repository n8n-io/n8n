<script lang="ts" setup>
import { MAIN_HEADER_TABS } from '@/constants';
import type { ITabBarItem } from '@/Interface';

import { N8nRadioButtons } from '@n8n/design-system';
withDefaults(
	defineProps<{
		items: ITabBarItem[];
		modelValue?: string;
	}>(),
	{
		modelValue: MAIN_HEADER_TABS.WORKFLOW,
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
			['tab-bar-container']: true,
		}"
	>
		<N8nRadioButtons
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
	padding: var(--spacing--5xs);
	background-color: var(--color--foreground);
	border-radius: var(--radius);
	transition: all 150ms ease-in-out;
	z-index: 1;
}

@media screen and (max-width: 430px) {
	.container {
		flex-direction: column;
	}
}
</style>
