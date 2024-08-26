<script lang="ts" setup>
/* eslint-disable vue/no-multiple-template-root */
import { computed, h, provide, toRef, useCssModule } from 'vue';
import type { CanvasConnectionPort, CanvasElementPortWithRenderData } from '@/types';
import { CanvasConnectionMode } from '@/types';

import type { ValidConnectionFunc } from '@vue-flow/core';
import { Handle } from '@vue-flow/core';
import { NodeConnectionType } from 'n8n-workflow';
import CanvasHandleMainInput from '@/components/canvas/elements/handles/render-types/CanvasHandleMainInput.vue';
import CanvasHandleMainOutput from '@/components/canvas/elements/handles/render-types/CanvasHandleMainOutput.vue';
import CanvasHandleNonMainInput from '@/components/canvas/elements/handles/render-types/CanvasHandleNonMainInput.vue';
import CanvasHandleNonMainOutput from '@/components/canvas/elements/handles/render-types/CanvasHandleNonMainOutput.vue';
import { CanvasNodeHandleKey } from '@/constants';
import { createCanvasConnectionHandleString } from '@/utils/canvasUtilsV2';

const props = defineProps<{
	mode: CanvasConnectionMode;
	isConnected?: boolean;
	isConnecting?: boolean;
	label?: string;
	type: CanvasConnectionPort['type'];
	index: CanvasConnectionPort['index'];
	position: CanvasElementPortWithRenderData['position'];
	offset: CanvasElementPortWithRenderData['offset'];
	isValidConnection: ValidConnectionFunc;
}>();

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

const handleString = computed(() =>
	createCanvasConnectionHandleString({
		mode: props.mode,
		type: props.type,
		index: props.index,
	}),
);

const isConnectableStart = computed(() => {
	return props.mode === CanvasConnectionMode.Output || props.type !== NodeConnectionType.Main;
});

const isConnectableEnd = computed(() => {
	return props.mode === CanvasConnectionMode.Input || props.type !== NodeConnectionType.Main;
});

const handleClasses = computed(() => [style.handle, style[props.type], style[props.mode]]);

/**
 * Render additional elements
 */

const renderTypeClasses = computed(() => [style.renderType, style[props.position]]);

const RenderType = () => {
	let Component;

	if (props.mode === CanvasConnectionMode.Output) {
		if (props.type === NodeConnectionType.Main) {
			Component = CanvasHandleMainOutput;
		} else {
			Component = CanvasHandleNonMainOutput;
		}
	} else {
		if (props.type === NodeConnectionType.Main) {
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
	emit('add', handleString.value);
}

/**
 * Provide
 */

const label = toRef(props, 'label');
const isConnected = toRef(props, 'isConnected');
const isConnecting = toRef(props, 'isConnecting');
const mode = toRef(props, 'mode');
const type = toRef(props, 'type');

provide(CanvasNodeHandleKey, {
	label,
	mode,
	type,
	isConnected,
	isConnecting,
});
</script>

<template>
	<Handle
		v-bind="$attrs"
		:id="handleString"
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
			:style="offset"
			:label="label"
			@add="onAdd"
		/>
	</Handle>
</template>

<style lang="scss" module>
.handle {
	--handle--indicator--width: 16px;
	--handle--indicator--height: 16px;

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
			--handle--indicator--width: 8px;
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
