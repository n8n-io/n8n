<script lang="ts" setup>
import { computed } from 'vue';

import type { BadgeTheme, TextStep } from '@n8n/design-system/types/';

import N8nText from '../N8nText';

const BADGE_SIZE_TO_TEXT_SIZE = {
	small: '2xs',
	medium: 'sm',
	large: 'md',
} as const satisfies Record<BadgeSize, TextStep>;

type BadgeSize = 'small' | 'medium' | 'large';

interface BadgeProps {
	theme?: BadgeTheme;
	size?: BadgeSize;
	bold?: boolean;
	showBorder?: boolean;
	clickable?: boolean;
	text?: string;
	elevated?: boolean;
	class?: string | string[] | Record<string, boolean>;
}

defineOptions({ name: 'N8nBadge' });
const props = withDefaults(defineProps<BadgeProps>(), {
	theme: 'default',
	size: 'small',
	bold: true,
	showBorder: true,
	clickable: false,
	elevated: false,
});

const textSize = computed<TextStep>(() => BADGE_SIZE_TO_TEXT_SIZE[props.size]);
</script>

<template>
	<span
		:class="[
			'n8n-badge',
			$style[props.theme],
			$style[props.size],
			{ [$style.border]: props.showBorder, [$style.clickable]: props.clickable },
			{ [$style.elevated]: props.elevated },
			props.class,
		]"
	>
		<slot name="leading"></slot>
		<N8nText v-if="props.text" :step="textSize" :bold="props.bold" :truncate="true">{{
			props.text
		}}</N8nText>
		<N8nText v-else :step="textSize" :bold="props.bold" :truncate="true">
			<slot></slot>
		</N8nText>
		<slot name="trailing"></slot>
	</span>
</template>

<style lang="scss" module>
.badge {
	--n8n--badge-background: transparent;
	--n8n--badge-text-color: var(--text-color);
	--n8n--badge-border-color: transparent;
	--n8n--badge-padding: var(--spacing--5xs) var(--spacing--3xs);
	--n8n--badge-height: var(--height--xs);

	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--3xs);
	white-space: nowrap;
	user-select: none;
	width: fit-content;
	max-width: var(--spacing--4xl);

	padding: var(--n8n--badge-padding);
	height: var(--n8n--badge-height);
	color: var(--n8n--badge-text-color);
	background-color: var(--n8n--badge-background);
	border: 1px solid var(--n8n--badge-background);
	border-radius: var(--radius--2xs);
	overflow: hidden;
}

/** Variants **/
.border {
	border-color: var(--n8n--badge-border-color);
}
.elevated {
	box-shadow: var(--shadow--xs);
}

/** Sizes **/
.small {
	--n8n--badge-height: var(--height--2xs);
}

.medium {
	--n8n--badge-height: var(--height--xs);
}

.large {
	--n8n--badge-padding: var(--spacing--5xs) var(--spacing--xs);
	--n8n--badge-height: var(--height--sm);
	border-radius: var(--radius--xs);
}

/** Themes **/
.default,
.success,
.warning,
.danger,
.primary,
.secondary,
.tertiary,
.neutral,
.pink,
.orange,
.green,
.purple,
.mint,
.red,
.blue,
.yellow {
	composes: badge;
}

.default {
	--n8n--badge-background: var(--background--surface);
	--n8n--badge-text-color: var(--text-color--subtle);
	--n8n--badge-border-color: var(--border-color);
}

.primary {
	--n8n--badge-background: var(--background--brand);
	--n8n--badge-text-color: var(--color--neutral-white);
	--n8n--badge-border-color: var(--background--brand--active);
}

.neutral,
.tertiary {
	--n8n--badge-background: var(--color--neutral-100);
	--n8n--badge-text-color: var(--color--neutral-900);
	--n8n--badge-border-color: var(--color--neutral-500);
}

.pink {
	--n8n--badge-background: var(--color--pink-100);
	--n8n--badge-text-color: var(--color--pink-900);
	--n8n--badge-border-color: var(--color--pink-500);
}

.orange {
	--n8n--badge-background: var(--color--orange-100);
	--n8n--badge-text-color: var(--color--orange-900);
	--n8n--badge-border-color: var(--color--orange-500);
}

.green,
.success {
	--n8n--badge-background: var(--color--green-100);
	--n8n--badge-text-color: var(--color--green-900);
	--n8n--badge-border-color: var(--color--green-500);
}

.purple,
.secondary {
	--n8n--badge-background: var(--color--purple-100);
	--n8n--badge-text-color: var(--color--purple-900);
	--n8n--badge-border-color: var(--color--purple-500);
}

.mint {
	--n8n--badge-background: var(--color--mint-100);
	--n8n--badge-text-color: var(--color--mint-900);
	--n8n--badge-border-color: var(--color--mint-500);
}

.red,
.danger {
	--n8n--badge-background: var(--color--red-100);
	--n8n--badge-text-color: var(--color--red-900);
	--n8n--badge-border-color: var(--color--red-500);
}

.blue {
	--n8n--badge-background: var(--color--blue-100);
	--n8n--badge-text-color: var(--color--blue-900);
	--n8n--badge-border-color: var(--color--blue-500);
}

.yellow,
.warning {
	--n8n--badge-background: var(--color--yellow-100);
	--n8n--badge-text-color: var(--color--yellow-900);
	--n8n--badge-border-color: var(--color--yellow-500);
}
</style>
