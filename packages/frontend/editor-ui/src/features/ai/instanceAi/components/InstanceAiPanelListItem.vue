<script setup lang="ts">
import {
	N8nIcon,
	N8nIconButton,
	N8nText,
	type IconName,
	type IconOrEmoji,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, useSlots } from 'vue';

const props = defineProps<{
	label: string;
	subtitle?: string;
	/** An icon name, or an icon or emoji object such as a project icon */
	icon?: IconName | string | IconOrEmoji;
	/** Shows a spinner in place of the icon, shimmers the label and disables the row */
	loading?: boolean;
	/** If set, the row is a link. If not set, the row is static. */
	href?: string;
	/** Accessible name of the link. Defaults to the label. */
	ariaLabel?: string;
	archived?: boolean;
	/** Shows a dismiss button that emits `dismiss` */
	dismissible?: boolean;
	testId?: string;
}>();

const emit = defineEmits<{
	click: [event: MouseEvent];
	dismiss: [];
}>();

defineSlots<{
	/** Replaces the icon */
	leading?: () => unknown;
	/** Sits after the label */
	trailing?: () => unknown;
}>();

const slots = useSlots();
const i18n = useI18n();

const isLink = computed(() => props.href !== undefined && !props.loading);
const hasLeading = computed(() => props.loading || !!props.icon || !!slots.leading);

const normalizedIcon = computed<IconOrEmoji | undefined>(() => {
	if (!props.icon) return undefined;
	if (typeof props.icon === 'string') return { type: 'icon', value: props.icon };
	return props.icon;
});

function onClick(event: MouseEvent) {
	emit('click', event);
}
</script>

<template>
	<li
		:class="[
			$style.row,
			subtitle && $style.withSubtitle,
			archived && $style.archived,
			isLink && $style.interactive,
		]"
		:data-test-id="testId"
	>
		<component
			:is="isLink ? 'a' : 'span'"
			:href="isLink ? href : undefined"
			:aria-label="isLink ? ariaLabel : undefined"
			:aria-disabled="loading || undefined"
			:class="$style.main"
			@click="isLink && onClick($event)"
		>
			<span v-if="hasLeading" :class="$style.leading">
				<N8nIcon v-if="loading" icon="spinner" spin size="large" :class="$style.icon" />
				<slot v-else-if="$slots.leading" name="leading" />
				<span v-else-if="normalizedIcon?.type === 'emoji'" :class="$style.emoji">
					{{ normalizedIcon.value }}
				</span>
				<N8nIcon
					v-else-if="normalizedIcon"
					:icon="normalizedIcon.value"
					size="large"
					:class="$style.icon"
				/>
			</span>
			<span :class="$style.text">
				<N8nText
					step="sm"
					color="text-dark"
					:class="[$style.label, $style.truncate, loading && $style.shimmer]"
					:title="label"
				>
					{{ label }}
				</N8nText>
				<N8nText v-if="subtitle" step="sm" color="text-light" :class="$style.truncate">
					{{ subtitle }}
				</N8nText>
			</span>
			<span v-if="archived" :class="$style.badge">
				{{ i18n.baseText('instanceAi.artifactsPanel.archived') }}
			</span>
			<slot name="trailing" />
		</component>
		<N8nIconButton
			v-if="dismissible"
			icon="x"
			variant="ghost"
			size="xsmall"
			:class="$style.dismiss"
			:aria-label="i18n.baseText('instanceAi.artifactsPanel.context.dismiss')"
			:title="i18n.baseText('instanceAi.artifactsPanel.context.dismiss')"
			data-test-id="instance-ai-panel-list-item-dismiss"
			@click="emit('dismiss')"
		/>
	</li>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/focus';
@use '@n8n/design-system/css/mixins/motion';
@use '@n8n/design-system/css/mixins/utils';

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	border-radius: var(--radius);
	user-select: none;
}

.withSubtitle {
	align-items: flex-start;

	.main {
		align-items: flex-start;
	}
}

.interactive:hover,
.interactive:has(.main:focus-visible) {
	background: var(--background--hover);
}

.main {
	display: flex;
	flex: 1;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	padding: var(--spacing--2xs);
	color: var(--text-color);
	border: 1px solid transparent;
	text-decoration: none;

	&:is(a) {
		cursor: pointer;

		&:hover,
		&:focus-visible,
		&:visited {
			color: var(--text-color);
			text-decoration: none;
		}

		&:focus-visible {
			@include focus.focus-ring-with-border;
		}
	}

	&[aria-disabled='true'] {
		cursor: default;
	}
}

.leading {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.icon {
	color: var(--icon-color);
}

/* Matches the size of a large N8nIcon */
.emoji {
	font-size: var(--font-size--md);
	line-height: 1;
}

.text {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
}

.truncate {
	@include utils.utils-ellipsis;
}

.shimmer {
	@include motion.shimmer;
}

.archived {
	opacity: 0.55;

	.label {
		text-decoration: line-through;
	}
}

.badge {
	font-size: var(--font-size--3xs);
	color: var(--text-color--subtle);
	background: var(--background--subtle);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border-radius: var(--radius--sm);
	flex-shrink: 0;
}

.dismiss {
	flex-shrink: 0;
	margin-right: var(--spacing--2xs);
}

.withSubtitle .dismiss {
	margin-top: calc(var(--spacing--2xs) - var(--spacing--5xs));
}
</style>
