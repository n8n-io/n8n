<script lang="ts" setup>
import { computed, h, provide, toRef, useCssModule } from 'vue';
import type { CanvasConnectionPort, CanvasElementPortWithRenderData } from '@/types';
import { CanvasConnectionMode } from '@/types';
import type { ValidConnectionFunc } from '@vue-flow/core';
import { Handle } from '@vue-flow/core';
import { NodeConnectionTypes } from 'n8n-workflow';
import CanvasHandleMainInput from '@/components/canvas/elements/handles/render-types/CanvasHandleMainInput.vue';
import CanvasHandleMainOutput from '@/components/canvas/elements/handles/render-types/CanvasHandleMainOutput.vue';
import CanvasHandleNonMainInput from '@/components/canvas/elements/handles/render-types/CanvasHandleNonMainInput.vue';
import CanvasHandleNonMainOutput from '@/components/canvas/elements/handles/render-types/CanvasHandleNonMainOutput.vue';
import { CanvasNodeHandleKey } from '@/constants';
import { useCanvasNode } from '@/composables/useCanvasNode';

const props = defineProps<
	CanvasElementPortWithRenderData & {
		type: CanvasConnectionPort['type'];
		required?: CanvasConnectionPort['required'];
		maxConnections?: CanvasConnectionPort['maxConnections'];
		index: CanvasConnectionPort['index'];
		label?: CanvasConnectionPort['label'];
		handleId: CanvasElementPortWithRenderData['handleId'];
		connectionsCount: CanvasElementPortWithRenderData['connectionsCount'];
		isConnecting: CanvasElementPortWithRenderData['isConnecting'];
		position: CanvasElementPortWithRenderData['position'];
		offset?: CanvasElementPortWithRenderData['offset'];
		mode: CanvasConnectionMode;
		isReadOnly?: boolean;
		isValidConnection: ValidConnectionFunc;
	}
>();

const emit = defineEmits<{
	add: [handle: string];
}>();

defineOptions({
	inheritAttrs: false,
});

const style = useCssModule();

const handleType = computed(() =>
	props.mode === CanvasConnectionMode.Input ? 'target' : 'source',
);

const handleClasses = computed(() => [style.handle, style[props.type], style[props.mode]]);

/**
 * Connectable
 */

const connectionsLimitReached = computed(() => {
	return props.maxConnections && props.connectionsCount >= props.maxConnections;
});

const isConnectableStart = computed(() => {
	if (connectionsLimitReached.value) return false;

	return props.mode === CanvasConnectionMode.Output || props.type !== NodeConnectionTypes.Main;
});

const isConnectableEnd = computed(() => {
	if (connectionsLimitReached.value) return false;

	return props.mode === CanvasConnectionMode.Input || props.type !== NodeConnectionTypes.Main;
});

const isConnected = computed(() => props.connectionsCount > 0);

/**
 * Run data
 */

const { runDataOutputMap } = useCanvasNode();

const runData = computed(() =>
	props.mode === CanvasConnectionMode.Output
		? runDataOutputMap.value?.[props.type]?.[props.index]
		: undefined,
);

/**
 * Render additional elements
 */

const renderTypeClasses = computed(() => [style.renderType, style[props.position]]);

const RenderType = () => {
	let Component;

	if (props.mode === CanvasConnectionMode.Output) {
		if (props.type === NodeConnectionTypes.Main) {
			Component = CanvasHandleMainOutput;
		} else {
			Component = CanvasHandleNonMainOutput;
		}
	} else {
		if (props.type === NodeConnectionTypes.Main) {
			Component = CanvasHandleMainInput;
		} else {
			Component = CanvasHandleNonMainInput;
		}
	}

	return Component ? h(Component) : null;
};

/**
 * Event bindings
 */

function onAdd() {
	emit('add', props.handleId);
}

/**
 * Provide
 */

const label = toRef(props, 'label');
const isConnecting = toRef(props, 'isConnecting');
const isReadOnly = toRef(props, 'isReadOnly');
const mode = toRef(props, 'mode');
const type = toRef(props, 'type');
const index = toRef(props, 'index');
const isRequired = toRef(props, 'required');
const maxConnections = toRef(props, 'maxConnections');

provide(CanvasNodeHandleKey, {
	label,
	mode,
	type,
	index,
	runData,
	isRequired,
	isConnected,
	isConnecting,
	isReadOnly,
	maxConnections,
});
</script>

<template>
	<Handle
		v-bind="$attrs"
		:id="handleId"
		:class="handleClasses"
		:type="handleType"
		:position="position"
		:style="offset"
		:connectable-start="isConnectableStart"
		:connectable-end="isConnectableEnd"
		:is-valid-connection="isValidConnection"
	>
		<RenderType
			:class="renderTypeClasses"
			:is-connected="isConnected"
			:max-connections="maxConnections"
			:style="offset"
			:label="label"
			@add="onAdd"
		/>
	</Handle>
</template>

<style lang="scss" module>
.handle {
	--handle--indicator--width: calc(16px * var(--canvas-zoom-compensation-factor, 1));
	--handle--indicator--height: calc(16px * var(--canvas-zoom-compensation-factor, 1));

	width: var(--handle--indicator--width);
	height: var(--handle--indicator--height);
	display: inline-flex;
	justify-content: center;
	align-items: center;
	border: 0;
	z-index: 1;
	background: transparent;
	border-radius: 0;

	&.inputs {
		&.main {
			--handle--indicator--width: calc(8px * var(--canvas-zoom-compensation-factor, 1));
		}
	}
}

.renderType {
	&.top {
		margin-bottom: calc(-1 * var(--handle--indicator--height));
		transform: translate(0%, -50%);
	}

	&.right {
		margin-left: calc(-1 * var(--handle--indicator--width));
		transform: translate(50%, 0%);
	}

	&.left {
		margin-right: calc(-1 * var(--handle--indicator--width));
		transform: translate(-50%, 0%);
	}

	&.bottom {
		margin-top: calc(-1 * var(--handle--indicator--height));
		transform: translate(0%, 50%);
	}
}
</style>
