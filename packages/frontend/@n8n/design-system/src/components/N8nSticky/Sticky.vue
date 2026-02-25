<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import { defaultStickyProps } from './constants';
import type { StickyProps } from './types';
import { useI18n } from '../../composables/useI18n';
import { isValidHexColor, adjustColorLightness } from '../../utils/colorUtils';
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

const styles = computed((): { height: string; width: string } => ({
	height: `${resHeight.value}px`,
	width: `${resWidth.value}px`,
}));

const shouldShowFooter = computed((): boolean => resHeight.value > 100 && resWidth.value > 155);

const getCustomColorStyles = (hexColor: string) => {
	if (!isValidHexColor(hexColor)) {
		return {};
	}

	// Create lighter border for dark mode (80% lighter)
	const lighterBorder = adjustColorLightness(hexColor, 80);
	// Create darker border for light mode (20% darker)
	const darkerBorder = adjustColorLightness(hexColor, -20);

	return {
		'--sticky--color--background': hexColor,
		'--sticky--border-color--custom-light': darkerBorder,
		'--sticky--border-color--custom-dark': lighterBorder,
	};
};

const customColorStyles = computed(() => {
	if (typeof props.backgroundColor === 'string') {
		return getCustomColorStyles(props.backgroundColor);
	}
	return {};
});

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
			[$style.customColor]: typeof backgroundColor === 'string' && isValidHexColor(backgroundColor),
		}"
		:style="{ ...styles, ...customColorStyles }"
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
	border-radius: var(--radius);

	background-color: var(--sticky--color--background);
	border: 1px solid var(--sticky--border-color);
}

// Custom color borders - only apply to custom colors
.customColor {
	// Default to darker border (for light mode)
	--sticky--border-color: var(--sticky--border-color--custom-light);
}

// Dark mode: use lighter borders for custom colors
:global(body[data-theme='dark']) .customColor {
	--sticky--border-color: var(--sticky--border-color--custom-dark);
}

// System dark mode (when theme is 'system')
@media (prefers-color-scheme: dark) {
	:global(body:not([data-theme='light'])) .customColor {
		--sticky--border-color: var(--sticky--border-color--custom-dark);
	}
}

.clickable {
	cursor: pointer;
}

.wrapper {
	width: 100%;
	height: 100%;
	position: absolute;
	padding: var(--spacing--2xs) var(--spacing--xs) 0;
	overflow: hidden;
}

.footer {
	padding: var(--spacing--5xs) var(--spacing--2xs) 0 var(--spacing--2xs);
	display: flex;
	justify-content: flex-end;
}

.color-2 {
	--sticky--color--background: var(--sticky--color--background--variant-2);
	--sticky--border-color: var(--sticky--border-color--variant-2);
}

.color-3 {
	--sticky--color--background: var(--sticky--color--background--variant-3);
	--sticky--border-color: var(--sticky--border-color--variant-3);
}

.color-4 {
	--sticky--color--background: var(--sticky--color--background--variant-4);
	--sticky--border-color: var(--sticky--border-color--variant-4);
}

.color-5 {
	--sticky--color--background: var(--sticky--color--background--variant-5);
	--sticky--border-color: var(--sticky--border-color--variant-5);
}

.color-6 {
	--sticky--color--background: var(--sticky--color--background--variant-6);
	--sticky--border-color: var(--sticky--border-color--variant-6);
}

.color-7 {
	--sticky--color--background: var(--sticky--color--background--variant-7);
	--sticky--border-color: var(--sticky--border-color--variant-7);
}
</style>

<style lang="scss">
.sticky-textarea {
	height: calc(100% - var(--spacing--lg));
	padding: var(--spacing--2xs) var(--spacing--2xs) 0 var(--spacing--2xs);
	cursor: default;

	.n8n-input {
		height: 100%;
		align-items: stretch;

		> div {
			align-items: stretch;
		}
	}

	textarea {
		resize: unset;
	}
}

.full-height {
	height: calc(100% - var(--spacing--2xs));
}
</style>
