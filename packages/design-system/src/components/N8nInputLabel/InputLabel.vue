<template>
	<div :class="$style.container">
		<div :class="labelClass">
			<div :class="$style.info">
				<n8n-text v-if="label" :bold="bold" :size="size" :compact="!underline">
					{{ label }}
					<n8n-text color="primary" :bold="bold" :size="size" v-if="required">*</n8n-text>
				</n8n-text>
			</div>
			<span :class="[$style.infoIcon, showTooltip ? $style.showIcon: $style.hiddenIcon]" v-if="tooltipText">
					<n8n-tooltip placement="top" :popper-class="$style.tooltipPopper">
						<n8n-icon icon="question-circle" size="small" />
						<div slot="content" v-html="addTargetBlank(tooltipText)"></div>
					</n8n-tooltip>
				</span>
			<div :class="{[$style.options]: true, [$style.showIcon]: showOptions}">
				<slot name="options"></slot>
			</div>
		</div>
		<slot></slot>
	</div>
</template>

<script lang="ts">
import N8nText from '../N8nText';
import N8nTooltip from '../N8nTooltip';
import N8nIcon from '../N8nIcon';

import { addTargetBlank } from '../utils/helpers';

export default {
	name: 'n8n-input-label',
	components: {
		N8nText,
		N8nIcon,
		N8nTooltip,
	},
	props: {
		label: {
			type: String,
		},
		tooltipText: {
			type: String,
		},
		required: {
			type: Boolean,
		},
		bold: {
			type: Boolean,
			default: true,
		},
		size: {
			type: String,
			default: 'medium',
			validator: (value: string): boolean =>
				['small', 'medium'].includes(value),
		},
		underline: {
			type: Boolean,
		},
		showTooltip: {
			type: Boolean,
		},
		showOptions: {
			type: Boolean,
		},
	},
	computed: {
		labelClass(): string {
			return {
				[this.$style.label]: !!this.label,
				[this.$style.underline]: this.underline,
				[this.$style[this.size]]: true,
			};
		},
	},
	methods: {
		addTargetBlank,
	},
};
</script>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
}

.container:hover {
	.infoIcon {
		opacity: 1;
	}

	> div > .options {
		opacity: 1;
	}
}

.inputLabel:hover {
	> .infoIcon {
		opacity: 1;
	}
}

.infoIcon {
	display: flex;
	align-items: center;
	color: var(--color-text-light);
	padding-left: var(--spacing-4xs);
	background-color: var(--color-background-xlight)
}

.showIcon {
	opacity: 1 !important;
}

.hiddenIcon {
	opacity: 0;
}

.info {
	display: flex;
	align-items: center;
	min-width: 0;

	> * {
		white-space: nowrap;
	}
}

.label {
	display: flex;
	overflow: hidden;
}

.small {
	margin-bottom: var(--spacing-4xs);
}

.medium {
	margin-bottom: var(--spacing-2xs);
}

.underline {
	border-bottom: var(--border-base);
}

.tooltipPopper {
	max-width: 400px;

	li {
		margin-left: var(--spacing-s);
	}
}

.options {
	opacity: 0;
	transition: opacity 150ms cubic-bezier(0.87, 0, 0.13, 1);
	flex-grow: 1;
	background-color: var(--color-background-xlight);

	> * {
		float: right;
	}
}

</style>
