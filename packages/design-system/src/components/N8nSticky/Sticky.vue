<template>
	<div
		:class="{
			'n8n-sticky': true,
			[$style.sticky]: true,
			[$style.clickable]: !isResizing,
			[$style[`color-${backgroundColor}`]]: true,
		}"
		:style="styles"
		@keydown.prevent
	>
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
			<div v-show="!editMode" :class="$style.wrapper" @dblclick.stop="onDoubleClick">
				<N8nMarkdown
					theme="sticky"
					:content="modelValue"
					:with-multi-breaks="true"
					@markdown-click="onMarkdownClick"
					@update-content="onUpdateModelValue"
				/>
			</div>
			<div
				v-show="editMode"
				:class="{ 'full-height': !shouldShowFooter, 'sticky-textarea': true }"
				@click.stop
				@mousedown.stop
				@mouseup.stop
				@keydown.esc="onInputBlur"
				@keydown.stop
			>
				<N8nInput
					ref="input"
					:model-value="modelValue"
					type="textarea"
					:rows="5"
					@blur="onInputBlur"
					@update:model-value="onUpdateModelValue"
					@wheel="onInputScroll"
				/>
			</div>
			<div v-if="editMode && shouldShowFooter" :class="$style.footer">
				<N8nText size="xsmall" align="right">
					<span v-html="t('sticky.markdownHint')"></span>
				</N8nText>
			</div>
		</N8nResizeWrapper>
	</div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import N8nInput from '../N8nInput';
import N8nMarkdown from '../N8nMarkdown';
import N8nResizeWrapper, { type ResizeData } from '../N8nResizeWrapper/ResizeWrapper.vue';
import N8nText from '../N8nText';
import { useI18n } from '../../composables/useI18n';

interface StickyProps {
	modelValue?: string;
	height?: number;
	width?: number;
	minHeight?: number;
	minWidth?: number;
	scale?: number;
	gridSize?: number;
	id?: string;
	defaultText?: string;
	editMode?: boolean;
	readOnly?: boolean;
	backgroundColor?: number | string;
}

const props = withDefaults(defineProps<StickyProps>(), {
	height: 180,
	width: 240,
	minHeight: 80,
	minWidth: 150,
	scale: 1,
	gridSize: 20,
	id: '0',
	editMode: false,
	readOnly: false,
	backgroundColor: 1,
});

const $emit = defineEmits<{
	(event: 'edit', editing: boolean): void;
	(event: 'update:modelValue', value: string): void;
	(event: 'markdown-click', link: string, e: Event): void;
	(event: 'resize', values: ResizeData): void;
	(event: 'resizestart'): void;
	(event: 'resizeend'): void;
}>();

const { t } = useI18n();
const isResizing = ref(false);
const input = ref<HTMLTextAreaElement | undefined>(undefined);

const resHeight = computed((): number => {
	return props.height < props.minHeight ? props.minHeight : props.height;
});

const resWidth = computed((): number => {
	return props.width < props.minWidth ? props.minWidth : props.width;
});

const styles = computed((): { height: string; width: string } => ({
	height: `${resHeight.value}px`,
	width: `${resWidth.value}px`,
}));

const shouldShowFooter = computed((): boolean => resHeight.value > 100 && resWidth.value > 155);

watch(
	() => props.editMode,
	(newMode, prevMode) => {
		setTimeout(() => {
			if (newMode && !prevMode && input.value) {
				if (props.defaultText === props.modelValue) {
					input.value.select();
				}
				input.value.focus();
			}
		}, 100);
	},
);

const onDoubleClick = () => {
	if (!props.readOnly) $emit('edit', true);
};

const onInputBlur = () => {
	if (!isResizing.value) $emit('edit', false);
};

const onUpdateModelValue = (value: string) => {
	$emit('update:modelValue', value);
};

const onMarkdownClick = (link: string, event: Event) => {
	$emit('markdown-click', link, event);
};

const onResize = (values: ResizeData) => {
	$emit('resize', values);
};

const onResizeStart = () => {
	isResizing.value = true;
	$emit('resizestart');
};

const onResizeEnd = () => {
	isResizing.value = false;
	$emit('resizeend');
};

const onInputScroll = (event: WheelEvent) => {
	// Pass through zoom events but hold regular scrolling
	if (!event.ctrlKey && !event.metaKey) {
		event.stopPropagation();
	}
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
