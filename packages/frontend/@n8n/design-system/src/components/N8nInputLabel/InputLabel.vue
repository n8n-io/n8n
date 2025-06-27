<script lang="ts" setup>
import type { TextColor } from '@n8n/design-system/types/text';

import N8nIcon from '../N8nIcon';
import N8nText from '../N8nText';
import N8nTooltip from '../N8nTooltip';

const SIZE = ['small', 'medium', 'large'] as const;

interface InputLabelProps {
	compact?: boolean;
	color?: TextColor;
	label?: string;
	tooltipText?: string;
	inputName?: string;
	required?: boolean;
	bold?: boolean;
	size?: (typeof SIZE)[number];
	underline?: boolean;
	showTooltip?: boolean;
	showOptions?: boolean;
}

defineOptions({ name: 'N8nInputLabel' });
withDefaults(defineProps<InputLabelProps>(), {
	compact: false,
	bold: true,
	size: 'medium',
});

const addTargetBlank = (html: string) =>
	html && html.includes('href=') ? html.replace(/href=/g, 'target="_blank" href=') : html;
</script>

<template>
	<div
		:class="{
			[$style.container]: true,
			[$style.withOptions]: $slots.options,
		}"
		v-bind="$attrs"
		data-test-id="input-label"
	>
		<div :class="$style.labelRow">
			<label
				v-if="label || $slots.options"
				:for="inputName"
				:class="{
					'n8n-input-label': true,
					[$style.inputLabel]: true,
					[$style.heading]: !!label,
					[$style.underline]: underline,
					[$style[size]]: true,
					[$style.overflow]: !!$slots.options,
				}"
			>
				<div :class="$style['main-content']">
					<div v-if="label" :class="$style.title">
						<N8nText
							:bold="bold"
							:size="size"
							:compact="compact"
							:color="color"
							:class="{
								[$style.textEllipses]: showOptions,
							}"
						>
							{{ label }}
							<N8nText v-if="required" color="primary" :bold="bold" :size="size">*</N8nText>
						</N8nText>
					</div>
					<span
						v-if="tooltipText && label"
						:class="[$style.infoIcon, showTooltip ? $style.visible : $style.hidden]"
					>
						<N8nTooltip placement="top" :popper-class="$style.tooltipPopper" :show-after="300">
							<N8nIcon :class="$style.icon" icon="circle-help" size="small" />
							<template #content>
								<div v-n8n-html="addTargetBlank(tooltipText)" />
							</template>
						</N8nTooltip>
					</span>
				</div>
				<div :class="$style['trailing-content']">
					<div
						v-if="$slots.options && label"
						:class="{ [$style.overlay]: true, [$style.visible]: showOptions }"
					/>
					<div
						v-if="$slots.options"
						:class="{ [$style.options]: true, [$style.visible]: showOptions }"
						:data-test-id="`${inputName}-parameter-input-options-container`"
					>
						<slot name="options" />
					</div>
					<div
						v-if="$slots.issues"
						:class="$style.issues"
						:data-test-id="`${inputName}-parameter-input-issues-container`"
					>
						<slot name="issues" />
					</div>
				</div>
			</label>
			<div
				v-if="$slots.persistentOptions"
				class="pl-4xs"
				:data-test-id="`${inputName}-parameter-input-persistent-options-container`"
			>
				<slot name="persistentOptions" />
			</div>
		</div>
		<slot />
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;

	label {
		display: flex;
		justify-content: space-between;
	}
}

.labelRow {
	flex-direction: row;
	display: flex;
}

.main-content {
	display: flex;
	&:hover {
		.infoIcon {
			opacity: 1;

			&:hover {
				color: var(--color-text-base);
			}
		}
	}
}

.infoIcon:has(.icon[aria-describedby]) {
	opacity: 1;
}

.trailing-content {
	display: flex;
	gap: var(--spacing-3xs);

	* {
		align-self: center;
	}
}

.inputLabel {
	display: block;
	flex-grow: 1;
}
.container:hover,
.inputLabel:hover {
	.options {
		opacity: 1;
		transition: opacity 100ms ease-in; // transition on hover in
	}

	.overlay {
		opacity: 1;
		transition: opacity 100ms ease-in; // transition on hover in
	}
}
.withOptions:hover {
	.title > span {
		text-overflow: ellipsis;
		overflow: hidden;
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
	margin-left: var(--spacing-4xs);
	z-index: 1;
}

.options {
	opacity: 0;
	transition: opacity 250ms cubic-bezier(0.98, -0.06, 0.49, -0.2); // transition on hover out
	display: flex;
	align-self: center;
}

.issues {
	display: flex;
	align-self: center;
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

.overflow {
	overflow-x: hidden;
	overflow-y: clip;
}

.textEllipses {
	text-overflow: ellipsis;
	overflow: hidden;
}

.heading {
	display: flex;

	&.small {
		padding-bottom: var(--spacing-5xs);
	}
	&.medium {
		padding-bottom: var(--spacing-2xs);
	}
}

.underline {
	border-bottom: var(--border-base);
}

:root .tooltipPopper {
	line-height: var(--font-line-height-compact);
	max-width: 400px;

	li {
		margin-left: var(--spacing-s);
	}

	code {
		color: var(--color-text-dark);
		font-size: var(--font-size-3xs);
		background: var(--color-background-medium);
		padding: var(--spacing-5xs);
		border-radius: var(--border-radius-base);
	}
}
</style>
