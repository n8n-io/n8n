import { getDefaultDiscovery, getInstallInstructions } from './browser-discovery';
import { AlreadyConnectedError, BrowserNotAvailableError, NotConnectedError } from './errors';
import type {
	BrowserName,
	Config,
	ConnectConfig,
	ConnectResult,
	ConnectionState,
	ResolvedBrowserInfo,
	ResolvedConfig,
} from './types';
import { configSchema } from './types';

export class BrowserConnection {
	private state: ConnectionState | null = null;
	private readonly config: ResolvedConfig;

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

		const adapter = await this.createAdapter();
		await adapter.launch(connectConfig);

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
		if (!this.state) return; // already disconnected — idempotent

		const { adapter } = this.state;
		this.state = null;

		try {
			await adapter.close();
		} catch {
			// Browser may already be dead — that's fine
		}
	}

	getConnection(): ConnectionState {
		if (!this.state) throw new NotConnectedError();
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

	private async createAdapter() {
		const { PlaywrightAdapter } = await import('./adapters/playwright');
		return new PlaywrightAdapter(this.config);
	}
}
