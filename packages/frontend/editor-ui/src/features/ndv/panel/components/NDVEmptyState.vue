<script setup lang="ts">
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';

import { N8nIcon } from '@n8n/design-system';
const { icon } = defineProps<{ title?: string; wide?: boolean; icon?: IconName }>();

defineSlots<{
	icon(): unknown;
	default(): unknown;
}>();
</script>

<template>
	<article :class="[$style.empty, { [$style.wide]: wide }]">
		<slot name="icon">
			<N8nIcon v-if="icon" :icon="icon" size="xlarge" />
		</slot>
		<h1 v-if="title" :class="$style.title">{{ title }}</h1>
		<p :class="$style.description"><slot /></p>
	</article>
</template>

<style lang="css" module>
.empty {
	display: flex;
	flex-flow: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--2xs);

	line-height: 2;
	color: var(--color--text);
}

.title {
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	margin: 0;
}

.description {
	font-size: var(--font-size--sm);
	margin: 0;
	text-align: center;
	max-width: 240px;

	.wide & {
		max-width: none;
	}
}
</style>
