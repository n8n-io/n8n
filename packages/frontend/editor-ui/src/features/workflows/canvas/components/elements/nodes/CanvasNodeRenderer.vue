<script lang="ts" setup>
import CanvasNodeDefault from './render-types/CanvasNodeDefault.vue';
import CanvasNodeStickyNote from './render-types/CanvasNodeStickyNote.vue';
import CanvasNodeAddNodes from './render-types/CanvasNodeAddNodes.vue';
import CanvasNodeChoicePrompt from './render-types/CanvasNodeChoicePrompt.vue';
import { CanvasNodeRenderType } from '../../../canvas.types';
import type { CanvasNodeData, CanvasNodeEventBusEvents } from '../../../canvas.types';
import type { NodeProps, XYPosition } from '@vue-flow/core';
import type { EventBus } from '@n8n/utils/event-bus';

defineProps<{
	id: string;
	label: NodeProps['label'];
	selected: boolean;
	readOnly: boolean;
	name: string;
	type: string;
	subtitle: string;
	disabled: boolean;
	connections: CanvasNodeData['connections'];
	execution: CanvasNodeData['execution'];
	runData: CanvasNodeData['runData'];
	issues: CanvasNodeData['issues'];
	render: CanvasNodeData['render'];
	eventBus: EventBus<CanvasNodeEventBusEvents>;
}>();

const emit = defineEmits<{
	'open:contextmenu': [event: MouseEvent];
	activate: [id: string, event: MouseEvent];
	deactivate: [id: string];
	update: [parameters: Record<string, unknown>];
	delete: [];
	move: [position: XYPosition];
	'replace:node': [id: string];
}>();

function onStickyActivate(id: string) {
	emit('activate', id, new MouseEvent('activate'));
}

function onActivate(id: string, event: MouseEvent) {
	emit('activate', id, event);
}
</script>

<template>
	<CanvasNodeStickyNote
		v-if="render.type === CanvasNodeRenderType.StickyNote"
		:id="id"
		:data-canvas-node-render-type="render.type"
		:selected="selected"
		:read-only="readOnly"
		:render="render"
		:event-bus="eventBus"
		@activate="onStickyActivate"
		@deactivate="$emit('deactivate', $event)"
		@move="$emit('move', $event)"
		@update="$emit('update', $event)"
		@open:contextmenu="$emit('open:contextmenu', $event)"
	/>
	<CanvasNodeAddNodes
		v-else-if="render.type === CanvasNodeRenderType.AddNodes"
		:data-canvas-node-render-type="render.type"
	/>
	<CanvasNodeChoicePrompt
		v-else-if="render.type === CanvasNodeRenderType.ChoicePrompt"
		:data-canvas-node-render-type="render.type"
	/>
	<CanvasNodeDefault
		v-else
		:id="id"
		:data-canvas-node-render-type="render.type"
		:name="name"
		:label="label"
		:subtitle="subtitle"
		:type="type"
		:disabled="disabled"
		:read-only="readOnly"
		:selected="selected"
		:connections="connections"
		:execution="execution"
		:run-data="runData"
		:issues="issues"
		:render="render"
		@activate="onActivate"
		@open:contextmenu="$emit('open:contextmenu', $event)"
		@replace:node="$emit('replace:node', $event)"
	/>
</template>
