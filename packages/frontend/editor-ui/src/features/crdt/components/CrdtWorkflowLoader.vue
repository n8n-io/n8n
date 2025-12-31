<script lang="ts" setup>
import { isMapChange, type CRDTMap } from '@n8n/crdt/browser';
import type { Node, NodeChange } from '@vue-flow/core';
import { useVueFlow } from '@vue-flow/core';
import type { INode } from 'n8n-workflow';
import { ref } from 'vue';
import { useCRDTSync } from '../composables';

const props = defineProps<{
	workflowId: string;
}>();

const initialized = ref(false);
const nodes = ref<Node[]>([]);

const instance = useVueFlow(props.workflowId);

const { state, error, onReady } = useCRDTSync({
	docId: props.workflowId,
});

onReady((doc) => {
	const nodesMap = doc.getMap<INode>('nodes');

	nodesMap.onDeepChange((changes, origin) => {
		const toChange: NodeChange[] = [];
		changes.forEach((change) => {
			if (!isMapChange(change)) return;

			if (change.action === 'add') {
				// Handle node addition
			} else if (
				change.action === 'update' &&
				origin !== 'local' &&
				change.path[1] === 'position'
			) {
				const oldValue = change.oldValue as [number, number];
				const value = change.value as [number, number];
				toChange.push({
					id: change.path[0] as string,
					from: { x: oldValue[0], y: oldValue[1] },
					position: { x: value[0], y: value[1] },
					type: 'position',
				});
			} else if (change.action === 'delete' && origin !== 'local') {
				toChange.push({
					type: 'remove',
					id: change.path[0] as string,
				});
			}
		});

		instance.applyNodeChanges(toChange);
	});

	instance.onNodeDragStop((event) => {
		doc.transact(() => {
			event.nodes.forEach((node) => {
				const crdtNode = doc.getMap('nodes').get(node.id) as CRDTMap<unknown> | undefined;
				if (!crdtNode) return;
				crdtNode.set('position', [node.position.x, node.position.y]);
			});
		});
	});

	instance.onNodesChange((changes) => {
		doc.transact(() => {
			changes.forEach((change) => {
				if (change.type === 'remove') {
					doc.getMap('nodes').delete(change.id);
				}
			});
		});
	});

	nodes.value = Object.values(nodesMap.toJSON()).map((node) => {
		return {
			id: node.id,
			position: { x: node.position[0], y: node.position[1] },
			data: { label: node.name },
		};
	});
	initialized.value = true;
});
</script>

<template>
	<!-- eslint-disable vue/no-multiple-template-root -->
	<slot
		v-if="state === 'ready' && initialized"
		v-bind="{ nodes, id: props.workflowId, fitViewOnInit: true }"
	/>
	<slot v-else-if="state === 'connecting'" name="connecting">Connecting to workflow...</slot>
	<slot v-else-if="state === 'error'" name="error" v-bind="{ error }">
		Error loading workflow: {{ error }}
	</slot>
</template>
