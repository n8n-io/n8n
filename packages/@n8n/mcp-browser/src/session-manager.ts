import type { BrowserAdapter } from './adapters/adapter';
import { getDefaultDiscovery } from './browser-discovery';
import { BrowserNotAvailableError, MaxSessionsError, SessionNotFoundError } from './errors';
import type {
	BrowserName,
	BrowserSession,
	Config,
	OpenSessionOptions,
	ResolvedBrowserInfo,
	ResolvedConfig,
	SessionConfig,
	SessionOpenResult,
} from './types';
import { configSchema, isChromiumBased, openSessionSchema } from './types';
import { expandHome, generateId } from './utils';

const REAPER_INTERVAL_MS = 60_000;

export class SessionManager {
	private readonly sessions = new Map<string, BrowserSession>();
	private readonly config: ResolvedConfig;
	private reaperInterval: ReturnType<typeof setInterval> | undefined;

	constructor(userConfig?: Partial<Config>) {
		const parsed = configSchema.parse(userConfig ?? {});

		// Merge auto-discovery with programmatic overrides
		const discovery = getDefaultDiscovery().discover();
		const browsers = new Map<BrowserName, ResolvedBrowserInfo>();

		// Populate from discovery
		for (const [name, info] of Object.entries(discovery)) {
			if (name === 'geckodriverPath' || name === 'safaridriverPath') continue;
			if (info && typeof info === 'object' && 'executablePath' in info) {
				browsers.set(name as BrowserName, { ...info, available: true });
			}
		}

		// Apply programmatic overrides
		for (const [name, override] of Object.entries(parsed.browsers)) {
			const existing = browsers.get(name as BrowserName);
			if (existing) {
				if (override.executablePath) existing.executablePath = override.executablePath;
				if (override.profilePath) existing.profilePath = override.profilePath;
			} else if (override.executablePath) {
				browsers.set(name as BrowserName, {
					executablePath: override.executablePath,
					profilePath: override.profilePath,
					available: true,
				});
			}
		}

		this.config = {
			defaultBrowser: parsed.defaultBrowser,
			defaultMode: parsed.defaultMode,
			headless: parsed.headless,
			viewport: parsed.viewport,
			sessionTtlMs: parsed.sessionTtlMs,
			maxConcurrentSessions: parsed.maxConcurrentSessions,
			profilesDir: expandHome(parsed.profilesDir),
			browsers,
			geckodriverPath: discovery.geckodriverPath,
			safaridriverPath: discovery.safaridriverPath,
		};

		this.startReaper();
	}

	// -------------------------------------------------------------------------
	// Public API
	// -------------------------------------------------------------------------

	async open(rawOptions?: Partial<OpenSessionOptions>): Promise<SessionOpenResult> {
		const options = openSessionSchema.parse(rawOptions ?? {});

		if (this.sessions.size >= this.config.maxConcurrentSessions) {
			throw new MaxSessionsError(this.config.maxConcurrentSessions);
		}

		const mode = options.mode ?? this.config.defaultMode;
		const browser = options.browser ?? this.config.defaultBrowser;
		const headless = options.headless ?? this.config.headless;
		const viewport = options.viewport ?? this.config.viewport;
		const ttlMs = options.ttlMs ?? this.config.sessionTtlMs;

		const sessionConfig: SessionConfig = {
			mode,
			browser,
			headless,
			viewport,
			profileName: options.profileName,
			ttlMs,
		};

		const adapter = await this.createAdapter(sessionConfig);
		await adapter.launch(sessionConfig);

		const sessionId = generateId('sess');
		const pages = await adapter.listPages();
		const pageMap = new Map(pages.map((p) => [p.id, p]));

		const session: BrowserSession = {
			id: sessionId,
			adapter,
			config: sessionConfig,
			pages: pageMap,
			activePageId: pages[0]?.id ?? '',
			createdAt: new Date(),
			lastAccessedAt: new Date(),
		};

		this.sessions.set(sessionId, session);

		return {
			sessionId,
			browser,
			mode,
			pages,
		};
	}

	async close(sessionId: string): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (!session) return; // already closed — idempotent

		this.sessions.delete(sessionId);

		try {
			await session.adapter.close();
		} catch {
			// Browser may already be dead — that's fine
		}
	}

	get(sessionId: string): BrowserSession {
		const session = this.sessions.get(sessionId);
		if (!session) throw new SessionNotFoundError(sessionId);
		return session;
	}

	touch(sessionId: string): void {
		const session = this.sessions.get(sessionId);
		if (session) session.lastAccessedAt = new Date();
	}

	async shutdown(): Promise<void> {
		if (this.reaperInterval) {
			clearInterval(this.reaperInterval);
			this.reaperInterval = undefined;
		}

		await Promise.all(Array.from(this.sessions.keys()).map((id) => this.close(id)));
	}

	get sessionCount(): number {
		return this.sessions.size;
	}

	getResolvedConfig(): ResolvedConfig {
		return this.config;
	}

	// -------------------------------------------------------------------------
	// Adapter selection
	// -------------------------------------------------------------------------

	private async createAdapter(config: SessionConfig): Promise<BrowserAdapter> {
		const { mode, browser } = config;

		// Ephemeral and persistent always use Playwright (bundled browsers)
		if (mode === 'ephemeral' || mode === 'persistent') {
			return this.createPlaywrightAdapter();
		}

		// Local mode — adapter depends on browser
		if (mode === 'local') {
			if (isChromiumBased(browser)) {
				// Verify browser is available for local mode
				this.requireBrowserAvailable(browser);
				return this.createPlaywrightAdapter();
			}

			if (browser === 'firefox') {
				this.requireBrowserAvailable('firefox');
				return this.createWebDriverBiDiAdapter();
			}

			if (browser === 'safari') {
				if (process.platform !== 'darwin') {
					throw new BrowserNotAvailableError('safari (macOS only)');
				}
				return this.createSafariDriverAdapter();
			}

			// webkit in local mode isn't supported — webkit is Playwright-only
			if (browser === 'webkit') {
				throw new BrowserNotAvailableError(
					'webkit in local mode (use ephemeral or persistent mode for WebKit)',
				);
			}
		}

		throw new BrowserNotAvailableError(browser);
	}

	private requireBrowserAvailable(browser: BrowserName): void {
		const info = this.config.browsers.get(browser);
		if (!info?.available) throw new BrowserNotAvailableError(browser);
	}

	private async createPlaywrightAdapter(): Promise<BrowserAdapter> {
		const { PlaywrightAdapter } = await import('./adapters/playwright');
		return new PlaywrightAdapter(this.config);
	}

	private async createWebDriverBiDiAdapter(): Promise<BrowserAdapter> {
		const { WebDriverBiDiAdapter } = await import('./adapters/webdriver-bidi');
		return new WebDriverBiDiAdapter(this.config);
	}

	private async createSafariDriverAdapter(): Promise<BrowserAdapter> {
		const { SafariDriverAdapter } = await import('./adapters/safaridriver');
		return new SafariDriverAdapter(this.config);
	}

	// -------------------------------------------------------------------------
	// TTL reaper
	// -------------------------------------------------------------------------

	private startReaper(): void {
		this.reaperInterval = setInterval(() => {
			const now = Date.now();
			for (const [id, session] of this.sessions) {
				const idleMs = now - session.lastAccessedAt.getTime();
				if (idleMs > session.config.ttlMs) {
					void this.close(id);
				}
			}
		}, REAPER_INTERVAL_MS);

		// Don't keep the process alive just for the reaper
		if (this.reaperInterval.unref) {
			this.reaperInterval.unref();
		}
	}
}
