<template>
	<div>
		<aside :class="{ 'node-creator-scrim': true, active: showScrim }" />
		Scrim {{ showScrim }}
		<slide-transition>
			<div
				v-if="active"
				class="node-creator"
				ref="nodeCreator"
				v-click-outside="onClickOutside"
				@dragover="onDragOver"
				@drop="onDrop"
				@mousedown="onMouseDown"
				@mouseup="onMouseUp"
				data-test-id="node-creator"
			>
				<TriggerMode />
			</div>
		</slide-transition>
	</div>
</template>

<script setup lang="ts">
import { watch, reactive, toRefs, getCurrentInstance, computed } from 'vue';
import SlideTransition from '@/components/transitions/SlideTransition.vue';
import { useNodeCreatorStore } from '@/stores/nodeCreator';
import TriggerMode from './TriggerMode.vue';

import { IUpdateInformation } from '@/Interface';
export interface Props {
	active?: boolean;
}

const props = defineProps<Props>();
const instance = getCurrentInstance();

const emit = defineEmits<{
	(event: 'closeNodeCreator'): void;
	(event: 'nodeTypeSelected', value: string[]): void;
}>();

const {
	subscribeToEvent,
	getNodeTypesWithManualTrigger,
	setAddedNodeActionParameters,
	setShowScrim,
} = useNodeCreatorStore();

subscribeToEvent('actionSelected', (action) => {
	const actionUpdateData = action as IUpdateInformation;
	emit('nodeTypeSelected', getNodeTypesWithManualTrigger(actionUpdateData.key));
	setAddedNodeActionParameters(actionUpdateData, instance?.proxy.$telemetry);
});

const state = reactive({
	nodeCreator: null as HTMLElement | null,
	mousedownInsideEvent: null as MouseEvent | null,
});

const showScrim = computed(() => useNodeCreatorStore().showScrim);
function onClickOutside(event: Event) {
	// We need to prevent cases where user would click inside the node creator
	// and try to drag undraggable element. In that case the click event would
	// be fired and the node creator would be closed. So we stop that if we detect
	// that the click event originated from inside the node creator. And fire click even on the
	// original target.
	if (state.mousedownInsideEvent) {
		const clickEvent = new MouseEvent('click', {
			bubbles: true,
			cancelable: true,
		});
		state.mousedownInsideEvent.target?.dispatchEvent(clickEvent);
		state.mousedownInsideEvent = null;
		return;
	}

	if (event.type === 'click') {
		emit('closeNodeCreator');
	}
}
function onMouseUp() {
	state.mousedownInsideEvent = null;
}
function onMouseDown(event: MouseEvent) {
	state.mousedownInsideEvent = event;
}
function onDragOver(event: DragEvent) {
	event.preventDefault();
}
function onDrop(event: DragEvent) {
	if (!event.dataTransfer) {
		return;
	}

	const nodeTypeName = event.dataTransfer.getData('nodeTypeName');
	const nodeCreatorBoundingRect = (state.nodeCreator as Element).getBoundingClientRect();

	// Abort drag end event propagation if dropped inside nodes panel
	if (
		nodeTypeName &&
		event.pageX >= nodeCreatorBoundingRect.x &&
		event.pageY >= nodeCreatorBoundingRect.y
	) {
		event.stopPropagation();
	}
}

watch(
	() => props.active,
	(isActive) => {
		if (isActive === false) setShowScrim(false);
	},
);

const { nodeCreator } = toRefs(state);
</script>

<style scoped lang="scss">
::v-deep *,
*:before,
*:after {
	box-sizing: border-box;
}

.node-creator {
	position: fixed;
	top: $header-height;
	bottom: 0;
	right: 0;
	z-index: 200;
	width: $node-creator-width;
	color: $node-creator-text-color;
}

.node-creator-scrim {
	position: fixed;
	top: $header-height;
	right: 0;
	bottom: 0;
	left: $sidebar-width;
	opacity: 0;
	z-index: 1;
	background: var(--color-background-dark);
	pointer-events: none;
	transition: opacity 200ms ease-in-out;

	&.active {
		opacity: 0.7;
	}
}
.newPanel {
	position: fixed;
	top: $header-height;
	bottom: 0;
	right: 0;
	z-index: 200;
	width: $node-creator-width;
	color: $node-creator-text-color;
}
</style>
