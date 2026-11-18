<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { ref, watch } from 'vue';
import type { AppNavSection } from '@/app/components/appNavigation/useAppNavigation';
import ProjectNavSections from './ProjectNavSections.vue';

/**
 * The "Settings" row that opens in place to list a project's settings pages.
 * It opens by itself when one of its pages is on screen, and stays the way
 * the user left it otherwise.
 */
const props = defineProps<{ disclosure: NonNullable<AppNavSection['disclosure']> }>();

const open = ref(props.disclosure.open);

watch(
	() => props.disclosure.open,
	(shouldOpen) => {
		if (shouldOpen) open.value = true;
	},
);
</script>

<template>
	<div>
		<button
			type="button"
			:class="$style.toggle"
			:aria-expanded="open"
			data-test-id="proto-settings-disclosure"
			@click="open = !open"
		>
			<span :class="$style.icon">
				<N8nIcon :icon="disclosure.icon" size="large" />
			</span>
			<span :class="$style.label">{{ disclosure.label }}</span>
			<N8nIcon
				icon="chevron-right"
				size="small"
				:class="[$style.chevron, { [$style.chevronOpen]: open }]"
			/>
		</button>
		<div v-if="open" :class="$style.pages" data-test-id="proto-settings-disclosure-pages">
			<ProjectNavSections :sections="disclosure.sections" />
		</div>
	</div>
</template>

<style lang="scss" module>
/* Mirrors the N8nMenuItem box, so the row reads as one of the list. */
.toggle {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	width: 100%;
	height: var(--spacing--xl);
	padding: var(--spacing--4xs);
	border: 1px solid transparent;
	border-radius: var(--radius);
	background: none;
	color: var(--text-color);
	cursor: pointer;
	font-family: inherit;
	font-size: var(--font-size--sm);
	text-align: start;

	&:hover {
		background-color: var(--background--hover);
	}

	&:focus-visible {
		outline: var(--focus--border-width, 2px) solid var(--focus--border-color, currentColor);
		outline-offset: -2px;
	}
}

.icon {
	display: grid;
	place-items: center;
	width: var(--spacing--lg);
	height: var(--spacing--lg);
	flex: none;
	color: var(--text-color--subtle);
}

.label {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.chevron {
	flex: none;
	margin-inline-end: var(--spacing--4xs);
	color: var(--text-color--subtler);
	transition: transform var(--duration--snappy) var(--easing--ease-out);
}

.chevronOpen {
	transform: rotate(90deg);
}

/* A rule down the side ties the pages to the row that opened them. */
.pages {
	margin: var(--spacing--5xs) 0 0 var(--spacing--sm);
	padding-inline-start: var(--spacing--3xs);
	border-inline-start: var(--border);
}

@media (prefers-reduced-motion: reduce) {
	.chevron {
		transition: none;
	}
}
</style>
