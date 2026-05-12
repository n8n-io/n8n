import { z } from 'zod';

import type { BrowserConnection } from '../connection';
import { McpBrowserError } from '../errors';
import type { AffectedResource, ToolContext, ToolDefinition } from '../types';
import { browserNameSchema } from '../types';
import { formatErrorResponse, formatCallToolResult } from '../utils';

export function createSessionTools(connection: BrowserConnection): ToolDefinition[] {
	return [browserConnect(connection), browserDisconnect(connection)];
}

// ---------------------------------------------------------------------------
// browser_connect
// ---------------------------------------------------------------------------

const browserConnectSchema = z.object({
	browser: browserNameSchema
		.optional()
		.describe(
			'Chromium-based browser to connect to. Options: chrome, brave, edge, chromium. ' +
				'Defaults to chrome. Only Chromium-based browsers are supported (they provide the CDP protocol required by the browser bridge extension).',
		),
});

const browserConnectOutputSchema = z.object({
	browser: z.string(),
	pages: z.array(
		z.object({
			id: z.string(),
			title: z.string(),
			url: z.string(),
		}),
	),
});

function browserConnect(
	connection: BrowserConnection,
): ToolDefinition<typeof browserConnectSchema> {
	return {
		name: 'browser_connect',
		description:
			"Connect to the user's browser for web automation. " +
			'Optionally specify a Chromium-based browser (chrome, brave, edge, chromium). ' +
			'Requires the n8n AI Browser Bridge extension to be installed. ' +
			'Must be called before using any other browser tools.',
		inputSchema: browserConnectSchema,
		outputSchema: browserConnectOutputSchema,
		async execute(args, _context: ToolContext) {
			try {
				const result = await connection.connect(args.browser);
				return formatCallToolResult({
					browser: result.browser,
					pages: result.pages,
				});
			} catch (error) {
				if (error instanceof McpBrowserError) return formatErrorResponse(error);
				return formatErrorResponse(
					new McpBrowserError(error instanceof Error ? error.message : String(error)),
				);
			}
		},
		getAffectedResources(_args, _context: ToolContext): AffectedResource[] {
			return [{ toolGroup: 'browser', resource: 'browser', description: 'Connect to browser' }];
		},
	};
}

// ---------------------------------------------------------------------------
// browser_disconnect
// ---------------------------------------------------------------------------

const browserDisconnectSchema = z.object({});

const browserDisconnectOutputSchema = z.object({
	disconnected: z.boolean(),
});

function browserDisconnect(
	connection: BrowserConnection,
): ToolDefinition<typeof browserDisconnectSchema> {
	return {
		name: 'browser_disconnect',
		description: 'Disconnect from the browser and release all resources.',
		inputSchema: browserDisconnectSchema,
		outputSchema: browserDisconnectOutputSchema,
		async execute(_args, _context: ToolContext) {
			try {
				await connection.disconnect();
				return formatCallToolResult({ disconnected: true });
			} catch (error) {
				if (error instanceof McpBrowserError) return formatErrorResponse(error);
				return formatErrorResponse(
					new McpBrowserError(error instanceof Error ? error.message : String(error)),
				);
			}
		},
		getAffectedResources(_args, _context: ToolContext): AffectedResource[] {
			return [
				{ toolGroup: 'browser', resource: 'browser', description: 'Disconnect from browser' },
			];
		},
	};
}
