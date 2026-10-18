import type { McpTool, McpToolCallRequest, McpToolCallResult } from '@n8n/api-types';
import { mcpToolSchema } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { LocalMcpServer } from '@n8n/instance-ai';
import type {
	AffectedResource,
	BrowserToolkit,
	ToolContext,
	ToolDefinition,
} from '@n8n/mcp-browser';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { z } from 'zod';

import { browserErrorResult, executeBrowserTool, toBrowserMcpTool } from './browser.helpers';
import type {
	CloudBrowserSessionScope,
	CloudBrowserSessionProvider,
} from './cloud-browser-session-provider';

/** Toolkit tools the model never gets in the cloud browser. */
const HIDDEN_BROWSER_TOOLS = new Set([
	// The server connects and disconnects the browser itself.
	'browser_connect',
	'browser_disconnect',
	// The session holds the user's sign-ins, so the model must not read or change them.
	'browser_cookies',
	'browser_storage',
	// Runs any script in the page, which can read the same sign-in data.
	'browser_evaluate',
	// Takes file paths on the n8n host.
	'browser_upload',
]);

export const START_SESSION_TOOL_NAME = 'browser_start_session';

/**
 * A session with no tool call for this long is released, so a job that stalls or waits
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
		'To go to a different URL in the current session, use browser_navigate or browser_tab_open.',
	inputSchema: {
		type: 'object',
		properties: { url: { type: 'string', description: 'Full URL to open' } },
		required: ['url'],
	},
	annotations: { category: 'browser' },
});

/**
 * Why browser tools cannot run: no session was started (or the job released it), or
 * the session ended without the model asking for it.
 */
type SessionUnavailableReason = 'notStarted' | 'connectionLost' | 'idleTimeout';

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
	logger: Logger;
}

interface ActiveSession {
	id: string;
	connection: BrowserToolkit['connection'];
	toolsByName: Map<string, ToolDefinition>;
}

/** Browser tools on a Browserbase session, for one background job. */
export class CloudBrowserLocalMcpServer implements LocalMcpServer {
	private readonly toolList: McpTool[] = [START_SESSION_MCP_TOOL];

	private activeSession?: ActiveSession;

	private sessionUnavailableReason: SessionUnavailableReason = 'notStarted';

	private idleTimer?: NodeJS.Timeout;

	/** Tool calls that have not returned yet. The idle timer runs only when this is zero. */
	private pendingCalls = 0;

	/**
	 * Session starts and releases hold this lock, so they run one at a time and two
	 * starts cannot both open a session and leak one. Action tools do not wait for it.
	 */
	private sessionLock: Promise<unknown> = Promise.resolve();

	constructor(private readonly options: CloudBrowserLocalMcpServerOptions) {
		const toolkit = options.createToolkit();
		for (const tool of this.getAvailableToolsFromToolkit(toolkit)) {
			const mcpTool = toBrowserMcpTool(tool);
			if (mcpTool) this.toolList.push(mcpTool);
		}
	}

	getAvailableTools(): McpTool[] {
		return this.toolList;
	}

	getToolsByCategory(category: string): McpTool[] {
		return category === 'browser' ? this.toolList : [];
	}

	async callTool(req: McpToolCallRequest): Promise<McpToolCallResult> {
		this.clearIdleTimer();
		this.pendingCalls++;
		try {
			if (req.name === START_SESSION_TOOL_NAME) {
				return await this.startSession(req.arguments);
			}
			return await this.executeBrowserTool(req.name, req.arguments);
		} finally {
			this.pendingCalls--;
			this.scheduleIdleRelease();
		}
	}

	/**
	 * Returns the sites and credentials that a call would touch, without running it, so the
	 * caller can ask the user for approval first. Returns an empty list when the call touches none.
	 */
	async getAffectedResources(req: McpToolCallRequest): Promise<AffectedResource[]> {
		if (req.name === START_SESSION_TOOL_NAME) {
			return this.getAffectedResourcesForStartSessionTool(req.arguments);
		}

		const tool = this.activeSession?.toolsByName.get(req.name);
		if (!tool) return [];

		// Arguments that do not parse make the call itself fail, so it touches nothing.
		const args = tool.inputSchema.safeParse(req.arguments);
		if (!args.success) return [];

		const resources = await tool.getAffectedResources(args.data, this.options.toolContext);
		return resources.filter((resource) => !isEmptyBrowserResource(resource));
	}

	/** A new session only loads its URL, so it touches the URL's host. A URL with no host touches none. */
	private getAffectedResourcesForStartSessionTool(
		rawArgs: Record<string, unknown>,
	): AffectedResource[] {
		const args = startSessionArgsSchema.safeParse(rawArgs);
		if (!args.success) return [];

		const host = new URL(args.data.url).hostname;
		if (!host) return [];
		return [
			{
				toolGroup: 'browser',
				kind: 'host',
				resource: host,
				description: `Browser: ${host}`,
			},
		];
	}

	/** Ends the job's browser session, if one is open. */
	async release(): Promise<void> {
		await this.withSessionLock(async () => await this.endActiveSession());
	}

	private async startSession(rawArgs: Record<string, unknown>): Promise<McpToolCallResult> {
		const args = startSessionArgsSchema.safeParse(rawArgs);
		if (!args.success) {
			return browserErrorResult('browser_start_session needs a URL.');
		}

		return await this.withSessionLock(async () => {
			// we should only have one active session at a time, so close any existing one first
			await this.endActiveSession();
			this.sessionUnavailableReason = 'notStarted';

			let session: ActiveSession;
			try {
				session = await this.openSession();
			} catch (error) {
				return browserErrorResult(
					`Could not open a browser session: ${ensureError(error).message}`,
				);
			}
			this.activeSession = session;

			return await this.executeBrowserTool('browser_navigate', { url: args.data.url });
		});
	}

	/** Runs one of the toolkit's tools on the active session. */
	private async executeBrowserTool(
		toolName: string,
		args: Record<string, unknown>,
	): Promise<McpToolCallResult> {
		const session = await this.getConnectedSession();
		if (!session) {
			return browserErrorResult(SESSION_UNAVAILABLE_MESSAGES[this.sessionUnavailableReason]);
		}

		const tool = session.toolsByName.get(toolName);
		if (!tool) {
			return browserErrorResult(`Unknown browser tool: ${toolName}`);
		}

		return await executeBrowserTool(tool, args, this.options.toolContext);
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
		logger.warn('Cloud browser session lost', { jobId: scope.jobId, sessionId: session.id });
		this.activeSession = undefined;
		this.sessionUnavailableReason = 'connectionLost';
		await this.releaseSession(session.id);
		return undefined;
	}

	/** Creates a session and connects the browser tools to it. */
	private async openSession(): Promise<ActiveSession> {
		const { scope, sessionProvider, createToolkit, logger } = this.options;
		const { id, connectUrl } = await sessionProvider.createSession(scope);

		const toolkit = createToolkit(connectUrl);
		try {
			await toolkit.connection.connect();
		} catch (error) {
			await this.releaseSession(id);
			throw error;
		}

		logger.info('Cloud browser session started', { jobId: scope.jobId, sessionId: id });
		return {
			id,
			connection: toolkit.connection,
			toolsByName: new Map(this.getAvailableToolsFromToolkit(toolkit).map((t) => [t.name, t])),
		};
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
				jobId: scope.jobId,
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
			jobId: scope.jobId,
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
		return toolkit.tools.filter((t) => !HIDDEN_BROWSER_TOOLS.has(t.name));
	}
}

/**
 * The toolkit reports a page with no host, such as `about:blank`, as the host 'browser'.
 * That is not a real site, so the caller must not ask the user to approve it.
 */
function isEmptyBrowserResource(resource: AffectedResource): boolean {
	return resource.kind === 'host' && resource.resource === 'browser';
}
