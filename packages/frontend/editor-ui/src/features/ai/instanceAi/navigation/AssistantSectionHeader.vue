<script lang="ts" setup>
import { useTemplateRef } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import { N8nIcon, N8nText } from '@n8n/design-system';

const props = defineProps<{
	title: string;
	/** Lets a list below the header take the title as its name, and describes the link. */
	titleId?: string;
	/**
	 * A link at the end of the header, for example to the full list. `ariaLabel` must start with
	 * the visible `label`, so that speech input finds the link by its visible text.
	 */
	link: { to: RouteLocationRaw; label: string; ariaLabel?: string; testId?: string };
}>();

const collapsed = defineModel<boolean>('collapsed', { required: true });

const toggleButton = useTemplateRef<HTMLButtonElement>('toggle');

// The section moves the focus here when a reload removes the focused row and no row is left.
defineExpose({ focus: () => toggleButton.value?.focus() });
</script>

<template>
	<div :class="$style.header">
		<!-- The heading holds the toggle, so heading navigation also reaches the toggle. -->
		<div role="heading" :aria-level="2" :class="$style.heading">
			<button
				ref="toggle"
				type="button"
				:class="$style.toggle"
				:aria-expanded="!collapsed"
				@click="collapsed = !collapsed"
			>
				<N8nText :id="props.titleId" size="small" bold color="text-base" :class="$style.title">
					{{ props.title }}
				</N8nText>
				<N8nIcon
					icon="chevron-down"
					size="small"
					:class="[$style.chevron, { [$style.chevronCollapsed]: collapsed }]"
				/>
			</button>
		</div>
		<!-- The link text is short, so the section title describes it, e.g. "View all, Chats". -->
		<RouterLink
			:to="props.link.to"
			:class="$style.link"
			:aria-label="props.link.ariaLabel"
			:aria-describedby="props.titleId"
			:data-test-id="props.link.testId"
		>
			{{ props.link.label }}
		</RouterLink>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/_focus.scss' as focus;

.header {
	display: flex;
	align-items: center;
	width: 100%;
	box-sizing: border-box;
	margin-top: var(--spacing--4xs);
	border-radius: var(--radius--3xs);
	color: inherit;

	// `--text-color--subtle` passes AA on the sidebar background, but not on the hover
	// background. So the title and the link take the full text colour there.
	&:hover {
		background-color: var(--color--background--light-1);
		color: var(--color--text--shade-1);

		.title,
		.link {
			color: var(--text-color);
		}

		.chevron {
			color: var(--color--text--shade-1);
		}
	}
}

.heading {
	display: flex;
	flex: 1;
	min-width: 0;
}

.toggle {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
	padding: var(--spacing--4xs) var(--spacing--3xs);
	background: none;
	border: none;
	border-radius: var(--radius--3xs);
	cursor: pointer;
	color: inherit;

	&:focus-visible {
		@include focus.focus-ring;
	}
}

.link {
	flex-shrink: 0;
	padding: var(--spacing--4xs) var(--spacing--3xs);
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--regular);
	text-decoration: none;

	&:hover,
	&:focus-visible {
		color: var(--text-color);
		text-decoration: none;
	}

	&:focus-visible {
		@include focus.focus-ring;
	}
}

@media (hover: hover) {
	.link {
		opacity: 0;
		pointer-events: none;
	}

	.header:hover .link,
	.header:has(.toggle:focus-visible) .link,
	.link:focus-visible {
		opacity: 1;
		pointer-events: auto;
	}
}

.chevron {
	color: var(--color--text--tint-1);
	transition: transform 0.15s ease;
	flex-shrink: 0;
}

.chevronCollapsed {
	transform: rotate(-90deg);
}
</style>
