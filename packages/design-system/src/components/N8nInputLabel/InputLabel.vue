<template functional>
	<div :class="$style.inputLabel">
		<label>
			<div :class="$style.label">
				<span>{{ props.label }}</span>
				<span v-if="props.tooltipText" :class="$style.infoIcon">
					<n8n-tooltip :content="props.tooltipText" placement="top">
						<n8n-icon icon="info-circle" />
					</n8n-tooltip>
				</span>
			</div>
			<slot></slot>
		</label>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';

import N8nTooltip from '../N8nTooltip';
import N8nIcon from '../N8nIcon';

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
}

.infoIcon {
	color: var(--color-text-light);
	display: var(--info-icon-display, none);
}
</style>
