<script setup lang="ts">
import { N8nDropdownMenu, N8nIcon } from '@n8n/design-system';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import {
	WIREFRAME_DESTINATIONS,
	type WireframeDestination,
} from '../composables/useWireframeDestination';

// Wireframe stub: where the reply goes. Words, not icons; nothing is actually sent.
const destination = defineModel<WireframeDestination>({ required: true });

const i18n = useI18n();

const items = computed<Array<DropdownMenuItemProps<WireframeDestination>>>(() =>
	WIREFRAME_DESTINATIONS.map((id) => ({
		id,
		label: i18n.baseText(`agents.builder.destination.${id}`),
		checked: destination.value === id,
	})),
);
</script>

<template>
	<N8nDropdownMenu :items="items" placement="bottom" width="14rem" @select="destination = $event">
		<template #trigger>
			<button type="button" :class="$style.trigger" data-testid="agent-preview-destination">
				{{ i18n.baseText(`agents.builder.destination.${destination}`) }}
				<N8nIcon icon="chevron-down" :size="12" />
			</button>
		</template>
	</N8nDropdownMenu>
</template>

<style lang="scss" module>
.trigger {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	height: 1.75rem;
	padding: 0 var(--spacing--2xs);
	border: var(--wireframe--border);
	border-radius: var(--wireframe--radius);
	background: var(--background--surface);
	color: var(--wireframe--ink);
	font-family: var(--wireframe--font-family);
	font-weight: var(--wireframe--font-weight);
	font-size: var(--font-size--2xs);
	letter-spacing: var(--wireframe--letter-spacing);
	white-space: nowrap;
	cursor: pointer;

	&:hover {
		background: var(--wireframe--hover-fill);
	}
}
</style>
