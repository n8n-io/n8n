<template functional>
	<div :class="$style.inputLabel">
		<div :class="props.label ? $style[`label-${props.size}`]: ''">
			<component v-if="props.label" :is="$options.components.N8nText" :bold="props.bold" :size="props.size">
				{{ props.label }}
				<component :is="$options.components.N8nText" color="primary" :bold="props.bold" :size="props.size" v-if="props.required">*</component>
			</component>
			<span :class="$style.infoIcon" v-if="props.tooltipText">
				<component :is="$options.components.N8nTooltip" placement="top" :popper-class="$style.tooltipPopper">
					<component :is="$options.components.N8nIcon" icon="question-circle" />
					<div slot="content" v-html="$options.methods.addTargetBlank(props.tooltipText)"></div>
				</component>
			</span>
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
				['small', 'medium'].indexOf(value) !== -1,
		},
	},
	methods: {
		addTargetBlank,
	},
};
</script>

<style lang="scss" module>
.inputLabel {
	&:hover {
		--info-icon-display: inline-block;
	}
}

.label {
	* {
		margin-right: var(--spacing-4xs);
	}
}

.label-small {
	composes: label;
	margin-bottom: var(--spacing-4xs);
}

.label-medium {
	composes: label;
	margin-bottom: var(--spacing-2xs);
}

.infoIcon {
	color: var(--color-text-light);
	display: var(--info-icon-display, none);
}

.tooltipPopper {
	max-width: 400px;
}
</style>
