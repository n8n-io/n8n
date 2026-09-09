import type { OutputBlockData } from '@editorjs/editorjs';
import { appContentSchema, type AppContent } from '@n8n/api-types';

// Editor.js's built-in divider tool is named `delimiter`; every other type
// name (including our custom tools) matches the storage type as-is.
const TYPE_TO_TOOL: Record<string, string> = { divider: 'delimiter' };
const TOOL_TO_TYPE: Record<string, string> = { delimiter: 'divider' };

export function toEditorBlocks(content: AppContent): OutputBlockData[] {
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

export interface ContentValidationResult {
	content?: AppContent;
	/** Zod issue message per block id, for blocks that failed validation. */
	issues: Record<string, string>;
}

/** Validates Editor.js output against `appContentSchema`, attributing each issue to its block id. */
export function validateEditorBlocks(blocks: OutputBlockData[]): ContentValidationResult {
	const candidate = fromEditorBlocks(blocks);
	const result = appContentSchema.safeParse(candidate);
	if (result.success) return { content: result.data, issues: {} };

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
