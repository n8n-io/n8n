<template functional>
	<div :class="{[$style.inputLabelContainer]: !props.labelHoverableOnly}">
		<div :class="$options.methods.getLabelClass(props, $style)">
			<div :class="$style.info">
				<component v-if="props.label" :is="$options.components.N8nText" :bold="props.bold" :size="props.size" :compact="!props.underline">
					{{ props.label }}
					<component :is="$options.components.N8nText" color="primary" :bold="props.bold" :size="props.size" v-if="props.required">*</component>
				</component>
				<span :class="[$style.infoIcon, props.showTooltip ? $style.showIcon: $style.hiddenIcon]" v-if="props.tooltipText">
					<component :is="$options.components.N8nTooltip" placement="top" :popper-class="$style.tooltipPopper">
						<component :is="$options.components.N8nIcon" icon="question-circle" size="small" />
						<div slot="content" v-html="$options.methods.addTargetBlank(props.tooltipText)"></div>
					</component>
				</span>
			</div>
			<div :class="{[$style.side]: true, [$style.showIcon]: props.showSide}">
				<slot name="side"></slot>
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
		labelHoverableOnly: {
			type: Boolean,
			default: false,
		},
		showSide: {
			type: Boolean,
		},
	},
	methods: {
		addTargetBlank,
		getLabelClass(props: {label: string, size: string, underline: boolean}, $style: any) {
			if (!props.label) {
				return '';
			}

			const classes = [];
			if (props.underline) {
				classes.push($style[`label-${props.size}-underline`]);
			}
			else {
				classes.push($style[`label-${props.size}`]);
			}

			if (props.labelHoverableOnly) {
				classes.push($style.inputLabel);
			}

			return classes;
		},
	},
};
</script>

<style lang="scss" module>
.inputLabelContainer:hover {
	.infoIcon {
		visibility: visible;
	}

	> div > .side {
		visibility: visible;
	}
}

.infoIcon {
	display: inline-block;
	color: var(--color-text-light);
	margin-left: var(--spacing-5xs);
}

.showIcon {
	visibility: visible !important;
}

.hiddenIcon {
	visibility: hidden;
}

.info {
	display: flex;
	flex-grow: 1;
	align-items: center;
}

.label {
	display: flex;
	overflow: hidden;
}

.label-small {
	composes: label;
	margin-bottom: var(--spacing-4xs);
}

.label-medium {
	composes: label;
	margin-bottom: var(--spacing-2xs);
}

.underline {
	border-bottom: var(--border-base);
}

.label-small-underline {
	composes: label-small;
	composes: underline;
}

.label-medium-underline {
	composes: label-medium;
	composes: underline;
}

.tooltipPopper {
	max-width: 400px;

	li {
		margin-left: var(--spacing-s);
	}
}

.side {
	visibility: hidden;
	float: right;
}
</style>
