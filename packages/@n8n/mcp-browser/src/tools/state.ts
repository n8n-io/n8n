import { z } from 'zod';

import type { BrowserConnection } from '../connection';
import type { ToolDefinition } from '../types';
import { formatCallToolResult } from '../utils';
import { createConnectedTool, pageIdField } from './helpers';

export function createStateTools(connection: BrowserConnection): ToolDefinition[] {
	return [browserStorage(connection)];
}

// ---------------------------------------------------------------------------
// browser_storage
// ---------------------------------------------------------------------------

const storageKindField = z.enum(['local', 'session']).describe('Storage type');

const storageGetSchema = z.object({
	kind: storageKindField,
	action: z.literal('get'),
	pageId: pageIdField,
});

const storageSetSchema = z.object({
	kind: storageKindField,
	action: z.literal('set'),
	data: z.record(z.string(), z.string()).describe('Key-value pairs to set'),
	pageId: pageIdField,
});

const storageClearSchema = z.object({
	kind: storageKindField,
	action: z.literal('clear'),
	pageId: pageIdField,
});

const browserStorageSchema = z.discriminatedUnion('action', [
	storageGetSchema,
	storageSetSchema,
	storageClearSchema,
]);

const browserStorageOutputSchema = z.object({
	data: z.record(z.unknown()).optional(),
	set: z.boolean().optional(),
	cleared: z.boolean().optional(),
});

function browserStorage(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_storage',
		'Get, set, or clear localStorage or sessionStorage.',
		browserStorageSchema,
		async (state, input, pageId) => {
			switch (input.action) {
				case 'get': {
					const data = await state.adapter.getStorage(pageId, input.kind);
					return formatCallToolResult({ data });
				}
				case 'set': {
					await state.adapter.setStorage(pageId, input.kind, input.data);
					return formatCallToolResult({ set: true });
				}
				case 'clear': {
					await state.adapter.clearStorage(pageId, input.kind);
					return formatCallToolResult({ cleared: true });
				}
			}
		},
		browserStorageOutputSchema,
	);
}
