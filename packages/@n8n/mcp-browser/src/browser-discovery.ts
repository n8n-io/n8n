import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { DiscoveredBrowsers } from './types';

/**
 * Auto-detect installed browsers and driver binaries on the current platform.
 * Results are cached for the lifetime of the process.
 */
export class BrowserDiscovery {
	private cached?: DiscoveredBrowsers;

	discover(): DiscoveredBrowsers {
		if (this.cached) return this.cached;

		const platform = process.platform;
		let result: DiscoveredBrowsers;

		switch (platform) {
			case 'darwin':
				result = this.discoverMacOS();
				break;
			case 'linux':
				result = this.discoverLinux();
				break;
			case 'win32':
				result = this.discoverWindows();
				break;
			default:
				result = {};
		}

		this.cached = result;
		return result;
	}

	// -------------------------------------------------------------------------
	// macOS
	// -------------------------------------------------------------------------

	private discoverMacOS(): DiscoveredBrowsers {
		const home = os.homedir();
		const result: DiscoveredBrowsers = {};

		// Chrome
		const chromePaths = [
			'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
			`${home}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
		];
		const chromePath = chromePaths.find((p) => fs.existsSync(p));
		if (chromePath) {
			result.chrome = {
				executablePath: chromePath,
				profilePath: path.join(home, 'Library/Application Support/Google/Chrome/Default'),
			};
		}

		// Brave
		const bravePaths = [
			'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
			`${home}/Applications/Brave Browser.app/Contents/MacOS/Brave Browser`,
		];
		const bravePath = bravePaths.find((p) => fs.existsSync(p));
		if (bravePath) {
			result.brave = {
				executablePath: bravePath,
				profilePath: path.join(
					home,
					'Library/Application Support/BraveSoftware/Brave-Browser/Default',
				),
			};
		}

		// Edge
		const edgePaths = [
			'/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
			`${home}/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge`,
		];
		const edgePath = edgePaths.find((p) => fs.existsSync(p));
		if (edgePath) {
			result.edge = {
				executablePath: edgePath,
				profilePath: path.join(home, 'Library/Application Support/Microsoft Edge/Default'),
			};
		}

		// Chromium
		const chromiumPaths = [
			'/Applications/Chromium.app/Contents/MacOS/Chromium',
			`${home}/Applications/Chromium.app/Contents/MacOS/Chromium`,
		];
		const chromiumPath = chromiumPaths.find((p) => fs.existsSync(p));
		if (chromiumPath) {
			result.chromium = {
				executablePath: chromiumPath,
				profilePath: path.join(home, 'Library/Application Support/Chromium/Default'),
			};
		}

		// Firefox
		const firefoxPaths = [
			'/Applications/Firefox.app/Contents/MacOS/firefox',
			`${home}/Applications/Firefox.app/Contents/MacOS/firefox`,
		];
		const firefoxPath = firefoxPaths.find((p) => fs.existsSync(p));
		if (firefoxPath) {
			result.firefox = {
				executablePath: firefoxPath,
				profilePath: this.resolveFirefoxProfile(
					path.join(home, 'Library/Application Support/Firefox'),
				),
			};
		}

		// Safari
		const safariPath = '/Applications/Safari.app/Contents/MacOS/Safari';
		if (fs.existsSync(safariPath)) {
			result.safari = { executablePath: safariPath };
		}

		// safaridriver
		if (fs.existsSync('/usr/bin/safaridriver')) {
			result.safaridriverPath = '/usr/bin/safaridriver';
		}

		// geckodriver
		result.geckodriverPath = this.whichSync('geckodriver');

		return result;
	}

	// -------------------------------------------------------------------------
	// Linux
	// -------------------------------------------------------------------------

	private discoverLinux(): DiscoveredBrowsers {
		const home = os.homedir();
		const result: DiscoveredBrowsers = {};

		// Chrome
		const chromeBin = this.whichSync('google-chrome') ?? this.whichSync('google-chrome-stable');
		if (chromeBin) {
			result.chrome = {
				executablePath: chromeBin,
				profilePath: path.join(home, '.config/google-chrome/Default'),
			};
		}

		// Brave
		const braveBin =
			this.whichSync('brave-browser') ??
			this.whichSync('brave-browser-stable') ??
			this.whichSync('brave');
		if (braveBin) {
			result.brave = {
				executablePath: braveBin,
				profilePath: path.join(home, '.config/BraveSoftware/Brave-Browser/Default'),
			};
		}

		// Edge
		const edgeBin = this.whichSync('microsoft-edge') ?? this.whichSync('microsoft-edge-stable');
		if (edgeBin) {
			result.edge = {
				executablePath: edgeBin,
				profilePath: path.join(home, '.config/microsoft-edge/Default'),
			};
		}

		// Chromium
		const chromiumBin = this.whichSync('chromium') ?? this.whichSync('chromium-browser');
		if (chromiumBin) {
			result.chromium = {
				executablePath: chromiumBin,
				profilePath: path.join(home, '.config/chromium/Default'),
			};
		}

		// Firefox
		const firefoxBin = this.whichSync('firefox');
		if (firefoxBin) {
			result.firefox = {
				executablePath: firefoxBin,
				profilePath: this.resolveFirefoxProfile(path.join(home, '.mozilla/firefox')),
			};
		}

		// geckodriver
		result.geckodriverPath = this.whichSync('geckodriver');

		return result;
	}

	// -------------------------------------------------------------------------
	// Windows
	// -------------------------------------------------------------------------

	private discoverWindows(): DiscoveredBrowsers {
		const programFiles = process.env.ProgramFiles ?? 'C:\\Program Files';
		const programFilesX86 = process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)';
		const localAppData = process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData\\Local');
		const appData = process.env.APPDATA ?? path.join(os.homedir(), 'AppData\\Roaming');

		const result: DiscoveredBrowsers = {};

		// Chrome
		const chromeWinPaths = [
			path.join(programFiles, 'Google\\Chrome\\Application\\chrome.exe'),
			path.join(programFilesX86, 'Google\\Chrome\\Application\\chrome.exe'),
			path.join(localAppData, 'Google\\Chrome\\Application\\chrome.exe'),
		];
		const chromeWin = chromeWinPaths.find((p) => fs.existsSync(p));
		if (chromeWin) {
			result.chrome = {
				executablePath: chromeWin,
				profilePath: path.join(localAppData, 'Google\\Chrome\\User Data\\Default'),
			};
		}

		// Brave
		const braveWinPaths = [
			path.join(programFiles, 'BraveSoftware\\Brave-Browser\\Application\\brave.exe'),
			path.join(localAppData, 'BraveSoftware\\Brave-Browser\\Application\\brave.exe'),
		];
		const braveWin = braveWinPaths.find((p) => fs.existsSync(p));
		if (braveWin) {
			result.brave = {
				executablePath: braveWin,
				profilePath: path.join(localAppData, 'BraveSoftware\\Brave-Browser\\User Data\\Default'),
			};
		}

		// Edge
		const edgeWinPaths = [
			path.join(programFilesX86, 'Microsoft\\Edge\\Application\\msedge.exe'),
			path.join(programFiles, 'Microsoft\\Edge\\Application\\msedge.exe'),
		];
		const edgeWin = edgeWinPaths.find((p) => fs.existsSync(p));
		if (edgeWin) {
			result.edge = {
				executablePath: edgeWin,
				profilePath: path.join(localAppData, 'Microsoft\\Edge\\User Data\\Default'),
			};
		}

		// Chromium
		const chromiumWin = path.join(localAppData, 'Chromium\\Application\\chrome.exe');
		if (fs.existsSync(chromiumWin)) {
			result.chromium = {
				executablePath: chromiumWin,
				profilePath: path.join(localAppData, 'Chromium\\User Data\\Default'),
			};
		}

		// Firefox
		const firefoxWinPaths = [
			path.join(programFiles, 'Mozilla Firefox\\firefox.exe'),
			path.join(programFilesX86, 'Mozilla Firefox\\firefox.exe'),
		];
		const firefoxWin = firefoxWinPaths.find((p) => fs.existsSync(p));
		if (firefoxWin) {
			result.firefox = {
				executablePath: firefoxWin,
				profilePath: this.resolveFirefoxProfile(path.join(appData, 'Mozilla\\Firefox')),
			};
		}

		// geckodriver
		result.geckodriverPath = this.whichSync('geckodriver');

		return result;
	}

	// -------------------------------------------------------------------------
	// Helpers
	// -------------------------------------------------------------------------

	/**
	 * Resolve the default Firefox profile directory by parsing `profiles.ini`.
	 * Returns undefined if no default profile can be determined.
	 */
	private resolveFirefoxProfile(firefoxDir: string): string | undefined {
		const profilesIni = path.join(firefoxDir, 'profiles.ini');
		if (!fs.existsSync(profilesIni)) return undefined;

		try {
			const content = fs.readFileSync(profilesIni, 'utf-8');
			const lines = content.split(/\r?\n/);

			let currentPath: string | undefined;
			let currentIsRelative = true;
			let foundDefault = false;

			for (const line of lines) {
				const trimmed = line.trim();

				if (trimmed.startsWith('[')) {
					// Emit previous section if it was marked as default
					if (foundDefault && currentPath) {
						return currentIsRelative ? path.join(firefoxDir, currentPath) : currentPath;
					}
					currentPath = undefined;
					currentIsRelative = true;
					foundDefault = false;
					continue;
				}

				const [key, ...valueParts] = trimmed.split('=');
				const value = valueParts.join('=');

				if (key === 'Path') currentPath = value;
				if (key === 'IsRelative' && value === '0') currentIsRelative = false;
				if (key === 'Default' && value === '1') foundDefault = true;
			}

			// Check last section
			if (foundDefault && currentPath) {
				return currentIsRelative ? path.join(firefoxDir, currentPath) : currentPath;
			}

			// Fallback: look for *.default-release profile directory
			const profilesDir = path.join(firefoxDir, 'Profiles');
			const dir = fs.existsSync(profilesDir) ? profilesDir : firefoxDir;
			const entries = fs.readdirSync(dir);
			const defaultRelease = entries.find((e) => e.endsWith('.default-release'));
			if (defaultRelease) return path.join(dir, defaultRelease);

			return undefined;
		} catch {
			return undefined;
		}
	}

	/** Run `which` (or `where` on Windows) and return the path, or undefined. */
	private whichSync(binary: string): string | undefined {
		try {
			const cmd = process.platform === 'win32' ? `where ${binary}` : `which ${binary}`;
			const result = execSync(cmd, { encoding: 'utf-8', timeout: 5_000 }).trim();
			// `where` on Windows may return multiple lines; take the first
			const firstLine = result.split(/\r?\n/)[0];
			return firstLine && fs.existsSync(firstLine) ? firstLine : undefined;
		} catch {
			return undefined;
		}
	}
}

/** Singleton instance for convenience. */
let defaultDiscovery: BrowserDiscovery | undefined;

export function getDefaultDiscovery(): BrowserDiscovery {
	defaultDiscovery ??= new BrowserDiscovery();
	return defaultDiscovery;
}
