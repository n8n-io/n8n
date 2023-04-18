<template>
	<div :class="$style.container" v-on="$listeners">
		<label
			v-if="label || $slots.options"
			:for="inputName"
			:class="{
				[$style.inputLabel]: true,
				[$style.heading]: !!label,
				[$style.underline]: underline,
				[$style[size]]: true,
				[$style.overflow]: !!$slots.options,
			}"
		>
			<div :class="$style.title" v-if="label">
				<n8n-text :bold="bold" :size="size" :compact="compact" :color="color">
					{{ label }}
					<n8n-text color="primary" :bold="bold" :size="size" v-if="required">*</n8n-text>
				</n8n-text>
			</div>
			<span
				:class="[$style.infoIcon, showTooltip ? $style.visible : $style.hidden]"
				v-if="tooltipText && label"
			>
				<n8n-tooltip placement="top" :popper-class="$style.tooltipPopper">
					<n8n-icon icon="question-circle" size="small" />
					<template #content>
						<div v-html="addTargetBlank(tooltipText)" />
					</template>
				</n8n-tooltip>
			</span>
			<div
				v-if="$slots.options && label"
				:class="{ [$style.overlay]: true, [$style.visible]: showOptions }"
			/>
			<div v-if="$slots.options" :class="{ [$style.options]: true, [$style.visible]: showOptions }">
				<slot name="options" />
			</div>
		</label>
		<slot />
	</div>
</template>

<script lang="ts">
import N8nText from '../N8nText';
import N8nTooltip from '../N8nTooltip';
import N8nIcon from '../N8nIcon';

import { addTargetBlank } from '../utils/helpers';

import { defineComponent } from 'vue';

export default defineComponent({
	name: 'n8n-input-label',
	components: {
		N8nText,
		N8nIcon,
		N8nTooltip,
	},
	props: {
		compact: {
			type: Boolean,
			default: false,
		},
		color: {
			type: String,
		},
		label: {
			type: String,
		},
		tooltipText: {
			type: String,
		},
		inputName: {
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
			validator: (value: string): boolean => ['small', 'medium'].includes(value),
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
	methods: {
		addTargetBlank,
	},
});
</script>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
}
.inputLabel {
	display: block;
}
.container:hover,
.inputLabel:hover {
	.infoIcon {
		opacity: 1;
	}

	.options {
		opacity: 1;
		transition: opacity 100ms ease-in; // transition on hover in
	}

	.overlay {
		opacity: 1;
		transition: opacity 100ms ease-in; // transition on hover in
	}
}

.title {
	display: flex;
	align-items: center;
	min-width: 0;

	> * {
		white-space: nowrap;
	}
}

.infoIcon {
	display: flex;
	align-items: center;
	color: var(--color-text-light);
	padding-left: var(--spacing-4xs);
	background-color: var(--color-background-xlight);
	z-index: 1;
}

.options {
	opacity: 0;
	background-color: var(--color-background-xlight);
	transition: opacity 250ms cubic-bezier(0.98, -0.06, 0.49, -0.2); // transition on hover out

	> * {
		float: right;
	}
}

.overlay {
	position: relative;
	flex-grow: 1;
	opacity: 0;
	transition: opacity 250ms cubic-bezier(0.98, -0.06, 0.49, -0.2); // transition on hover out

	> div {
		position: absolute;
		width: 60px;
		height: 19px;
		top: 0;
		right: 0;
		z-index: 0;

		background: linear-gradient(
			270deg,
			var(--color-foreground-xlight) 72.19%,
			rgba(255, 255, 255, 0) 107.45%
		);
	}
}

.hidden {
	opacity: 0;
}

.visible {
	opacity: 1;
}

.heading {
	display: flex;
}

.overflow {
	overflow-x: hidden;
	overflow-y: clip;
}

.small {
	margin-bottom: var(--spacing-5xs);
}

.medium {
	margin-bottom: var(--spacing-2xs);
}

.underline {
	border-bottom: var(--border-base);
}

:root .tooltipPopper {
	max-width: 400px;

	li {
		margin-left: var(--spacing-s);
	}
}
</style>
