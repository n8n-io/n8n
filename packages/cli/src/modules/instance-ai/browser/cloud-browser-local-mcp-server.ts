import type {
	InstanceAiCloudBrowserLiveViewResponse,
	McpTool,
	McpToolCallRequest,
	McpToolCallResult,
} from '@n8n/api-types';
import { mcpToolSchema } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { LocalMcpServer } from '@n8n/instance-ai';
import type {
	AffectedResource,
	BrowserToolkit,
	PageChangeDetails,
	ToolContext,
	ToolDefinition,
} from '@n8n/mcp-browser';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { z } from 'zod';

import {
	browserErrorResult,
	executeBrowserTool,
	gateBrowserAccess,
	isBrowserAccessAllowed,
	toBrowserMcpTool,
	type BrowserDomainGate,
} from './browser.helpers';
import type {
	CloudBrowserSessionScope,
	CloudBrowserSessionProvider,
} from './cloud-browser-session-provider';

/**
 * Toolkit tools the model gets in the cloud browser. A tool that is not in this list stays
 * hidden, so a new toolkit tool reaches the cloud browser only after someone adds it here.
 */
export const CLOUD_BROWSER_TOOLS: ReadonlySet<string> = new Set([
	// Navigation
	'browser_navigate',
	'browser_back',
	'browser_forward',
	'browser_reload',
	// Page interaction
	'browser_click',
	'browser_type',
	'browser_press',
	'browser_hover',
	'browser_drag',
	'browser_select',
	'browser_scroll',
	'browser_dialog',
	'browser_wait',
	// Windows. Only a window that a site opened can be closed.
	'browser_tab_list',
	'browser_tab_close',
	// Page inspection
	'browser_snapshot',
	'browser_screenshot',
	'browser_content',
	'browser_console',
	'browser_network',
	// Credentials. Each call goes through its own permission gate.
	'browser_capture_secret',
	'browser_create_credential',
]);

export const START_SESSION_TOOL_NAME = 'browser_start_session';

/**
 * A session with no tool call for this long is released, so a task that stalls or waits
 * a long time for the user does not keep a paid browser open. The model can open a new
 * session when it continues.
 */
export const SESSION_IDLE_TIMEOUT_MS = 15 * 60 * 1000;

const START_SESSION_MCP_TOOL: McpTool = mcpToolSchema.parse({
	name: START_SESSION_TOOL_NAME,
	description:
		'Open a new cloud browser session and load a URL in it. ' +
		'Call this once, before you use any other browser tool, or when another browser tool tells you to. ' +
		'IMPORTANT: this closes the current browser session. All open pages, sign-ins and cookies are lost. ' +
		'To go to a different URL in the current session, use browser_navigate.',
	inputSchema: {
		type: 'object',
		properties: { url: { type: 'string', description: 'Full URL to open' } },
		required: ['url'],
	},
	annotations: { category: 'browser' },
});

/**
 * Why browser tools cannot run: no session was started, or the session ended without
 * the model asking for it.
 */
type SessionUnavailableReason = 'notStarted' | 'connectionLost' | 'idleTimeout';

const RELEASED_MESSAGE = 'The browser task has ended. No browser tools can run.';

const OTHER_TAB_MESSAGE =
	'Browser tools work only in the current window. When a site opens a new window, the tools move to it.';

const CLOSE_FIRST_WINDOW_MESSAGE =
	'This is the first window of the session, so it cannot be closed. Only a window that a site opened can be closed.';

const NO_HOST_MESSAGE = 'This browser action only works on websites. Use a website address.';

const START_SESSION_HINT = 'Call browser_start_session with a URL to open a session.';

const SESSION_UNAVAILABLE_MESSAGES: Record<SessionUnavailableReason, string> = {
	notStarted: `No browser session is open. ${START_SESSION_HINT}`,
	connectionLost: `The browser session closed unexpectedly. Its pages, sign-ins and cookies are gone. ${START_SESSION_HINT}`,
	idleTimeout: `The browser session was closed because no browser tool was used for ${SESSION_IDLE_TIMEOUT_MS / 60_000} minutes. Its pages, sign-ins and cookies are gone. ${START_SESSION_HINT}`,
};

const startSessionArgsSchema = z.object({ url: z.string().url() });

export interface CloudBrowserLocalMcpServerOptions {
	scope: CloudBrowserSessionScope;
	sessionProvider: CloudBrowserSessionProvider;
	createToolkit: (connectUrl?: string) => BrowserToolkit;
	toolContext: ToolContext;
	/**
	 * The sites the user approved and the admin's permissions. Required, so no call skips the
	 * check. `setDomainGate()` replaces it.
	 */
	domainGate: BrowserDomainGate;
	logger: Logger;
}

interface ActiveSession {
	id: string;
	connection: BrowserToolkit['connection'];
	toolsByName: Map<string, ToolDefinition>;
	/**
	 * The open windows, oldest first. The last one is the current window: the tools act on it and
	 * the live view shows it. A window a site opens goes on top, as in a normal browser, and when it
	 * closes the window below it is current again.
	 */
	windows: string[];
	/** The current window when the agent's last call returned. Its next result notes any change since then. */
	windowSeenByAgent?: string;
	/** The browser tools that run right now. Calls can run in parallel. See `executeBrowserToolOnSession`. */
	runningBrowserTools: number;
}

/** Browser tools on a Browserbase session, for one background task. */
export class CloudBrowserLocalMcpServer implements LocalMcpServer {
	private readonly toolList: McpTool[] = [START_SESSION_MCP_TOOL];

	private activeSession?: ActiveSession;

	private sessionUnavailableReason: SessionUnavailableReason = 'notStarted';

	private idleTimer?: NodeJS.Timeout;

	/** Tool calls that have not returned yet. The idle timer runs only when this is zero. */
	private pendingCalls = 0;

	/**
	 * Set by `release()` when the task ends. After that, the service no longer tracks this
	 * server, so it must not open a session that nothing would release.
	 */
	private isReleased = false;

	/** Set while a session opens, so the live view can tell an opening browser from none. */
	private isOpeningSession = false;

	/**
	 * Session starts and releases hold this lock, so they run one at a time and two
	 * starts cannot both open a session and leak one. Action tools wait for a start or
	 * release in progress but do not take the lock, so they still run in parallel.
	 */
	private sessionLock: Promise<unknown> = Promise.resolve();

	/** Read on every call, so a replaced gate applies from the next call on. */
	private domainGate: BrowserDomainGate;

	/** Called when the current window changes, so the live view can show the new one. */
	private onCurrentWindowChange?: () => void;

	constructor(private readonly options: CloudBrowserLocalMcpServerOptions) {
		this.domainGate = options.domainGate;

		const toolkit = options.createToolkit();
		for (const tool of this.getAvailableToolsFromToolkit(toolkit)) {
			const mcpTool = toBrowserMcpTool(tool);
			if (mcpTool) this.toolList.push(mcpTool);
		}
	}

	/** Replaces the gate, for example when a new run of the task brings new permissions. */
	setDomainGate(domainGate: BrowserDomainGate): void {
		this.domainGate = domainGate;
	}

	/** Sets what to call when the current window changes, also while the user has control. */
	setCurrentWindowListener(listener: () => void): void {
		this.onCurrentWindowChange = listener;
	}

	getAvailableTools(): McpTool[] {
		return this.toolList;
	}

	getToolsByCategory(category: string): McpTool[] {
		return category === 'browser' ? this.toolList : [];
	}

	async callTool(req: McpToolCallRequest): Promise<McpToolCallResult> {
		if (this.isReleased) return browserErrorResult(RELEASED_MESSAGE);

		this.clearIdleTimer();
		this.pendingCalls++;
		try {
			// The user's answer when the call runs again after a confirmation request.
			// The tool wrapper removes this key from the model's own arguments.
			const { _confirmation: confirmation, ...args } = req.arguments;
			if (req.name === START_SESSION_TOOL_NAME) {
				return await this.startSession(args, confirmation);
			}
			// wait for any session start or release that is still in progress
			// so we do not try to use a session that is not ready
			await this.sessionLock;
			if (this.isReleased) return browserErrorResult(RELEASED_MESSAGE);
			return await this.executeBrowserTool(req.name, args, confirmation);
		} finally {
			this.pendingCalls--;
			this.scheduleIdleRelease();
		}
	}

	/**
	 * The live view of the session the agent works in, or why there is none. The link lets anyone who
	 * has it control the browser, so callers must never log or store it.
	 */
	async getLiveView(): Promise<InstanceAiCloudBrowserLiveViewResponse> {
		if (this.isReleased) return { status: 'not-found' };
		if (this.isOpeningSession) return { status: 'starting' };

		const session = this.activeSession;
		// The next tool call notices the lost connection and releases the session.
		if (session && !session.connection.isConnected) {
			return { status: 'disconnected', reason: 'connectionLost' };
		}
		if (!session) {
			return this.sessionUnavailableReason === 'notStarted'
				? { status: 'no-session' }
				: { status: 'disconnected', reason: this.sessionUnavailableReason };
		}

		const { scope, sessionProvider } = this.options;
		// With one window, the session's own live view shows it, so the window needs no lookup.
		const currentWindow = session.windows.length > 1 ? session.windows.at(-1) : undefined;
		const targetId = currentWindow
			? await adapterOf(session)?.getTargetId?.(currentWindow)
			: undefined;
		const liveViewUrl = await sessionProvider.getSessionLiveViewUrl(scope, session.id, targetId);
		// The session can end or change before we get the live url response.
		// Then this link is old, and we need the client to ask again.
		if (this.activeSession?.id !== session.id) return { status: 'starting' };
		return { status: 'live', liveViewUrl, windowId: session.windows.at(-1) ?? '' };
	}

	/** A new session only loads its URL, so it touches the URL's host. */
	private getAffectedResourcesForStartSessionTool(host: string): AffectedResource[] {
		return [
			{
				toolGroup: 'browser',
				kind: 'host',
				resource: host,
				description: `Browser: ${host}`,
			},
		];
	}

	/**
	 * Ends the task's browser session, if one is open. The server then refuses every later
	 * call, including calls that were waiting for this release.
	 */
	async release(): Promise<void> {
		await this.withSessionLock(async () => {
			this.isReleased = true;
			await this.endActiveSession();
		});
	}

	private async startSession(
		rawArgs: Record<string, unknown>,
		confirmation: unknown,
	): Promise<McpToolCallResult> {
		const args = startSessionArgsSchema.safeParse(rawArgs);
		if (!args.success) {
			return browserErrorResult('browser_start_session needs a URL.');
		}

		// Like the other tools, a session only opens pages with a web address.
		const host = new URL(args.data.url).hostname;
		if (!host) return browserErrorResult(NO_HOST_MESSAGE);

		return await this.withSessionLock(async () => {
			// A start queued behind release() must not open a session.
			if (this.isReleased) return browserErrorResult(RELEASED_MESSAGE);

			// Check before a session opens, so a denied site costs no browser. The check never
			// waits for the user: it returns a request, and the agent pauses outside this call.
			const accessResult = await this.gateAccess(
				this.getAffectedResourcesForStartSessionTool(host),
				confirmation,
			);
			if (accessResult) return accessResult;

			// we should only have one active session at a time, so close any existing one first
			await this.endActiveSession();
			this.sessionUnavailableReason = 'notStarted';

			let session: ActiveSession;
			this.isOpeningSession = true;
			try {
				session = await this.openSession();
			} catch (error) {
				return browserErrorResult(
					`Could not open a browser session: ${ensureError(error).message}`,
				);
			} finally {
				this.isOpeningSession = false;
			}
			this.activeSession = session;

			const navigate = session.toolsByName.get('browser_navigate');
			if (!navigate) {
				return browserErrorResult('Unknown browser tool: browser_navigate');
			}
			// No access check: the URL was checked before the session opened.
			return await this.executeBrowserToolOnSession(session, navigate, { url: args.data.url });
		});
	}

	/**
	 * Runs one of the toolkit's tools on the active session, after it checks every site and
	 * credential the call touches.
	 */
	private async executeBrowserTool(
		toolName: string,
		args: Record<string, unknown>,
		confirmation: unknown,
	): Promise<McpToolCallResult> {
		const session = await this.getConnectedSession();
		if (!session) {
			return browserErrorResult(SESSION_UNAVAILABLE_MESSAGES[this.sessionUnavailableReason]);
		}

		const tool = session.toolsByName.get(toolName);
		if (!tool) {
			return browserErrorResult(`Unknown browser tool: ${toolName}`);
		}

		// The agent works in the current window: the live view shows it, and site approvals
		// check its host. Other windows are not supported.
		if (args.pageId !== undefined && args.pageId !== activePageIdOf(session)) {
			return browserErrorResult(OTHER_TAB_MESSAGE);
		}
		if (toolName === 'browser_tab_close' && session.windows.length <= 1) {
			return browserErrorResult(CLOSE_FIRST_WINDOW_MESSAGE);
		}

		// The check runs here, after the session lock, so it reads the session the tool runs on.
		// If `getAffectedResources` throws, the helper returns an error and the tool does not run.
		const result = await this.executeBrowserToolOnSession(
			session,
			tool,
			args,
			async (parsedArgs) =>
				await this.gateAccess(
					await tool.getAffectedResources(parsedArgs, this.options.toolContext),
					confirmation,
				),
		);
		// Compared with what the agent last saw, so a window that opened while the user had control,
		// or after the call that opened it returned, is noted too.
		const noted = withWindowChangeNote(result, session, session.windowSeenByAgent);
		session.windowSeenByAgent = session.windows.at(-1);
		return noted;
	}

	/**
	 * Keeps the session's windows in order and points the tools at the current one. Runs for every
	 * window the browser opens or closes, also while the user has control.
	 */
	private onPageChange(session: ActiveSession, { type, pageId }: PageChangeDetails): void {
		const { windows } = session;
		const before = windows.at(-1);
		const index = windows.indexOf(pageId);
		if (type === 'opened' && index === -1) windows.push(pageId);
		if (type === 'closed' && index !== -1) windows.splice(index, 1);

		const current = windows.at(-1);
		if (current === before) return;
		// While a tool runs, the tools move to the new window after the last running one returns.
		if (session.runningBrowserTools === 0) {
			const isConnected = setActivePageToCurrentWindow(session);
			// The next tool call releases a session whose connection is gone.
			if (!isConnected) return;
		}
		if (session === this.activeSession) this.onCurrentWindowChange?.();
	}

	private async executeBrowserToolOnSession(
		session: ActiveSession,
		tool: ToolDefinition,
		args: Record<string, unknown>,
		checkAccess?: (args: unknown) => Promise<McpToolCallResult | undefined>,
	): Promise<McpToolCallResult> {
		session.runningBrowserTools++;
		try {
			return await executeBrowserTool(tool, args, this.options.toolContext, checkAccess);
		} finally {
			session.runningBrowserTools--;
			if (session.runningBrowserTools === 0) setActivePageToCurrentWindow(session);
		}
	}

	/**
	 * Checks each site and credential write that a call touches, with the same gate as the
	 * extension browser. A call on a page with no host is refused. Returns a result that stops
	 * the call, or `undefined` when the call can run. When the call runs again after a request,
	 * the user's answer applies to the first resource that still needs one.
	 */
	private async gateAccess(
		resources: AffectedResource[],
		confirmation: unknown,
	): Promise<McpToolCallResult | undefined> {
		const { domainGate } = this;
		let answer = confirmation;
		for (const resource of resources) {
			if (isNoHostResource(resource)) return browserErrorResult(NO_HOST_MESSAGE);
			if (isBrowserAccessAllowed(domainGate, resource)) continue;

			const result = await gateBrowserAccess(domainGate, resource, answer);
			answer = undefined;
			if (result) return result;
		}
		return undefined;
	}

	/**
	 * Returns the active session, or `undefined` once its browser connection has dropped,
	 * for example when Browserbase ended the session. A dropped session is released.
	 */
	private async getConnectedSession(): Promise<ActiveSession | undefined> {
		const session = this.activeSession;
		if (!session) return undefined;
		if (session.connection.isConnected) return session;

		const { scope, logger } = this.options;
		logger.warn('Cloud browser session lost', { taskId: scope.taskId, sessionId: session.id });
		this.activeSession = undefined;
		this.sessionUnavailableReason = 'connectionLost';
		await this.releaseSession(session.id);
		return undefined;
	}

	/** Creates a session and connects the browser tools to it. */
	private async openSession(): Promise<ActiveSession> {
		const { scope, sessionProvider, createToolkit, logger } = this.options;
		const { id, connectUrl } = await sessionProvider.createSession(scope);

		let toolkit: BrowserToolkit;
		try {
			toolkit = createToolkit(connectUrl);
			await toolkit.connection.connect();
		} catch (error) {
			await this.releaseSession(id);
			throw error;
		}

		logger.info('Cloud browser session started', { taskId: scope.taskId, sessionId: id });
		const { adapter, activePageId } = toolkit.connection.getConnection();
		const session: ActiveSession = {
			id,
			connection: toolkit.connection,
			toolsByName: new Map(this.getAvailableToolsFromToolkit(toolkit).map((t) => [t.name, t])),
			windows: activePageId ? [activePageId] : [],
			windowSeenByAgent: activePageId || undefined,
			runningBrowserTools: 0,
		};
		adapter.onPageChange = (change) => this.onPageChange(session, change);
		return session;
	}

	/** Disconnects the tools and releases the active session, if one is open. */
	private async endActiveSession(): Promise<void> {
		this.clearIdleTimer();
		const session = this.activeSession;
		if (!session) return;
		this.activeSession = undefined;

		await session.connection.disconnect();
		await this.releaseSession(session.id);
	}

	/** Releases a session. A failure is only logged, since nothing more can be done about it here. */
	private async releaseSession(sessionId: string): Promise<void> {
		const { scope, sessionProvider, logger } = this.options;
		try {
			await sessionProvider.releaseSession(scope, sessionId);
		} catch (error) {
			logger.warn('Failed to release cloud browser session', {
				taskId: scope.taskId,
				sessionId,
				error: ensureError(error).message,
			});
		}
	}

	private scheduleIdleRelease(): void {
		this.clearIdleTimer();
		if (!this.activeSession || this.pendingCalls > 0) return;

		this.idleTimer = setTimeout(
			async () => await this.releaseIdleSession(),
			SESSION_IDLE_TIMEOUT_MS,
		);
		// The timer alone must not keep the process running.
		this.idleTimer.unref();
	}

	private clearIdleTimer(): void {
		clearTimeout(this.idleTimer);
		this.idleTimer = undefined;
	}

	private async releaseIdleSession(): Promise<void> {
		const { scope, logger } = this.options;
		logger.info('Releasing idle cloud browser session', {
			taskId: scope.taskId,
			sessionId: this.activeSession?.id,
		});
		await this.withSessionLock(async () => {
			if (!this.activeSession) return;
			await this.endActiveSession();
			this.sessionUnavailableReason = 'idleTimeout';
		});
	}

	/** Runs `fn` after every earlier session start or release has settled. */
	private async withSessionLock<T>(fn: () => Promise<T>): Promise<T> {
		const run = this.sessionLock.then(fn, fn);
		// A failed step must not stop the steps queued after it.
		this.sessionLock = run.catch(() => undefined);
		return await run;
	}

	private getAvailableToolsFromToolkit(toolkit: BrowserToolkit): ToolDefinition[] {
		return toolkit.tools.filter((t) => CLOUD_BROWSER_TOOLS.has(t.name));
	}
}

/**
 * The toolkit reports a page with no host as the host 'browser'. That covers `about:blank`,
 * but also `data:`, `javascript:` and `file:` URLs, whose pages can reach any site, so the
 * cloud browser refuses these calls. A real host called `browser` is refused too. That is
 * harmless: a bare `browser` has no public DNS name, so it cannot load in the cloud browser.
 */
function isNoHostResource(resource: AffectedResource): boolean {
	return resource.kind === 'host' && resource.resource === 'browser';
}

/** Makes the current window the page the tools act on. Returns false when the connection is gone. */
function setActivePageToCurrentWindow(session: ActiveSession): boolean {
	try {
		session.connection.getConnection().activePageId = session.windows.at(-1) ?? '';
		return true;
	} catch {
		return false;
	}
}

/** The tab the session's tools act on by default, or `undefined` when the connection is gone. */
function activePageIdOf(session: ActiveSession): string | undefined {
	try {
		return session.connection.getConnection().activePageId;
	} catch {
		return undefined;
	}
}

function adapterOf(session: ActiveSession) {
	try {
		return session.connection.getConnection().adapter;
	} catch {
		return undefined;
	}
}

function hostOfWindow(session: ActiveSession, pageId: string | undefined): string | undefined {
	if (!pageId) return undefined;
	const url = adapterOf(session)?.getPageUrl(pageId);
	if (!url) return undefined;
	try {
		return new URL(url).hostname || undefined;
	} catch {
		return undefined;
	}
}

/**
 * Tells the model when the current window changed since its last call, for example when a click or
 * the user opened a popup.
 * The model reads structuredContent when there is one, so the note goes there first, and in the text.
 */
function withWindowChangeNote(
	result: McpToolCallResult,
	session: ActiveSession,
	windowSeen: string | undefined,
): McpToolCallResult {
	const current = session.windows.at(-1);
	if (current === windowSeen) return result;

	const host = hostOfWindow(session, current);
	// The window the agent last saw is still open, so a new one opened on top of it.
	const opened = windowSeen !== undefined && session.windows.includes(windowSeen);
	const windowChange = opened
		? `A new window opened${host ? ` on ${host}` : ''}. Browser tools now act in it. ` +
			`If you do not need it, close it with browser_tab_close and pageId "${current}". ` +
			'When it closes, the tools act on the previous window again.'
		: `The window closed. Browser tools act on the previous window${host ? ` on ${host}` : ''} again.`;
	return {
		...result,
		content: [...result.content, { type: 'text', text: windowChange }],
		...(result.structuredContent && {
			structuredContent: { windowChange, ...result.structuredContent },
		}),
	};
}
