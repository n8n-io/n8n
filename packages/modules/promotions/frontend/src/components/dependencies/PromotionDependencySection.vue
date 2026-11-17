<script setup lang="ts">
import { N8nHeading, N8nIcon, N8nText, type IconName } from '@n8n/design-system';
import { useId } from 'vue';

/** One titled list of the dependency report: a group of gaps, the warnings, the grants. */
withDefaults(
	defineProps<{
		title: string;
		description?: string;
		/** `danger` stops the operation in both modes. `quiet` only informs. */
		tone?: 'default' | 'danger' | 'quiet';
		icon?: IconName;
		/** A smaller title, for a list inside a dialog. */
		compact?: boolean;
	}>(),
	{ tone: 'default', description: undefined, icon: undefined },
);

const headingId = useId();
</script>

<template>
	<section :class="[$style.section, $style[tone]]" :aria-labelledby="headingId">
		<header :class="$style.header">
			<N8nIcon v-if="icon" :icon="icon" size="small" :class="$style.icon" />
			<div :class="$style.titles">
				<N8nHeading
					:id="headingId"
					:tag="compact ? 'h3' : 'h2'"
					:size="compact ? 'small' : 'medium'"
				>
					{{ title }}
				</N8nHeading>
				<N8nText v-if="description" tag="p" step="xs" color="text-base" :class="$style.description">
					{{ description }}
				</N8nText>
			</div>
			<div v-if="$slots.action" :class="$style.action">
				<slot name="action" />
			</div>
		</header>
		<ul :class="$style.list" role="list">
			<slot />
		</ul>
	</section>
</template>

<style module lang="scss">
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.header {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.icon {
	flex-shrink: 0;
	margin-top: var(--spacing--4xs);
	color: var(--icon-color);
}

.danger .icon {
	color: var(--text-color--danger);
}

.titles {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.description {
	margin: 0;
}

.action {
	flex-shrink: 0;
}

.list {
	margin: 0;
	padding: 0;
	border: var(--border);
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
	list-style: none;
	overflow: hidden;
}

.danger .list {
	border-color: var(--border-color--danger);
}

.quiet .list {
	background-color: transparent;
}
</style>
