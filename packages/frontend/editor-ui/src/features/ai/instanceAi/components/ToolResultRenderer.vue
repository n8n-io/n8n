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

const props = defineProps<{
	result: unknown;
	toolName: string;
	toolArgs?: Record<string, unknown>;
}>();

type ResultType = 'content' | 'code' | 'table' | 'json';
type McpContentItem = McpToolCallResult['content'][number];

function isAction(family: string, action: string): boolean {
	return props.toolName === family && props.toolArgs?.action === action;
}

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

function isCodeTool(): boolean {
	return isAction('workflows', 'get-as-code') || isAction('nodes', 'type-definition');
}

function isTableTool(): boolean {
	return (
		isAction('data-tables', 'query') ||
		isAction('workflows', 'list') ||
		isAction('executions', 'list') ||
		isAction('credentials', 'list') ||
		isAction('nodes', 'search') ||
		isAction('nodes', 'list') ||
		isAction('data-tables', 'list')
	);
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
	if (isCodeTool()) return 'code';
	if (isTableTool() && result && typeof result === 'object') return 'table';
	return 'json';
}

function extractCode(result: unknown): string | null {
	if (!result || typeof result !== 'object') return null;
	const obj = result as Record<string, unknown>;

	if (isAction('workflows', 'get-as-code') && typeof obj.code === 'string') {
		return obj.code;
	}
	if (isAction('nodes', 'type-definition') && Array.isArray(obj.definitions)) {
		const defs = obj.definitions as Array<Record<string, unknown>>;
		return defs
			.filter((d) => typeof d.content === 'string')
			.map((d) => d.content as string)
			.join('\n\n');
	}
	return null;
}

function extractTableRows(result: unknown): Array<Record<string, unknown>> | null {
	if (!result || typeof result !== 'object') return null;
	const obj = result as Record<string, unknown>;

	for (const key of [
		'data',
		'workflows',
		'executions',
		'credentials',
		'results',
		'nodes',
		'tables',
	]) {
		if (Array.isArray(obj[key]) && obj[key].length > 0 && typeof obj[key][0] === 'object') {
			return obj[key] as Array<Record<string, unknown>>;
		}
	}
	return null;
}

const resultType = computed(() => detectType(props.result));
const contentItems = computed(() => extractMcpContent(props.result));
const codeContent = computed(() => extractCode(props.result));
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
