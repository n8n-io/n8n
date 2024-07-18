<script lang="ts" setup>
/* eslint-disable vue/no-multiple-template-root */
import { computed, h, provide, toRef, useCssModule } from 'vue';
import type { CanvasConnectionPort, CanvasElementPortWithRenderData } from '@/types';
import { CanvasConnectionMode } from '@/types';

import type { ValidConnectionFunc } from '@vue-flow/core';
import { Handle } from '@vue-flow/core';
import { NodeConnectionType } from 'n8n-workflow';
import CanvasHandleMainOutput from '@/components/canvas/elements/handles/render-types/CanvasHandleMainOutput.vue';
import CanvasHandleNonMainInput from '@/components/canvas/elements/handles/render-types/CanvasHandleNonMainInput.vue';
import { CanvasNodeHandleKey } from '@/constants';
import { createCanvasConnectionHandleString } from '@/utils/canvasUtilsV2';

const props = defineProps<{
	mode: CanvasConnectionMode;
	connected?: boolean;
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

const hasRenderType = computed(() => {
	return (
		(props.type === NodeConnectionType.Main && props.mode === CanvasConnectionMode.Output) ||
		props.type !== NodeConnectionType.Main
	);
});

const renderTypeClasses = computed(() => [style.renderType, style[props.position]]);

const RenderType = () => {
	let Component;

	if (props.mode === CanvasConnectionMode.Output) {
		if (props.type === NodeConnectionType.Main) {
			Component = CanvasHandleMainOutput;
		}
	} else {
		if (props.type !== NodeConnectionType.Main) {
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
const connected = toRef(props, 'connected');
const mode = toRef(props, 'mode');
const type = toRef(props, 'type');

provide(CanvasNodeHandleKey, {
	label,
	mode,
	type,
	connected,
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
	/>
	<RenderType
		v-if="hasRenderType"
		:class="renderTypeClasses"
		:connected="connected"
		:style="offset"
		:label="label"
		@add="onAdd"
	/>
</template>

<style lang="scss" module>
.handle {
	width: 16px;
	height: 16px;
	display: inline-flex;
	justify-content: center;
	align-items: center;
	border: 0;
	z-index: 1;
	background: var(--color-foreground-xdark);

	&:hover {
		background: var(--color-primary);
	}

	&.inputs {
		&.main {
			width: 8px;
			border-radius: 0;
		}

		&:not(.main) {
			width: 14px;
			height: 14px;
			transform-origin: 0 0;
			transform: rotate(45deg) translate(2px, 2px);
			border-radius: 0;
			background: hsl(
				var(--node-type-supplemental-color-h) var(--node-type-supplemental-color-s)
					var(--node-type-supplemental-color-l)
			);

			&:hover {
				background: var(--color-primary);
			}
		}
	}
}

.renderType {
	position: absolute;
	z-index: 0;

	&.top {
		top: 0;
		transform: translate(-50%, -50%);
	}

	&.right {
		right: 0;
		transform: translate(100%, -50%);
	}

	&.left {
		left: 0;
		transform: translate(-50%, -50%);
	}

	&.bottom {
		bottom: 0;
		transform: translate(-50%, 50%);
	}
}
</style>
