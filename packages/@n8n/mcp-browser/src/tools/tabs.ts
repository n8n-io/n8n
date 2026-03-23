import { z } from 'zod';

import type { SessionManager } from '../session-manager';
import type { ToolDefinition } from '../types';
import { formatCallToolResult } from '../utils';
import { createSessionTool, sessionIdField } from './helpers';

export function createTabTools(
	sessionManager: SessionManager,
	toolGroupId: string,
): ToolDefinition[] {
	return [
		tabOpen(sessionManager, toolGroupId),
		tabList(sessionManager, toolGroupId),
		tabFocus(sessionManager, toolGroupId),
		tabClose(sessionManager, toolGroupId),
	];
}

const tabOpenSchema = z.object({
	sessionId: sessionIdField,
	url: z.string().optional().describe('URL to navigate to (default: about:blank)'),
});

const tabOpenOutputSchema = z.object({
	pageId: z.string(),
	title: z.string(),
	url: z.string(),
});

function tabOpen(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_tab_open',
		'Open a new tab in an existing session. Optionally navigate to a URL.',
		tabOpenSchema,
		async (session, input) => {
			const pageInfo = await session.adapter.newPage(input.url);
			session.pages.set(pageInfo.id, pageInfo);
			session.activePageId = pageInfo.id;
			return formatCallToolResult({
				pageId: pageInfo.id,
				title: pageInfo.title,
				url: pageInfo.url,
			});
		},
		tabOpenOutputSchema,
		toolGroupId,
		(args: z.infer<typeof tabOpenSchema>) => {
			if (!args.url) return 'browser';
			try {
				return new URL(args.url).hostname;
			} catch {
				return args.url;
			}
		},
	);
}

const tabListSchema = z.object({
	sessionId: sessionIdField,
});

const tabListOutputSchema = z.object({
	pages: z.array(
		z.object({
			id: z.string(),
			title: z.string(),
			url: z.string(),
			active: z.boolean(),
		}),
	),
});

function tabList(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_tab_list',
		'List all open tabs in a session.',
		tabListSchema,
		async (session) => {
			const pages = await session.adapter.listPages();
			return formatCallToolResult({
				pages: pages.map((p) => ({
					...p,
					active: p.id === session.activePageId,
				})),
			});
		},
		tabListOutputSchema,
		toolGroupId,
	);
}

const tabFocusSchema = z.object({
	sessionId: sessionIdField,
	pageId: z.string().describe('Page ID to make active'),
});

const tabFocusOutputSchema = z.object({
	activePageId: z.string(),
});

function tabFocus(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_tab_focus',
		'Switch the active tab in a session.',
		tabFocusSchema,
		async (session, input) => {
			// Verify page exists by listing
			const pages = await session.adapter.listPages();
			const target = pages.find((p) => p.id === input.pageId);
			if (!target) {
				const { PageNotFoundError } = await import('../errors');
				throw new PageNotFoundError(input.pageId, session.id);
			}
			session.activePageId = input.pageId;
			return formatCallToolResult({ activePageId: input.pageId });
		},
		tabFocusOutputSchema,
		toolGroupId,
	);
}

const tabCloseSchema = z.object({
	sessionId: sessionIdField,
	pageId: z.string().describe('Page ID to close'),
});

const tabCloseOutputSchema = z.object({
	closed: z.boolean(),
	pageId: z.string(),
	sessionClosed: z.boolean(),
});

function tabClose(sessionManager: SessionManager, toolGroupId: string): ToolDefinition {
	return createSessionTool(
		sessionManager,
		'browser_tab_close',
		'Close a tab. If it is the last tab, the session is also closed.',
		tabCloseSchema,
		async (session, input) => {
			await session.adapter.closePage(input.pageId);
			session.pages.delete(input.pageId);

			const remainingPages = await session.adapter.listPages();
			let sessionClosed = false;

			if (remainingPages.length === 0) {
				await sessionManager.close(session.id);
				sessionClosed = true;
			} else if (session.activePageId === input.pageId) {
				// Switch to most recently available page
				session.activePageId = remainingPages[remainingPages.length - 1].id;
			}

			return formatCallToolResult({ closed: true, pageId: input.pageId, sessionClosed });
		},
		tabCloseOutputSchema,
		toolGroupId,
	);
}
