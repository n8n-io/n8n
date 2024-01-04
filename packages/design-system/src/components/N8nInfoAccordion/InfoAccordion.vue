<template>
	<div :class="['accordion', $style.container]">
		<div :class="{ [$style.header]: true, [$style.expanded]: expanded }" @click="toggle">
			<N8nIcon
				v-if="headerIcon"
				:icon="headerIcon.icon"
				:color="headerIcon.color"
				size="small"
				class="mr-2xs"
			/>
			<N8nText :class="$style.headerText" color="text-base" size="small" align="left" bold>{{
				title
			}}</N8nText>
			<N8nIcon :icon="expanded ? 'chevron-up' : 'chevron-down'" bold />
		</div>
		<div
			v-if="expanded"
			:class="{ [$style.description]: true, [$style.collapsed]: !expanded }"
			@click="onClick"
		>
			<!-- Info accordion can display list of items with icons or just a HTML description -->
			<div v-if="items.length > 0" :class="$style.accordionItems">
				<div v-for="item in items" :key="item.id" :class="$style.accordionItem">
					<n8n-tooltip :disabled="!item.tooltip">
						<template #content>
							<div @click="onTooltipClick(item.id, $event)" v-html="item.tooltip"></div>
						</template>
						<N8nIcon :icon="item.icon" :color="item.iconColor" size="small" class="mr-2xs" />
					</n8n-tooltip>
					<N8nText size="small" color="text-base">{{ item.label }}</N8nText>
				</div>
			</div>
			<N8nText color="text-base" size="small" align="left">
				<span v-html="description"></span>
			</N8nText>
			<slot name="customContent"></slot>
		</div>
	</div>
</template>

<script lang="ts">
import N8nText from '../N8nText';
import N8nIcon from '../N8nIcon';
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import type { EventBus } from '../../utils';
import { createEventBus } from '../../utils';

export interface IAccordionItem {
	id: string;
	label: string;
	icon: string;
	iconColor?: string;
	tooltip?: string;
}

export default defineComponent({
	name: 'N8nInfoAccordion',
	components: {
		N8nText,
		N8nIcon,
	},
	props: {
		title: {
			type: String,
		},
		description: {
			type: String,
		},
		items: {
			type: Array as PropType<IAccordionItem[]>,
			default: () => [],
		},
		initiallyExpanded: {
			type: Boolean,
			default: false,
		},
		headerIcon: {
			type: Object as PropType<{ icon: string; color: string }>,
			required: false,
		},
		eventBus: {
			type: Object as PropType<EventBus>,
			default: () => createEventBus(),
		},
	},
	data() {
		return {
			expanded: false,
		};
	},
	mounted() {
		this.eventBus.on('expand', () => {
			this.expanded = true;
		});
		this.expanded = this.initiallyExpanded;
	},
	methods: {
		toggle() {
			this.expanded = !this.expanded;
		},
		onClick(e: MouseEvent) {
			this.$emit('click:body', e);
		},
		onTooltipClick(item: string, event: MouseEvent) {
			this.$emit('tooltipClick', item, event);
		},
	},
});
</script>

<style lang="scss" module>
.container {
	background-color: var(--color-background-base);
}

.header {
	cursor: pointer;
	display: flex;
	padding: var(--spacing-s);
	align-items: center;

	.headerText {
		flex-grow: 1;
	}
}

.expanded {
	padding: var(--spacing-s) var(--spacing-s) var(--spacing-2xs) var(--spacing-s);
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
