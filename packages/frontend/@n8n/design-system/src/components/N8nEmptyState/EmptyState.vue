<script lang="ts" setup>
import { computed } from 'vue';

import type { ButtonVariant } from '../../types/button';
import N8nButton from '../N8nButton';
import N8nIcon from '../N8nIcon';
import { type IconName } from '../N8nIcon/icons';
import N8nText from '../N8nText';

type EmptyStateVariant = 'empty' | 'gated';

interface EmptyStateProps {
	/** Single icon tile. Ignored when `iconCluster` is provided. */
	icon?: IconName;
	/** 1–3 icons rendered as the stacked/rotated/elevated tile motif. */
	iconCluster?: IconName[];
	title?: string;
	description?: string;
	/** Primary call-to-action label. */
	buttonText?: string;
	buttonIcon?: IconName;
	buttonVariant?: ButtonVariant;
	buttonDisabled?: boolean;
	/** When set, renders a low-emphasis "Learn more" button that opens the url in a new tab. */
	learnMoreUrl?: string;
	learnMoreText?: string;
	/** Reserved for subtle semantic/style differences between true-empty and gated/upgrade states. */
	variant?: EmptyStateVariant;
	/** Dashed panel around the content core. */
	bordered?: boolean;
}

defineOptions({ name: 'N8nEmptyState' });

const props = withDefaults(defineProps<EmptyStateProps>(), {
	icon: undefined,
	iconCluster: undefined,
	title: undefined,
	description: undefined,
	buttonText: undefined,
	buttonIcon: undefined,
	buttonVariant: 'solid',
	buttonDisabled: false,
	learnMoreUrl: undefined,
	learnMoreText: 'Learn more',
	variant: 'empty',
	bordered: true,
});

defineEmits<{
	'click:button': [event: MouseEvent];
}>();

const tiles = computed<IconName[]>(() => {
	if (props.iconCluster?.length) return props.iconCluster;
	if (props.icon) return [props.icon];
	return [];
});

function tilePosition(index: number): 'left' | 'center' | 'right' {
	const total = tiles.value.length;
	if (total <= 1) return 'center';
	if (total === 2) return index === 0 ? 'left' : 'right';

	const center = Math.floor(total / 2);
	if (index < center) return 'left';
	if (index > center) return 'right';
	return 'center';
}
</script>

<template>
	<div
		:class="[$style.container, { [$style.bordered]: bordered }]"
		:data-variant="variant"
		data-test-id="empty-state"
	>
		<div v-if="$slots.visual || tiles.length" :class="$style.visual">
			<slot name="visual">
				<div :class="$style.cluster" data-test-id="empty-state-cluster">
					<span
						v-for="(tileIcon, index) in tiles"
						:key="`${tileIcon}-${index}`"
						:class="[$style.tile, $style[`tile-${tilePosition(index)}`]]"
					>
						<N8nIcon :icon="tileIcon" :size="20" :stroke-width="1.5" color="foreground-xdark" />
					</span>
				</div>
			</slot>
		</div>

		<div v-if="title || description || $slots.title || $slots.description" :class="$style.text">
			<N8nText
				v-if="title || $slots.title"
				tag="h3"
				:bold="true"
				size="large"
				color="text-dark"
				:class="$style.title"
			>
				<slot name="title">{{ title }}</slot>
			</N8nText>
			<N8nText v-if="description || $slots.description" size="medium" color="text-base">
				<slot name="description">{{ description }}</slot>
			</N8nText>
		</div>

		<div v-if="$slots.actions || buttonText || learnMoreUrl" :class="$style.actions">
			<slot name="actions">
				<N8nButton
					v-if="learnMoreUrl"
					variant="ghost"
					size="large"
					:href="learnMoreUrl"
					target="_blank"
					data-test-id="empty-state-learn-more"
				>
					{{ learnMoreText }}
					<N8nIcon icon="arrow-up-right" />
				</N8nButton>
				<N8nButton
					v-if="buttonText"
					:label="buttonText"
					:variant="buttonVariant"
					:icon="buttonIcon"
					:disabled="buttonDisabled"
					size="large"
					data-test-id="empty-state-button"
					@click="$emit('click:button', $event)"
				/>
			</slot>
		</div>

		<div v-if="$slots.additionalContent" :class="$style.additionalContent">
			<slot name="additionalContent"></slot>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--lg);
	padding: var(--spacing--3xl);
	text-align: center;
}

.bordered {
	border: 2px dashed var(--color--foreground);
	border-radius: var(--radius--lg);
}

.visual {
	display: flex;
	justify-content: center;
}

.cluster {
	display: flex;
	align-items: center;
	justify-content: center;
}

.tile {
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--height--xl);
	height: var(--height--xl);
	background: var(--background--surface);
	border: 1px solid var(--border-color--subtle);
	border-radius: var(--radius--2xs);
	box-shadow: var(--shadow--sm);
}

.tile + .tile {
	margin-left: calc(-1 * var(--spacing--2xs));
}

.tile-left {
	transform: rotate(-8deg);
}

.tile-right {
	transform: rotate(8deg);
}

.tile-center {
	position: relative;
	z-index: 1;
	box-shadow: var(--shadow--md);
}

.text {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--2xs);
	max-width: 32rem;
}

.title {
	margin: 0;
}

.actions {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
}

.additionalContent {
	display: flex;
	justify-content: center;
}
</style>
