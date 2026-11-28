import type {
	InstanceAiCloudBrowserLiveViewResponse,
	McpTool,
	McpToolCallRequest,
	McpToolCallResult,
} from '@n8n/api-types';
import { mcpToolSchema } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type {
	CloudBrowserUserActionHost,
	CloudBrowserUserControlResult,
	LocalMcpServer,
} from '@n8n/instance-ai';
import type {
	AffectedResource,
	BrowserToolkit,
	PageChangeDetails,
	ToolContext,
	ToolDefinition,
} from '@n8n/mcp-browser';
import { BaseError } from '@n8n/errors';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { createDeferredPromise, type IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { isIP } from 'node:net';
import { z } from 'zod';

import {
	browserErrorResult,
	executeBrowserTool,
	gateBrowserAccess,
	gateSavedLoginAccess,
	isBrowserAccessAllowed,
	isSavedLoginDecision,
	toBrowserMcpTool,
	type BrowserDomainGate,
	type SavedLoginDecision,
} from './browser.helpers';
import type {
	CloudBrowserLoginProfile,
	CloudBrowserSession,
	CloudBrowserSessionLocation,
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

/**
 * While the user has control, the session stays open this long without a tool call, so they
 * have time to sign in. Browserbase ends a session after 60 minutes in any case.
 */
export const USER_CONTROL_TIMEOUT_MS = 30 * 60 * 1000;

const START_SESSION_MCP_TOOL: McpTool = mcpToolSchema.parse({
	name: START_SESSION_TOOL_NAME,
	description:
		'Open a new cloud browser session and load a URL in it. ' +
		'Call this once, before you use any other browser tool, or when another browser tool tells you to. ' +
		'IMPORTANT: this closes the current browser session. All open pages, sign-ins and cookies are lost. ' +
		'To go to a different URL in the current session, use browser_navigate.',
	inputSchema: {
		type: 'object',
		properties: {
			url: { type: 'string', description: 'Full URL to open' },
			proxyCountry: {
				type: 'string',
				description:
					'Optional. A two-letter country code, for example "DE". The browser then reaches sites through a residential proxy in that country, which is slower and costs more. ' +
					'Use it only when the goal asks for results as seen from a specific country, or after a site blocked the browser, for example with an access denied page, a CAPTCHA that keeps coming back, or a message about automated traffic. ' +
					'In that case, call browser_start_session again with a country and try again.',
			},
		},
		required: ['url'],
	},
	annotations: { category: 'browser' },
});

/**
 * Why browser tools cannot run: no session was started, or the session ended without
 * the model asking for it.
 */
type SessionUnavailableReason =
	| 'notStarted'
	| 'connectionLost'
	| 'idleTimeout'
	| 'userControlTimeout';

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
	userControlTimeout: `The browser session was closed because the user did not return control within ${USER_CONTROL_TIMEOUT_MS / 60_000} minutes. Its pages, sign-ins and cookies are gone. Report the task as blocked.`,
};

const USER_NOT_IN_CONTROL_MESSAGE = 'The user does not have control of the browser.';

const CALL_SKIPPED_RESULT: McpToolCallResult = {
	content: [
		{
			type: 'text',
			text: 'The user took control of the browser, so this call did not run. Call browser_snapshot to see the page, then continue.',
		},
	],
};

/**
 * The result of giving control back to the agent: why the user still has control, or whether the
 * login they made was saved.
 */
export type CloudBrowserReturnControlResult =
	| { returned: false; error: string }
	| { returned: true; loginWillBeSaved: boolean };

/**
 * What happened to a login when its session ended: a login the user chose to save was saved or not
 * saved, or a saved login that the session used was removed because it could not be kept.
 */
export type CloudBrowserLoginSaveStatus = 'saved' | 'notSaved' | 'removed';

export interface CloudBrowserLoginSaveResult {
	domain: string;
	status: CloudBrowserLoginSaveStatus;
}

/**
 * The result of a tool call that waited while the user had control. The call is skipped, because
 * the page may have changed.
 */
function skippedToolCallResult(result: CloudBrowserUserControlResult): McpToolCallResult {
	if (!result.returned) return browserErrorResult(result.error);
	return CALL_SKIPPED_RESULT;
}

const URL_ERROR = 'browser_start_session needs a URL.';
const PROXY_COUNTRY_ERROR = 'proxyCountry must be a two-letter country code, for example "DE".';

/** Each field carries the error message the model sees when it is invalid. */
const startSessionArgsSchema = z.object({
	url: z.string({ required_error: URL_ERROR, invalid_type_error: URL_ERROR }).url(URL_ERROR),
	proxyCountry: z
		.string({ invalid_type_error: PROXY_COUNTRY_ERROR })
		.regex(/^[a-z]{2}$/i, PROXY_COUNTRY_ERROR)
		.transform((country) => country.toUpperCase())
		.optional(),
});

export interface CloudBrowserLocalMcpServerOptions {
	scope: CloudBrowserSessionScope;
	sessionProvider: CloudBrowserSessionProvider;
	/**
	 * Gives each session a login profile, so the user can save the logins they make in it. Without
	 * it, sessions open without a login profile.
	 */
	enableLoginProfiles?: boolean;
	createToolkit: (connectUrl?: string) => BrowserToolkit;
	toolContext: ToolContext;
	/**
	 * The sites the user approved and the admin's permissions. Required, so no call skips the
	 * check. `setDomainGate()` replaces it.
	 */
	domainGate: BrowserDomainGate;
	logger: Logger;
}

/** Where the browser runs. Sites see it in the proxy country when there is one, otherwise in the region. */
interface SessionLocation {
	/** The provider's id of the region, for example "eu-central-1". A login is saved with it. */
	regionId: string;
	/** The country of the region, for example "DE". */
	regionCountry?: string;
	proxyCountry?: string;
	proxyCity?: string;
}

/** A login the user can save now. */
export interface CloudBrowserLoginToSave {
	/** The site of the login. */
	domain: string;
	/** When the user saved their login for the site, which a save replaces. */
	replacesSavedLoginFrom?: Date;
}

/** Whether a new session may open, and how the user chose to use their saved login for the site. */
type StartSessionAccess =
	| { isAllowed: false; result: McpToolCallResult }
	| { isAllowed: true; savedLoginDecision?: SavedLoginDecision };

interface ActiveSession {
	id: string;
	location: SessionLocation;
	/** Absent when the session has no login profile. */
	loginProfile?: CloudBrowserLoginProfile;
	/** The user asked to save the login. It is saved when the session ends. */
	saveLoginProfileOnSessionEnd?: boolean;
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
	/**
	 * Whether the session loaded only pages and frames of `domain`. Works after a drop too. Absent
	 * when the browser cannot tell.
	 */
	hasVisitedOnlySite?: (domain: string) => boolean;
}

/** Browser tools on a Browserbase session, for one background task. */
export class CloudBrowserLocalMcpServer implements LocalMcpServer, CloudBrowserUserActionHost {
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

	/** Set while the user has control of the browser. */
	private userControl?: {
		/** Resolves when control comes back to the agent, or when the browser closes first. */
		result: IDeferredPromise<CloudBrowserUserControlResult>;
		/** The user clicked "Take over". When the agent asks, they have control before that. */
		hasTakenOver: boolean;
		/** The agent asked the user to sign in. */
		isLoginRequest?: boolean;
	};

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

	/** Called when the user gives control back to the agent. */
	private onControlReturned?: () => void;

	/**
	 * Notes the user wrote when they gave control back. They never go into a browser tool result:
	 * the agent treats those as untrusted page content. The agent takes them as user messages.
	 */
	private userControlNotes: string[] = [];

	/**
	 * The logins the user chose to save, from every session that has ended, by site: what happened
	 * to the login. A site that is saved stays saved, also when a later save for it fails.
	 */
	private readonly loginSaveResults = new Map<string, CloudBrowserLoginSaveStatus>();

	/**
	 * The user's answers on the saved-login card, by host, as hosts are approved. A later session on
	 * the host in this task uses the answer and does not ask again, and the browser tools on the
	 * host run. "Deny" is not kept.
	 */
	private readonly savedLoginDecisions = new Map<string, SavedLoginDecision>();

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

	/** Sets what to call when the user gives control back to the agent. */
	setControlReturnedListener(listener: () => void): void {
		this.onControlReturned = listener;
	}

	getAvailableTools(): McpTool[] {
		return this.toolList;
	}

	getToolsByCategory(category: string): McpTool[] {
		return category === 'browser' ? this.toolList : [];
	}

	async callTool(req: McpToolCallRequest): Promise<McpToolCallResult> {
		if (this.isReleased) return browserErrorResult(RELEASED_MESSAGE);
		// Not counted as pending, so the user-control timeout still runs while the call waits.
		if (this.userControl) return skippedToolCallResult(await this.userControl.result.promise);

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
		// The disconnect handler releases the session. Until it runs, the connection already tells.
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
		return {
			status: 'live',
			liveViewUrl,
			windowId: session.windows.at(-1) ?? '',
			...(this.userControl?.hasTakenOver ? { userHasTakenOver: true } : {}),
			...(session.loginProfile && {
				loginProfile: {
					domain: session.loginProfile.domain,
					...(session.loginProfile.savedAt && {
						savedAt: session.loginProfile.savedAt.toISOString(),
					}),
					...(session.saveLoginProfileOnSessionEnd && { willBeSavedOnSessionEnd: true }),
				},
			}),
		};
	}

	/** Whether the user has control of the browser. Tool calls wait until they return it. */
	isUserInControl(): boolean {
		return this.userControl !== undefined;
	}

	/**
	 * The user clicked "Take over": gives them control of the browser, or keeps the control the agent
	 * asked for. Returns why the user cannot take over, for example when no session is open.
	 */
	giveControlToUser(): string | undefined {
		const error = this.startUserControl();
		if (error) return error;
		if (this.userControl) this.userControl.hasTakenOver = true;
		return undefined;
	}

	/** Tool calls wait while the user has control, and the session gets the longer idle limit. */
	private startUserControl(): string | undefined {
		if (this.isReleased) return RELEASED_MESSAGE;
		if (!this.activeSession) return SESSION_UNAVAILABLE_MESSAGES[this.sessionUnavailableReason];
		this.userControl ??= {
			result: createDeferredPromise<CloudBrowserUserControlResult>(),
			hasTakenOver: false,
		};
		this.scheduleIdleRelease();
		return undefined;
	}

	/**
	 * Gives control back to the agent, with what the user changed. With `shouldSaveLogin`, the
	 * login the user made is saved when the session ends, if we can tell where they signed in.
	 */
	async returnControlToAgent(
		note?: string,
		shouldSaveLogin?: boolean,
	): Promise<CloudBrowserReturnControlResult> {
		if (!this.userControl) return { returned: false, error: USER_NOT_IN_CONTROL_MESSAGE };
		const loginWillBeSaved = shouldSaveLogin ? await this.markLoginToBeSaved() : false;
		if (!this.userControl) return { returned: false, error: USER_NOT_IN_CONTROL_MESSAGE };
		if (note) this.userControlNotes.push(note);
		this.endUserControl({ returned: true });
		this.onControlReturned?.();
		return { returned: true, loginWillBeSaved };
	}

	/**
	 * The logins the user chose to save, and whether each was saved. A login is saved when its
	 * session ends, so release the server first to get every login of the task.
	 */
	getLoginSaveResults(): CloudBrowserLoginSaveResult[] {
		return [...this.loginSaveResults].map(([domain, status]) => ({ domain, status }));
	}

	drainUserControlNotes(): string[] {
		return this.userControlNotes.splice(0);
	}

	/**
	 * For the agent's request: gives the user control and waits until they return it. After a login
	 * request, the user can save the login when they return control.
	 */
	async requestUserAction({
		isLoginRequest,
	}: { isLoginRequest: boolean }): Promise<CloudBrowserUserControlResult> {
		const error = this.startUserControl();
		if (error) return { returned: false, error };
		const userControl = this.userControl;
		if (isLoginRequest && userControl) userControl.isLoginRequest = true;
		return (await userControl?.result.promise) ?? { returned: true };
	}

	/** The login the user can save now, or nothing when they cannot save one. */
	async getLoginToSave(): Promise<CloudBrowserLoginToSave | undefined> {
		const session = this.activeSession;
		if (!session?.loginProfile || !(await this.canSaveLogin(session))) return undefined;
		const { domain } = session.loginProfile;
		// A save replaces the user's saved login for the site, so the user is told before they save.
		const savedLoginProfile = await this.findSavedLoginProfileForDomain(domain);
		return { domain, replacesSavedLoginFrom: savedLoginProfile?.savedAt };
	}

	/** Whether the user can save the login they just made in the session. */
	private async canSaveLogin(session: ActiveSession): Promise<boolean> {
		const { loginProfile } = session;
		// There is no login profile, or it is saved, or already marked to be saved.
		if (!loginProfile || loginProfile.savedAt || session.saveLoginProfileOnSessionEnd) {
			return false;
		}
		// The agent did not ask the user to sign in.
		if (!this.userControl?.isLoginRequest) return false;
		// The user must be on the site of the login profile. Otherwise we cannot tell where they
		// signed in. SSO sign-ins redirect back to this site, so this check still holds.
		const currentDomain = await registrableDomainOf(currentHostOf(session));
		return currentDomain === loginProfile.domain;
	}

	/**
	 * Marks the login of the active session to be saved when the session ends. Returns false when
	 * the user cannot save it.
	 */
	private async markLoginToBeSaved(): Promise<boolean> {
		const session = this.activeSession;
		if (!session || !(await this.canSaveLogin(session))) return false;
		session.saveLoginProfileOnSessionEnd = true;
		return true;
	}

	private endUserControl(result: CloudBrowserUserControlResult): void {
		const userControl = this.userControl;
		if (!userControl) return;
		this.userControl = undefined;
		userControl.result.resolve(result);
		this.scheduleIdleRelease();
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
		this.endUserControl({ returned: false, error: RELEASED_MESSAGE });
	}

	private async startSession(
		rawArgs: Record<string, unknown>,
		confirmation: unknown,
	): Promise<McpToolCallResult> {
		const args = startSessionArgsSchema.safeParse(rawArgs);
		if (!args.success) {
			return browserErrorResult(args.error.issues.map((issue) => issue.message).join(' '));
		}

		// Like the other tools, a session only opens pages with a web address.
		const host = new URL(args.data.url).hostname;
		if (!host) return browserErrorResult(NO_HOST_MESSAGE);

		return await this.withSessionLock(async () => {
			// A start queued behind release() must not open a session.
			if (this.isReleased) return browserErrorResult(RELEASED_MESSAGE);
			// The user did not come back, the session was closed so the task should be reported as blocked
			if (this.sessionUnavailableReason === 'userControlTimeout') {
				return browserErrorResult(SESSION_UNAVAILABLE_MESSAGES.userControlTimeout);
			}

			// Looked up under the session lock, so a saved login that a released session deletes
			// is gone before this lookup.
			const savedLoginProfile = await this.findSavedLoginProfileForHost(host);

			// Check before a session opens, so a denied site costs no browser. The check never
			// waits for the user: it returns a request, and the agent pauses outside this call.
			const access = await this.gateStartSession(host, savedLoginProfile, confirmation);
			if (!access.isAllowed) return access.result;

			// we should only have one active session at a time, so close any existing one first
			await this.endActiveSession();
			this.sessionUnavailableReason = 'notStarted';

			let session: ActiveSession;
			this.isOpeningSession = true;
			try {
				const loginProfile = await this.chooseLoginProfile(
					host,
					savedLoginProfile,
					access.savedLoginDecision,
				);
				session = await this.openSession(loginProfile, { proxyCountry: args.data.proxyCountry });
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
			const result = await this.executeBrowserToolOnSession(session, navigate, {
				url: args.data.url,
			});
			return withSessionContext(result, session);
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
			// The disconnect handler releases a session whose connection is gone.
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
			return await executeBrowserTool(tool, args, this.options.toolContext, async (parsedArgs) => {
				const accessResult = await checkAccess?.(parsedArgs);
				// The user may take control while the call waits. Skip it so the tool does not run.
				if (this.userControl) return CALL_SKIPPED_RESULT;
				return accessResult;
			});
		} finally {
			session.runningBrowserTools--;
			if (session.runningBrowserTools === 0) setActivePageToCurrentWindow(session);
		}
	}

	/**
	 * Checks a new session on `host`. With a saved login for the site, the saved-login card decides.
	 * Without one, the host is checked like any other site.
	 */
	private async gateStartSession(
		host: string,
		savedLoginProfile: CloudBrowserLoginProfile | undefined,
		confirmation: unknown,
	): Promise<StartSessionAccess> {
		if (savedLoginProfile?.savedAt) {
			const savedLogin = {
				domain: savedLoginProfile.domain,
				savedAt: savedLoginProfile.savedAt,
			};
			return this.gateStartSessionWithSavedLogin(host, savedLogin, confirmation);
		}
		return await this.gateStartSessionWithoutSavedLogin(host, confirmation);
	}

	/** Checks a new session on a host where the user has no saved login: the normal host check. */
	private async gateStartSessionWithoutSavedLogin(
		host: string,
		confirmation: unknown,
	): Promise<StartSessionAccess> {
		// The user can answer the saved-login card after the saved login was deleted. The answer
		// still opens the session, without a saved login.
		let hostConfirmation = confirmation;
		if (isSavedLoginDecision(confirmation)) hostConfirmation = 'allowOnce';

		const resources = this.getAffectedResourcesForStartSessionTool(host);
		const result = await this.gateAccess(resources, hostConfirmation);
		if (result) return { isAllowed: false, result };
		return { isAllowed: true };
	}

	/**
	 * Checks a new session on a host where the user has a saved login. The user chooses on a card
	 * whether the session uses it. The answer is kept for the host for the rest of the task, so a
	 * later session on the host does not ask again.
	 */
	private gateStartSessionWithSavedLogin(
		host: string,
		savedLogin: { domain: string; savedAt: Date },
		confirmation: unknown,
	): StartSessionAccess {
		// The answer from the card, or else the answer from earlier in the task.
		let decision = confirmation;
		if (decision === undefined) decision = this.savedLoginDecisions.get(host);

		const [resource] = this.getAffectedResourcesForStartSessionTool(host);
		const result = gateSavedLoginAccess(this.domainGate, resource, savedLogin, decision);
		if (result) return { isAllowed: false, result };

		// The gate opens the session only with a saved-login answer. This check narrows the type.
		if (!isSavedLoginDecision(decision)) return { isAllowed: true };
		this.savedLoginDecisions.set(host, decision);
		return { isAllowed: true, savedLoginDecision: decision };
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
			if (this.isHostAllowedForTask(resource)) continue;

			const result = await gateBrowserAccess(domainGate, resource, answer);
			answer = undefined;
			if (result) return result;
		}
		return undefined;
	}

	/**
	 * Whether the user answered the saved-login card for this host in this task. Opening the host
	 * was part of that answer, so the browser tools on the host do not ask again. Unlike a run
	 * approval, it lasts for the whole task. An admin block still applies.
	 */
	private isHostAllowedForTask(resource: AffectedResource): boolean {
		if (resource.kind !== 'host') return false;
		if (this.domainGate.permissionMode === 'blocked') return false;
		return this.savedLoginDecisions.has(resource.resource);
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
		await this.withSessionLock(async () => await this.releaseSessionAndLoginProfile(session));
		return undefined;
	}

	/** Creates a session with the login profile and connects the browser tools to it. */
	private async openSession(
		loginProfile: CloudBrowserLoginProfile | undefined,
		requestedLocation: Partial<CloudBrowserSessionLocation>,
	): Promise<ActiveSession> {
		const { scope, sessionProvider, createToolkit, logger } = this.options;
		// A saved login must open where it was saved, regardless of what the agent asked for.
		const locationToOpen = loginProfile?.savedLocation ?? requestedLocation;
		let createdSession: CloudBrowserSession;
		try {
			createdSession = await sessionProvider.createSession(scope, {
				...locationToOpen,
				loginProfileId: loginProfile?.id,
			});
		} catch (error) {
			logger.warn('Failed to create a cloud browser session', {
				taskId: scope.taskId,
				usesSavedLogin: !!loginProfile?.savedAt,
				regionId: locationToOpen.regionId,
				proxyCountry: locationToOpen.proxyCountry,
				...safeErrorDetails(error),
			});
			// Session creation failed, so the login profile is not used and can be deleted.
			// Unless it is an existing saved login, in which case we do nothing.
			if (!loginProfile?.savedAt) await this.deleteLoginProfile(loginProfile);
			throw error;
		}
		const { id, connectUrl, regionCountry, regionId } = createdSession;
		const location: SessionLocation = {
			regionId,
			regionCountry,
			proxyCountry: locationToOpen.proxyCountry,
			proxyCity: locationToOpen.proxyCity,
		};

		let toolkit: BrowserToolkit;
		try {
			toolkit = createToolkit(connectUrl);
			await toolkit.connection.connect();
		} catch (error) {
			logger.warn('Failed to connect to a cloud browser session', {
				taskId: scope.taskId,
				sessionId: id,
				usesSavedLogin: !!loginProfile?.savedAt,
				...safeErrorDetails(error),
			});
			await this.releaseSessionById(id);
			// The tools could not connect, so the login profile is not used and can be deleted.
			// Unless it is an existing saved login, in which case we do nothing.
			if (!loginProfile?.savedAt) await this.deleteLoginProfile(loginProfile);
			throw error;
		}

		logger.info('Cloud browser session started', { taskId: scope.taskId, sessionId: id });
		const { adapter, activePageId } = toolkit.connection.getConnection();
		const session: ActiveSession = {
			id,
			location,
			...(loginProfile && { loginProfile }),
			connection: toolkit.connection,
			toolsByName: new Map(this.getAvailableToolsFromToolkit(toolkit).map((t) => [t.name, t])),
			windows: activePageId ? [activePageId] : [],
			windowSeenByAgent: activePageId || undefined,
			runningBrowserTools: 0,
			hasVisitedOnlySite: adapter.hasVisitedOnlySite?.bind(adapter),
		};
		adapter.onPageChange = (change) => this.onPageChange(session, change);
		// The connection uses this hook to clear its own state, so ours runs after it.
		const onDisconnect = adapter.onDisconnect;
		adapter.onDisconnect = (reason, details) => {
			onDisconnect?.(reason, details);
			void this.onConnectionLost(session);
		};
		return session;
	}

	/**
	 * The user's saved login for the site of `host`. Returns nothing without login profiles, or when
	 * the host has no registrable domain, for example an IP address.
	 */
	private async findSavedLoginProfileForHost(
		host: string,
	): Promise<CloudBrowserLoginProfile | undefined> {
		if (!this.options.enableLoginProfiles) return undefined;
		const domain = await registrableDomainOf(host);
		if (!domain) return undefined;
		return await this.findSavedLoginProfileForDomain(domain);
	}

	/**
	 * The login profile for a new session on `host`: the saved login when the user chose to use it,
	 * or else a new login profile. Returns nothing without login profiles, when the host has no
	 * registrable domain, or when no login profile could be created. The session then opens without
	 * one: a failure here must not stop the task from browsing.
	 */
	private async chooseLoginProfile(
		host: string,
		savedLoginProfile: CloudBrowserLoginProfile | undefined,
		savedLoginDecision: SavedLoginDecision | undefined,
	): Promise<CloudBrowserLoginProfile | undefined> {
		if (!this.options.enableLoginProfiles) return undefined;
		if (savedLoginProfile && savedLoginDecision === 'allowWithSavedLogin') {
			return savedLoginProfile;
		}
		const domain = await registrableDomainOf(host);
		if (!domain) return undefined;
		return await this.createLoginProfile(domain);
	}

	/**
	 * The user's most recently used saved login for `domain`. A failed lookup is only logged, so the
	 * session opens with a new login profile instead.
	 */
	private async findSavedLoginProfileForDomain(
		domain: string,
	): Promise<CloudBrowserLoginProfile | undefined> {
		const { scope, sessionProvider, logger } = this.options;
		try {
			const [savedLoginProfile] = await sessionProvider.listSavedLoginProfiles(scope, domain);
			return savedLoginProfile;
		} catch (error) {
			logger.warn('Failed to find a saved cloud browser login, opening the session without one', {
				taskId: scope.taskId,
				...safeErrorDetails(error),
			});
			return undefined;
		}
	}

	/** A new login profile for `domain`. Returns nothing when it could not be created. */
	private async createLoginProfile(domain: string): Promise<CloudBrowserLoginProfile | undefined> {
		const { scope, sessionProvider, logger } = this.options;
		try {
			const id = await sessionProvider.createLoginProfile(scope);
			return { id, domain };
		} catch (error) {
			logger.warn(
				'Failed to create a login profile, opening the cloud browser session without one',
				{
					taskId: scope.taskId,
					...safeErrorDetails(error),
				},
			);
			return undefined;
		}
	}

	/**
	 * Releases a session whose connection dropped, for example when Browserbase ended it, and ends a
	 * wait for the user with the reason. Without this, an agent that waits for the user would wait
	 * until the user-control timeout, since no tool call comes to notice the drop.
	 */
	private async onConnectionLost(session: ActiveSession): Promise<void> {
		// A session we closed ourselves, for example on an idle timeout, already has its reason.
		if (session !== this.activeSession) return;

		const { scope, logger } = this.options;
		logger.warn('Cloud browser session lost', { taskId: scope.taskId, sessionId: session.id });
		this.activeSession = undefined;
		this.sessionUnavailableReason = 'connectionLost';
		this.clearIdleTimer();
		this.endUserControl({ returned: false, error: SESSION_UNAVAILABLE_MESSAGES.connectionLost });
		// Under the lock, so a new session cannot open on a saved login that this release deletes.
		await this.withSessionLock(async () => await this.releaseSessionAndLoginProfile(session));
	}

	/** Releases the active session, if one is open. */
	private async endActiveSession(): Promise<void> {
		this.clearIdleTimer();
		const session = this.activeSession;
		if (!session) return;
		this.activeSession = undefined;
		await this.releaseSessionAndLoginProfile(session);
	}

	/**
	 * Disconnects the tools from a session and releases it. Then saves its login profile, or else
	 * deletes it. A failure is only logged, since nothing more can be done about it here.
	 */
	private async releaseSessionAndLoginProfile(session: ActiveSession): Promise<void> {
		const { id: sessionId, location, loginProfile } = session;

		const shouldKeepLoginProfile = await this.shouldKeepLoginProfile(session);

		await session.connection.disconnect();
		await this.releaseSessionById(sessionId);

		let isLoginKept = false;
		if (shouldKeepLoginProfile && loginProfile) {
			isLoginKept = await this.keepLoginProfile(loginProfile, location);
		}

		let isLoginDeleted = false;
		if (!isLoginKept) {
			isLoginDeleted = await this.deleteLoginProfile(loginProfile);
		}

		const status = this.loginSaveStatusOf(session, isLoginKept, isLoginDeleted);
		if (loginProfile && status) this.loginSaveResults.set(loginProfile.domain, status);
	}

	/** What to tell the user about the login of a session that ended, or nothing. */
	private loginSaveStatusOf(
		session: ActiveSession,
		isLoginKept: boolean,
		isLoginDeleted: boolean,
	): CloudBrowserLoginSaveStatus | undefined {
		const { loginProfile } = session;
		if (!loginProfile) return undefined;
		if (session.saveLoginProfileOnSessionEnd) {
			// A login that was saved earlier in the task still exists, so a failed save later does not change that.
			const existingStatus = this.loginSaveResults.get(loginProfile.domain);
			if (existingStatus === 'saved') return 'saved';
			return isLoginKept ? 'saved' : 'notSaved';
		}
		// A saved login that the session used, and that was deleted because it could not be kept, for
		// example after a drop.
		if (loginProfile.savedAt && isLoginDeleted) return 'removed';
		return undefined;
	}

	/** Releases a session with the provider. A failure is only logged. */
	private async releaseSessionById(sessionId: string): Promise<void> {
		const { scope, sessionProvider, logger } = this.options;
		try {
			await sessionProvider.releaseSession(scope, sessionId);
		} catch (error) {
			logger.warn('Failed to release cloud browser session', {
				taskId: scope.taskId,
				sessionId,
				...safeErrorDetails(error),
			});
		}
	}

	/**
	 * Whether to keep the login profile when its session ends: a saved login the session used, or a
	 * login the user chose to save. The login profile keeps the browser state of its session, so the
	 * other sites are cleared from it first. After a drop they cannot be cleared, so it is kept only
	 * when the session loaded no page or frame of another site. Otherwise it is deleted, also an
	 * existing saved login, because it may now hold the data of other sites.
	 */
	private async shouldKeepLoginProfile(session: ActiveSession): Promise<boolean> {
		const { loginProfile } = session;
		if (!loginProfile) return false;
		if (!loginProfile.savedAt && !session.saveLoginProfileOnSessionEnd) return false;
		// The other sites cannot be cleared after a drop, so keep it only when no other site was loaded.
		if (!session.connection.isConnected) {
			return session.hasVisitedOnlySite?.(loginProfile.domain) ?? false;
		}
		return await this.clearOtherSiteData(session, loginProfile);
	}

	/** Deletes the data of every site except the login profile's. Returns whether it did. */
	private async clearOtherSiteData(
		session: ActiveSession,
		loginProfile: CloudBrowserLoginProfile,
	): Promise<boolean> {
		const { scope, logger } = this.options;
		const adapter = adapterOf(session);
		if (!adapter?.clearSiteDataExcept) return false;
		try {
			await adapter.clearSiteDataExcept(loginProfile.domain);
			return true;
		} catch (error) {
			logger.warn('Failed to clear other sites from a cloud browser login', {
				taskId: scope.taskId,
				...safeErrorDetails(error),
			});
			return false;
		}
	}

	/**
	 * Keeps a login profile after its session ended. A saved login is already kept: the session
	 * provider wrote the cleared browser state into it when the session was released. Any other
	 * login profile is saved. Returns whether it is kept.
	 */
	private async keepLoginProfile(
		loginProfile: CloudBrowserLoginProfile,
		location: SessionLocation,
	): Promise<boolean> {
		if (loginProfile.savedAt) return true;
		return await this.saveLoginProfile(loginProfile, location);
	}

	/** Saves a login profile after its session ended. Returns whether it did. */
	private async saveLoginProfile(
		loginProfile: CloudBrowserLoginProfile,
		{ regionId, proxyCountry, proxyCity }: SessionLocation,
	): Promise<boolean> {
		const { scope, sessionProvider, logger } = this.options;
		try {
			await sessionProvider.saveLoginProfile(scope, {
				id: loginProfile.id,
				domain: loginProfile.domain,
				location: { regionId, proxyCountry, proxyCity },
			});
		} catch (error) {
			logger.warn('Failed to save a cloud browser login', {
				taskId: scope.taskId,
				...safeErrorDetails(error),
			});
			return false;
		}
		// Only after the save worked, so a failed save never loses the old login.
		await this.deleteOtherSavedLogins(loginProfile);
		return true;
	}

	/**
	 * Deletes the user's other saved logins for the site of a login that was just saved, so that the
	 * user has one saved login for each site. A failure is only logged: the new login is saved.
	 */
	private async deleteOtherSavedLogins(savedLoginProfile: CloudBrowserLoginProfile): Promise<void> {
		const { scope, sessionProvider, logger } = this.options;
		let savedLoginProfiles: CloudBrowserLoginProfile[];
		try {
			savedLoginProfiles = await sessionProvider.listSavedLoginProfiles(
				scope,
				savedLoginProfile.domain,
			);
		} catch (error) {
			logger.warn('Failed to list the other saved cloud browser logins for a site', {
				taskId: scope.taskId,
				...safeErrorDetails(error),
			});
			return;
		}
		const otherLoginProfiles = savedLoginProfiles.filter(({ id }) => id !== savedLoginProfile.id);
		// Each delete logs its own failure and does not throw, so this waits for all of them.
		await Promise.all(
			otherLoginProfiles.map(async (loginProfile) => await this.deleteLoginProfile(loginProfile)),
		);
	}

	/**
	 * Deletes a login profile. Returns whether it did. The gateway deletes an unsaved one a few hours
	 * after its last use in any case, so a failure is only logged.
	 */
	private async deleteLoginProfile(loginProfile?: CloudBrowserLoginProfile): Promise<boolean> {
		if (!loginProfile) return false;
		const { scope, sessionProvider, logger } = this.options;
		try {
			await sessionProvider.deleteLoginProfile(scope, loginProfile.id);
			return true;
		} catch (error) {
			logger.warn('Failed to delete a cloud browser login profile', {
				taskId: scope.taskId,
				isSaved: !!loginProfile.savedAt,
				...safeErrorDetails(error),
			});
			return false;
		}
	}

	private scheduleIdleRelease(): void {
		this.clearIdleTimer();
		if (!this.activeSession || this.pendingCalls > 0) return;

		this.idleTimer = setTimeout(
			async () => await this.releaseIdleSession(),
			this.userControl ? USER_CONTROL_TIMEOUT_MS : SESSION_IDLE_TIMEOUT_MS,
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
			const reason = this.userControl ? 'userControlTimeout' : 'idleTimeout';
			await this.endActiveSession();
			this.sessionUnavailableReason = reason;
			this.endUserControl({ returned: false, error: SESSION_UNAVAILABLE_MESSAGES[reason] });
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

/**
 * Adds what the agent needs to know about a new session to a successful result:
 * - `browserLocation.regionCountry` and `browserLocation.proxyCountry`: where sites see the browser.
 * - `savedLoginProfile.domain`: set when the session uses the user's saved login for the site. The
 *   agent never learns which logins exist, only that this session uses one.
 * The model reads structuredContent when there is one, so they go there.
 */
function withSessionContext(result: McpToolCallResult, session: ActiveSession): McpToolCallResult {
	if (result.isError || !result.structuredContent) return result;

	const { regionCountry, proxyCountry } = session.location;
	const browserLocation = {
		...(regionCountry && { regionCountry }),
		...(proxyCountry && { proxyCountry }),
	};
	const savedLoginProfile = session.loginProfile?.savedAt && {
		domain: session.loginProfile.domain,
	};
	// First, so they stay visible when a large page result is cut down for the model.
	return {
		...result,
		structuredContent: {
			...((regionCountry || proxyCountry) && { browserLocation }),
			...(savedLoginProfile && { savedLoginProfile }),
			...result.structuredContent,
		},
	};
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

/** The host of the current window, or nothing when the connection is gone or it has none. */
function currentHostOf(session: ActiveSession): string | undefined {
	return hostOfWindow(session, session.windows.at(-1));
}

/**
 * The registrable domain of a host, for example "linkedin.com" for "accounts.linkedin.com".
 * Nothing for an IP address or a host without one, such as "localhost".
 */
async function registrableDomainOf(host: string | undefined): Promise<string | undefined> {
	if (!host || isIP(host)) return undefined;
	const { get: getRegistrableDomain } = await import('psl');
	return getRegistrableDomain(host) ?? undefined;
}

/**
 * The details of an error that are safe to log: its class, and for a failed gateway request the
 * status code and the gateway's own error type and message. Any other message is never logged: a
 * browser error can contain the session's connect URL, which holds a signing key, or the sites
 * the user visited, and an upstream message can contain IDs.
 */
function safeErrorDetails(error: unknown): {
	errorName: string;
	statusCode?: number;
	gatewayErrorType?: string;
	gatewayErrorMessage?: string;
} {
	const { extra } = error instanceof BaseError ? error : {};
	return {
		errorName: ensureError(error).name,
		...(typeof extra?.statusCode === 'number' && { statusCode: extra.statusCode }),
		...(typeof extra?.gatewayErrorType === 'string' && {
			gatewayErrorType: extra.gatewayErrorType,
		}),
		...(typeof extra?.gatewayErrorMessage === 'string' && {
			gatewayErrorMessage: extra.gatewayErrorMessage,
		}),
	};
}
