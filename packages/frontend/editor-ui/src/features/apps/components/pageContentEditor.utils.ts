import type { OutputBlockData } from '@editorjs/editorjs';
import { appContentSchema, appLayoutSchema, type AppContent, type AppLayout } from '@n8n/api-types';
import type { z } from 'zod';

// Editor.js's built-in divider tool is named `delimiter`; every other type
// name (including our custom tools) matches the storage type as-is.
const TYPE_TO_TOOL: Record<string, string> = { divider: 'delimiter' };
const TOOL_TO_TYPE: Record<string, string> = { delimiter: 'divider' };

export function toEditorBlocks(content: AppLayout): OutputBlockData[] {
	return content.map((block) => ({
		id: block.id,
		type: TYPE_TO_TOOL[block.type] ?? block.type,
		data: block.data,
	}));
}

// `@editorjs/list` 2.x saves `items` as `{ content, meta, items }` objects (it
// accepts the flat string form as input). The list tool runs with `maxLevel: 1`,
// so taking each item's `content` loses nothing.
const toStorageData = (block: OutputBlockData): unknown => {
	if (block.type !== 'list') return block.data;
	const { style, items } = block.data as { style: string; items: Array<{ content: string }> };
	return { style, items: items.map((item) => item.content) };
};

export function fromEditorBlocks(blocks: OutputBlockData[]): unknown[] {
	return blocks.map((block) => ({
		id: block.id,
		type: TOOL_TO_TYPE[block.type] ?? block.type,
		data: toStorageData(block),
	}));
}

export type EditorSchema = 'content' | 'layout';

export interface ContentValidationResult {
	/** Set in `content` mode when every block passed. */
	content?: AppContent;
	/** Set in `layout` mode when every block passed. */
	layout?: AppLayout;
	/** Zod issue message per block id, for blocks that failed validation. */
	issues: Record<string, string>;
}

function parseBlocks<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, candidate: unknown[]) {
	const result = schema.safeParse(candidate);
	if (result.success) return { data: result.data, issues: {} };

	const issues: Record<string, string> = {};
	for (const issue of result.error.issues) {
		const index = typeof issue.path[0] === 'number' ? issue.path[0] : undefined;
		const candidateBlock = index !== undefined ? candidate[index] : undefined;
		const blockId =
			candidateBlock && typeof candidateBlock === 'object' && 'id' in candidateBlock
				? String(candidateBlock.id)
				: undefined;
		if (blockId) issues[blockId] = issue.message;
	}
	return { issues };
}

/** Validates Editor.js output against the page content or layout schema, attributing each issue to its block id. */
export function validateEditorBlocks(
	blocks: OutputBlockData[],
	schema: EditorSchema = 'content',
): ContentValidationResult {
	const candidate = fromEditorBlocks(blocks);
	if (schema === 'layout') {
		const { data, issues } = parseBlocks(appLayoutSchema, candidate);
		return { layout: data, issues };
	}
	const { data, issues } = parseBlocks(appContentSchema, candidate);
	return { content: data, issues };
}
