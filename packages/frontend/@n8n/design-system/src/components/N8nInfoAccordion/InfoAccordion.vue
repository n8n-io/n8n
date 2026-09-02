<script lang="ts" setup>
import { createEventBus, type EventBus } from '@n8n/utils/event-bus';
import { onMounted, ref, useId } from 'vue';

import type { IconColor } from '../../types/icon';
import N8nIcon from '../N8nIcon';
import { type IconName } from '../N8nIcon/icons';
import N8nText from '../N8nText';
import N8nTooltip from '../N8nTooltip';

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
	initiallyExpanded?: boolean;
	headerIcon?: { icon: IconName; color: IconColor };
	eventBus?: EventBus;
}

defineOptions({ name: 'N8nInfoAccordion' });
const props = withDefaults(defineProps<InfoAccordionProps>(), {
	items: () => [],
	initiallyExpanded: false,
	eventBus: () => createEventBus(),
});
const emit = defineEmits<{
	'click:body': [e: MouseEvent];
	tooltipClick: [item: string, e: MouseEvent];
}>();

const expanded = ref(false);
const headerId = `info-accordion-header-${useId()}`;

onMounted(() => {
	props.eventBus.on('expand', () => {
		expanded.value = true;
	});
	expanded.value = props.initiallyExpanded;
});

const toggle = () => {
	expanded.value = !expanded.value;
};

const onClick = (e: MouseEvent) => emit('click:body', e);

const onTooltipClick = (item: string, event: MouseEvent) => emit('tooltipClick', item, event);
</script>

<template>
	<div :class="['accordion', $style.container]">
		<button
			:id="headerId"
			type="button"
			:class="{ [$style.header]: true, [$style.expanded]: expanded }"
			:aria-expanded="expanded"
			@click="toggle"
		>
			<N8nIcon v-if="headerIcon" :icon="headerIcon.icon" :color="headerIcon.color" size="small" />
			<N8nText :class="$style.headerText" color="text-base" size="small" align="left" bold>{{
				title
			}}</N8nText>
			<N8nIcon :icon="expanded ? 'chevron-up' : 'chevron-down'" bold />
		</button>
		<section
			v-if="expanded"
			:class="{ [$style.description]: true, [$style.collapsed]: !expanded }"
			:aria-labelledby="headerId"
			@click="onClick"
		>
			<!-- Info accordion can display list of items with icons or just a HTML description -->
			<div v-if="items.length > 0" :class="$style.accordionItems">
				<div v-for="item in items" :key="item.id" :class="$style.accordionItem">
					<N8nTooltip :disabled="!item.tooltip">
						<template #content>
							<small v-n8n-html="item.tooltip" @click="onTooltipClick(item.id, $event)" />
						</template>
						<N8nIcon :icon="item.icon" :color="item.iconColor" size="small" class="mr-2xs" />
					</N8nTooltip>
					<N8nText size="small" color="text-base">{{ item.label }}</N8nText>
				</div>
			</div>
			<N8nText color="text-base" size="small" align="left">
				<span v-n8n-html="description"></span>
			</N8nText>
			<slot name="customContent"></slot>
		</section>
	</div>
</template>

<style lang="scss" module>
.container {
	background-color: var(--color--background);
}

.header {
	cursor: pointer;
	display: flex;
	width: 100%;
	border: 0;
	background: transparent;
	font: inherit;
	padding: var(--spacing--sm);
	align-items: center;
	justify-content: flex-start;
	gap: var(--spacing--3xs);
}

.expanded {
	padding: var(--spacing--sm) var(--spacing--sm) var(--spacing--2xs) var(--spacing--sm);
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
	padding: 0 var(--spacing--sm) var(--spacing--sm) var(--spacing--sm);

	b {
		font-weight: var(--font-weight--bold);
	}
}
</style>
