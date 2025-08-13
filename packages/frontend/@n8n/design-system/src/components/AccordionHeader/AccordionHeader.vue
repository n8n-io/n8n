<script lang="ts" setup>
import { createEventBus } from '@n8n/utils/event-bus';
import { ref } from 'vue';

import type { IconColor } from '@n8n/design-system/types/icon';

import N8nIcon from '../N8nIcon';
import { type IconName } from '../N8nIcon/icons';
import N8nText from '../N8nText';

export interface IAccordionItem {
	id: string;
	label: string;
	icon: IconName;
	iconColor?: IconColor;
	tooltip?: string | null;
}

interface InfoAccordionProps {
	title?: string;
	description?: string;
	items?: IAccordionItem[];
}

defineOptions({ name: 'N8nInfoAccordion' });
withDefaults(defineProps<InfoAccordionProps>(), {
	items: () => [],
	initiallyExpanded: false,
	eventBus: () => createEventBus(),
});
// const emit = defineEmits<{
// }>();

const expanded = ref(false);

const toggle = () => {
	expanded.value = !expanded.value;
};
</script>

<template>
	<div class="n8n-accordion-header">
		<div :class="[$style.header, $style.container]" @click="toggle">
			<div :class="$style.title">
				<N8nText :class="$style.headerText" color="text-base" size="small" align="left" bold>{{
					title
				}}</N8nText>
				<N8nIcon :icon="expanded ? 'chevron-up' : 'chevron-down'" bold />
			</div>
			<div>
				<N8nText color="text-base" size="small" align="left">
					{{ description }}
				</N8nText>
			</div>
		</div>
		<div>
			<slot v-if="expanded" />
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	background-color: var(--color-background-base);
}

.header {
	cursor: pointer;
	display: flex;
	flex-direction: column;
	padding: var(--spacing-s);
	justify-content: flex-start;
	gap: var(--spacing-3xs);
}

.headerText {
	flex-grow: 1;
}

.title {
	display: flex;
}

.accordionItems {
	display: flex;
	flex-direction: column !important;
	align-items: flex-start !important;
	width: 100%;
}

.accordionItem {
	display: block !important;
	text-align: left;
}

.description {
	display: flex;
	padding: 0 var(--spacing-s) var(--spacing-s) var(--spacing-s);

	b {
		font-weight: var(--font-weight-bold);
	}
}
</style>
