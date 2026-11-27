<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import { computed } from 'vue';

import { splitPath } from '../runtime-credentials.utils';

const { path } = defineProps<{
	/** A dotted path such as `headers.x-api-token`. */
	path: string;
}>();

const segments = computed(() => splitPath(path));
</script>

<template>
	<code :class="$style.chip" data-test-id="runtime-path-chip">
		<template v-for="(segment, index) in segments" :key="`${index}-${segment}`">
			<N8nIcon v-if="index > 0" :class="$style.separator" icon="chevron-right" size="xsmall" />
			<span :class="$style.segment" :data-first="index === 0 || undefined">{{ segment }}</span>
		</template>
	</code>
</template>

<style lang="scss" module>
.chip {
	display: inline-flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--5xs);
	max-width: 100%;
	padding: var(--spacing--5xs) var(--spacing--2xs);
	border: var(--border-width) var(--border-style) var(--border-color--subtle);
	border-radius: var(--radius);
	background-color: var(--background--subtle);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	color: var(--text-color);
}

.segment {
	overflow-wrap: anywhere;

	&[data-first] {
		color: var(--text-color--subtle);
	}
}

.separator {
	flex-shrink: 0;
	color: var(--text-color--subtler);
}
</style>
