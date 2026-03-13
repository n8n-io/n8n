import { Builder } from 'selenium-webdriver';
import { Options as SafariOptions } from 'selenium-webdriver/safari';

import type { ResolvedConfig, SessionConfig } from '../types';
import type { WebDriver } from 'selenium-webdriver';
import { WebDriverBaseAdapter } from './webdriver-base';

// ---------------------------------------------------------------------------
// Safari WebDriver Adapter
// ---------------------------------------------------------------------------

/**
 * Classic W3C WebDriver adapter for Safari on macOS.
 *
 * Uses safaridriver (ships with macOS) to control the user's installed Safari.
 * Safari has no BiDi support, so console/error/network monitoring and
 * request interception are unavailable.
 *
 * Supported: navigation, interaction, snapshot, ref resolution, cookies,
 * storage, screenshot, pdf, evaluate, getText, wait.
 *
 * Unsupported (throws UnsupportedOperationError from base class):
 * getConsole, getErrors, getNetwork, setHeaders, setOffline,
 * setGeolocation, setTimezone, setLocale, setDevice.
 */
export class SafariDriverAdapter extends WebDriverBaseAdapter {
	readonly name = 'safaridriver';

	private resolvedConfig: ResolvedConfig;

	constructor(config: ResolvedConfig) {
		super();
		this.resolvedConfig = config;
	}

	// =========================================================================
	// Driver creation
	// =========================================================================

	protected async createDriver(config: SessionConfig): Promise<WebDriver> {
		const options = new SafariOptions();

		// Safari doesn't support headless mode — ignore config.headless
		// Safari doesn't support custom viewport at launch — will be set via script

		const builder = new Builder().forBrowser('safari').setSafariOptions(options);

		// Use safaridriver path if discovered
		if (this.resolvedConfig.safaridriverPath) {
			const { ServiceBuilder } = await import('selenium-webdriver/safari');
			const service = new ServiceBuilder(this.resolvedConfig.safaridriverPath);
			builder.setSafariService(service.build());
		}

		const driver = await builder.build();

		// Set viewport size via window management
		try {
			await driver.manage().window().setRect({
				width: config.viewport.width,
				height: config.viewport.height,
			});
		} catch {
			// Safari may not support setRect in all contexts
		}

		return driver;
	}
}
