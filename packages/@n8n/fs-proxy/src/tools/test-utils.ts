import type { CallToolResult } from './types';

/** Extract text from the first content block, throwing if it isn't a text block. */
export function textOf(result: CallToolResult): string {
	const item = result.content[0];
	if (item.type !== 'text') throw new Error(`Expected text content, got ${item.type}`);
	return item.text;
}

/** Extract structuredContent from a result, throwing if it isn't present. */
export function structuredOf(result: CallToolResult): Record<string, unknown> {
	if (!result.structuredContent) throw new Error('Expected structuredContent');
	return result.structuredContent as Record<string, unknown>;
}
