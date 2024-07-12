<template>
	<N8nResizeWrapper
		:is-resizing-enabled="!readOnly"
		:height="height"
		:width="width"
		:min-height="minHeight"
		:min-width="minWidth"
		:scale="scale"
		:grid-size="gridSize"
		@resizeend="onResizeEnd"
		@resize="onResize"
		@resizestart="onResizeStart"
	>
		<N8nSticky v-bind="stickyBindings" />
	</N8nResizeWrapper>
</template>

<script lang="ts" setup>
import { computed, ref, useAttrs } from 'vue';
import N8nResizeWrapper, { type ResizeData } from '../N8nResizeWrapper/ResizeWrapper.vue';
import N8nSticky from '../N8nSticky/Sticky.vue';
import type { StickyProps } from '../N8nSticky/types';
import { defaultStickyProps } from '../N8nSticky/constants';

type ResizeableStickyProps = StickyProps & {
	scale?: number;
	gridSize?: number;
};

const props = withDefaults(defineProps<ResizeableStickyProps>(), {
	...defaultStickyProps,
	scale: 1,
	gridSize: 20,
});

const emit = defineEmits<{
	resize: [values: ResizeData];
	resizestart: [];
	resizeend: [];
}>();

const attrs = useAttrs();

const stickyBindings = computed(() => ({ ...props, ...attrs }));

const isResizing = ref(false);

const onResize = (values: ResizeData) => {
	emit('resize', values);
};

const onResizeStart = () => {
	isResizing.value = true;
	emit('resizestart');
};

const onResizeEnd = () => {
	isResizing.value = false;
	emit('resizeend');
};
</script>
