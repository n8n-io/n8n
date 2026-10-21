<script lang="ts" setup>
import type { IconSize } from '../../types';
import N8nIcon from '../N8nIcon';

interface ExternalLinkProps {
	href?: string;
	size?: IconSize;
	newWindow?: boolean;
	/**
	 * Render as part of running text instead of a standalone control: the link takes the
	 * surrounding font and line height, underlines its label, and its hover pill grows into the
	 * surrounding whitespace without shifting the copy around it. Pair with `size="small"` for
	 * body-sized (14px) text.
	 */
	inline?: boolean;
}

defineOptions({ name: 'N8nExternalLink' });
withDefaults(defineProps<ExternalLinkProps>(), {
	href: undefined,
	size: undefined,
	newWindow: true,
	inline: false,
});
</script>

<template>
	<component
		:is="href ? 'a' : 'button'"
		:href="href"
		:target="href && newWindow ? '_blank' : undefined"
		:rel="href && newWindow ? 'noopener noreferrer' : undefined"
		:class="[$style.link, { [$style.inline]: inline }]"
		v-bind="$attrs"
	>
		<slot></slot>
		<N8nIcon icon="external-link" :size="size" />
	</component>
</template>

<style lang="scss" module>
.link {
	color: var(--color--text);
	text-decoration: none;
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	background: none;
	border: none;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	cursor: pointer;
	border-radius: var(--radius);
	font-weight: var(--font-weight--regular);

	svg {
		color: var(--color--text--tint-1);
	}

	&:hover:not(:disabled) {
		color: var(--color--primary);
		background: var(--color--foreground--tint-1);

		svg {
			color: var(--color--primary);
		}
	}

	&:active {
		color: var(--color--primary--shade-1);
	}

	/* Rendered as a <button> without an href; disabled means inert, so no click affordance. */
	&:disabled {
		cursor: default;
	}

	&.inline {
		/* Reads as part of the sentence: same font, weight and line height as the copy around it. */
		font: inherit;
		line-height: inherit;
		/*
		 * The standalone padding would push the word away from the copy before it and make its
		 * line taller than its neighbours, so it is tightened and cancelled out with equal negative
		 * margins: the word sits exactly where plain text would, and the hover pill grows into the
		 * surrounding whitespace instead of moving any text.
		 */
		padding: var(--spacing--5xs) var(--spacing--4xs);
		margin: calc(-1 * var(--spacing--5xs)) calc(-1 * var(--spacing--4xs));
		/* Marks the word as a link in prose; the icon and the gap carry no text, so they stay bare. */
		text-decoration: underline;
	}
}
</style>
