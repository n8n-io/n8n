/**
 * Local "what is the user looking at" detection.
 *
 * Hybrid, macOS-first: `get-windows` (active-win) supplies the app, window
 * title, bundle id and — for Chromium/WebKit browsers — the active tab URL;
 * `osascript` fills in what it cannot (the Finder front-window folder, and a
 * best-effort document path). Every function is defensive: a missing
 * permission, an unsupported platform or a thrown AppleScript degrades to a
 * coarser result and never rejects, so the caller (the desktop picker or the
 * orchestrator tool) always gets *some* context.
 */
// `get-windows` is ESM-only and loaded lazily via dynamic `import()` below; this
// top-level import is type-only (erased at runtime) — it just gives us its types.
import type * as GetWindows from 'get-windows';
import { execFile } from 'node:child_process';

import { logger } from '../../logger';

/** The four context shapes the UI distinguishes; mirrors the renderer's `AssistantContextKind`. */
export type DetectedContextKind = 'browser' | 'finder' | 'pdf' | 'other';

export interface DetectedContext {
	/** Stable per-window id (from get-windows), so the picker can key/select. */
	id?: string;
	kind: DetectedContextKind;
	/** Application name, e.g. "Google Chrome". */
	app?: string;
	/** macOS bundle identifier, e.g. "com.google.Chrome". */
	bundleId?: string;
	/** Window title. */
	windowTitle?: string;
	/** Browser tab URL (Chromium/WebKit browsers only — not Firefox). */
	url?: string;
	/** Absolute folder path (Finder) or document file path (PDF/doc). */
	path?: string;
}

/** Raw window metadata, before kind-specific enrichment. */
interface WindowInfo {
	id?: string;
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
export function deriveKind(info: WindowInfo): DetectedContextKind {
	const bundleId = info.bundleId ?? '';
	if (bundleId === FINDER_BUNDLE_ID) return 'finder';
	if (BROWSER_BUNDLE_IDS.has(bundleId) || URLLESS_BROWSER_BUNDLE_IDS.has(bundleId))
		return 'browser';
	if (PDF_BUNDLE_IDS.has(bundleId)) return 'pdf';
	if (info.windowTitle?.toLowerCase().endsWith('.pdf')) return 'pdf';
	return 'other';
}

type GetWindowsModule = typeof GetWindows;
type GetWindowsResult = NonNullable<Awaited<ReturnType<GetWindowsModule['activeWindow']>>>;

/**
 * Load get-windows and run a query against it, with the permission fallback.
 *
 * The get-windows helper binary *hard-fails* its upfront Screen-Recording /
 * Accessibility permission check (a separately spawned binary doesn't inherit
 * the host app's TCC grant). So we try the full call first — when permissions
 * are present it yields title + URL — and on failure retry with the permission
 * gates disabled, which still returns app name + bundleId (enough for `kind`
 * and a label), just without title/URL. Returns `undefined` on total failure.
 */
async function withGetWindows<T>(
	run: (gw: GetWindowsModule, options?: GetWindows.Options) => Promise<T>,
): Promise<T | undefined> {
	if (!isMac()) return undefined;
	try {
		// ESM-only module — loaded lazily so the helper is only required when
		// detection actually runs (and never on unsupported platforms).
		const gw = await import('get-windows');
		try {
			return await run(gw);
		} catch (gatedError) {
			logger.debug('get-windows full call failed; retrying without permission gate', {
				error: gatedError instanceof Error ? gatedError.message : String(gatedError),
			});
			return await run(gw, { screenRecordingPermission: false, accessibilityPermission: false });
		}
	} catch (error) {
		// `warn` (not debug) so a silent empty context is never a mystery.
		logger.warn('get-windows query failed', {
			error: error instanceof Error ? error.message : String(error),
		});
		return undefined;
	}
}

/** Map a raw get-windows result to our intermediate shape. */
function toWindowInfo(win: GetWindowsResult): WindowInfo {
	return {
		id: win.id !== undefined ? String(win.id) : undefined,
		app: win.owner?.name,
		bundleId: 'bundleId' in win.owner ? win.owner.bundleId : undefined,
		windowTitle: win.title || undefined,
		url: 'url' in win ? win.url : undefined,
	};
}

/** Query the frontmost window. Returns `{}` on any failure. */
export async function detectActiveWindow(): Promise<WindowInfo> {
	const win = await withGetWindows(async (gw, options) => await gw.activeWindow(options));
	return win ? toWindowInfo(win) : {};
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

/** Derive kind and enrich a window's path (Finder folder / document path). */
async function buildContext(info: WindowInfo): Promise<DetectedContext> {
	const kind = deriveKind(info);
	const context: DetectedContext = {
		id: info.id,
		kind,
		app: info.app,
		bundleId: info.bundleId,
		windowTitle: info.windowTitle,
		url: info.url,
	};
	if (kind === 'finder') {
		context.path = await detectFinderFolder();
	} else if (kind === 'pdf') {
		context.path = await detectDocumentPath(info.app);
	}
	return context;
}

/**
 * Detect the user's frontmost context. Always resolves; on non-macOS or total
 * failure it returns `{ kind: 'other' }`. Used by the orchestrator MCP tool.
 */
export async function detectActiveContext(): Promise<DetectedContext> {
	return await buildContext(await detectActiveWindow());
}

/**
 * Detect every open window the user could pick as context — one entry per app
 * (the app's frontmost window), ordered front-to-back, enriched with the Finder
 * folder / document path where applicable. Empty on non-macOS or failure.
 */
export async function detectOpenContexts(): Promise<DetectedContext[]> {
	const windows = await withGetWindows(async (gw, options) => await gw.openWindows(options));
	if (!windows || windows.length === 0) return [];

	// Dedupe to one window per app (keep the frontmost — `openWindows` is ordered
	// front-to-back), dropping anything without an app name.
	const seen = new Set<string>();
	const perApp: WindowInfo[] = [];
	for (const win of windows) {
		const info = toWindowInfo(win);
		if (!info.app) continue;
		const key = info.bundleId ?? info.app;
		if (seen.has(key)) continue;
		seen.add(key);
		perApp.push(info);
	}

	return await Promise.all(perApp.map(buildContext));
}
