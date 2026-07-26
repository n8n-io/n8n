<script lang="ts" setup>
import { computed, ref } from 'vue';
import { N8nIconButton } from '@n8n/design-system';
import { useClipboard } from '@n8n/composables/useClipboard';
import { highlightCode } from '../codeHighlight';

const props = defineProps<{
	code: string;
	/** highlight.js language id, e.g. `typescript`. */
	language?: string;
}>();

const clipboard = useClipboard();
const copied = ref(false);

const highlighted = computed(() => highlightCode(props.code, props.language));

async function handleCopy() {
	await clipboard.copy(props.code);
	copied.value = true;
	setTimeout(() => {
		copied.value = false;
	}, 2000);
}
</script>

<template>
	<div :class="$style.wrapper">
		<N8nIconButton
			:icon="copied ? 'check' : 'copy'"
			variant="ghost"
			size="xsmall"
			:class="$style.copyBtn"
			@click="handleCopy"
		/>
		<!-- eslint-disable-next-line vue/no-v-html -->
		<pre
			v-if="highlighted"
			:class="[$style.code, 'hljs']"
			data-test-id="tool-result-code-highlighted"
			v-html="highlighted"
		/>
		<pre v-else :class="$style.code" data-test-id="tool-result-code">{{ props.code }}</pre>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	position: relative;
}

.copyBtn {
	position: absolute;
	top: var(--spacing--4xs);
	right: var(--spacing--4xs);
	opacity: 0;
	transition: opacity 0.15s ease;
	z-index: 1;

	.wrapper:hover & {
		opacity: 1;
	}
}

.code {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
	word-break: break-word;
	margin: 0;
	padding: var(--spacing--xs);
	color: var(--color--text--tint-1);
	background: transparent;
}
</style>
