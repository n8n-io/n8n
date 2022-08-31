<template>
	<div :class="{'n8n-info-tip': true, [$style[theme]]: true, [$style[type]]: true, [$style.bold]: bold}">
		<n8n-tooltip :placement="tooltipPlacement" :popper-class="$style.tooltipPopper" :disabled="type !== 'tooltip'">
			<span :class="$style.iconText">
				<n8n-icon :icon="theme.startsWith('info') ? 'info-circle': 'exclamation-triangle'" />
				<span v-if="type === 'note'"><slot></slot></span>
			</span>
			<span v-if="type === 'tooltip'" slot="content"><slot></slot></span>
		</n8n-tooltip>
	</div>
</template>

<script lang="ts">
import N8nIcon from '../N8nIcon';
import N8nTooltip from '../N8nTooltip';

import Vue from 'vue';

export default Vue.extend({
	name: 'n8n-info-tip',
	components: {
		N8nIcon,
		N8nTooltip,
	},
	props: {
		theme: {
			type: String,
			default: 'info',
			validator: (value: string): boolean =>
				['info', 'info-light', 'warning', 'danger'].includes(value),
		},
		type: {
			type: String,
			default: 'note',
			validator: (value: string): boolean =>
				['note', 'tooltip'].includes(value),
		},
		bold: {
			type: Boolean,
			default: true,
		},
		tooltipPlacement: {
			type: String,
			default: 'top',
		},
	},
});
</script>

<style lang="scss" module>
.base {
	font-size: var(--font-size-2xs);
	line-height: var(--font-size-s);
	word-break: normal;
	display: flex;
	align-items: center;

	svg {
		font-size: var(--font-size-s);
	}
}

.bold {
	font-weight: var(--font-weight-bold);
}

.note {
	composes: base;

	svg {
		margin-right: var(--spacing-4xs);
	}
}

.tooltip {
	composes: base;
	display: inline-flex;
}

.iconText {
	display: inline-flex;
}

.info-light {
	color: var(--color-foreground-dark);
}

.info {
	color: var(--color-text-light);
}

.warning {
	color: var(--color-warning);
}

.danger {
	color: var(--color-danger);
}
</style>
