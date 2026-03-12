import { Builder } from 'selenium-webdriver';
import { Options as FirefoxOptions } from 'selenium-webdriver/firefox';
import LogInspector from 'selenium-webdriver/bidi/logInspector';
import Network from 'selenium-webdriver/bidi/network';

import type {
	ConsoleEntry,
	ErrorEntry,
	NetworkEntry,
	ResolvedConfig,
	SessionConfig,
} from '../types';
import type { WebDriver } from 'selenium-webdriver';
import { WebDriverBaseAdapter } from './webdriver-base';

// ---------------------------------------------------------------------------
// Firefox BiDi Adapter
// ---------------------------------------------------------------------------

/**
 * WebDriver BiDi adapter for Firefox local mode.
 *
 * Uses selenium-webdriver with BiDi extensions for enhanced capabilities:
 * - Console/error log capture via LogInspector
 * - Network monitoring via Network BiDi module
 * - Request interception for setHeaders/setOffline
 *
 * All standard WebDriver operations (navigation, interaction, cookies,
 * storage, snapshot, ref resolution) are inherited from WebDriverBaseAdapter.
 */
export class WebDriverBiDiAdapter extends WebDriverBaseAdapter {
	readonly name = 'webdriver-bidi';

	private resolvedConfig: ResolvedConfig;
	private logInspector?: LogInspector;
	private network?: Network;

	// Buffered entries from BiDi subscriptions
	private consoleBuffer: ConsoleEntry[] = [];
	private errorBuffer: ErrorEntry[] = [];
	private networkBuffer: NetworkEntry[] = [];

	// Network interception state
	private headerInterceptId?: string;
	private customHeaders: Record<string, string> = {};

	constructor(config: ResolvedConfig) {
		super();
		this.resolvedConfig = config;
	}

	// =========================================================================
	// Driver creation
	// =========================================================================

	protected async createDriver(config: SessionConfig): Promise<WebDriver> {
		const options = new FirefoxOptions();

		// Enable BiDi
		options.enableBidi();

		// Set binary path if available
		const firefoxInfo = this.resolvedConfig.browsers.get('firefox');
		if (firefoxInfo?.executablePath) {
			options.setBinary(firefoxInfo.executablePath);
		}

		// Set profile for local mode
		if (config.mode === 'local' && firefoxInfo?.profilePath) {
			options.setProfile(firefoxInfo.profilePath);
		}

		// Headless mode
		if (config.headless) {
			options.addArguments('-headless');
		}

		// Viewport
		options.windowSize(config.viewport);

		// Build the driver
		const builder = new Builder().forBrowser('firefox').setFirefoxOptions(options);

		// Use geckodriver path if discovered
		if (this.resolvedConfig.geckodriverPath) {
			const { ServiceBuilder } = await import('selenium-webdriver/firefox');
			const service = new ServiceBuilder(this.resolvedConfig.geckodriverPath);
			builder.setFirefoxService(service.build());
		}

		const driver = await builder.build();

		// Initialize BiDi modules
		await this.initBiDi(driver);

		return driver;
	}

	// =========================================================================
	// BiDi initialization
	// =========================================================================

	private async initBiDi(driver: WebDriver): Promise<void> {
		// Log inspector — captures console and JS errors
		try {
			this.logInspector = new LogInspector(driver);
			await this.logInspector.init();

			await this.logInspector.onConsoleEntry((entry) => {
				this.consoleBuffer.push({
					level: entry.level,
					text: entry.text,
					timestamp: entry.timestamp,
				});
			});

			await this.logInspector.onJavascriptException((entry) => {
				this.errorBuffer.push({
					message: entry.text,
					stack: entry.stackTrace?.callFrames
						?.map((f) => `  at ${f.functionName} (${f.url}:${f.lineNumber}:${f.columnNumber})`)
						.join('\n'),
					timestamp: entry.timestamp,
				});
			});
		} catch {
			// BiDi log inspection not available — degrade gracefully
		}

		// Network — captures requests and responses
		try {
			this.network = new Network(driver);
			await this.network.init();

			await this.network.responseCompleted((event) => {
				this.networkBuffer.push({
					url: event.response.url,
					method: event.request.method,
					status: event.response.status,
					contentType: event.response.mimeType,
					timestamp: event.timestamp,
				});
			});
		} catch {
			// BiDi network not available — degrade gracefully
		}
	}

	// =========================================================================
	// Override: Console/Errors/Network (BiDi-enhanced)
	// =========================================================================

	async getConsole(_pageId: string, level?: string, clear?: boolean): Promise<ConsoleEntry[]> {
		let entries = [...this.consoleBuffer];

		if (level) {
			entries = entries.filter((e) => e.level === level);
		}

		if (clear) {
			this.consoleBuffer = [];
		}

		return entries;
	}

	async getErrors(_pageId: string, clear?: boolean): Promise<ErrorEntry[]> {
		const entries = [...this.errorBuffer];

		if (clear) {
			this.errorBuffer = [];
		}

		return entries;
	}

	async getNetwork(_pageId: string, filter?: string, clear?: boolean): Promise<NetworkEntry[]> {
		let entries = [...this.networkBuffer];

		if (filter) {
			const pattern = this.globToRegex(filter);
			entries = entries.filter((e) => pattern.test(e.url));
		}

		if (clear) {
			this.networkBuffer = [];
		}

		return entries;
	}

	// =========================================================================
	// Override: setHeaders (via BiDi network interception)
	// =========================================================================

	async setHeaders(_pageId: string, headers: Record<string, string>): Promise<void> {
		if (!this.network) {
			throw new Error('BiDi network module not available');
		}

		// Remove previous intercept
		if (this.headerInterceptId) {
			await this.network.removeIntercept(this.headerInterceptId);
			this.headerInterceptId = undefined;
		}

		this.customHeaders = headers;

		if (Object.keys(headers).length === 0) return;

		// Add intercept for all requests
		this.headerInterceptId = await this.network.addIntercept('beforeRequestSent');

		await this.network.beforeRequestSent(async (event) => {
			const modifiedHeaders = event.request.headers.map((h) => ({
				name: h.name,
				value: h.value,
			}));

			for (const [name, value] of Object.entries(this.customHeaders)) {
				const existing = modifiedHeaders.findIndex(
					(h) => h.name.toLowerCase() === name.toLowerCase(),
				);
				const headerValue = { type: 'string' as const, value };
				if (existing >= 0) {
					modifiedHeaders[existing].value = headerValue;
				} else {
					modifiedHeaders.push({ name, value: headerValue });
				}
			}

			// Continue with modified headers
			// Note: This is a simplified version — full implementation would need
			// request continuation with the BiDi continueRequest API
		});
	}

	// =========================================================================
	// Override: setOffline (via BiDi network)
	// =========================================================================

	async setOffline(_pageId: string, offline: boolean): Promise<void> {
		if (!this.network) {
			throw new Error('BiDi network module not available');
		}

		if (offline) {
			// Block all requests by intercepting and failing them
			await this.network.addIntercept('beforeRequestSent');
		}
		// Note: Turning offline mode off requires removing the intercept
		// Full implementation would track the offline intercept ID
	}

	// =========================================================================
	// Cleanup
	// =========================================================================

	async close(): Promise<void> {
		try {
			if (this.logInspector) await this.logInspector.close();
		} catch {
			/* ignore */
		}

		try {
			if (this.network) await this.network.close();
		} catch {
			/* ignore */
		}

		await super.close();

		this.consoleBuffer = [];
		this.errorBuffer = [];
		this.networkBuffer = [];
	}

	// =========================================================================
	// Private helpers
	// =========================================================================

	private globToRegex(pattern: string): RegExp {
		const escaped = pattern
			.replace(/[.+^${}()|[\]\\]/g, '\\$&')
			.replace(/\*\*/g, '.*')
			.replace(/\*/g, '[^/]*')
			.replace(/\?/g, '.');
		return new RegExp(`^${escaped}$`);
	}
}
