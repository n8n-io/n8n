import { getDefaultDiscovery, getInstallInstructions } from './browser-discovery';
import type { CDPRelayServer } from './cdp-relay';
import {
	AlreadyConnectedError,
	BrowserNotAvailableError,
	ConnectionLostError,
	ExtensionNotConnectedError,
	NotConnectedError,
	type ConnectionLostReason,
} from './errors';
import { createLogger } from './logger';
import type { FixtureBundle } from './adapters/fixture';
import type {
	Adapter,
	BrowserName,
	Config,
	ConnectConfig,
	ConnectResult,
	ConnectionState,
	ResolvedBrowserInfo,
	ResolvedConfig,
} from './types';
import { configSchema } from './types';

const log = createLogger('connection');

export interface BrowserConnectionOptions {
	/**
	 * Externally managed relay (remote mode). The connection does not own its
	 * lifecycle - the embedder is responsible for stopping it.
	 */
	relay?: CDPRelayServer;
	/** Explicit CDP endpoint for remote mode; overrides `relay.cdpEndpoint()`. */
	cdpEndpoint?: string;
	/** Headers sent when connecting to {@link cdpEndpoint} (e.g. an auth token). */
	cdpConnectHeaders?: Record<string, string>;
	/** Fixture bundle for the deterministic `fixture` adapter (eval replay). When
	 *  omitted with `adapter: 'fixture'`, the bundle is loaded from the
	 *  `N8N_EVAL_BROWSER_FIXTURES` file. */
	fixtures?: FixtureBundle;
}

export class BrowserConnection {
	private state: ConnectionState | null = null;
	private disconnectReason: ConnectionLostReason | undefined;
	private readonly config: ResolvedConfig;
	private readonly externalRelay?: CDPRelayServer;
	private readonly externalCdpEndpoint?: string;
	private readonly cdpConnectHeaders?: Record<string, string>;
	private readonly externalFixtures?: FixtureBundle;
	/** Adapter kept alive after an extension-connect timeout so its relay URL remains valid. */
	private pendingAdapter: Adapter | null = null;

	constructor(userConfig?: Partial<Config>, options?: BrowserConnectionOptions) {
		const parsed = configSchema.parse(userConfig ?? {});
		this.externalRelay = options?.relay;
		this.externalCdpEndpoint = options?.cdpEndpoint;
		this.cdpConnectHeaders = options?.cdpConnectHeaders;
		this.externalFixtures = options?.fixtures;

		// Merge auto-discovery with programmatic overrides
		const discovery = getDefaultDiscovery().discover();
		const browsers = new Map<BrowserName, ResolvedBrowserInfo>();

		// Populate from discovery
		for (const [name, info] of Object.entries(discovery)) {
			if (info && typeof info === 'object' && 'executablePath' in info) {
				const browserInfo = info as { executablePath: string; profilePath?: string };
				browsers.set(name as BrowserName, { ...browserInfo, available: true });
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
			browsers,
			adapter: parsed.adapter,
			mode: parsed.mode,
		};
	}

	// -------------------------------------------------------------------------
	// Public API
	// -------------------------------------------------------------------------

	async connect(overrideBrowser?: BrowserName): Promise<ConnectResult> {
		if (this.state) {
			throw new AlreadyConnectedError();
		}

		const browser = overrideBrowser ?? this.config.defaultBrowser;
		// The fixture adapter replays a recorded bundle — it needs no real
		// browser binary (that is the point: deterministic eval replay in CI).
		if (this.config.mode !== 'remote' && this.config.adapter !== 'fixture') {
			this.requireBrowserAvailable(browser);
		}

		const connectConfig: ConnectConfig = {
			browser,
		};

		// Reuse a pending adapter (relay kept alive from a prior timeout) if available.
		const adapter = this.pendingAdapter ?? (await this.createAdapter());
		this.pendingAdapter = null;

		// Listen for unexpected disconnections so we can invalidate state immediately
		adapter.onDisconnect = (reason) => {
			if (!this.state) return; // already disconnected
			log.debug('unexpected disconnect, reason:', reason);
			this.disconnectReason = reason;
			this.state = null;
		};

		try {
			await adapter.launch(connectConfig);
		} catch (error) {
			if (error instanceof ExtensionNotConnectedError) {
				// Keep the adapter alive so its relay URL stays valid for the next retry.
				this.pendingAdapter = adapter;
			} else {
				await adapter.close().catch(() => {});
			}
			throw error;
		}

		// Two-tier model: listTabs() returns metadata from the relay (no
		// debugger attachment). Playwright page objects are created lazily
		// when a tool first interacts with a specific tab.
		const pages = await adapter.listTabs();
		const pageMap = new Map(pages.map((p) => [p.id, p]));

		this.state = {
			adapter,
			pages: pageMap,
			activePageId: pages[0]?.id ?? '',
		};

		return { browser, pages };
	}

	async disconnect(): Promise<void> {
		const pending = this.pendingAdapter;
		this.pendingAdapter = null;

		if (pending) await pending.close().catch(() => {});

		if (!this.state) return; // already disconnected — idempotent

		const { adapter } = this.state;
		this.state = null;
		this.disconnectReason = undefined;

		try {
			await adapter.close();
		} catch {
			// Browser may already be dead — that's fine
		}
	}

	getConnection(): ConnectionState {
		if (!this.state) {
			if (this.disconnectReason) {
				throw new ConnectionLostError(this.disconnectReason);
			}
			throw new NotConnectedError();
		}
		return this.state;
	}

	get isConnected(): boolean {
		return this.state !== null;
	}

	async shutdown(): Promise<void> {
		await this.disconnect();
	}

	getResolvedConfig(): ResolvedConfig {
		return this.config;
	}

	// -------------------------------------------------------------------------
	// Private
	// -------------------------------------------------------------------------

	getAvailableBrowsers(): BrowserName[] {
		return [...this.config.browsers.entries()]
			.filter(([_, v]) => v.available)
			.map(([name]) => name);
	}

	private requireBrowserAvailable(browser: BrowserName): void {
		const info = this.config.browsers.get(browser);
		if (!info?.available) {
			const available = this.getAvailableBrowsers();
			const instructions = getInstallInstructions(browser);
			throw new BrowserNotAvailableError(browser, available, instructions);
		}
	}

	private async createAdapter(): Promise<Adapter> {
		if (this.config.adapter === 'fixture') {
			// Deterministic eval replay — no real browser. Wins over mode: a
			// fixture run never touches a relay/extension.
			const { FixtureAdapter, loadFixtureBundleFromEnv } = await import('./adapters/fixture.js');
			const bundle = this.externalFixtures ?? (await loadFixtureBundleFromEnv());
			return new FixtureAdapter(bundle);
		}
		if (this.config.mode === 'remote') {
			// Remote mode is only supported by the Playwright adapter
			const { PlaywrightAdapter } = await import('./adapters/playwright.js');
			return new PlaywrightAdapter(this.config, {
				relay: this.externalRelay,
				cdpEndpoint: this.externalCdpEndpoint,
				cdpConnectHeaders: this.cdpConnectHeaders,
			});
		}
		if (this.config.adapter === 'agent-browser') {
			const { AgentBrowserAdapter } = await import('./adapters/agent-browser.js');
			return new AgentBrowserAdapter(this.config);
		}
		const { PlaywrightAdapter } = await import('./adapters/playwright.js');
		return new PlaywrightAdapter(this.config);
	}
}
