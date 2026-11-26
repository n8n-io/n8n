<script lang="ts" setup>
import { computed } from 'vue';
import type { McpToolCallResult } from '@n8n/api-types';
import { N8nAiActivityStepResultSection } from '@n8n/design-system';
import { isRecord } from '@n8n/utils/is-record';

import ToolResultJson from './ToolResultJson.vue';
import ToolResultTable from './ToolResultTable.vue';
import ToolResultCode from './ToolResultCode.vue';
import ToolResultImage from './ToolResultImage.vue';
import ToolResultFile from './ToolResultFile.vue';
import ToolResultText from './ToolResultText.vue';
import { extractToolCallCode, isCodeToolCall } from './toolResultCode';
import { extractTableRows, isTableToolCall } from './toolResultTable';

const props = defineProps<{
	result: unknown;
	toolName: string;
	toolArgs?: Record<string, unknown>;
}>();

type ResultType = 'content' | 'code' | 'table' | 'json';
type McpContentItem = McpToolCallResult['content'][number];

function normalizeImageContentItem(item: Record<string, unknown>): McpContentItem | null {
	if (typeof item.data !== 'string') return null;

	switch (item.type) {
		case 'image':
			return typeof item.mimeType === 'string'
				? { type: 'image', data: item.data, mimeType: item.mimeType }
				: null;
		case 'image-data':
			return typeof item.mediaType === 'string'
				? { type: 'image', data: item.data, mimeType: item.mediaType }
				: null;
		case 'media':
		case 'file-data':
			return typeof item.mediaType === 'string' && item.mediaType.startsWith('image/')
				? { type: 'image', data: item.data, mimeType: item.mediaType }
				: null;
		default:
			return null;
	}
}

function normalizeContentItem(item: unknown): McpContentItem | null {
	if (!isRecord(item) || typeof item.type !== 'string') return null;

	if (item.type === 'text' && typeof item.text === 'string') {
		return { type: 'text', text: item.text };
	}
	if (
		item.type === 'file' &&
		typeof item.mediaType === 'string' &&
		isRecord(item.data) &&
		item.data.type === 'data' &&
		typeof item.data.data === 'string'
	) {
		return item.mediaType.startsWith('image/')
			? { type: 'image', data: item.data.data, mimeType: item.mediaType }
			: {
					type: 'resource',
					resource: { uri: '', blob: item.data.data, mimeType: item.mediaType },
				};
	}
	if (
		item.type === 'file-data' &&
		typeof item.mediaType === 'string' &&
		typeof item.data === 'string' &&
		!item.mediaType.startsWith('image/')
	) {
		return {
			type: 'resource',
			resource: {
				uri: '',
				blob: item.data as string,
				mimeType: item.mediaType,
			},
		};
	}

	return normalizeImageContentItem(item);
}

function normalizeContentItems(items: unknown[]): McpContentItem[] | null {
	const content = items
		.map(normalizeContentItem)
		.filter((item): item is McpContentItem => item !== null);

	return content.length > 0 ? content : null;
}

function extractMcpContent(result: unknown): McpToolCallResult['content'] | null {
	if (Array.isArray(result)) return normalizeContentItems(result);
	if (
		isRecord(result) &&
		'content' in result &&
		Array.isArray((result as McpToolCallResult).content)
	) {
		return normalizeContentItems((result as McpToolCallResult).content);
	}
	if (isRecord(result) && result.type === 'content' && Array.isArray(result.value)) {
		return normalizeContentItems(result.value);
	}

	return null;
}

function detectType(result: unknown): ResultType {
	if (extractMcpContent(result) !== null) return 'content';
	if (isCodeToolCall(props.toolName, props.toolArgs)) return 'code';
	if (isTableToolCall(props.toolName, props.toolArgs) && result && typeof result === 'object')
		return 'table';
	return 'json';
}

const resultType = computed(() => detectType(props.result));
const contentItems = computed(() => extractMcpContent(props.result));
const codeContent = computed(() =>
	extractToolCallCode(props.toolName, props.toolArgs, props.result),
);
const tableRows = computed(() => extractTableRows(props.result));
</script>

<template>
	<N8nAiActivityStepResultSection v-if="resultType === 'content' && contentItems">
		<div :class="$style.contentList">
			<template v-for="(item, idx) in contentItems" :key="idx">
				<ToolResultImage
					v-if="item.type === 'image'"
					:data="item.data"
					:mime-type="item.mimeType"
				/>
				<ToolResultFile
					v-else-if="item.type === 'resource' && item.resource.mimeType"
					:data="item.resource.blob"
					:mime-type="item.resource.mimeType"
				/>
				<ToolResultText v-else-if="item.type === 'text'" :text="item.text" />
			</template>
		</div>
	</N8nAiActivityStepResultSection>
	<N8nAiActivityStepResultSection v-else-if="resultType === 'code' && codeContent">
		<ToolResultCode :code="codeContent" />
	</N8nAiActivityStepResultSection>
	<N8nAiActivityStepResultSection v-else-if="resultType === 'table' && tableRows">
		<ToolResultTable :rows="tableRows" />
	</N8nAiActivityStepResultSection>
	<ToolResultJson v-else :value="props.result" />
</template>

<style module>
.contentList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
</style>
