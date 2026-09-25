<script lang="ts" setup>
import { useTemplateRef } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { INodeTypeDescription } from 'n8n-workflow';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { isNodeChipRemovalKey } from '../constants';
import InstanceAiResourceChip from './InstanceAiResourceChip.vue';

const props = defineProps<{
	label: string;
	breadcrumbs?: readonly string[];
	nodeType?: INodeTypeDescription | null;
	testid: string;
	icon?: 'layers';
	removable?: boolean;
	expanded?: boolean | null;
}>();

const emit = defineEmits<{ remove: []; 'toggle-expand': []; 'enter-panel': [] }>();

const i18n = useI18n();

const rootRef = useTemplateRef<{ focus: () => void }>('root');
defineExpose({ focus: () => rootRef.value?.focus() });

// stopPropagation prevents the canvas/logs panel's document-level
// Arrow/Enter/Escape shortcuts from also firing (see shouldIgnoreCanvasShortcut).
function handleKeydown(event: KeyboardEvent) {
	const isExpandable = props.expanded !== null && props.expanded !== undefined;

	if (event.key === 'Enter' && isExpandable) {
		event.preventDefault();
		event.stopPropagation();
		emit('toggle-expand');
		return;
	}

	if (event.key === 'Escape' && props.expanded === true) {
		event.preventDefault();
		event.stopPropagation();
		emit('toggle-expand');
		return;
	}

	// Drop straight into the expand panel's node list; the parent expands it
	// first if it wasn't already open.
	if (event.key === 'ArrowDown' && isExpandable) {
		event.preventDefault();
		event.stopPropagation();
		emit('enter-panel');
		return;
	}

	if (isNodeChipRemovalKey(event.key) && props.removable) {
		event.preventDefault();
		event.stopPropagation();
		emit('remove');
	}
}
</script>

<template>
	<InstanceAiResourceChip
		ref="root"
		:class="{ [$style.expandable]: expanded != null }"
		:label="label"
		:breadcrumbs="breadcrumbs"
		:removable="removable"
		:remove-label="i18n.baseText('generic.delete')"
		:test-id="testid"
		remove-test-id="nodes-chip-remove"
		tabindex="0"
		role="group"
		:aria-label="label"
		@keydown="handleKeydown"
		@click="expanded != null && emit('toggle-expand')"
		@remove="emit('remove')"
	>
		<template #icon>
			<N8nIcon v-if="icon" :icon="icon" size="small" />
			<NodeIcon v-else-if="nodeType" :node-type="nodeType" :size="12" />
			<N8nIcon v-else icon="crosshair" size="small" />
		</template>
	</InstanceAiResourceChip>
</template>

<style lang="scss" module>
.expandable {
	cursor: pointer;
}
</style>
