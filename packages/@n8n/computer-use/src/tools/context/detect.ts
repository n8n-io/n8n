/**
 * Local "what is the user looking at" detection.
 *
 * Hybrid, macOS-first: `get-windows` (active-win) supplies the frontmost app,
 * window title, bundle id and — for Chromium/WebKit browsers — the active tab
 * URL in a single call; `osascript` fills in what it cannot (the Finder
 * front-window folder, and a best-effort document path). Every function is
 * defensive: a missing permission, an unsupported platform or a thrown
 * AppleScript degrades to a coarser result and never rejects, so the caller
 * (the desktop picker or the orchestrator tool) always gets *some* context.
 */
import { execFile } from 'node:child_process';

import { logger } from '../../logger';

/** The four context shapes the UI distinguishes; mirrors the renderer's `AssistantContextKind`. */
export type DetectedContextKind = 'browser' | 'finder' | 'pdf' | 'other';

export interface DetectedContext {
	kind: DetectedContextKind;
	/** Frontmost application name, e.g. "Google Chrome". */
	app?: string;
	/** macOS bundle identifier, e.g. "com.google.Chrome". */
	bundleId?: string;
	/** Active window title. */
	windowTitle?: string;
	/** Active browser tab URL (Chromium/WebKit browsers only — not Firefox). */
	url?: string;
	/** Absolute folder path (Finder) or document file path (PDF/doc). */
	path?: string;
}

/** Raw frontmost-window metadata, before kind-specific enrichment. */
interface ActiveWindowInfo {
	app?: string;
	bundleId?: string;
	windowTitle?: string;
	url?: string;
}

function isMac(): boolean {
	return process.platform === 'darwin';
}

// Bundle ids whose active tab URL `get-windows` can read on macOS. Firefox is
// intentionally absent: neither get-windows nor AppleScript expose its URL.
const BROWSER_BUNDLE_IDS = new Set([
	'com.google.Chrome',
	'com.google.Chrome.canary',
	'com.apple.Safari',
	'com.apple.SafariTechnologyPreview',
	'company.thebrowser.Browser', // Arc
	'com.microsoft.edgemac',
	'com.brave.Browser',
	'com.operasoftware.Opera',
	'com.vivaldi.Vivaldi',
]);

// Browsers we still classify as 'browser' even though we cannot read their URL.
const URLLESS_BROWSER_BUNDLE_IDS = new Set([
	'org.mozilla.firefox',
	'org.mozilla.firefoxdeveloperedition',
]);

const PDF_BUNDLE_IDS = new Set(['com.apple.Preview', 'com.adobe.Reader', 'com.adobe.Acrobat.Pro']);

const FINDER_BUNDLE_ID = 'com.apple.finder';

/** Map an app's bundle id / title to one of the four UI kinds. */
export function deriveKind(info: ActiveWindowInfo): DetectedContextKind {
	const bundleId = info.bundleId ?? '';
	if (bundleId === FINDER_BUNDLE_ID) return 'finder';
	if (BROWSER_BUNDLE_IDS.has(bundleId) || URLLESS_BROWSER_BUNDLE_IDS.has(bundleId))
		return 'browser';
	if (PDF_BUNDLE_IDS.has(bundleId)) return 'pdf';
	if (info.windowTitle?.toLowerCase().endsWith('.pdf')) return 'pdf';
	return 'other';
}

/** Query the frontmost window via `get-windows`. Returns `{}` on any failure. */
export async function detectActiveWindow(): Promise<ActiveWindowInfo> {
	if (!isMac()) return {};
	try {
		// ESM-only module — loaded lazily so the native addon is only required
		// when detection actually runs (and never on unsupported platforms).
		const { activeWindow } = await import('get-windows');

		// get-windows spawns a helper binary that, by default, *hard-fails* its
		// upfront Screen-Recording / Accessibility permission check (a separately
		// spawned binary doesn't inherit the host app's TCC grant). So we try the
		// full call first — when permissions are present it yields title + URL —
		// and on failure retry with the permission gates disabled, which still
		// returns the app name + bundleId (enough for `kind` and the label), just
		// without title/URL. Graceful degradation rather than an empty context.
		let win: Awaited<ReturnType<typeof activeWindow>>;
		try {
			win = await activeWindow();
		} catch (gatedError) {
			logger.debug('Active-window full detection failed; retrying without permission gate', {
				error: gatedError instanceof Error ? gatedError.message : String(gatedError),
			});
			win = await activeWindow({
				screenRecordingPermission: false,
				accessibilityPermission: false,
			});
		}

		if (!win) {
			logger.warn('Active-window detection returned nothing (likely missing permission)');
			return {};
		}
		const info: ActiveWindowInfo = {
			app: win.owner?.name,
			bundleId: 'bundleId' in win.owner ? win.owner.bundleId : undefined,
			windowTitle: win.title || undefined,
			url: 'url' in win ? win.url : undefined,
		};
		logger.debug('Active-window detected', { ...info });
		return info;
	} catch (error) {
		// `warn` (not debug) so a silent empty context is never a mystery — this is
		// the line that says whether get-windows failed to load or the OS denied it.
		logger.warn('Active-window detection failed', {
			error: error instanceof Error ? error.message : String(error),
		});
		return {};
	}
}

/** Run a one-liner AppleScript, returning trimmed stdout or `undefined` on failure. */
async function runOsascript(script: string): Promise<string | undefined> {
	if (!isMac()) return undefined;
	return await new Promise<string | undefined>((resolve) => {
		execFile('osascript', ['-e', script], { timeout: 3000 }, (error, stdout) => {
			if (error) {
				logger.debug('osascript failed', { error: error.message });
				resolve(undefined);
				return;
			}
			const out = String(stdout).trim();
			resolve(out.length > 0 ? out : undefined);
		});
	});
}

/** Absolute POSIX path of the front Finder window's folder, or `undefined`. */
export async function detectFinderFolder(): Promise<string | undefined> {
	return await runOsascript(
		'tell application "Finder" to if (count of windows) > 0 then return POSIX path of (target of front window as alias)',
	);
}

/** Best-effort file path of the frontmost document in a PDF/document viewer. */
export async function detectDocumentPath(app: string | undefined): Promise<string | undefined> {
	if (!app) return undefined;
	// Preview/Acrobat expose `path of front document`; quote the app name so
	// names with spaces (e.g. "Adobe Acrobat") are handled.
	const escaped = app.replace(/"/g, '\\"');
	return await runOsascript(
		`tell application "${escaped}" to if (count of documents) > 0 then return path of front document`,
	);
}

/**
 * Detect the user's current context. Always resolves; on non-macOS or total
 * failure it returns `{ kind: 'other' }`.
 */
export async function detectActiveContext(): Promise<DetectedContext> {
	const info = await detectActiveWindow();
	const kind = deriveKind(info);

	const context: DetectedContext = {
		kind,
		app: info.app,
		bundleId: info.bundleId,
		windowTitle: info.windowTitle,
		url: info.url,
	};

	if (kind === 'finder') {
		context.path = await detectFinderFolder();
	} else if (kind === 'pdf') {
		context.path = (await detectDocumentPath(info.app)) ?? context.path;
	}

	return context;
}
