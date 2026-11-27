import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

const MAX_TEXT = 40_000;

export const clip = (text: string, max = MAX_TEXT): string =>
	text.length > max ? `${text.slice(0, max)}\n[cut: ${text.length - max} more characters]` : text;

export const resultText = (res: CallToolResult): string =>
	res.content.flatMap((c) => (c.type === 'text' ? [c.text] : [])).join('\n');

export const errText = (e: unknown): string => (e instanceof Error ? e.message : 'unknown error');
