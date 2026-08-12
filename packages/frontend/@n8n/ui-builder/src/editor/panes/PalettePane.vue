<script setup lang="ts">
import { N8nButton } from '@n8n/design-system';

import PaneShell from './PaneShell.vue';
import type { UiComponentDef } from '../../core/types';

/**
 * The components on offer, in sections. Clicking one inserts it relative to the
 * current selection: into it if it takes children, into the nearest ancestor
 * that does otherwise, or into the app frame's pages when nothing is selected.
 * Working out where is the document's rule, not this pane's.
 */
defineOptions({ name: 'PalettePane' });

defineProps<{
	sections: Array<{ name: string; items: UiComponentDef[] }>;
	count: number;
	disabled?: boolean;
}>();

const emit = defineEmits<{ add: [type: string] }>();
</script>

<template>
	<PaneShell title="Components">
		<template #header>
			<span class="ui-palette__count">{{ count }}</span>
		</template>

		<div class="ui-palette">
			<template v-for="section in sections" :key="section.name">
				<span class="ui-palette__group">{{ section.name }}</span>
				<N8nButton
					v-for="def in section.items"
					:key="def.type"
					class="ui-palette__item"
					variant="ghost"
					size="small"
					:disabled="disabled"
					@click="emit('add', def.type)"
				>
					{{ def.label }}
				</N8nButton>
			</template>
		</div>
	</PaneShell>
</template>

<style scoped>
.ui-palette {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.ui-palette__count {
	font-variant-numeric: tabular-nums;
}

.ui-palette__group {
	padding: var(--spacing--2xs) var(--spacing--3xs) var(--spacing--5xs);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.04em;
}

.ui-palette__item {
	justify-content: flex-start;
	width: 100%;
}
</style>
