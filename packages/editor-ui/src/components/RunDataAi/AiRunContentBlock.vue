<script lang="ts" setup>
import type { IAiDataContent } from '@/Interface';
import { capitalize } from 'lodash-es';
import { ref, onMounted } from 'vue';
import type { ParsedAiContent } from './useAiContentParsers';
import { useAiContentParsers } from './useAiContentParsers';
import VueMarkdown from 'vue-markdown-render';
import hljs from 'highlight.js/lib/core';
import { useClipboard } from '@/composables/useClipboard';
import { useI18n } from '@/composables/useI18n';
import { useToast } from '@/composables/useToast';
import { NodeConnectionType } from 'n8n-workflow';
import type { NodeError, IDataObject } from 'n8n-workflow';

const props = defineProps<{
	runData: IAiDataContent;
	error?: NodeError;
}>();

const i18n = useI18n();
const clipboard = useClipboard();
const { showMessage } = useToast();
const contentParsers = useAiContentParsers();

// eslint-disable-next-line @typescript-eslint/no-use-before-define
const isExpanded = ref(getInitialExpandedState());
const renderType = ref<'rendered' | 'json'>('rendered');
const contentParsed = ref(false);
const parsedRun = ref(undefined as ParsedAiContent | undefined);
function getInitialExpandedState() {
	const collapsedTypes = {
		input: [NodeConnectionType.AiDocument, NodeConnectionType.AiTextSplitter],
		output: [
			NodeConnectionType.AiDocument,
			NodeConnectionType.AiEmbedding,
			NodeConnectionType.AiTextSplitter,
			NodeConnectionType.AiVectorStore,
		],
	};

	return !collapsedTypes[props.runData.inOut].includes(props.runData.type);
}

function isJsonString(text: string) {
	try {
		JSON.parse(text);
		return true;
	} catch (e) {
		return false;
	}
}

const markdownOptions = {
	highlight(str: string, lang: string) {
		if (lang && hljs.getLanguage(lang)) {
			try {
				return hljs.highlight(str, { language: lang }).value;
			} catch {}
		}

		return ''; // use external default escaping
	},
};

function parseAiRunData(run: IAiDataContent) {
	if (!run.data) {
		return;
	}
	const parsedData = contentParsers.parseAiRunData(run.data, run.type);

	return parsedData;
}

function isMarkdown(content: JsonMarkdown): boolean {
	if (typeof content !== 'string') return false;
	const markdownPatterns = [
		/^# .+/gm, // headers
		/\*{1,2}.+\*{1,2}/g, // emphasis and strong
		/\[.+\]\(.+\)/g, // links
		/```[\s\S]+```/g, // code blocks
	];

	return markdownPatterns.some((pattern) => pattern.test(content));
}

function formatToJsonMarkdown(data: string): string {
	return '```json\n' + data + '\n```';
}

type JsonMarkdown = string | object | Array<string | object>;

function jsonToMarkdown(data: JsonMarkdown): string {
	if (isMarkdown(data)) return data as string;

	if (Array.isArray(data) && data.length && typeof data[0] !== 'number') {
		const markdownArray = data.map((item: JsonMarkdown) => jsonToMarkdown(item));

		return markdownArray.join('\n\n').trim();
	}

	if (typeof data === 'string') {
		// If data is a valid JSON string – format it as JSON markdown
		if (isJsonString(data)) {
			return formatToJsonMarkdown(data);
		}

		// Return original string otherwise
		return data;
	}

	return formatToJsonMarkdown(JSON.stringify(data, null, 2));
}

function setContentParsed(content: ParsedAiContent): void {
	contentParsed.value = !!content.find((item) => {
		if (item.parsedContent?.parsed === true) {
			return true;
		}
		return false;
	});
}

function onBlockHeaderClick() {
	isExpanded.value = !isExpanded.value;
}

function onCopyToClipboard(content: IDataObject | IDataObject[]) {
	try {
		void clipboard.copy(JSON.stringify(content, undefined, 2));
		showMessage({
			title: i18n.baseText('generic.copiedToClipboard'),
			type: 'success',
		});
	} catch (err) {}
}

function onRenderTypeChange(value: 'rendered' | 'json') {
	renderType.value = value;
}

onMounted(() => {
	parsedRun.value = parseAiRunData(props.runData);
	if (parsedRun.value) {
		setContentParsed(parsedRun.value);
	}
});
</script>

<template>
	<div :class="$style.block">
		<header :class="$style.blockHeader" @click="onBlockHeaderClick">
			<button :class="$style.blockToggle">
				<font-awesome-icon :icon="isExpanded ? 'angle-down' : 'angle-right'" size="lg" />
			</button>
			<p :class="$style.blockTitle">{{ capitalize(runData.inOut) }}</p>
			<n8n-radio-buttons
				v-if="contentParsed && !error && isExpanded"
				size="small"
				:model-value="renderType"
				:class="$style.rawSwitch"
				:options="[
					{ label: 'Rendered', value: 'rendered' },
					{ label: 'JSON', value: 'json' },
				]"
				@update:model-value="onRenderTypeChange"
			/>
		</header>
		<main
			:class="{
				[$style.blockContent]: true,
				[$style.blockContentExpanded]: isExpanded,
			}"
		>
			<NodeErrorView v-if="error" :error="error" :class="$style.error" />
			<div
				v-for="({ parsedContent, raw }, index) in parsedRun"
				v-else
				:key="index"
				:class="$style.contentText"
				:data-content-type="parsedContent?.type"
			>
				<template v-if="parsedContent && renderType === 'rendered'">
					<template v-if="parsedContent.type === 'json'">
						<VueMarkdown
							:source="jsonToMarkdown(parsedContent.data as JsonMarkdown)"
							:class="$style.markdown"
							:options="markdownOptions"
						/>
					</template>
					<template v-if="parsedContent.type === 'markdown'">
						<VueMarkdown
							:source="parsedContent.data"
							:class="$style.markdown"
							:options="markdownOptions"
						/>
					</template>
					<p
						v-if="parsedContent.type === 'text'"
						:class="$style.runText"
						v-text="parsedContent.data"
					/>
				</template>
				<!-- We weren't able to parse text or raw switch -->
				<template v-else>
					<div :class="$style.rawContent">
						<n8n-icon-button
							size="small"
							:class="$style.copyToClipboard"
							type="secondary"
							:title="i18n.baseText('nodeErrorView.copyToClipboard')"
							icon="copy"
							@click="onCopyToClipboard(raw)"
						/>
						<VueMarkdown :source="jsonToMarkdown(raw as JsonMarkdown)" :class="$style.markdown" />
					</div>
				</template>
			</div>
		</main>
	</div>
</template>

<style lang="scss" module>
.copyToClipboard {
	position: absolute;
	right: var(--spacing-s);
	top: var(--spacing-s);
}
.rawContent {
	position: relative;
}
.markdown {
	& {
		white-space: pre-wrap;

		h1 {
			font-size: var(--font-size-l);
			line-height: var(--font-line-height-xloose);
		}

		h2 {
			font-size: var(--font-size-m);
			line-height: var(--font-line-height-loose);
		}

		h3 {
			font-size: var(--font-size-s);
			line-height: var(--font-line-height-regular);
		}

		pre {
			background: var(--chat--message--pre--background);
			border-radius: var(--border-radius-base);
			line-height: var(--font-line-height-xloose);
			padding: var(--spacing-s);
			font-size: var(--font-size-s);
			white-space: pre-wrap;
		}
	}
}
.contentText {
	padding-top: var(--spacing-s);
	padding-left: var(--spacing-m);
	font-size: var(--font-size-s);
}
.block {
	padding: 0 0 var(--spacing-2xs) var(--spacing-2xs);
	background: var(--color-foreground-light);
	margin-top: var(--spacing-xl);
	border-radius: var(--border-radius-base);
}
:root .blockContent {
	height: 0;
	overflow: hidden;

	&.blockContentExpanded {
		height: auto;
	}
}
.runText {
	line-height: var(--font-line-height-xloose);
	white-space: pre-line;
}
.rawSwitch {
	opacity: 0;
	height: fit-content;
	margin-left: auto;
	margin-right: var(--spacing-2xs);

	.block:hover & {
		opacity: 1;
	}
}
.blockHeader {
	display: flex;
	gap: var(--spacing-xs);
	cursor: pointer;
	/* This hack is needed to make the whole surface of header clickable  */
	margin: calc(-1 * var(--spacing-xs));
	padding: var(--spacing-2xs) var(--spacing-xs);
	align-items: center;

	& * {
		user-select: none;
	}
}
.blockTitle {
	font-size: var(--font-size-s);
	color: var(--color-text-dark);
	margin: 0;
	padding-bottom: var(--spacing-4xs);
}
.blockToggle {
	border: none;
	background: none;
	padding: 0;
	color: var(--color-text-base);
	margin-top: calc(-1 * var(--spacing-3xs));
}
.error {
	padding: var(--spacing-s) 0;
}
</style>
