<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core';
import { ElNotification as Notification } from 'element-plus';
import hljs from 'highlight.js/lib/core';
import json from 'highlight.js/lib/languages/json';
import python from 'highlight.js/lib/languages/python';
import typescript from 'highlight.js/lib/languages/typescript';
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';

import { CODE_BLOCK_LANGUAGES, type CodeBlockEmits, type CodeBlockProps } from './CodeBlock.types';
import { useI18n } from '../../composables/useI18n';
import N8nButton from '../N8nButton';
import N8nTooltip from '../N8nTooltip';

hljs.registerLanguage('json', json);
hljs.registerLanguage('python', python);
hljs.registerLanguage('typescript', typescript);

const props = withDefaults(defineProps<Omit<CodeBlockProps, 'collapsed'>>(), {
	language: 'auto',
	copyable: true,
	maxHeight: 280,
	ariaLabel: undefined,
});

const emit = defineEmits<Omit<CodeBlockEmits, 'update:collapsed'>>();
const collapsed = defineModel<boolean>('collapsed', { default: true });
const preRef = useTemplateRef<HTMLPreElement>('pre');
const explicitHeight = ref<string>();
const isCollapsible = ref(false);
const { t } = useI18n();

const highlightedCode = computed(() => {
	if (props.language === 'auto') {
		return hljs.highlightAuto(props.code, [...CODE_BLOCK_LANGUAGES]).value;
	}

	return hljs.highlight(props.code, {
		language: props.language,
		ignoreIllegals: true,
	}).value;
});

const heightStyle = computed(() => {
	if (explicitHeight.value) return { height: explicitHeight.value };

	return collapsed.value ? { maxHeight: `${props.maxHeight}px` } : undefined;
});

const expandButtonLabel = computed(() =>
	collapsed.value ? t('codeBlock.expand') : t('codeBlock.collapse'),
);
const expandButtonIcon = computed(() => (collapsed.value ? 'arrow-down' : 'arrow-up'));
const isClipboardAvailable =
	typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function';

/** Here we check if the collapsible control is needed.
 * Only if we exceed the maxHeight (default: 280px) do we show the Expand/Collapse toggle
 */
function measureCollapsibility() {
	const element = preRef.value;
	isCollapsible.value = element ? element.scrollHeight - props.maxHeight > 1 : false;
}

useResizeObserver(preRef, measureCollapsibility);
watch(() => [preRef.value, props.code, props.maxHeight], measureCollapsibility, {
	flush: 'post',
	immediate: true,
});

async function copyCode() {
	try {
		await navigator.clipboard.writeText(props.code);
		Notification({
			title: t('codeBlock.copiedToClipboard'),
			type: 'success',
			position: 'bottom-right',
		});
		emit('copy', props.code);
	} catch {
		Notification({
			title: t('codeBlock.copyFailed'),
			type: 'error',
			position: 'bottom-right',
		});
	}
}

async function toggleCollapsed() {
	const element = preRef.value;
	if (!element) return;

	const currentHeight = element.getBoundingClientRect().height;
	explicitHeight.value = `${currentHeight}px`;
	await nextTick();

	/** Force layout so browser re-registers the transitions starting height.
	 * Prevents accidental batch into a single frame.
	 */
	void element.offsetHeight;

	collapsed.value = !collapsed.value;
	await nextTick();

	const contentHeight = element.scrollHeight;
	const targetHeight = collapsed.value ? Math.min(contentHeight, props.maxHeight) : contentHeight;

	explicitHeight.value = `${targetHeight}px`;
}

function onHeightTransitionEnd(event: TransitionEvent) {
	if (event.propertyName === 'height' && event.target === preRef.value) {
		explicitHeight.value = undefined;
	}
}
</script>

<template>
	<!-- Highlight.js escapes source code before returning markup. -->
	<!-- eslint-disable vue/no-v-html -->
	<div :class="$style.codeBlock">
		<div v-if="copyable && isClipboardAvailable" :class="$style.actions">
			<N8nTooltip :content="t('codeBlock.copy')">
				<N8nButton
					icon="copy"
					icon-only
					icon-size="medium"
					size="small"
					variant="ghost"
					:aria-label="t('codeBlock.copy')"
					:title="t('codeBlock.copy')"
					@click="copyCode"
				/>
			</N8nTooltip>
		</div>
		<pre
			ref="pre"
			:class="[$style.pre, { [$style.isExpanded]: !collapsed }]"
			:style="heightStyle"
			:aria-label="ariaLabel"
			:tabindex="ariaLabel ? 0 : undefined"
			@transitionend="onHeightTransitionEnd"
		><code class="hljs" v-html="highlightedCode" /></pre>
		<div v-if="isCollapsible" :class="$style.expandButtonContainer">
			<N8nTooltip :content="expandButtonLabel">
				<N8nButton
					size="small"
					:icon="expandButtonIcon"
					icon-only
					icon-size="medium"
					variant="subtle"
					:class="$style.expandButton"
					:aria-label="expandButtonLabel"
					@click="toggleCollapsed"
				/>
			</N8nTooltip>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '../../css/mixins/motion.scss';

.codeBlock {
	position: relative;
	overflow: hidden;
	border: var(--border);
	border-radius: var(--radius);
	background: var(--background--subtle);
}

.actions {
	position: absolute;
	top: var(--spacing--2xs);
	right: var(--spacing--2xs);
	z-index: 1;
	display: flex;
	gap: var(--spacing--4xs);
	opacity: 0;
	pointer-events: none;

	> * {
		pointer-events: auto;
	}
}

.pre {
	@include motion.height-transition;

	box-sizing: border-box;
	margin: 0;
	overflow: auto;
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--xs);
	line-height: var(--line-height--xl);
	tab-size: 4;
	scrollbar-width: thin;
	scrollbar-color: gray transparent;
	mask-image: linear-gradient(
		to bottom,
		black 0,
		black calc(100% - var(--spacing--sm)),
		transparent 100%
	);

	code {
		font-family: inherit;
		background-color: transparent;
	}
}
.isExpanded {
	padding-bottom: 2em;
}

.expandButtonContainer {
	display: grid;
	place-items: center;
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	pointer-events: none;
	z-index: 2;
	padding: var(--spacing--xs);
}
.expandButton {
	opacity: 0;
	pointer-events: auto;
}

.codeBlock:hover .actions,
.codeBlock:focus-within .actions,
.codeBlock:hover .expandButton,
.codeBlock:focus-within .expandButton {
	opacity: 1;
	pointer-events: auto;
	transition: opacity var(--duration--snappy) var(--easing--ease-out);
}
</style>
