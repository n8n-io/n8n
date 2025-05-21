<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import { defaultStickyProps } from './constants';
import type { StickyProps } from './types';
import { useI18n } from '../../composables/useI18n';
import N8nInput from '../N8nInput';
import N8nMarkdown from '../N8nMarkdown';
import N8nText from '../N8nText';

const props = withDefaults(defineProps<StickyProps>(), defaultStickyProps);

const emit = defineEmits<{
	edit: [editing: boolean];
	'update:modelValue': [value: string];
	'markdown-click': [link: HTMLAnchorElement, e: MouseEvent];
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

const inputName = computed(() => (props.id ? `${props.id}-input` : undefined));

// [ria] implement custom colors here
const styles = computed((): { height: string; width: string } => ({
	height: `${resHeight.value}px`,
	width: `${resWidth.value}px`,
}));

const backgroundColorStyles = computed(() => {
	if (typeof props.backgroundColor === 'string') {
		// If the color is in HSL format (starts with 'hsl')
		if (props.backgroundColor.startsWith('hsl')) {
			// Extract HSL values for easier manipulation
			const hslMatch = props.backgroundColor.match(/hsl\(([^,]+),\s*([^,]+)%,\s*([^)]+)%\)/);
			if (hslMatch) {
				const h = hslMatch[1]; // hue
				const s = hslMatch[2]; // saturation
				const l = parseInt(hslMatch[3], 10); // lightness

				// Create darker border color by reducing lightness by 15%
				const borderLightness = Math.max(0, l - 15);

				return {
					'--color-sticky-background': props.backgroundColor,
					'--color-sticky-border': `hsl(${h}, ${s}%, ${borderLightness}%)`,
				};
			}
		}

		// Fallback for non-HSL colors or if parsing fails
		return {
			'--color-sticky-background': props.backgroundColor,
			'--color-sticky-border': props.backgroundColor, // Same color as background as fallback
		};
	}
	return {};
});

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
	if (!props.readOnly) emit('edit', true);
};

const onInputBlur = () => {
	if (!isResizing.value) emit('edit', false);
};

const onUpdateModelValue = (value: string) => {
	emit('update:modelValue', value);
};

const onMarkdownClick = (link: HTMLAnchorElement, event: MouseEvent) => {
	emit('markdown-click', link, event);
};

const onInputScroll = (event: WheelEvent) => {
	// Pass through zoom events but hold regular scrolling
	if (!event.ctrlKey && !event.metaKey) {
		event.stopPropagation();
	}
};
</script>

<template>
	<div
		:class="{
			'n8n-sticky': true,
			[$style.sticky]: true,
			[$style.clickable]: !isResizing,
			[$style[`color-${backgroundColor}`]]: typeof backgroundColor === 'number',
			[$style.customColor]: typeof backgroundColor === 'string',
		}"
		:style="[styles, backgroundColorStyles]"
		@keydown.prevent
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
				:name="inputName"
				type="textarea"
				:rows="5"
				@blur="onInputBlur"
				@update:model-value="onUpdateModelValue"
				@wheel="onInputScroll"
			/>
		</div>
		<div v-if="editMode && shouldShowFooter" :class="$style.footer">
			<N8nText size="xsmall" align="right">
				<span v-n8n-html="t('sticky.markdownHint')"></span>
			</N8nText>
		</div>
	</div>
</template>

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

.customColor {
	/* Custom colors handled via inline styles */
	/* Border color is handled in backgroundColorStyles computed property */
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
