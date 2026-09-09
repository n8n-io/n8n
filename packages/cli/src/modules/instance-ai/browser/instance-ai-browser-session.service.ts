import type {
	BrowserRecording,
	BrowserRecordingAction,
	BrowserRecordingScreenshot,
	InstanceAiBrowserCreateLinkResponse,
	InstanceAiBrowserStatusResponse,
	ToolCategory,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { ProjectRepository, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { BrowserExtensionTraceContext } from '@n8n/instance-ai';
import type {
	BrowserConnection,
	CDPRelayServer,
	CreateCredentialPayload,
	SecretsBuffer,
	ToolContext,
} from '@n8n/mcp-browser';
import { redactString } from '@n8n/mcp-browser';
import { UnexpectedError } from 'n8n-workflow';
import { nanoid } from 'nanoid';
import { timingSafeEqual } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CredentialsService } from '@/credentials/credentials.service';
import { Push } from '@/push';
import { UrlService } from '@/services/url.service';
import { Telemetry } from '@/telemetry';

import { BrowserLocalMcpServer } from './browser-local-mcp-server';
import {
	BROWSER_USE_WS_NAMESPACE,
	CDP_TOKEN_HEADER,
	EXTENSION_VERSION_QUERY_PARAM,
	parseExtensionVersion,
	type BrowserUseUpgradeRequest,
} from './browser-use-ws.constants';

const CONNECT_TOKEN_TTL_MS = 5 * 60 * 1000;

const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/** How often to summarize actions accumulated so far, while a recording is in progress. */
const CAPTION_INTERVAL_MS = 12_000;

/** Coalesces a burst of streamed actions (e.g. fast clicking) into one live push,
 *  instead of one push per action. */
const ACTION_PUSH_DEBOUNCE_MS = 300;

interface BrowserSession {
	userId: string;
	sessionId: string;
	relay: CDPRelayServer;
	relayAuthToken: string;
	cdpToken: string;
	tokenCreatedAt: number;
	hasConnectedOnce: boolean;
	connected: boolean;
	connectedAt: Date | null;
	extensionVersion: string | null;
	connection: BrowserConnection;
	mcpServer: BrowserLocalMcpServer;
	completedRecordingIds: Set<string>;
	/** Thread that asked Instance AI to start this recording, if any — set by `startRecording()`,
	 *  consumed (and cleared) the moment the recording completes. */
	pendingRecordingThreadId?: string;
	/** Total actions streamed in for the in-progress recording — reset on start,
	 *  cleared once the recording completes or is discarded. */
	inProgressActionCount: number;
	/** Redacted actions accumulated since the last caption tick, fed to the next one. */
	pendingCaptionActions: BrowserRecordingAction[];
	/** Latest running summary produced from `pendingCaptionActions`, consumed at completion. */
	latestCaption?: string;
	captionInterval?: ReturnType<typeof setInterval>;
	/** Pending debounced live-state push, see `ACTION_PUSH_DEBOUNCE_MS`. */
	pushDebounceTimer?: ReturnType<typeof setTimeout>;
}

interface BrowserRecordingCompletion {
	userId: string;
	projectId: string;
	recording: BrowserRecording;
	/** The thread that triggered this recording, so completion can resume it instead of
	 *  opening a new thread. Absent for recordings started manually from the extension. */
	originThreadId?: string;
	/** The latest running summary generated while the recording was in progress, if any —
	 *  a head start for the recap, not shown anywhere in the UI. */
	caption?: string;
}

interface BrowserRecordingCompletionResult {
	threadId: string;
}

@Service()
export class InstanceAiBrowserSessionService {
	private readonly sessions = new Map<string, BrowserSession>();

	private readonly sessionsBySessionId = new Map<string, BrowserSession>();

	private readonly logger: Logger;

	private recordingCompletionHandler?: (
		input: BrowserRecordingCompletion,
	) => Promise<BrowserRecordingCompletionResult>;

	/** Summarizes actions accumulated since the last tick, into one running caption.
	 *  Set from instance-ai.service.ts, which has the model resolution this needs. */
	private actionCaptionHandler?: (input: {
		userId: string;
		actions: BrowserRecordingAction[];
	}) => Promise<string | undefined>;

	constructor(
		logger: Logger,
		private readonly urlService: UrlService,
		private readonly push: Push,
		private readonly userRepository: UserRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly credentialsService: CredentialsService,
		private readonly globalConfig: GlobalConfig,
		private readonly telemetry: Telemetry,
	) {
		this.logger = logger.scoped('instance-ai');
	}

	setRecordingCompletionHandler(
		handler: (input: BrowserRecordingCompletion) => Promise<BrowserRecordingCompletionResult>,
	): void {
		this.recordingCompletionHandler = handler;
	}

	setActionCaptionHandler(
		handler: (input: {
			userId: string;
			actions: BrowserRecordingAction[];
		}) => Promise<string | undefined>,
	): void {
		this.actionCaptionHandler = handler;
	}

	async createLink(userId: string): Promise<InstanceAiBrowserCreateLinkResponse> {
		const session = this.sessions.get(userId) ?? (await this.createSession(userId));

		session.relayAuthToken = `bu_${nanoid(32)}`;
		session.tokenCreatedAt = Date.now();

		const { buildExtensionConnectUrl } = await import('@n8n/mcp-browser');
		const relayEndpoint = this.buildExtensionEndpoint(session);
		const connectUrl = buildExtensionConnectUrl(relayEndpoint);
		const expiresAt = new Date(session.tokenCreatedAt + CONNECT_TOKEN_TTL_MS);

		return {
			connectUrl,
			expiresAt: expiresAt.toISOString(),
			ttlSeconds: Math.ceil(CONNECT_TOKEN_TTL_MS / 1000),
		};
	}

	getStatus(userId: string): InstanceAiBrowserStatusResponse {
		const session = this.sessions.get(userId);
		return {
			connected: session?.connected ?? false,
			connectedAt: session?.connectedAt?.toISOString() ?? null,
			toolCategories: this.getToolCategories(userId),
		};
	}

	async disconnect(userId: string): Promise<void> {
		const session = this.sessions.get(userId);
		if (!session) return;
		this.sessions.delete(userId);
		this.sessionsBySessionId.delete(session.sessionId);
		await this.teardownSession(session);
		this.pushState(userId);
	}

	findMcpServer(userId: string): BrowserLocalMcpServer | undefined {
		const session = this.sessions.get(userId);
		return session?.connected ? session.mcpServer : undefined;
	}

	/** Ask the paired extension to start recording, on behalf of the given thread, and wait
	 *  for it to confirm. Only arms the live state once the extension actually agreed —
	 *  otherwise the model and the live artifact would believe a recording is running that
	 *  never started. */
	async startRecording(
		userId: string,
		threadId: string,
	): Promise<{ started: boolean; reason?: string }> {
		const session = this.sessions.get(userId);
		if (!session?.connected) {
			return { started: false, reason: 'The browser extension is not connected.' };
		}
		const result = await this.callRelay(session.relay.startRecording(), 'start');
		if (!result.success) {
			this.logger.warn('Failed to start browser recording', { userId, error: result.error });
			return { started: false, reason: result.error };
		}
		session.pendingRecordingThreadId = threadId;
		this.startLiveRecordingState(session);
		return { started: true };
	}

	/** Ask the paired extension to stop the active recording and submit it immediately, and
	 *  wait for it to confirm — a stop can fail (e.g. nothing was recorded yet), and the
	 *  caller needs to know rather than assume the recording is on its way. */
	async stopAndSubmitRecording(userId: string): Promise<{ stopped: boolean; reason?: string }> {
		const session = this.sessions.get(userId);
		if (!session?.connected) {
			return { stopped: false, reason: 'The browser extension is not connected.' };
		}
		const result = await this.callRelay(session.relay.stopAndSubmitRecording(), 'stop');
		if (!result.success) {
			this.logger.warn('Failed to stop browser recording', { userId, error: result.error });
		}
		return { stopped: result.success, reason: result.error };
	}

	/** Await a relay call that reports `{success, error}`, folding a rejected promise (e.g. the
	 *  extension disconnecting mid-call) into the same shape instead of throwing. */
	private async callRelay(
		promise: Promise<{ success: boolean; error?: string }>,
		action: 'start' | 'stop',
	): Promise<{ success: boolean; error?: string }> {
		try {
			return await promise;
		} catch (error) {
			return {
				success: false,
				error: `The browser extension disconnected before it could ${action}.`,
			};
		}
	}

	/** Ask the paired extension to discard the active recording, directly — no thread
	 *  message, no analysis. Returns false if there's no paired session or recording to discard. */
	discardRecording(userId: string): boolean {
		const session = this.sessions.get(userId);
		if (!session?.connected || !session.pendingRecordingThreadId) return false;
		this.pushRecordingState(session, 'discarded');
		this.resetLiveRecordingState(session);
		session.pendingRecordingThreadId = undefined;
		session.relay.discardRecording().catch((error) => {
			this.logger.warn('Failed to discard browser recording', {
				userId,
				error: error instanceof Error ? error.message : String(error),
			});
		});
		return true;
	}

	isConnected(userId: string): boolean {
		return this.sessions.get(userId)?.connected ?? false;
	}

	getExtensionTraceContext(userId: string): BrowserExtensionTraceContext {
		const session = this.sessions.get(userId);
		if (!session?.connected) return { connectionState: 'disconnected' };
		return {
			connectionState: 'connected',
			...(session.extensionVersion !== null ? { version: session.extensionVersion } : {}),
		};
	}

	handleExtensionUpgrade(req: BrowserUseUpgradeRequest): void {
		const session = this.sessionsBySessionId.get(req.params.sessionId);
		const token = typeof req.query.token === 'string' ? req.query.token : null;
		if (!session || !this.isExtensionTokenValid(session, token)) {
			req.ws.close(4003, 'Invalid auth token');
			return;
		}
		session.extensionVersion = parseExtensionVersion(req.query[EXTENSION_VERSION_QUERY_PARAM]);
		session.relay.attachExtension(req.ws);
	}

	handleCdpUpgrade(req: BrowserUseUpgradeRequest): void {
		const session = this.sessionsBySessionId.get(req.params.sessionId);
		const header = req.headers[CDP_TOKEN_HEADER];
		const token = typeof header === 'string' ? header : null;
		if (
			!session ||
			!LOOPBACK_ADDRESSES.has(req.socket.remoteAddress ?? '') ||
			!this.tokensMatch(session.cdpToken, token)
		) {
			req.ws.close(4003, 'Invalid auth token');
			return;
		}
		session.relay.attachController(req.ws);
	}

	async shutdown(): Promise<void> {
		const sessions = [...this.sessions.values()];
		this.sessions.clear();
		this.sessionsBySessionId.clear();
		for (const session of sessions) {
			await this.teardownSession(session);
		}
	}

	private async createSession(userId: string): Promise<BrowserSession> {
		const { CDPRelayServer, createBrowserTools } = await import('@n8n/mcp-browser');

		const sessionId = nanoid();
		const cdpToken = `cdp_${nanoid(32)}`;

		const relay = new CDPRelayServer({ noServer: true });
		relay.onExtensionConnect = () => this.handleExtensionConnected(userId);
		relay.onExtensionDisconnect = () => this.handleExtensionDisconnected(userId);
		relay.onRecordingCompleted = async (recording) =>
			await this.handleRecordingCompleted(userId, recording);
		relay.onRecordingActionAppended = (_recordingId, action) =>
			this.handleRecordingActionAppended(userId, action);
		relay.onRecordingScreenshotCaptured = (_recordingId, screenshot) =>
			this.handleRecordingScreenshotCaptured(userId, screenshot);

		const toolkit = createBrowserTools(
			{ mode: 'remote' },
			{
				relay,
				cdpEndpoint: this.buildCdpEndpoint(sessionId),
				cdpConnectHeaders: { [CDP_TOKEN_HEADER]: cdpToken },
			},
		);
		const workDir = join(tmpdir(), 'n8n-instance-ai-browser', userId);
		await mkdir(workDir, { recursive: true });
		const toolContext: ToolContext = {
			dir: workDir,
			secretsBuffer: createInMemorySecretsBuffer(),
			createCredential: async (payload: CreateCredentialPayload) =>
				await this.createCredential(userId, payload),
		};

		const session: BrowserSession = {
			userId,
			sessionId,
			relay,
			relayAuthToken: `bu_${nanoid(32)}`,
			cdpToken,
			tokenCreatedAt: Date.now(),
			hasConnectedOnce: false,
			connected: false,
			connectedAt: null,
			extensionVersion: null,
			connection: toolkit.connection,
			mcpServer: new BrowserLocalMcpServer(toolkit, toolContext, this.logger),
			completedRecordingIds: new Set(),
			inProgressActionCount: 0,
			pendingCaptionActions: [],
		};
		this.sessions.set(userId, session);
		this.sessionsBySessionId.set(sessionId, session);
		return session;
	}

	private async teardownSession(session: BrowserSession): Promise<void> {
		try {
			await session.connection.shutdown();
		} catch (error) {
			this.logger.warn('Failed to shut down browser connection', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
		session.relay.stop();
		session.connected = false;
		session.connectedAt = null;
		session.completedRecordingIds.clear();
		session.pendingRecordingThreadId = undefined;
		this.resetLiveRecordingState(session);
	}

	private async handleRecordingCompleted(
		userId: string,
		recording: BrowserRecording,
	): Promise<{ threadUrl?: string }> {
		const session = this.sessions.get(userId);
		const handler = this.recordingCompletionHandler;
		if (!session || !handler || session.completedRecordingIds.has(recording.id)) return {};

		session.completedRecordingIds.add(recording.id);
		const originThreadId = session.pendingRecordingThreadId;
		if (originThreadId) this.pushRecordingState(session, 'stopped');
		session.pendingRecordingThreadId = undefined;
		const caption = session.latestCaption;
		this.resetLiveRecordingState(session);
		try {
			const project = await this.projectRepository.getPersonalProjectForUserOrFail(userId);
			const { threadId } = await handler({
				userId,
				projectId: project.id,
				recording,
				originThreadId,
				caption,
			});
			return {
				threadUrl: `${this.urlService.getInstanceBaseUrl().replace(/\/$/, '')}/assistant/${threadId}`,
			};
		} catch (error) {
			session.completedRecordingIds.delete(recording.id);
			throw error;
		}
	}

	/** Reset the in-progress recording state — clears the caption tick, pending debounced
	 *  push, action buffer, and count. Idempotent; used both to arm a fresh recording and
	 *  to tear one down (completion, discard, teardown, disconnect). */
	private resetLiveRecordingState(session: BrowserSession): void {
		if (session.captionInterval) clearInterval(session.captionInterval);
		session.captionInterval = undefined;
		if (session.pushDebounceTimer) clearTimeout(session.pushDebounceTimer);
		session.pushDebounceTimer = undefined;
		session.inProgressActionCount = 0;
		session.pendingCaptionActions = [];
		session.latestCaption = undefined;
	}

	/** Arm live recording state and start the periodic caption tick. Called once the
	 *  extension has confirmed the recording actually started. */
	private startLiveRecordingState(session: BrowserSession): void {
		this.resetLiveRecordingState(session);
		session.captionInterval = setInterval(() => {
			void this.runCaptionTick(session);
		}, CAPTION_INTERVAL_MS);
		this.pushRecordingState(session, 'recording');
	}

	private handleRecordingActionAppended(userId: string, action: BrowserRecordingAction): void {
		const session = this.sessions.get(userId);
		if (!session?.pendingRecordingThreadId) return;
		const redacted = redactAction(action);
		session.pendingCaptionActions.push(redacted);
		session.inProgressActionCount += 1;
		if (session.pushDebounceTimer) return;
		session.pushDebounceTimer = setTimeout(() => {
			session.pushDebounceTimer = undefined;
			this.pushRecordingState(session, 'recording');
		}, ACTION_PUSH_DEBOUNCE_MS);
	}

	/** Forward one captured screenshot live, while a recording is in progress — no
	 *  debounce needed, capture is already throttled (250ms/action, 20-shot cap). */
	private handleRecordingScreenshotCaptured(
		userId: string,
		screenshot: BrowserRecordingScreenshot,
	): void {
		const session = this.sessions.get(userId);
		const threadId = session?.pendingRecordingThreadId;
		if (!threadId) return;
		this.push.sendToUsers(
			{
				type: 'instanceAiRecordingScreenshotReceived',
				data: {
					threadId,
					actionId: screenshot.actionId,
					mimeType: screenshot.mimeType,
					data: screenshot.data,
				},
			},
			[userId],
		);
	}

	/** Summarize whatever has accumulated since the last tick. Skips the call — and its
	 *  cost — entirely when nothing new has come in. Never throws: a failed summary just
	 *  means no caption is available yet, not a broken recording. */
	private async runCaptionTick(session: BrowserSession): Promise<void> {
		const handler = this.actionCaptionHandler;
		const actions = session.pendingCaptionActions;
		if (!handler || actions.length === 0) return;
		session.pendingCaptionActions = [];
		try {
			const caption = await handler({ userId: session.userId, actions });
			if (caption) {
				session.latestCaption = caption;
				this.pushRecordingState(session, 'recording');
			}
		} catch (error) {
			this.logger.warn('Failed to summarize in-progress recording', {
				userId: session.userId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private pushRecordingState(
		session: BrowserSession,
		status: 'recording' | 'stopped' | 'discarded',
	): void {
		const threadId = session.pendingRecordingThreadId;
		if (!threadId) return;
		this.push.sendToUsers(
			{
				type: 'instanceAiRecordingStateChanged',
				data: {
					threadId,
					status,
					actionCount: session.inProgressActionCount,
					...(session.latestCaption ? { caption: session.latestCaption } : {}),
				},
			},
			[session.userId],
		);
	}

	private handleExtensionConnected(userId: string): void {
		const session = this.sessions.get(userId);
		if (!session) {
			return;
		}

		session.connected = true;
		session.connectedAt = new Date();
		session.hasConnectedOnce = true;
		void session.mcpServer.callTool({
			name: 'browser_connect',
			arguments: {},
		});
		this.telemetry.track('Instance AI Browser connected', {
			user_id: userId,
			browser_extension_version: session.extensionVersion,
		});
		this.logger.info('Browser Use extension connected', {
			userId,
			extensionVersion: session.extensionVersion,
		});
		this.pushState(userId);
	}

	private handleExtensionDisconnected(userId: string): void {
		const session = this.sessions.get(userId);
		if (!session) {
			return;
		}

		session.connected = false;
		session.connectedAt = null;
		if (session.pendingRecordingThreadId) {
			// The extension dropped mid-recording (browser closed, sleep, network blip) rather
			// than the user stopping/discarding — clean up the same way discard does, so the
			// live artifact and the caption timer don't outlive the connection.
			this.pushRecordingState(session, 'discarded');
			this.resetLiveRecordingState(session);
			session.pendingRecordingThreadId = undefined;
		}
		this.logger.info('Browser Use extension disconnected', { userId });
		this.pushState(userId);
	}

	private pushState(userId: string): void {
		const session = this.sessions.get(userId);
		this.push.sendToUsers(
			{
				type: 'instanceAiBrowserStateChanged',
				data: {
					connected: session?.connected ?? false,
					connectedAt: session?.connectedAt?.toISOString() ?? null,
					toolCategories: this.getToolCategories(userId),
				},
			},
			[userId],
		);
	}

	private getToolCategories(userId: string): ToolCategory[] {
		const session = this.sessions.get(userId);
		return session?.connected ? [{ name: 'browser', enabled: true }] : [];
	}

	private isExtensionTokenValid(session: BrowserSession, token: string | null): boolean {
		if (!this.tokensMatch(session.relayAuthToken, token)) {
			return false;
		}

		if (!session.hasConnectedOnce) {
			return Date.now() - session.tokenCreatedAt <= CONNECT_TOKEN_TTL_MS;
		}

		return true;
	}

	private tokensMatch(expected: string, actual: string | null): boolean {
		if (!actual) {
			return false;
		}
		const expectedBuffer = Buffer.from(expected);
		const actualBuffer = Buffer.from(actual);
		return (
			expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer)
		);
	}

	private async createCredential(
		userId: string,
		payload: CreateCredentialPayload,
	): Promise<{ credentialId: string }> {
		const user = await this.userRepository.findOne({
			where: { id: userId },
			relations: ['role'],
		});
		if (!user) {
			throw new UnexpectedError('User for browser session not found');
		}

		const credential = await this.credentialsService.createUnmanagedCredential(payload, user);
		return { credentialId: credential.id };
	}

	private buildExtensionEndpoint(session: BrowserSession): string {
		const token = encodeURIComponent(session.relayAuthToken);
		return `${this.getPublicWsBaseUrl()}${BROWSER_USE_WS_NAMESPACE}/extension/${session.sessionId}?token=${token}`;
	}

	private buildCdpEndpoint(sessionId: string): string {
		return `ws://127.0.0.1:${this.globalConfig.port}${BROWSER_USE_WS_NAMESPACE}/cdp/${sessionId}`;
	}

	private getPublicWsBaseUrl(): string {
		const base = new URL(this.urlService.getInstanceBaseUrl());
		const scheme = base.protocol === 'https:' ? 'wss' : 'ws';
		return `${scheme}://${base.host}`;
	}
}

function redactOptional(value: string | undefined): string | undefined {
	return value === undefined ? undefined : redactString(value);
}

/** Redact an action's free-text fields again, server-side — defense in depth on top of
 *  the extension's own sanitization, since the action now leaves the trusted extension
 *  boundary independently of the final reviewed submission. */
function redactAction(action: BrowserRecordingAction): BrowserRecordingAction {
	return {
		...action,
		url: redactString(action.url),
		value: redactOptional(action.value),
		target: action.target
			? {
					...action.target,
					role: redactOptional(action.target.role),
					label: redactOptional(action.target.label),
					name: redactOptional(action.target.name),
					inputType: redactOptional(action.target.inputType),
				}
			: action.target,
	};
}

function createInMemorySecretsBuffer(): SecretsBuffer {
	const store = new Map<string, Map<string, string>>();
	return {
		capture(credentialsKey: string, field: string, value: string): void {
			const fields = store.get(credentialsKey) ?? new Map<string, string>();
			fields.set(field, value);
			store.set(credentialsKey, fields);
		},
		getFields(credentialsKey: string): Map<string, string> | undefined {
			return store.get(credentialsKey);
		},
		clear(credentialsKey: string): void {
			store.delete(credentialsKey);
		},
	};
}
