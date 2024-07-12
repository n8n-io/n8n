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

<style lang="scss" module>
.sticky {
	position: absolute;
	border-radius: var(--border-radius-base);

	background-color: var(--color-sticky-background);
	border: 1px solid var(--color-sticky-border);

	.wrapper::after {
		opacity: 0.15;
		background: linear-gradient(
			180deg,
			var(--color-sticky-background) 0.01%,
			var(--color-sticky-border)
		);
	}
}

.clickable {
	cursor: pointer;
}

.wrapper {
	width: 100%;
	height: 100%;
	position: absolute;
	padding: var(--spacing-2xs) var(--spacing-xs) 0;
	overflow: hidden;

	&::after {
		content: '';
		width: 100%;
		height: 24px;
		left: 0;
		bottom: 0;
		position: absolute;
		border-radius: var(--border-radius-base);
	}
}

.footer {
	padding: var(--spacing-5xs) var(--spacing-2xs) 0 var(--spacing-2xs);
	display: flex;
	justify-content: flex-end;
}

.color-2 {
	--color-sticky-background: var(--color-sticky-background-2);
	--color-sticky-border: var(--color-sticky-border-2);
}

.color-3 {
	--color-sticky-background: var(--color-sticky-background-3);
	--color-sticky-border: var(--color-sticky-border-3);
}

.color-4 {
	--color-sticky-background: var(--color-sticky-background-4);
	--color-sticky-border: var(--color-sticky-border-4);
}

.color-5 {
	--color-sticky-background: var(--color-sticky-background-5);
	--color-sticky-border: var(--color-sticky-border-5);
}

.color-6 {
	--color-sticky-background: var(--color-sticky-background-6);
	--color-sticky-border: var(--color-sticky-border-6);
}

.color-7 {
	--color-sticky-background: var(--color-sticky-background-7);
	--color-sticky-border: var(--color-sticky-border-7);
}
</style>

<style lang="scss">
.sticky-textarea {
	height: calc(100% - var(--spacing-l));
	padding: var(--spacing-2xs) var(--spacing-2xs) 0 var(--spacing-2xs);
	cursor: default;

	.el-textarea {
		height: 100%;

		.el-textarea__inner {
			height: 100%;
			resize: unset;
		}
	}
}

.full-height {
	height: calc(100% - var(--spacing-2xs));
}
</style>
