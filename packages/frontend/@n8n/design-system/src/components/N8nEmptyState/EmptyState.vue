<script lang="ts" setup>
import { computed } from 'vue';

import EmptyStateIconCards from './EmptyStateIconCards.vue';
import type { EmptyStateIconCards as EmptyStateIconCardsIcon, EmptyStateSize } from './types';
import type { ButtonVariant } from '../../types/button';
import N8nButton from '../N8nButton';
import N8nCallout, { type CalloutTheme } from '../N8nCallout';
import N8nHeading from '../N8nHeading';
import N8nIcon from '../N8nIcon';
import { type IconName } from '../N8nIcon/icons';
import type { IconOrEmoji } from '../N8nIconPicker/types';
import N8nText from '../N8nText';
import N8nTooltip from '../N8nTooltip/Tooltip.vue';

interface EmptyStateProps {
	icon?: IconOrEmoji | EmptyStateIconCardsIcon;
	heading?: string;
	buttonText?: string;
	buttonVariant?: ButtonVariant;
	buttonDisabled?: boolean;
	buttonIcon?: IconName;
	description?: string;
	calloutText?: string;
	calloutTheme?: CalloutTheme;
	calloutIcon?: IconName;
	/**
	 * `small` fits inside a table or a list, for example in the `#cover` slot of
	 * `N8nDataTableServer`. Put the one-line message in `description`.
	 */
	size?: EmptyStateSize;
}

defineOptions({ name: 'N8nEmptyState' });
const props = withDefaults(defineProps<EmptyStateProps>(), {
	calloutTheme: 'info',
	buttonIcon: undefined,
	size: 'default',
});

const isSmall = computed(() => props.size === 'small');
// The default size leaves the variant to N8nButton.
const resolvedButtonVariant = computed(
	() => props.buttonVariant ?? (isSmall.value ? 'outline' : undefined),
);
</script>

<template>
	<div
		:class="['n8n-empty-state', $style.container, { [$style.small]: isSmall }]"
		data-test-id="empty-state"
	>
		<div v-if="icon" :class="$style.icon">
			<EmptyStateIconCards
				v-if="icon.type === 'cards'"
				:center-icon="icon.center"
				:side-icons="icon.sides"
				:animated="icon.animated ?? true"
			/>
			<N8nIcon
				v-else-if="icon.type === 'icon'"
				:icon="icon.value"
				:size="isSmall ? 24 : 40"
				:stroke-width="1.5"
				color="foreground-xdark"
			/>
			<span v-else>{{ icon.value }}</span>
		</div>
		<div v-if="heading || $slots.heading || description" :class="$style.text">
			<div v-if="heading || $slots.heading" :class="$style.heading">
				<N8nHeading :size="isSmall ? 'medium' : 'xlarge'" align="center">
					<slot name="heading">{{ heading }}</slot>
				</N8nHeading>
			</div>
			<div
				v-if="description"
				:class="$style.description"
				@click="$emit('descriptionClick', $event)"
			>
				<N8nText color="text-base">
					<slot name="description">
						<span v-n8n-html="description"></span>
					</slot>
				</N8nText>
			</div>
		</div>
		<N8nTooltip v-if="buttonText" :disabled="!buttonDisabled">
			<template #content>
				<slot name="disabledButtonTooltip"></slot>
			</template>
			<N8nButton
				:label="buttonText"
				:variant="resolvedButtonVariant"
				:disabled="buttonDisabled"
				:icon="buttonIcon"
				:size="isSmall ? 'small' : 'large'"
				role="button"
				@click="$emit('click:button', $event)"
			/>
		</N8nTooltip>
		<div v-if="$slots.additionalContent" :class="$style['additional-content']">
			<slot name="additionalContent"></slot>
		</div>
		<N8nCallout
			v-if="calloutText"
			:theme="calloutTheme"
			:icon="calloutIcon"
			:class="$style.callout"
		>
			<N8nText color="text-base">
				<span v-n8n-html="calloutText" size="small"></span>
			</N8nText>
		</N8nCallout>
	</div>
</template>

<style lang="scss" module>
.container {
	border: 2px dashed var(--color--foreground);
	border-radius: var(--radius--lg);
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--md);
	padding: var(--spacing--3xl) var(--spacing--xl);
}

.icon {
	font-size: 40px;
}

.small {
	border: 0;
	border-radius: 0;
	gap: var(--spacing--sm);
	padding: var(--spacing--2xl) var(--spacing--md);

	.icon {
		font-size: var(--font-size--2xl);
	}
}

.text {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	max-width: 32rem;
}

.heading {
	text-align: center;
}

.description {
	color: var(--color--text);
	text-align: center;
}

.callout {
	width: 100%;
	text-align: left;
}

.additional-content {
	display: flex;
	margin-top: 0;
	justify-content: center;
}
</style>
