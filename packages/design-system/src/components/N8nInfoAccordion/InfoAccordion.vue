<template>
	<div :class="['accordion', $style.container]">
		<div :class="{ [$style.header]: true, [$style.expanded]: expanded }" @click="toggle">
			<n8n-icon
				v-if="headerIcon"
				:icon="headerIcon.icon"
				:color="headerIcon.color"
				size="small"
				class="mr-2xs"
			/>
			<n8n-text :class="$style.headerText" color="text-base" size="small" align="left" bold>{{
				title
			}}</n8n-text>
			<n8n-icon :icon="expanded ? 'chevron-up' : 'chevron-down'" bold />
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
							<div v-html="item.tooltip" @click="onTooltipClick(item.id, $event)"></div>
						</template>
						<n8n-icon :icon="item.icon" :color="item.iconColor" size="small" class="mr-2xs" />
					</n8n-tooltip>
					<n8n-text size="small" color="text-base">{{ item.label }}</n8n-text>
				</div>
			</div>
			<n8n-text color="text-base" size="small" align="left">
				<span v-html="description"></span>
			</n8n-text>
			<slot name="customContent"></slot>
		</div>
	</div>
</template>

<script lang="ts">
import N8nText from '../N8nText';
import N8nIcon from '../N8nIcon';
import Vue, { PropType } from 'vue';

interface IAccordionItem {
	id: string;
	label: string;
	icon: string;
}

export default Vue.extend({
	name: 'n8n-info-accordion',
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
			default() {
				return [];
			},
		},
		initiallyExpanded: {
			type: Boolean,
			default: false,
		},
		headerIcon: {
			type: Object as PropType<{ icon: string; color: string }>,
			required: false,
		},
	},
	mounted() {
		this.$on('expand', () => {
			this.expanded = true;
		});
		this.expanded = this.initiallyExpanded;
	},
	data() {
		return {
			expanded: false,
		};
	},
	methods: {
		toggle() {
			this.expanded = !this.expanded;
		},
		onClick(e) {
			this.$emit('click', e);
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
