import type { McpTool, McpToolCallRequest, McpToolCallResult } from '@n8n/api-types';
import { mcpToolSchema } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { LocalMcpServer } from '@n8n/instance-ai';

import type { BrowserDomainGate, BrowserLocalMcpServer } from './browser-local-mcp-server';
import type { BrowserbaseGatewayClient, BrowserbaseSession } from './browserbase-gateway.client';

const LIVE_VIEW_TOOL = 'browser_live_view';

/** Release the Browserbase session after this long without a browser tool call. */
const IDLE_RELEASE_MS = Number(process.env.N8N_INSTANCE_AI_BROWSERBASE_IDLE_MS) || 15 * 60 * 1000;

const LIVE_VIEW_TOOL_DEFINITION: McpTool = mcpToolSchema.parse({
	name: LIVE_VIEW_TOOL,
	description:
		'Get a Live View link for the cloud browser, which lets the user see and use the browser. ' +
		"The cloud browser is not the user's own browser and starts signed out of every site. " +
		'When a page needs the user to sign in, enter a password or 2FA code, solve a CAPTCHA or ' +
		'pass any other security check, call this tool and hand the link for the page to the user ' +
		'(with request-user-action if you have it, otherwise ask them to reply when done and end ' +
		'your turn). Do not type passwords or codes yourself. The browser stays open while you wait.',
	inputSchema: { type: 'object', properties: {} },
	annotations: { category: 'browser' },
});

/**
 * Pages where only the user can continue. The AI Assistant prompt says the browser is the
 * user's own, so the model ends its turn without a link. We add the Live View link for it.
 */
const SIGN_IN_HOSTS =
	/^(accounts\.google\.com|login\.microsoftonline\.com|login\.live\.com|appleid\.apple\.com)$/;
const SIGN_IN_PATH =
	/(log-?in|sign-?in|signin|\/sso\b|challenge|captcha|two-factor|\/2fa|\/mfa|verify)/i;

function needsUser(url: string): boolean {
	try {
		const { hostname, pathname } = new URL(url);
		return SIGN_IN_HOSTS.test(hostname) || SIGN_IN_PATH.test(pathname);
	} catch {
		return false;
	}
}

interface ActiveSession {
	browserbase: BrowserbaseSession;
	server: BrowserLocalMcpServer;
}

/**
 * PROTOTYPE: the browser tools, backed by a Browserbase cloud browser instead of the Chrome
 * extension. Tools are listed before any session exists. The first call creates a session
 * through the gateway and connects Playwright to it over CDP. The session is per user and
 * survives between turns, so the agent can hand over to the user and continue next turn.
 */
export class CloudBrowserMcpServer implements LocalMcpServer {
	private gate?: BrowserDomainGate;

	private active?: ActiveSession;

	private starting?: Promise<ActiveSession>;

	private idleTimer?: NodeJS.Timeout;

	/** Sign-in pages already handed off, so the hint is added once per page. */
	private readonly handedOff = new Set<string>();

	/**
	 * Lists the tools before any session exists. The toolkit fixes its CDP URL when it is
	 * created, so this one gets a placeholder URL and is never connected.
	 */
	private readonly catalog: BrowserLocalMcpServer;

	constructor(
		private readonly userId: string,
		private readonly gateway: BrowserbaseGatewayClient,
		/** Builds the browser tools for a CDP URL. */
		private readonly connectToolsTo: (cdpEndpoint: string) => BrowserLocalMcpServer,
		private readonly logger: Logger,
	) {
		this.catalog = connectToolsTo('ws://catalog.invalid');
	}

	setDomainGate(gate: BrowserDomainGate | undefined): void {
		this.gate = gate;
	}

	getAvailableTools(): McpTool[] {
		return [...this.catalog.getAvailableTools(), LIVE_VIEW_TOOL_DEFINITION];
	}

	getToolsByCategory(category: string): McpTool[] {
		return category === 'browser' ? this.getAvailableTools() : [];
	}

	async callTool(req: McpToolCallRequest): Promise<McpToolCallResult> {
		this.touch();

		let session: ActiveSession;
		try {
			session = await this.ensureSession();
		} catch (error) {
			return errorResult(`Cloud browser unavailable: ${messageOf(error)}`);
		}

		if (req.name === LIVE_VIEW_TOOL) {
			return await this.liveView(session);
		}

		// Keep the session (and any sign-in) for the next turn. Release happens on idle.
		if (req.name === 'browser_disconnect') {
			return textResult('The cloud browser stays open for this conversation. Nothing to do.');
		}

		let result = await this.callOnSession(session, req);
		// Browserbase can end a session on its side (timeout, release) while we still hold it.
		// Every later call then fails with "connection lost", so start a fresh session once.
		if (result.isError && isConnectionLost(result)) {
			this.logger.info('[browserbase demo] session lost, starting a new one', {
				sessionId: session.browserbase.id,
			});
			await this.release('connection lost');
			this.touch();
			try {
				session = await this.ensureSession();
			} catch (error) {
				return errorResult(`Cloud browser unavailable: ${messageOf(error)}`);
			}
			result = await this.callOnSession(session, req);
			if (!result.isError) {
				result.content = [
					...result.content,
					{
						type: 'text',
						text: 'Note: the cloud browser was restarted, so earlier tabs and sign-ins are gone.',
					},
				];
			}
		}
		if (result.isError) return result;
		await this.addHandOff(session, result);
		this.logSize(req.name, result);
		return result;
	}

	private async callOnSession(
		session: ActiveSession,
		req: McpToolCallRequest,
	): Promise<McpToolCallResult> {
		session.server.setDomainGate(this.gate);
		// Already connected, and a second connect is refused, so answer with the open tabs.
		if (req.name === 'browser_connect') {
			return await session.server.callTool({ name: 'browser_tab_list', arguments: {} });
		}
		return await session.server.callTool(req);
	}

	/**
	 * When a page is on a sign-in or security check, adds its Live View link and tells the agent
	 * to hand over. Browserbase's debug endpoint gives each page's URL and link in one call.
	 */
	private async addHandOff(session: ActiveSession, result: McpToolCallResult): Promise<void> {
		let pages;
		try {
			({ pages } = await this.gateway.getLivePages(this.userId, session.browserbase.id));
		} catch {
			return;
		}
		const waiting = pages.filter((p) => needsUser(p.url));
		// Once the user is past every check, a later sign-in on the same page gets the hint again.
		if (waiting.length === 0) this.handedOff.clear();
		const page = waiting.find((p) => !this.handedOff.has(p.url));
		if (!page) return;
		this.handedOff.add(page.url);

		const handOff = {
			page: page.title || page.url,
			liveViewUrl: page.debuggerFullscreenUrl,
			instruction:
				'This page needs the user (sign-in or security check). The user cannot see the cloud ' +
				'browser. Call request-user-action with this liveViewUrl if you have it, otherwise give ' +
				'it to the user as a link and end your turn. Do not type credentials or codes yourself.',
		};
		if (result.structuredContent) {
			// The model reads structuredContent; keep the text copy in step with it.
			result.structuredContent = { ...result.structuredContent, handOff };
			result.content = [
				{ type: 'text', text: JSON.stringify(result.structuredContent) },
				...result.content.filter((part) => part.type !== 'text'),
			];
		} else {
			result.content = [...result.content, { type: 'text', text: JSON.stringify({ handOff }) }];
		}
		this.logger.info('[browserbase demo] hand-off hint added', { page: page.url.slice(0, 80) });
	}

	/** PROTOTYPE: how much each browser result costs in model context, to compare runs. */
	private logSize(tool: string, result: McpToolCallResult): void {
		const chars = result.structuredContent
			? JSON.stringify(result.structuredContent).length
			: textOf(result).length;
		this.logger.info('[browserbase demo] tool result size', {
			tool,
			chars,
			approxTokens: Math.round(chars / 4),
		});
	}

	/**
	 * PROTOTYPE: the open session's Live View and current page, for the browser tab in the
	 * UI. Undefined when no session is open. The Live View shows the session as a whole.
	 * The current page is taken as the last one Browserbase lists, the newest tab.
	 */
	async getLiveView(): Promise<
		| { liveViewUrl: string; pageUrl?: string; viewport?: { width: number; height: number } }
		| undefined
	> {
		const session = this.active;
		if (!session) return undefined;
		try {
			const debug = await this.gateway.getLivePages(this.userId, session.browserbase.id);
			return {
				liveViewUrl: debug.debuggerFullscreenUrl,
				pageUrl: debug.pages.at(-1)?.url,
				viewport: session.browserbase.viewport,
			};
		} catch {
			return undefined;
		}
	}

	/** Releases the Browserbase session. The next tool call starts a new one. */
	async release(reason: string): Promise<void> {
		clearTimeout(this.idleTimer);
		this.idleTimer = undefined;
		if (this.starting) await this.starting.catch(() => undefined);
		const session = this.active;
		this.active = undefined;
		// A new session starts signed out, so its sign-in pages need the hint again.
		this.handedOff.clear();
		if (!session) return;

		this.logger.info('[browserbase demo] releasing session', {
			sessionId: session.browserbase.id,
			reason,
		});
		await session.server.callTool({ name: 'browser_disconnect', arguments: {} }).catch(() => {});
		await this.gateway.releaseSession(this.userId, session.browserbase.id).catch((error) => {
			this.logger.warn('[browserbase demo] release failed', { error: messageOf(error) });
		});
	}

	private async ensureSession(): Promise<ActiveSession> {
		if (this.active) return this.active;
		if (this.starting) return await this.starting;

		this.starting = (async () => {
			const browserbase = await this.gateway.createSession(this.userId);
			const server = this.connectToolsTo(browserbase.connectUrl);
			const connected = await server.callTool({ name: 'browser_connect', arguments: {} });
			if (connected.isError) {
				await this.gateway.releaseSession(this.userId, browserbase.id).catch(() => {});
				throw new Error(`Could not connect to the cloud browser: ${textOf(connected)}`);
			}
			this.logger.info('[browserbase demo] session started', {
				sessionId: browserbase.id,
				dashboard: `https://www.browserbase.com/sessions/${browserbase.id}`,
			});
			return { browserbase, server };
		})();

		try {
			this.active = await this.starting;
			return this.active;
		} finally {
			this.starting = undefined;
		}
	}

	private async liveView(session: ActiveSession): Promise<McpToolCallResult> {
		try {
			const debug = await this.gateway.getLivePages(this.userId, session.browserbase.id);
			const pages = debug.pages.map((page) => ({
				title: page.title,
				url: page.url,
				liveViewUrl: page.debuggerFullscreenUrl,
			}));
			return textResult(
				JSON.stringify({
					note: 'Give the user the liveViewUrl of the page that needs them.',
					pages,
				}),
			);
		} catch (error) {
			return errorResult(`Could not get the Live View: ${messageOf(error)}`);
		}
	}

	private touch(): void {
		clearTimeout(this.idleTimer);
		this.idleTimer = setTimeout(() => {
			this.release('idle').catch(() => {});
		}, IDLE_RELEASE_MS);
		this.idleTimer.unref?.();
	}
}

function textResult(text: string): McpToolCallResult {
	return { content: [{ type: 'text', text }] };
}

function errorResult(text: string): McpToolCallResult {
	return { content: [{ type: 'text', text }], isError: true };
}

function textOf(result: McpToolCallResult): string {
	return result.content
		.map((part) => ('text' in part && typeof part.text === 'string' ? part.text : ''))
		.join(' ');
}

/** Matches `ConnectionLostError` from `@n8n/mcp-browser` (`src/errors.ts`). */
function isConnectionLost(result: McpToolCallResult): boolean {
	const text = result.structuredContent ? JSON.stringify(result.structuredContent) : textOf(result);
	return text.includes('Browser connection lost');
}

function messageOf(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
