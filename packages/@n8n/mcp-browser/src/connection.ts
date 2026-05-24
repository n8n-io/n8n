import { getDefaultDiscovery, getInstallInstructions } from './browser-discovery';
import {
	AlreadyConnectedError,
	BrowserNotAvailableError,
	ConnectionLostError,
	ExtensionNotConnectedError,
	NotConnectedError,
	type ConnectionLostReason,
} from './errors';
import { createLogger } from './logger';
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

export class BrowserConnection {
	private state: ConnectionState | null = null;
	private disconnectReason: ConnectionLostReason | undefined;
	private readonly config: ResolvedConfig;
	/** Adapter kept alive after an extension-connect timeout so its relay URL remains valid. */
	private pendingAdapter: Adapter | null = null;

	constructor(userConfig?: Partial<Config>) {
		const parsed = configSchema.parse(userConfig ?? {});

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
		this.requireBrowserAvailable(browser);

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
		if (this.config.adapter === 'agent-browser') {
			const { AgentBrowserAdapter } = await import('./adapters/agent-browser');
			return new AgentBrowserAdapter(this.config);
		}
		const { PlaywrightAdapter } = await import('./adapters/playwright');
		return new PlaywrightAdapter(this.config);
	}
}
