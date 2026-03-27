import { z } from 'zod';

import type { SessionManager } from '../session-manager';
import type { ToolDefinition } from '../types';
import { formatCallToolResult } from '../utils';
import { createSessionTool, pageIdField, sessionIdField } from './helpers';

export function createStateTools(
	sessionManager: SessionManager,
	toolGroupId: string,
): ToolDefinition[] {
	return [
		browserCookies(sessionManager, toolGroupId),
		browserStorage(sessionManager, toolGroupId),
		browserSetOffline(sessionManager, toolGroupId),
		browserSetHeaders(sessionManager, toolGroupId),
		browserSetGeolocation(sessionManager, toolGroupId),
		browserSetTimezone(sessionManager, toolGroupId),
		browserSetLocale(sessionManager, toolGroupId),
		browserSetDevice(sessionManager, toolGroupId),
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

const cookiesGetSchema = z.object({
	sessionId: sessionIdField,
	action: z.literal('get'),
	url: z.string().optional().describe('Filter cookies by URL'),
	pageId: pageIdField,
});

const cookiesSetSchema = z.object({
	sessionId: sessionIdField,
	action: z.literal('set'),
	cookies: z.array(cookieSchema).describe('Cookies to set'),
	pageId: pageIdField,
});

const cookiesClearSchema = z.object({
	sessionId: sessionIdField,
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

function browserCookies(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_cookies',
		'Get, set, or clear cookies.',
		browserCookiesSchema,
		async (session, input, pageId) => {
			switch (input.action) {
				case 'get': {
					const cookies = await session.adapter.getCookies(pageId, input.url);
					return formatCallToolResult({ cookies });
				}
				case 'set': {
					await session.adapter.setCookies(pageId, input.cookies);
					return formatCallToolResult({ set: true, count: input.cookies.length });
				}
				case 'clear': {
					await session.adapter.clearCookies(pageId);
					return formatCallToolResult({ cleared: true });
				}
			}
		},
		browserCookiesOutputSchema,
		toolGroupId,
	);
}

// ---------------------------------------------------------------------------
// browser_storage
// ---------------------------------------------------------------------------

const storageKindField = z.enum(['local', 'session']).describe('Storage type');

const storageGetSchema = z.object({
	sessionId: sessionIdField,
	kind: storageKindField,
	action: z.literal('get'),
	pageId: pageIdField,
});

const storageSetSchema = z.object({
	sessionId: sessionIdField,
	kind: storageKindField,
	action: z.literal('set'),
	data: z.record(z.string(), z.string()).describe('Key-value pairs to set'),
	pageId: pageIdField,
});

const storageClearSchema = z.object({
	sessionId: sessionIdField,
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

function browserStorage(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_storage',
		'Get, set, or clear localStorage or sessionStorage.',
		browserStorageSchema,
		async (session, input, pageId) => {
			switch (input.action) {
				case 'get': {
					const data = await session.adapter.getStorage(pageId, input.kind);
					return formatCallToolResult({ data });
				}
				case 'set': {
					await session.adapter.setStorage(pageId, input.kind, input.data);
					return formatCallToolResult({ set: true });
				}
				case 'clear': {
					await session.adapter.clearStorage(pageId, input.kind);
					return formatCallToolResult({ cleared: true });
				}
			}
		},
		browserStorageOutputSchema,
		toolGroupId,
	);
}

// ---------------------------------------------------------------------------
// browser_set_offline
// ---------------------------------------------------------------------------

const browserSetOfflineSchema = z.object({
	sessionId: sessionIdField,
	offline: z.boolean().describe('true = offline, false = online'),
	pageId: pageIdField,
});

const browserSetOfflineOutputSchema = z.object({
	offline: z.boolean(),
});

function browserSetOffline(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_set_offline',
		'Toggle offline mode. Playwright only.',
		browserSetOfflineSchema,
		async (session, input, pageId) => {
			await session.adapter.setOffline(pageId, input.offline);
			return formatCallToolResult({ offline: input.offline });
		},
		browserSetOfflineOutputSchema,
		toolGroupId,
	);
}

// ---------------------------------------------------------------------------
// browser_set_headers
// ---------------------------------------------------------------------------

const browserSetHeadersSchema = z.object({
	sessionId: sessionIdField,
	headers: z.record(z.string(), z.string()).describe('Headers to set'),
	pageId: pageIdField,
});

const browserSetHeadersOutputSchema = z.object({
	headers: z.record(z.unknown()),
});

function browserSetHeaders(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_set_headers',
		'Set extra HTTP headers for all subsequent requests. Pass empty object to clear.',
		browserSetHeadersSchema,
		async (session, input, pageId) => {
			await session.adapter.setHeaders(pageId, input.headers);
			return formatCallToolResult({ headers: input.headers });
		},
		browserSetHeadersOutputSchema,
		toolGroupId,
	);
}

// ---------------------------------------------------------------------------
// browser_set_geolocation
// ---------------------------------------------------------------------------

const geoSetSchema = z.object({
	sessionId: sessionIdField,
	action: z.literal('set'),
	latitude: z.number().describe('Latitude'),
	longitude: z.number().describe('Longitude'),
	accuracy: z.number().optional().describe('Accuracy in meters'),
	pageId: pageIdField,
});

const geoClearSchema = z.object({
	sessionId: sessionIdField,
	action: z.literal('clear'),
	pageId: pageIdField,
});

const browserSetGeolocationSchema = z.discriminatedUnion('action', [geoSetSchema, geoClearSchema]);

const browserSetGeolocationOutputSchema = z.object({
	geolocation: z.record(z.unknown()).nullable(),
});

function browserSetGeolocation(
	sessionManager: SessionManager,
	toolGroupId: string,
): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_set_geolocation',
		'Override geolocation (action: "set") or remove the override (action: "clear").',
		browserSetGeolocationSchema,
		async (session, input, pageId) => {
			if (input.action === 'clear') {
				await session.adapter.setGeolocation(pageId, null);
				return formatCallToolResult({ geolocation: null });
			}
			const geo = {
				latitude: input.latitude,
				longitude: input.longitude,
				accuracy: input.accuracy,
			};
			await session.adapter.setGeolocation(pageId, geo);
			return formatCallToolResult({ geolocation: geo });
		},
		browserSetGeolocationOutputSchema,
		toolGroupId,
	);
}

// ---------------------------------------------------------------------------
// browser_set_timezone
// ---------------------------------------------------------------------------

const browserSetTimezoneSchema = z.object({
	sessionId: sessionIdField,
	timezone: z.string().describe('IANA timezone'),
	pageId: pageIdField,
});

const browserSetTimezoneOutputSchema = z.object({
	timezone: z.string(),
});

function browserSetTimezone(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_set_timezone',
		'Override timezone. IANA format (e.g. "America/New_York"). Playwright only.',
		browserSetTimezoneSchema,
		async (session, input, pageId) => {
			await session.adapter.setTimezone(pageId, input.timezone);
			return formatCallToolResult({ timezone: input.timezone });
		},
		browserSetTimezoneOutputSchema,
		toolGroupId,
	);
}

// ---------------------------------------------------------------------------
// browser_set_locale
// ---------------------------------------------------------------------------

const browserSetLocaleSchema = z.object({
	sessionId: sessionIdField,
	locale: z.string().describe('BCP 47 locale'),
	pageId: pageIdField,
});

const browserSetLocaleOutputSchema = z.object({
	locale: z.string(),
});

function browserSetLocale(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_set_locale',
		'Override locale. BCP 47 format (e.g. "en-US", "de-DE"). Playwright only.',
		browserSetLocaleSchema,
		async (session, input, pageId) => {
			await session.adapter.setLocale(pageId, input.locale);
			return formatCallToolResult({ locale: input.locale });
		},
		browserSetLocaleOutputSchema,
		toolGroupId,
	);
}

// ---------------------------------------------------------------------------
// browser_set_device
// ---------------------------------------------------------------------------

const browserSetDeviceSchema = z.object({
	sessionId: sessionIdField,
	device: z.string().describe('Playwright device name (e.g. "iPhone 14")'),
	pageId: pageIdField,
});

const browserSetDeviceOutputSchema = z.object({
	device: z.string(),
});

function browserSetDevice(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_set_device',
		'Emulate a device (viewport, user agent, touch, etc.). Playwright only. Examples: "iPhone 14", "Pixel 7".',
		browserSetDeviceSchema,
		async (session, input, pageId) => {
			await session.adapter.setDevice(pageId, { name: input.device });
			return formatCallToolResult({ device: input.device });
		},
		browserSetDeviceOutputSchema,
		toolGroupId,
	);
}
