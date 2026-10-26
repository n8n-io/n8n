<script setup lang="ts">
import type { IconName } from '@n8n/design-system';

import { N8nIcon } from '@n8n/design-system';
const { icon } = defineProps<{
	title?: string;
	wide?: boolean;
	/** Center the action independently of the heading and footer. */
	alignAction?: boolean;
	icon?: IconName;
	/** Has a compact `#actions` fallback that replaces the description on a narrow pane (needs an `ndvPane` container). */
	hasCompactAction?: boolean;
}>();

defineSlots<{
	icon(): unknown;
	default(): unknown;
	actions(): unknown;
	footer(): unknown;
}>();
</script>

<template>
	<article
		data-ndv-empty-state
		:class="[
			$style.empty,
			{
				[$style.wide]: wide,
				[$style.compactActions]: hasCompactAction,
				[$style.alignAction]: alignAction,
			},
		]"
	>
		<div v-if="alignAction" :class="$style.heading">
			<slot name="icon">
				<N8nIcon v-if="icon" :icon="icon" size="xlarge" />
			</slot>
			<h1 v-if="title" :class="$style.title">{{ title }}</h1>
		</div>
		<template v-else>
			<slot name="icon">
				<N8nIcon v-if="icon" :icon="icon" size="xlarge" />
			</slot>
			<h1 v-if="title" :class="$style.title">{{ title }}</h1>
		</template>
		<p :class="$style.description"><slot /></p>
		<div v-if="$slots.actions" :class="$style.actions">
			<slot name="actions" />
		</div>
		<div v-if="$slots.footer" :class="$style.footer"><slot name="footer" /></div>
	</article>
</template>

<style lang="css" module>
.empty {
	display: flex;
	flex-flow: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--sm);

	line-height: 2;
	color: var(--color--text);
}

.title {
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--medium);
	line-height: 145%;
	color: var(--color--text);
	margin: 0;
}

.actions {
	margin-top: var(--spacing--xs);
}

.description {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	margin: 0;
	text-align: center;
	max-width: 240px;

	.wide & {
		max-width: none;
	}
}

.compactActions .actions {
	display: none;
}

@container ndvPane (max-width: 180px) {
	.compactActions .description,
	.compactActions .footer {
		display: none;
	}

	.compactActions .actions {
		display: block;
	}
}
.empty.alignAction {
	display: grid;
	grid-template-rows: minmax(min-content, 1fr) auto minmax(min-content, 1fr);
	grid-template-columns: minmax(0, 1fr);
	justify-items: center;
	align-items: start;
	height: 100%;
	width: 100%;
	margin-bottom: 0;
	gap: var(--spacing--sm);

	.heading {
		grid-row: 1;
		align-self: end;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing--sm);
		text-align: center;
	}

	.description,
	.actions {
		grid-row: 2;
		grid-column: 1;
		margin: 0;
	}

	.footer {
		grid-row: 3;
		font-size: var(--font-size--sm);
		line-height: var(--line-height--xl);
	}
}
</style>
