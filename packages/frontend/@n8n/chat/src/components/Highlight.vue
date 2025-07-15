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
		<div class="highlight-tool-bar d-flex align-center">
			<span v-if="language" class="highlight-language">{{ filterLanguage || language }}</span>
			<div class="spacer flex-grow-1" />
			<template v-if="copyable">
				<div v-if="!isCopied" class="cursor-pointer d-flex align-center" @click="onCopyClick">
					<N8nIcon icon="copy" />
					<span class="ml-2">Copy</span>
				</div>
				<div v-else>Copy Successfully</div>
			</template>
		</div>
		<pre class="code-box"><code ref="_codeBlock" v-html="filterData"></code></pre>
	</div>
</template>

<style lang="scss">
@use 'highlight.js/styles/atom-one-dark.css';

.highlight {
	margin: 0;
	color: #abb2bf;
	background: #272822;
	min-height: 100%;
	display: block;
	border-radius: var(--chat--border-radius);
	overflow: hidden;
	&-language {
		text-transform: capitalize;
	}
	&-tool-bar {
		background: #34352f;
		font-size: 12px;
		padding: 6px 12px;
	}

	.code-box {
		padding: 16px;
	}
	.spacer {
		flex-grow: 1;
	}
	.flex-grow-1 {
		flex-grow: 1;
	}
	.cursor-pointer {
		cursor: pointer;
	}
	.d-flex {
		display: flex;
	}
	.align-center {
		align-items: center;
	}
	.ml-2 {
		margin-left: 8px;
	}
}
</style>
