<script setup lang="ts">
import { computed, ref, onUnmounted, onDeactivated } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import { useTimeoutFn } from '@vueuse/core';
import hljs from 'highlight.js';
import isEmpty from 'lodash/isEmpty';
import { clipboard } from '../utils/clipboard';

interface Props {
	data: string;
	copyDelay: number;
	language: string;
	copyable: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	data: '',
	copyDelay: 1500,
	language: '',
	copyable: true,
});

const isCopied = ref(false);

const filterLanguage = computed(() => {
	if (isEmpty(props.data) || isEmpty(props.language)) return '';
	return hljs.getLanguage(props.language)?.name || '';
});

const filterData = computed(() => {
	if (isEmpty(props.data)) return '';
	const langName = filterLanguage.value;
	if (!isEmpty(langName)) {
		return hljs.highlight(props.data, { language: langName }).value;
	}
	return hljs.highlightAuto(props.data).value;
});

interface Emits {
	copy: [text: string];
}

const emits = defineEmits<Emits>();

const { start, stop } = useTimeoutFn(
	() => {
		isCopied.value = false;
	},
	props.copyDelay,
	{
		immediate: false,
	},
);

function onCopyClick(): void {
	const text = props.data;

	clipboard(text || '');

	isCopied.value = true;

	emits('copy', text);

	start();
}

onUnmounted(() => {
	stop();
});
onDeactivated(() => {
	stop();
});
</script>

<template>
	<div class="highlight">
		<div class="highlight-tool-bar">
			<span class="highlight-language">{{ filterLanguage || language }}</span>
			<template v-if="copyable">
				<div v-if="!isCopied" class="highlight-copy-btn" @click="onCopyClick">
					<N8nIcon icon="copy" />
					<span class="highlight-copy-text">Copy</span>
				</div>
				<div v-else>Copy Successfully</div>
			</template>
		</div>
		<pre class="highlight-code-box"><code ref="_codeBlock" v-html="filterData"></code></pre>
	</div>
</template>

<style lang="scss">
@use 'sass:meta';

@include meta.load-css('highlight.js/styles/github.css');

@mixin hljs-dark-theme {
	@include meta.load-css('highlight.js/styles/github-dark-dimmed.css');
}

$highlight-border-color-light: #d1d9e0;
$highlight-background-color-light: #fff;
$highlight-tool-bar-background-light: #e0e6eb;
$highlight-tool-bar-color-light: #000;
$highlight-tool-bar-border-light: #d1d9e0;
$highlight-border-color-dark: #3d444d;
$highlight-background-color-dark: #151619;
$highlight-tool-bar-background-dark: #151b23;
$highlight-tool-bar-color-dark: #fff;
$highlight-tool-bar-border-dark: #3d444d;

body {
	&[data-theme='dark'] {
		@include hljs-dark-theme;
		.highlight {
			border: 1px solid $highlight-border-color-dark;
			background-color: $highlight-background-color-dark;
			&-tool-bar {
				background: $highlight-tool-bar-background-dark;
				color: $highlight-tool-bar-color-dark;
				border-bottom: 1px solid $highlight-tool-bar-border-dark;
			}
		}
	}

	@media (prefers-color-scheme: dark) {
		@include hljs-dark-theme;
	}
}

.highlight {
	margin: 8px 0;
	min-width: 300px;
	min-height: 100%;
	display: block;
	border-radius: 4px;
	overflow: hidden;
	border: 1px solid $highlight-border-color-light;
	background-color: $highlight-background-color-light;
	&-language {
		text-transform: capitalize;
	}
	&-tool-bar {
		color: $highlight-tool-bar-color-light;
		background: $highlight-tool-bar-background-light;
		font-size: 12px;
		padding: 6px 12px;
		border-bottom: 1px solid #d1d9e0;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	&-code-box {
		padding: 8px;
		border-radius: 0;
		overflow-x: auto;
	}
	&-copy-btn {
		display: flex;
		align-items: center;
		cursor: pointer;
	}
	&-copy-text {
		margin-left: 4px;
	}
}
</style>
