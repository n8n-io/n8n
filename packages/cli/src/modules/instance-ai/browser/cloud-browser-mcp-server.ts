import type { McpTool, McpToolCallRequest, McpToolCallResult } from '@n8n/api-types';
import { GATEWAY_CONFIRMATION_REQUIRED_PREFIX, mcpToolSchema } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { LocalMcpServer } from '@n8n/instance-ai';

import type { BrowserDomainGate, BrowserLocalMcpServer } from './browser-local-mcp-server';
import type {
	BrowserbaseGatewayClient,
	BrowserbaseLivePage,
	BrowserbaseSession,
} from './browserbase-gateway.client';
import { cookieReachesSite, isOnSite, siteOf } from './saved-login-site';
import type { SavedLogin, SavedLoginStore } from './saved-login.store';

const LIVE_VIEW_TOOL = 'browser_live_view';

/** Release the Browserbase sessions after this long without a browser tool call. */
const IDLE_RELEASE_MS = Number(process.env.N8N_INSTANCE_AI_BROWSERBASE_IDLE_MS) || 15 * 60 * 1000;

/**
 * PROTOTYPE (saved logins): marks the "use your saved login" card. The tool layer in
 * `@n8n/instance-ai` (`create-tools-from-mcp-server.ts`) renders it as its own card.
 */
const SAVED_LOGIN_TOOL_GROUP = 'saved-login';

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

const START_SESSION_TOOL = 'browser_start_session';

/**
 * PROTOTYPE (saved logins): one live browser per browser task. The model decides when it
 * needs a sign-in on another site, the harness decides what the browser opens with. The
 * name says "session" because that is what it is, so the description says it is not a
 * sign-in: sites use "session" for their sign-ins.
 */
const START_SESSION_TOOL_DEFINITION: McpTool = mcpToolSchema.parse({
	name: START_SESSION_TOOL,
	description:
		'Start a new cloud browser session for a site that needs its own sign-in, and open a URL ' +
		'in it. You have one browser at a time: this closes the current one. Use browser_navigate ' +
		'for everything else, including public pages on other sites. Sign-ins are kept for the ' +
		'whole task, so calling this with a URL on a site you used before reopens it signed in. ' +
		'Switching takes several seconds and loses page state such as open forms, so finish what ' +
		'you need on one site before switching. This is a browser, not a sign-in: an expired ' +
		'sign-in is handed to the user, not fixed by starting a new session. Element refs from ' +
		'before the switch are not valid.',
	inputSchema: {
		type: 'object',
		properties: { url: { type: 'string', description: 'The page to open.' } },
		required: ['url'],
	},
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

/**
 * A browser's context: what is kept when the task switches to another site, and settled
 * when the task ends. Holds at most one site's sign-in (its bound site).
 */
interface BrowserLogin {
	/** The context the session writes back to on release. */
	contextId: string;
	/** The saved login the context belongs to. */
	savedLogin?: SavedLogin;
	/** The one site the context is for: the saved login's, or the page's at hand-back. */
	site?: string;
	/** The user ticked "Remember this login" at hand-back. */
	remember: boolean;
	/** The region the context was used in. A context only works in its region. */
	region?: string;
	/** Origins of the pages seen, for the cleanup at release. */
	origins: Set<string>;
}

/** A context whose browser was closed. It is reopened, saved or deleted later. */
interface ClosedLogin extends BrowserLogin {
	/** The session that last wrote it, waited for before the context is reopened or deleted. */
	lastSessionId: string;
	/** Nobody was left mid sign-in, so a saved login's "last verified" can be updated. */
	verified: boolean;
}

/** The live Browserbase session. A task has at most one. */
interface CloudSession extends BrowserLogin {
	browserbase: BrowserbaseSession;
	server: BrowserLocalMcpServer;
	/** Sign-in pages already handed off, so the hint is added once per page. */
	handedOff: Set<string>;
	/** A sign-in was handed to the user and they have not handed back yet. */
	signInPending: boolean;
	/** The last agent navigation in it. */
	lastNavigation?: { url: string; site?: string };
}

/** What a new session opens with: a context closed earlier in the task, or a saved login. */
type OpenFrom = { closed: ClosedLogin } | { savedLogin: SavedLogin } | undefined;

/** What the browsers of one user's tasks share. */
export interface CloudBrowserShared {
	/** Sites whose saved login the user allowed for a whole conversation, by thread. */
	savedLoginGrants: Map<string, Set<string>>;
	/** Whether another task's browser uses a saved login. One browser per saved login. */
	inUseElsewhere: (savedLoginId: string) => boolean;
}

/**
 * PROTOTYPE: the browser tools for one browser task, backed by a Browserbase cloud browser
 * instead of the Chrome extension. Tools are listed before any session exists. The first
 * page the agent opens creates a session through the gateway and connects Playwright to it
 * over CDP. The task has one live session at a time, and its sessions end with the task, or
 * after 15 minutes idle.
 *
 * Saved logins: the harness owns contexts, the model never sees them. Each session gets
 * one: the site's saved login if the user agrees, or a new one. Navigations stay in the
 * session. A session holds one site's sign-in, so a sign-in for another site is not handed
 * off there, and the agent is told to start a session for it. Starting one closes the
 * current session and keeps its context for the task, so switching back reopens it signed
 * in. At release, every site but the bound one is cleared from the context. When the task
 * ends, a context nobody chose to remember is deleted.
 */
export class CloudBrowserMcpServer implements LocalMcpServer {
	private gate?: BrowserDomainGate;

	/** The live session, where tool calls go. */
	private current?: CloudSession;

	/** Contexts of sessions the task switched away from, by site. */
	private closed: ClosedLogin[] = [];

	/** The site whose saved login card is waiting, so its answer is not taken for a domain answer. */
	private askedSavedLogin?: string;

	/** Tool calls, hand-backs and releases run one at a time. */
	private lock: Promise<unknown> = Promise.resolve();

	private idleTimer?: NodeJS.Timeout;

	/** A session is being created, between the user's approval and the browser being up. */
	private starting = false;

	/** Told when the live session opens or closes, or a page in it navigates. */
	private readonly changeListeners = new Set<() => void>();

	/**
	 * Lists the tools before any session exists. The toolkit fixes its CDP URL when it is
	 * created, so this one gets a placeholder URL and is never connected.
	 */
	private readonly catalog: BrowserLocalMcpServer;

	constructor(
		readonly userId: string,
		private readonly gateway: BrowserbaseGatewayClient,
		/** Builds the browser tools for a CDP URL. */
		private readonly connectToolsTo: (cdpEndpoint: string) => BrowserLocalMcpServer,
		private readonly savedLogins: SavedLoginStore,
		private readonly logger: Logger,
		private readonly shared: CloudBrowserShared = {
			savedLoginGrants: new Map(),
			inUseElsewhere: () => false,
		},
	) {
		this.catalog = connectToolsTo('ws://catalog.invalid');
	}

	setDomainGate(gate: BrowserDomainGate | undefined): void {
		this.gate = gate;
	}

	getAvailableTools(): McpTool[] {
		return [
			...this.catalog.getAvailableTools().filter((tool) => tool.name !== 'browser_tab_open'),
			START_SESSION_TOOL_DEFINITION,
			LIVE_VIEW_TOOL_DEFINITION,
		];
	}

	/**
	 * PROTOTYPE: calls `listener` when what the UI shows may have changed: the live session
	 * opened or closed, or a page in it navigated, also when the user drives it. Returns the
	 * unsubscribe function.
	 */
	onChange(listener: () => void): () => void {
		this.changeListeners.add(listener);
		return () => this.changeListeners.delete(listener);
	}

	/** PROTOTYPE: whether a session is being created right now, for the UI. */
	isStarting(): boolean {
		return this.starting;
	}

	private notifyChange(): void {
		for (const listener of this.changeListeners) listener();
	}

	getToolsByCategory(category: string): McpTool[] {
		return category === 'browser' ? this.getAvailableTools() : [];
	}

	async callTool(req: McpToolCallRequest): Promise<McpToolCallResult> {
		this.touch();
		return await this.serialized(async () => await this.handle(req));
	}

	private async handle(req: McpToolCallRequest): Promise<McpToolCallResult> {
		if (req.name === START_SESSION_TOOL) return await this.startSession(req);
		// One tab per browser, so the Live View shows what the agent works on.
		if (req.name === 'browser_tab_open') {
			return errorResult(
				`Not available. Use browser_navigate, or ${START_SESSION_TOOL} for a site that needs ` +
					'its own sign-in.',
			);
		}
		if (opensUrl(req)) return await this.navigate(req);

		const session = this.current;
		if (!session) return answerWithoutSession(req);
		if (req.name === LIVE_VIEW_TOOL) return await this.liveView(session);
		// Keep the session (and any sign-in) for the rest of the task.
		if (req.name === 'browser_disconnect') {
			return textResult('The cloud browser stays open for this task. Nothing to do.');
		}
		return await this.callAndCheck(session, req, []);
	}

	/**
	 * An agent navigation. It stays in the live session. The first page opens one, and a
	 * session nobody signed in to yet makes way for the site's sign-in (from earlier in the
	 * task, or a saved login), since it holds nothing worth keeping. Domain access is asked
	 * first, so a denied domain costs no browser. The session starts here, not on
	 * browser_connect, so the harness knows the site before it picks a context.
	 */
	private async navigate(req: McpToolCallRequest): Promise<McpToolCallResult> {
		const checked = await this.checkNavigation(req);
		if ('blocked' in checked) return checked.blocked;
		const { url, site, args, savedLoginAnswer } = checked;

		let session = this.current;
		let notes: string[] = [];
		if (!session || !isBound(session)) {
			try {
				const login = await this.loginFor(site, savedLoginAnswer);
				if ('stop' in login) return login.stop;
				notes = login.notes;
				if (login.from || !session) {
					if (session) await this.discard(session, 'replaced, no sign-in');
					session = await this.open(login.from);
				}
			} catch (error) {
				return errorResult(`Cloud browser unavailable: ${messageOf(error)}`);
			}
		}

		session.lastNavigation = { url, site };
		return await this.callAndCheck(session, { name: req.name, arguments: args }, notes);
	}

	/**
	 * The agent needs a sign-in on another site. The live session closes and its context is
	 * kept for the task. The new one opens with the site's context from earlier in the task,
	 * its saved login if the user agrees, or a new context. A session nobody signed in to is
	 * reused for a site with neither.
	 */
	private async startSession(req: McpToolCallRequest): Promise<McpToolCallResult> {
		const checked = await this.checkNavigation(req);
		if ('blocked' in checked) return checked.blocked;
		const { url, site, savedLoginAnswer } = checked;
		const navigation = { name: 'browser_navigate', arguments: { url } };

		const current = this.current;
		if (current?.site && current.site === site) {
			current.lastNavigation = { url, site };
			return await this.callAndCheck(current, navigation, [
				`You are already in the browser for ${site}.`,
			]);
		}
		if (current?.signInPending) {
			return errorResult(
				'The user is still signing in in this browser. Wait for them before switching.',
			);
		}

		let session: CloudSession;
		let notes: string[];
		try {
			const login = await this.loginFor(site, savedLoginAnswer);
			if ('stop' in login) return login.stop;
			notes = login.notes;
			if (current && !isBound(current) && !login.from) {
				session = current;
				notes.push('The browser you had has no sign-in yet, so it is used for this site.');
			} else {
				if (current && isBound(current)) {
					await this.closeForLater(current);
					notes.push(
						`Closed the browser for ${current.site}. Its sign-in is kept for this task: call ` +
							`${START_SESSION_TOOL} with a URL on ${current.site} to go back.`,
					);
				} else if (current) {
					await this.discard(current, 'replaced, no sign-in');
				}
				session = await this.open(login.from);
			}
		} catch (error) {
			return errorResult(`Cloud browser unavailable: ${messageOf(error)}`);
		}

		session.lastNavigation = { url, site };
		return await this.callAndCheck(session, navigation, notes);
	}

	/**
	 * Domain access for a call that opens a URL. The saved login card's answer comes back the
	 * same way a domain card's does, so it is told apart by the site the card asked about.
	 */
	private async checkNavigation(req: McpToolCallRequest): Promise<
		| { blocked: McpToolCallResult }
		| {
				url: string;
				site?: string;
				args: Record<string, unknown>;
				savedLoginAnswer: unknown;
		  }
	> {
		const { _confirmation, ...args } = req.arguments;
		const url = String(args.url);
		const site = siteOf(url);
		const answersSavedLogin =
			_confirmation !== undefined && site !== undefined && this.askedSavedLogin === site;
		this.askedSavedLogin = undefined;

		// The domain gate knows browser_navigate, and asks the same for a new session.
		const access: McpToolCallRequest = {
			name: 'browser_navigate',
			arguments:
				_confirmation === undefined || answersSavedLogin ? { url } : { url, _confirmation },
		};
		this.catalog.setDomainGate(this.gate);
		const blocked = await this.catalog.checkAccess(access);
		if (blocked) return { blocked };
		return { url, site, args, savedLoginAnswer: answersSavedLogin ? _confirmation : undefined };
	}

	/**
	 * What a session for a site opens with: its context from earlier in the task, or its
	 * saved login if the user agrees. `stop` is the card while the user has not answered, or
	 * the reason the saved login cannot be used now.
	 */
	private async loginFor(
		site: string | undefined,
		answer: unknown,
	): Promise<{ stop: McpToolCallResult } | { from?: OpenFrom; notes: string[] }> {
		if (!site) return { notes: [] };
		const closed = this.closed.find((login) => login.site === site);
		if (closed) {
			return {
				from: { closed },
				notes: [`Reopened the browser for ${site}, with its sign-in from earlier in this task.`],
			};
		}

		const saved = await this.savedLogins.findBySite(this.userId, site);
		if (!saved) return { notes: [] };
		if (this.shared.inUseElsewhere(saved.id)) {
			return {
				stop: errorResult(
					`The user's saved login for ${site} is in use by another browser task, and one ` +
						'browser at a time can use it. Report this as blocked, naming the site.',
				),
			};
		}
		const consent = this.savedLoginConsent(site, answer);
		if (consent === 'ask') {
			this.askedSavedLogin = site;
			return { stop: savedLoginCard(site) };
		}
		if (consent === 'no') {
			return {
				notes: [`The user chose not to use their saved login for ${site}. Sign-ins work as usual.`],
			};
		}
		return {
			from: { savedLogin: saved },
			notes: [
				`This browser uses the user's saved login for ${site}. If the site still asks for a ` +
					'sign-in, the login has expired: hand it to the user as usual.',
			],
		};
	}

	private savedLoginConsent(site: string, answer: unknown): 'yes' | 'no' | 'ask' {
		const grantsByThread = this.shared.savedLoginGrants;
		const threadId = this.gate?.threadId ?? '';
		if (grantsByThread.get(threadId)?.has(site)) return 'yes';
		if (answer === undefined) return 'ask';
		if (answer === 'allowForSession') {
			const grants = grantsByThread.get(threadId) ?? new Set<string>();
			grants.add(site);
			grantsByThread.set(threadId, grants);
			return 'yes';
		}
		return answer === 'allowOnce' ? 'yes' : 'no';
	}

	/**
	 * Runs a call on a session, then checks its pages for a sign-in. A session holds one
	 * site's sign-in, so a sign-in for another site the agent went to is not handed to the
	 * user here: the agent is told to start a session for it. Redirects inside the bound
	 * site's own sign-in, such as to its identity provider, are handed off as usual.
	 */
	private async callAndCheck(
		session: CloudSession,
		req: McpToolCallRequest,
		notes: string[],
	): Promise<McpToolCallResult> {
		let result = await this.callOnSession(session, req);
		// Browserbase can end a session on its side (timeout, release) while we still hold it.
		// Every later call then fails with "connection lost", so start a fresh session once.
		if (result.isError && isConnectionLost(result)) {
			try {
				session = await this.restart(session);
			} catch (error) {
				return errorResult(`Cloud browser unavailable: ${messageOf(error)}`);
			}
			result = await this.callOnSession(session, req);
			notes.push('The cloud browser was restarted, so earlier pages are gone.');
		}
		if (result.isError) return result;

		const signIn = await this.findSignIn(session);
		const navigation = session.lastNavigation;
		if (
			signIn &&
			session.site &&
			navigation?.site &&
			navigation.site !== session.site &&
			!isOnSite(new URL(signIn.url).hostname, session.site)
		) {
			notes.push(
				`This browser is for ${session.site}, so the sign-in for ${navigation.site} cannot ` +
					'happen here. Do not hand this page to the user. If you need to be signed in to ' +
					`${navigation.site}, call ${START_SESSION_TOOL} with ${navigation.url}.`,
			);
		} else if (signIn) {
			session.handedOff.add(signIn.url);
			session.signInPending = true;
			addToResult(result, 'handOff', {
				page: signIn.title || signIn.url,
				liveViewUrl: signIn.debuggerFullscreenUrl,
				instruction:
					'This page needs the user (sign-in or security check). The user cannot see the ' +
					'cloud browser. Call request-user-action with this liveViewUrl if you have it, ' +
					'otherwise give it to the user as a link and end your turn. Do not type ' +
					'credentials or codes yourself.',
			});
			this.logger.info('[browserbase demo] hand-off hint added', {
				page: signIn.url.slice(0, 80),
			});
		}
		if (notes.length > 0) addToResult(result, 'browserNote', notes.join(' '));
		this.logSize(req.name, result);
		return result;
	}

	private async callOnSession(
		session: CloudSession,
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
	 * Records the session's page origins for the cleanup, and returns a page that is on a
	 * sign-in or security check and not yet handed off. Browserbase's debug endpoint gives
	 * each page's URL and Live View link in one call.
	 */
	private async findSignIn(session: CloudSession): Promise<BrowserbaseLivePage | undefined> {
		let pages: BrowserbaseLivePage[];
		try {
			({ pages } = await this.gateway.getLivePages(this.userId, session.browserbase.id));
		} catch {
			return undefined;
		}
		for (const page of pages) addOrigin(session.origins, page.url);
		const waiting = pages.filter((p) => needsUser(p.url));
		// Once the user is past every check, a later sign-in on the same page gets the hint again.
		if (waiting.length === 0) session.handedOff.clear();
		return waiting.find((p) => !session.handedOff.has(p.url));
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
	 * PROTOTYPE: the live session's Live View and page, for the browser tab in the UI.
	 * Undefined when no session is open. The current page is taken as the last one
	 * Browserbase lists, the newest tab. When a site opened a tab or popup, the view follows
	 * it, and goes back when it closes. `loginSite` is the site the "Remember this login"
	 * checkbox names. It is absent when the session already uses a saved login.
	 */
	async getLiveView(): Promise<
		| {
				liveViewUrl: string;
				pageUrl?: string;
				viewport?: { width: number; height: number };
				loginSite?: string;
		  }
		| undefined
	> {
		const session = this.current;
		if (!session) return undefined;
		try {
			const debug = await this.gateway.getLivePages(this.userId, session.browserbase.id);
			const newest = debug.pages.at(-1);
			const pageUrl = newest?.url;
			return {
				liveViewUrl:
					debug.pages.length > 1 && newest
						? newest.debuggerFullscreenUrl
						: debug.debuggerFullscreenUrl,
				pageUrl,
				viewport: session.browserbase.viewport,
				loginSite: session.savedLogin ? undefined : (session.site ?? siteOf(pageUrl)),
			};
		} catch {
			return undefined;
		}
	}

	/**
	 * PROTOTYPE (saved logins): the user clicked "I'm done". Binds the live session's
	 * context to the site of the page the user is on now, never to one the agent names, and
	 * notes whether to remember it. Returns the bound site.
	 */
	async handBack(remember: boolean): Promise<string | undefined> {
		return await this.serialized(async () => {
			const session = this.current;
			if (!session) return undefined;
			session.signInPending = false;
			if (session.savedLogin) return session.site;
			if (!session.site) {
				const { pages } = await this.gateway.getLivePages(this.userId, session.browserbase.id);
				session.site = siteOf(pages.at(-1)?.url);
			}
			if (remember && session.site) session.remember = true;
			this.logger.info('[browserbase demo] hand-back', {
				site: session.site,
				remember: session.remember,
			});
			return session.site;
		});
	}

	/** PROTOTYPE (saved logins): whether this task uses a saved login, live or for later. */
	isUsing(savedLoginId: string): boolean {
		return [this.current, ...this.closed].some((login) => login?.savedLogin?.id === savedLoginId);
	}

	/** Ends the task's browsers: closes the live session, then settles every context. */
	async release(reason: string): Promise<void> {
		clearTimeout(this.idleTimer);
		this.idleTimer = undefined;
		await this.serialized(async () => {
			const session = this.current;
			const logins = this.closed;
			this.current = undefined;
			this.closed = [];
			this.askedSavedLogin = undefined;
			if (session) logins.push(await this.close(session, reason));
			await Promise.all(logins.map(async (login) => await this.settle(login)));
		});
	}

	/** Closes the live session and keeps its context for the rest of the task. */
	private async closeForLater(session: CloudSession): Promise<void> {
		if (this.current === session) this.current = undefined;
		this.closed.push(await this.close(session, 'switched to another site'));
	}

	/** Closes a session nobody signed in to, and deletes its context. */
	private async discard(session: CloudSession, reason: string): Promise<void> {
		if (this.current === session) this.current = undefined;
		await this.settle(await this.close(session, reason));
	}

	/**
	 * Cleans up and releases a session. Browserbase writes the context on release, so the
	 * cleanup goes right before it: every site but the bound one is cleared.
	 */
	private async close(session: CloudSession, reason: string): Promise<ClosedLogin> {
		session.server.connection.onPagesChanged(undefined);
		this.notifyChange();
		this.logger.info('[browserbase demo] releasing session', {
			sessionId: session.browserbase.id,
			reason,
			site: session.site,
		});
		if (session.site) await this.clearOtherSites(session, session.site);
		await session.server.callTool({ name: 'browser_disconnect', arguments: {} }).catch(() => {});
		await this.gateway.releaseSession(this.userId, session.browserbase.id).catch((error) => {
			this.logger.warn('[browserbase demo] release failed', { error: messageOf(error) });
		});
		return {
			contextId: session.contextId,
			savedLogin: session.savedLogin,
			site: session.site,
			remember: session.remember,
			region: session.region,
			origins: session.origins,
			lastSessionId: session.browserbase.id,
			verified: !session.signInPending,
		};
	}

	/**
	 * Settles a context at the end of the task. A saved login, or a sign-in the user chose to
	 * remember, is kept with only its site in it. Any other context is deleted.
	 */
	private async settle(login: ClosedLogin): Promise<void> {
		const now = new Date().toISOString();
		try {
			if (login.savedLogin) {
				await this.savedLogins.touch(login.savedLogin.id, {
					lastUsedAt: now,
					lastVerifiedAt: login.verified ? now : undefined,
				});
			} else if (login.remember && login.site) {
				const saved = await this.savedLogins.add({
					userId: this.userId,
					site: login.site,
					label: login.site,
					region: login.region ?? 'unknown',
					contextId: login.contextId,
				});
				this.logger.info('[browserbase demo] saved login stored', {
					savedLoginId: saved.id,
					site: login.site,
					region: saved.region,
				});
			} else {
				await this.waitUntilStopped(login.lastSessionId);
				await this.gateway.deleteContext(this.userId, login.contextId);
				this.logger.info('[browserbase demo] context deleted', { contextId: login.contextId });
			}
		} catch (error) {
			this.logger.warn('[browserbase demo] settling the context failed', {
				contextId: login.contextId,
				error: messageOf(error),
			});
		}
	}

	/** Enforces one site per context, whatever the agent visited. */
	private async clearOtherSites(session: CloudSession, site: string): Promise<void> {
		try {
			const cleared = await session.server.connection.clearSiteDataExcept(
				{
					cookieDomain: (domain) => cookieReachesSite(domain, site),
					origin: (host) => isOnSite(host, site),
				},
				session.origins,
			);
			this.logger.info('[browserbase demo] cleared other sites before release', {
				site,
				cookieDomains: cleared.cookieDomains,
				origins: cleared.origins,
			});
		} catch (error) {
			// TBD: the context is then saved with whatever else the session signed in to.
			this.logger.warn('[browserbase demo] site cleanup failed', {
				site,
				error: messageOf(error),
			});
		}
	}

	/**
	 * Waits for a released session to stop, so it has written its context before the context
	 * is reopened or deleted.
	 */
	private async waitUntilStopped(sessionId: string): Promise<void> {
		for (let attempt = 0; attempt < 20; attempt++) {
			const status = await this.gateway
				.getSessionStatus(this.userId, sessionId)
				.catch(() => undefined);
			if (status !== 'RUNNING') return;
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
	}

	/**
	 * Opens the live session: on a context from earlier in the task, on a saved login's
	 * context, or on a new context. A context opens in the region it was used in.
	 */
	private async open(from?: OpenFrom): Promise<CloudSession> {
		this.starting = true;
		this.notifyChange();
		try {
			return await this.openSession(from);
		} finally {
			this.starting = false;
			this.notifyChange();
		}
	}

	private async openSession(from?: OpenFrom): Promise<CloudSession> {
		const closed = from && 'closed' in from ? from.closed : undefined;
		const savedLogin =
			closed?.savedLogin ?? (from && 'savedLogin' in from ? from.savedLogin : undefined);
		if (closed) {
			this.closed = this.closed.filter((login) => login !== closed);
			await this.waitUntilStopped(closed.lastSessionId);
		}
		const isNew = !closed && !savedLogin;
		const contextId =
			closed?.contextId ??
			savedLogin?.contextId ??
			(await this.gateway.createContext(this.userId)).id;
		const region = closed?.region ?? savedLogin?.region;
		const giveBack = async () => {
			if (closed) this.closed.push(closed);
			if (isNew) await this.gateway.deleteContext(this.userId, contextId).catch(() => {});
		};

		let browserbase: BrowserbaseSession;
		try {
			browserbase = await this.gateway.createSession(this.userId, {
				context: { id: contextId, persist: true },
				region,
			});
		} catch (error) {
			await giveBack();
			throw error;
		}
		const server = this.connectToolsTo(browserbase.connectUrl);
		const connected = await server.callTool({ name: 'browser_connect', arguments: {} });
		if (connected.isError) {
			await this.gateway.releaseSession(this.userId, browserbase.id).catch(() => {});
			await giveBack();
			throw new Error(`Could not connect to the cloud browser: ${textOf(connected)}`);
		}

		const session: CloudSession = {
			browserbase,
			server,
			contextId,
			savedLogin,
			site: closed?.site ?? savedLogin?.site,
			remember: closed?.remember ?? false,
			region: browserbase.region ?? region,
			origins: closed?.origins ?? new Set(),
			handedOff: new Set(),
			signInPending: false,
		};
		this.current = session;
		server.connection.onPagesChanged(() => this.notifyChange());
		this.logger.info('[browserbase demo] session started', {
			sessionId: browserbase.id,
			region: browserbase.region,
			contextId,
			savedLoginId: savedLogin?.id,
			site: session.site,
			reopened: closed !== undefined,
			dashboard: `https://www.browserbase.com/sessions/${browserbase.id}`,
		});
		if (region && browserbase.region && browserbase.region !== region) {
			this.logger.warn('[browserbase demo] context opened outside its region', {
				contextRegion: region,
				sessionRegion: browserbase.region,
			});
		}
		return session;
	}

	/** Replaces a session Browserbase ended, on the same context. */
	private async restart(session: CloudSession): Promise<CloudSession> {
		this.logger.info('[browserbase demo] session lost, starting a new one', {
			sessionId: session.browserbase.id,
		});
		if (this.current === session) this.current = undefined;
		const closed = await this.close(session, 'connection lost');
		const next = await this.open({ closed });
		next.lastNavigation = session.lastNavigation;
		return next;
	}

	private async liveView(session: CloudSession): Promise<McpToolCallResult> {
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

	private async serialized<T>(fn: () => Promise<T>): Promise<T> {
		const run = this.lock.then(fn, fn);
		this.lock = run.catch(() => undefined);
		return await run;
	}

	private touch(): void {
		clearTimeout(this.idleTimer);
		this.idleTimer = setTimeout(() => {
			this.release('idle').catch(() => {});
		}, IDLE_RELEASE_MS);
		this.idleTimer.unref?.();
	}
}

const NO_PAGE_YET = 'No page is open yet. Open one with browser_navigate first.';

/**
 * Before the first page, calls that need no page are answered here, so browser_connect
 * does not start a session.
 */
function answerWithoutSession(req: McpToolCallRequest): McpToolCallResult {
	switch (req.name) {
		case 'browser_connect':
		case 'browser_tab_list':
			return textResult(JSON.stringify({ connected: true, pages: [], note: NO_PAGE_YET }));
		case 'browser_disconnect':
			return textResult('No cloud browser is open. Nothing to do.');
		default:
			return errorResult(NO_PAGE_YET);
	}
}

/** An agent navigation: the call that opens a URL. The first one opens a browser. */
function opensUrl(req: McpToolCallRequest): boolean {
	if (req.name !== 'browser_navigate') return false;
	const url = req.arguments.url;
	return typeof url === 'string' && url !== '' && url !== 'about:blank';
}

/** A browser holds a sign-in once it has a saved login, a hand-back, or a sign-in under way. */
function isBound(session: CloudSession): boolean {
	return session.site !== undefined || session.signInPending;
}

function savedLoginCard(site: string): McpToolCallResult {
	const payload = {
		toolGroup: SAVED_LOGIN_TOOL_GROUP,
		resource: site,
		description: `Sign in to ${site} with your saved login?`,
		options: ['denyOnce', 'allowOnce', 'allowForSession'],
	};
	return errorResult(`${GATEWAY_CONFIRMATION_REQUIRED_PREFIX}${JSON.stringify(payload)}`);
}

function addOrigin(origins: Set<string>, url: string): void {
	try {
		const { origin, protocol } = new URL(url);
		if (protocol === 'https:' || protocol === 'http:') origins.add(origin);
	} catch {
		// Not a URL, e.g. about:blank.
	}
}

/** Adds a field the model reads. It reads structuredContent, so the text copy is kept in step. */
function addToResult(result: McpToolCallResult, key: string, value: unknown): void {
	if (result.structuredContent) {
		result.structuredContent = { ...result.structuredContent, [key]: value };
		result.content = [
			{ type: 'text', text: JSON.stringify(result.structuredContent) },
			...result.content.filter((part) => part.type !== 'text'),
		];
	} else {
		result.content = [...result.content, { type: 'text', text: JSON.stringify({ [key]: value }) }];
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
