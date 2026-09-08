import { z } from 'zod';

import type { BrowserConnection } from '../connection';
import type { ToolDefinition } from '../types';
import { formatCallToolResult } from '../utils';
import { createConnectedTool, pageIdField } from './helpers';

export function createStateTools(connection: BrowserConnection): ToolDefinition[] {
	return [browserCookies(connection), browserStorage(connection)];
}

// ---------------------------------------------------------------------------
// browser_cookies
// ---------------------------------------------------------------------------

const cookieSchema = z.object({
	name: z.string(),
	value: z.string(),
	domain: z.string().optional(),
	path: z.string().optional(),
	expires: z.number().optional(),
	httpOnly: z.boolean().optional(),
	secure: z.boolean().optional(),
	sameSite: z.enum(['Strict', 'Lax', 'None']).optional(),
});

const cookiesGetSchema = z.object({
	action: z.literal('get'),
	url: z.string().optional().describe('Filter cookies by URL'),
	pageId: pageIdField,
});

const cookiesSetSchema = z.object({
	action: z.literal('set'),
	cookies: z.array(cookieSchema).describe('Cookies to set'),
	pageId: pageIdField,
});

const cookiesClearSchema = z.object({
	action: z.literal('clear'),
	pageId: pageIdField,
});

const browserCookiesSchema = z.discriminatedUnion('action', [
	cookiesGetSchema,
	cookiesSetSchema,
	cookiesClearSchema,
]);

const browserCookiesOutputSchema = z.object({
	cookies: z.array(z.record(z.unknown())).optional(),
	set: z.boolean().optional(),
	count: z.number().optional(),
	cleared: z.boolean().optional(),
});

function browserCookies(connection: BrowserConnection): ToolDefinition {
	return createConnectedTool(
		connection,
		'browser_cookies',
		'Get, set, or clear cookies.',
		browserCookiesSchema,
		async (state, input, pageId) => {
			switch (input.action) {
				case 'get': {
					const cookies = await state.adapter.getCookies(pageId, input.url);
					return formatCallToolResult({ cookies });
				}
				case 'set': {
					await state.adapter.setCookies(pageId, input.cookies);
					return formatCallToolResult({ set: true, count: input.cookies.length });
				}
				case 'clear': {
					await state.adapter.clearCookies(pageId);
					return formatCallToolResult({ cleared: true });
				}
			}
		},
		browserCookiesOutputSchema,
	);
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
