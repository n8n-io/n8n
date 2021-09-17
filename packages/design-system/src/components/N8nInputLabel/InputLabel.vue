<template functional>
	<div :class="$style.inputLabel">
		<div :class="$style.label">
			<span>
				{{ $options.methods.addTargetBlank(props.label) }}
				<span v-if="props.required" :class="$style.required">*</span>
			</span>
			<span :class="$style.infoIcon" v-if="props.tooltipText">
				<n8n-tooltip placement="top" :popper-class="$style.tooltipPopper">
					<n8n-icon icon="question-circle" />
					<div slot="content" v-html="props.tooltipText"></div>
				</n8n-tooltip>
			</span>
		</div>
		<slot></slot>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

import N8nTooltip from '../N8nTooltip';
import N8nIcon from '../N8nIcon';

import { addTargetBlank } from '../utils/helpers';

Vue.component('N8nIcon', N8nIcon);
Vue.component('N8nTooltip', N8nTooltip);

export default {
	name: 'n8n-input-label',
	props: {
		label: {
			type: String,
			required: true,
		},
		tooltipText: {
			type: String,
		},
		required: {
			type: Boolean,
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
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-s);
	margin-bottom: var(--spacing-2xs);

	* {
		margin-right: var(--spacing-4xs);
	}
}

.infoIcon {
	color: var(--color-text-light);
	display: var(--info-icon-display, none);
}

.required {
	color: var(--color-primary);
}

.tooltipPopper {
	max-width: 400px;
}
</style>
