<script setup lang="ts">
import { useClipboard } from '@/composables/useClipboard';
import { useI18n } from '@/composables/useI18n';
import { useToast } from '@/composables/useToast';
import { type ParsedAiContent, type JsonMarkdown } from '@/utils/aiUtils';
import { jsonToMarkdown, markdownOptions } from '@/utils/aiUtils';
import { N8nIconButton } from '@n8n/design-system';
import { type IDataObject } from 'n8n-workflow';
import VueMarkdown from 'vue-markdown-render';

const { content, compact = false } = defineProps<{
	content: ParsedAiContent;
	compact?: boolean;
}>();

const i18n = useI18n();
const clipboard = useClipboard();
const { showMessage } = useToast();

function onCopyToClipboard(object: IDataObject | IDataObject[]) {
	try {
		void clipboard.copy(JSON.stringify(object, undefined, 2));
		showMessage({
			title: i18n.baseText('generic.copiedToClipboard'),
			type: 'success',
		});
	} catch (err) {}
}
</script>

<template>
	<div :class="compact ? $style.compact : ''">
		<div
			v-for="({ parsedContent, raw }, index) in content"
			:key="index"
			:class="$style.contentText"
			:data-content-type="parsedContent?.type"
		>
			<VueMarkdown
				v-if="parsedContent?.type === 'json'"
				:source="jsonToMarkdown(parsedContent.data as JsonMarkdown)"
				:class="$style.markdown"
				:options="markdownOptions"
			/>
			<VueMarkdown
				v-else-if="parsedContent?.type === 'markdown'"
				:source="parsedContent.data"
				:class="$style.markdown"
				:options="markdownOptions"
			/>
			<p
				v-else-if="parsedContent?.type === 'text'"
				:class="$style.runText"
				v-text="parsedContent.data"
			/>
			<!-- We weren't able to parse text or raw switch -->
			<div v-else :class="$style.rawContent">
				<N8nIconButton
					size="small"
					:class="$style.copyToClipboard"
					type="secondary"
					:title="i18n.baseText('nodeErrorView.copyToClipboard')"
					icon="copy"
					@click="onCopyToClipboard(raw)"
				/>
				<VueMarkdown :source="jsonToMarkdown(raw as JsonMarkdown)" :class="$style.markdown" />
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.runText {
	line-height: var(--font-line-height-xloose);
	white-space: pre-line;
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

			.compact & {
				padding: var(--spacing-3xs);
				font-size: var(--font-size-xs);
			}
		}
	}
}

.copyToClipboard {
	position: absolute;
	right: var(--spacing-s);
	top: var(--spacing-s);
}

.rawContent {
	position: relative;
}

.contentText {
	padding-top: var(--spacing-s);
	padding-left: var(--spacing-m);
	padding-right: var(--spacing-m);
	font-size: var(--font-size-s);

	.compact & {
		padding-top: 0;
		padding-inline: var(--spacing-2xs);
		font-size: var(--font-size-xs);
	}
}
</style>
