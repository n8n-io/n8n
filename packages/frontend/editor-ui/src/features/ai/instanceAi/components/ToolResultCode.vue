<script lang="ts" setup>
import { ref } from 'vue';
import { N8nIconButton } from '@n8n/design-system';
import { useClipboard } from '@/app/composables/useClipboard';

const props = defineProps<{
	code: string;
}>();

const clipboard = useClipboard();
const copied = ref(false);

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
		<pre :class="$style.code">{{ props.code }}</pre>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	position: relative;
	max-height: 300px;
	overflow-y: auto;
	background: var(--color--foreground--tint-2);
	border-radius: var(--radius);
}

.copyBtn {
	position: absolute;
	top: var(--spacing--4xs);
	right: var(--spacing--4xs);
	opacity: 0;
	transition: opacity 0.15s ease;

	.wrapper:hover & {
		opacity: 1;
	}
}

.code {
	font-family: monospace;
	font-size: var(--font-size--3xs);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
	word-break: break-word;
	margin: 0;
	padding: var(--spacing--xs);
	color: var(--color--text--tint-1);
}
</style>
