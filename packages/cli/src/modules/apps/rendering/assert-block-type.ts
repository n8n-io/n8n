import type { AppBlock, AppBlockType } from '@n8n/api-types';

/**
 * `BlockRenderer<T>.render` is generic over one block type, but the registry
 * (read-only, see `renderer-registry.ts`) erases that to the full `AppBlock`
 * union when it stores and dispatches renderers. This narrows back to the
 * one type each renderer actually handles.
 */
export function isBlockType<T extends AppBlockType>(
	block: AppBlock,
	type: T,
): block is Extract<AppBlock, { type: T }> {
	return block.type === type;
}
