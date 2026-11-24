<script setup lang="ts">
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, useId } from 'vue';

import { clampText } from './wouldHaveHappened.utils';

/**
 * Long plain text, shortened with an expand action. The text renders through
 * interpolation, so HTML and markdown show as written.
 */
const props = withDefaults(
	defineProps<{
		text: string;
		maxChars?: number;
		maxLines?: number;
		monospace?: boolean;
		/** Bold text, for a subject or title. */
		emphasis?: boolean;
	}>(),
	{ maxChars: 280, maxLines: 6, monospace: false, emphasis: false },
);

const i18n = useI18n();
const expanded = ref(false);
const contentId = useId();

const clamped = computed(() => clampText(props.text, props.maxChars, props.maxLines));
const visibleText = computed(() => (expanded.value ? props.text : clamped.value.text));
</script>

<template>
	<div :class="$style.wrapper">
		<p
			:class="[$style.text, monospace && $style.monospace, emphasis && $style.emphasis]"
			:id="contentId"
			data-test-id="would-have-happened-text"
		>
			<span>{{ visibleText }}</span>
		</p>
		<N8nButton
			v-if="clamped.clamped"
			variant="ghost"
			size="xsmall"
			:class="$style.toggle"
			:aria-expanded="expanded"
			:aria-controls="contentId"
			data-test-id="would-have-happened-text-toggle"
			@click="expanded = !expanded"
		>
			{{
				expanded
					? i18n.baseText('agents.testRun.preview.showLess')
					: i18n.baseText('agents.testRun.preview.showMore')
			}}
		</N8nButton>
	</div>
</template>

<style module lang="scss">
.wrapper {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.text {
	margin: 0;
	color: var(--text-color);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--lg);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
	user-select: text;
}

.monospace {
	font-family: monospace;
	line-height: var(--line-height--sm);
}

.emphasis {
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	line-height: var(--line-height--md);
}

.toggle {
	margin-left: calc(-1 * var(--spacing--4xs));
}
</style>
