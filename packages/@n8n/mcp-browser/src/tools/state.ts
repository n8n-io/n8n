import { z } from 'zod';

import type { SessionManager } from '../session-manager';
import type { ToolDefinition } from '../types';
import { createSessionTool, pageIdField, sessionIdField } from './helpers';

export function createStateTools(sessionManager: SessionManager): ToolDefinition[] {
	return [
		browserCookies(sessionManager),
		browserStorage(sessionManager),
		browserSetOffline(sessionManager),
		browserSetHeaders(sessionManager),
		browserSetGeolocation(sessionManager),
		browserSetTimezone(sessionManager),
		browserSetLocale(sessionManager),
		browserSetDevice(sessionManager),
	];
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

function browserCookies(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_cookies',
		'Get, set, or clear cookies.',
		{
			sessionId: sessionIdField,
			action: z.enum(['get', 'set', 'clear']).describe('Cookie action'),
			cookies: z
				.array(cookieSchema)
				.optional()
				.describe('Cookies to set (required for "set" action)'),
			url: z.string().optional().describe('Filter cookies by URL (for "get")'),
			pageId: pageIdField,
		},
		async (session, input, pageId) => {
			switch (input.action) {
				case 'get': {
					const cookies = await session.adapter.getCookies(pageId, input.url);
					return { cookies };
				}
				case 'set': {
					await session.adapter.setCookies(pageId, input.cookies ?? []);
					return { set: true, count: input.cookies?.length ?? 0 };
				}
				case 'clear': {
					await session.adapter.clearCookies(pageId);
					return { cleared: true };
				}
			}
		},
	);
}

// ---------------------------------------------------------------------------
// browser_storage
// ---------------------------------------------------------------------------

function browserStorage(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_storage',
		'Get, set, or clear localStorage or sessionStorage.',
		{
			sessionId: sessionIdField,
			kind: z.enum(['local', 'session']).describe('Storage type'),
			action: z.enum(['get', 'set', 'clear']).describe('Storage action'),
			data: z
				.record(z.string(), z.string())
				.optional()
				.describe('Key-value pairs to set (required for "set" action)'),
			pageId: pageIdField,
		},
		async (session, input, pageId) => {
			switch (input.action) {
				case 'get': {
					const data = await session.adapter.getStorage(pageId, input.kind);
					return { data };
				}
				case 'set': {
					await session.adapter.setStorage(pageId, input.kind, input.data ?? {});
					return { set: true };
				}
				case 'clear': {
					await session.adapter.clearStorage(pageId, input.kind);
					return { cleared: true };
				}
			}
		},
	);
}

// ---------------------------------------------------------------------------
// browser_set_offline
// ---------------------------------------------------------------------------

function browserSetOffline(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_set_offline',
		'Toggle offline mode. Playwright only.',
		{
			sessionId: sessionIdField,
			offline: z.boolean().describe('true = offline, false = online'),
			pageId: pageIdField,
		},
		async (session, input, pageId) => {
			await session.adapter.setOffline(pageId, input.offline);
			return { offline: input.offline };
		},
	);
}

// ---------------------------------------------------------------------------
// browser_set_headers
// ---------------------------------------------------------------------------

function browserSetHeaders(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_set_headers',
		'Set extra HTTP headers for all subsequent requests. Pass empty object to clear.',
		{
			sessionId: sessionIdField,
			headers: z.record(z.string(), z.string()).describe('Headers to set'),
			pageId: pageIdField,
		},
		async (session, input, pageId) => {
			await session.adapter.setHeaders(pageId, input.headers);
			return { headers: input.headers };
		},
	);
}

// ---------------------------------------------------------------------------
// browser_set_geolocation
// ---------------------------------------------------------------------------

function browserSetGeolocation(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_set_geolocation',
		'Override geolocation. Set clear=true to remove the override.',
		{
			sessionId: sessionIdField,
			latitude: z.number().optional().describe('Latitude'),
			longitude: z.number().optional().describe('Longitude'),
			accuracy: z.number().optional().describe('Accuracy in meters'),
			clear: z.boolean().optional().describe('Remove geolocation override'),
			pageId: pageIdField,
		},
		async (session, input, pageId) => {
			if (input.clear) {
				await session.adapter.setGeolocation(pageId, null);
				return { geolocation: null };
			}
			const geo = {
				latitude: input.latitude ?? 0,
				longitude: input.longitude ?? 0,
				accuracy: input.accuracy,
			};
			await session.adapter.setGeolocation(pageId, geo);
			return { geolocation: geo };
		},
	);
}

// ---------------------------------------------------------------------------
// browser_set_timezone
// ---------------------------------------------------------------------------

function browserSetTimezone(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_set_timezone',
		'Override timezone. IANA format (e.g. "America/New_York"). Playwright only.',
		{
			sessionId: sessionIdField,
			timezone: z.string().describe('IANA timezone'),
			pageId: pageIdField,
		},
		async (session, input, pageId) => {
			await session.adapter.setTimezone(pageId, input.timezone);
			return { timezone: input.timezone };
		},
	);
}

// ---------------------------------------------------------------------------
// browser_set_locale
// ---------------------------------------------------------------------------

function browserSetLocale(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_set_locale',
		'Override locale. BCP 47 format (e.g. "en-US", "de-DE"). Playwright only.',
		{
			sessionId: sessionIdField,
			locale: z.string().describe('BCP 47 locale'),
			pageId: pageIdField,
		},
		async (session, input, pageId) => {
			await session.adapter.setLocale(pageId, input.locale);
			return { locale: input.locale };
		},
	);
}

// ---------------------------------------------------------------------------
// browser_set_device
// ---------------------------------------------------------------------------

function browserSetDevice(sessionManager: SessionManager): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_set_device',
		'Emulate a device (viewport, user agent, touch, etc.). Playwright only. Examples: "iPhone 14", "Pixel 7".',
		{
			sessionId: sessionIdField,
			device: z.string().describe('Playwright device name (e.g. "iPhone 14")'),
			pageId: pageIdField,
		},
		async (session, input, pageId) => {
			await session.adapter.setDevice(pageId, { name: input.device });
			return { device: input.device };
		},
	);
}
