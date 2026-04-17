<script lang="ts" setup>
import { computed } from 'vue';
import type { McpToolCallResult } from '@n8n/api-types';
import ToolResultJson from './ToolResultJson.vue';
import ToolResultTable from './ToolResultTable.vue';
import ToolResultCode from './ToolResultCode.vue';
import ToolResultMedia from './ToolResultMedia.vue';
import ToolResultText from './ToolResultText.vue';

const props = defineProps<{
	result: unknown;
	toolName: string;
	toolArgs?: Record<string, unknown>;
}>();

type ResultType = 'content' | 'code' | 'table' | 'json';

function isAction(family: string, action: string): boolean {
	return props.toolName === family && props.toolArgs?.action === action;
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
	if (Array.isArray(result)) return result;
	if (
		result !== null &&
		typeof result === 'object' &&
		'content' in result &&
		Array.isArray((result as McpToolCallResult).content)
	) {
		return (result as McpToolCallResult).content;
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
	<div v-if="resultType === 'content' && contentItems" :class="$style.contentList">
		<template v-for="(item, idx) in contentItems" :key="idx">
			<ToolResultMedia v-if="item.type === 'image'" :data="item.data" :mime-type="item.mimeType" />
			<ToolResultText v-else-if="item.type === 'text'" :text="item.text" />
		</template>
	</div>
	<ToolResultCode v-else-if="resultType === 'code' && codeContent" :code="codeContent" />
	<ToolResultTable v-else-if="resultType === 'table' && tableRows" :rows="tableRows" />
	<ToolResultJson v-else :value="props.result" />
</template>

<style module>
.contentList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
</style>
