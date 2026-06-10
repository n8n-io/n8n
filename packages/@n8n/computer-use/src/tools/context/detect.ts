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

/** The context shapes the UI distinguishes; mirrors the renderer's `AssistantContextKind`. */
export type DetectedContextKind = 'browser' | 'finder' | 'pdf' | 'calendar' | 'email' | 'other';

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

// Common calendar apps. (Google Calendar etc. live in the browser → 'browser'.)
const CALENDAR_BUNDLE_IDS = new Set([
	'com.apple.iCal',
	'com.flexibits.fantastical2.mac',
	'com.busymac.busycal3',
	'com.readdle.calendars-mac',
]);

// Common desktop email clients. (Outlook is mail-first; webmail lives in the browser.)
const EMAIL_BUNDLE_IDS = new Set([
	'com.apple.mail',
	'com.microsoft.Outlook',
	'com.readdle.smartemail-Mac', // Spark
	'org.mozilla.thunderbird',
	'com.airmailapp.airmail2',
]);

const FINDER_BUNDLE_ID = 'com.apple.finder';

/** Map an app's bundle id / title to one of the UI kinds. */
export function deriveKind(info: WindowInfo): DetectedContextKind {
	const bundleId = info.bundleId ?? '';
	if (bundleId === FINDER_BUNDLE_ID) return 'finder';
	if (BROWSER_BUNDLE_IDS.has(bundleId) || URLLESS_BROWSER_BUNDLE_IDS.has(bundleId))
		return 'browser';
	if (CALENDAR_BUNDLE_IDS.has(bundleId)) return 'calendar';
	if (EMAIL_BUNDLE_IDS.has(bundleId)) return 'email';
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

/** Run an AppleScript that emits one value per line; returns the trimmed, non-empty lines. */
async function runOsascriptLines(script: string): Promise<string[]> {
	const out = await runOsascript(script);
	if (!out) return [];
	return out
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
}

/** Absolute POSIX folder path of *every* open Finder window (front-to-back). */
export async function detectFinderFolders(): Promise<string[]> {
	// Accumulate into a newline-joined string and `return` it (osascript `log`
	// goes to stderr, which we don't read).
	const script = [
		'tell application "Finder"',
		'set out to ""',
		'repeat with w in windows',
		'try',
		'set out to out & POSIX path of (target of w as alias) & linefeed',
		'end try',
		'end repeat',
		'return out',
		'end tell',
	].join('\n');
	return await runOsascriptLines(script);
}

/** File path of *every* open document in a PDF/document viewer (front-to-back). */
export async function detectDocumentPaths(app: string | undefined): Promise<string[]> {
	if (!app) return [];
	const escaped = app.replace(/"/g, '\\"');
	const script = [
		`tell application "${escaped}"`,
		'set out to ""',
		'repeat with d in documents',
		'try',
		'set out to out & (path of d) & linefeed',
		'end try',
		'end repeat',
		'return out',
		'end tell',
	].join('\n');
	return await runOsascriptLines(script);
}

/** Last path segment, for a short folder/document label. */
function basename(p: string): string {
	return p.replace(/\/+$/, '').split('/').pop() ?? p;
}

/** Stable identity used to condense windows that point at the same context. */
function contextIdentity(context: DetectedContext): string {
	switch (context.kind) {
		case 'finder':
			return `finder:${context.path ?? context.app ?? ''}`;
		case 'pdf':
			return `pdf:${context.path ?? context.windowTitle ?? context.app ?? ''}`;
		case 'browser':
			return `browser:${context.url ?? context.windowTitle ?? context.app ?? ''}`;
		default:
			// calendar / email / other — app-level, one entry per app.
			return `${context.kind}:${context.app ?? ''}`;
	}
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
 * Detect every open window the user could pick as context, ordered front-to-back
 * and deduped by *context identity* rather than by app:
 *
 * - Finder/PDF windows are condensed by their folder / document path — two
 *   windows on the same Downloads folder collapse to one, but Desktop and
 *   Downloads (or PDF A and PDF B) stay separate. Paths come from enumerating
 *   every Finder window / open document via osascript (get-windows only exposes
 *   the frontmost window's path).
 * - Browser windows are condensed by URL; other apps to one entry per app.
 *
 * Empty on non-macOS or failure.
 *
 * Limitation: get-windows uses macOS's on-screen window list, which only covers
 * the *current* Space — windows on other Spaces aren't returned. There's no
 * option to enumerate across Spaces without private CoreGraphics / Accessibility
 * APIs, so the picker reflects the Space the assistant was opened on.
 */
export async function detectOpenContexts(): Promise<DetectedContext[]> {
	const windows = await withGetWindows(async (gw, options) => await gw.openWindows(options));
	if (!windows || windows.length === 0) return [];

	const infos = windows
		.map(toWindowInfo)
		.filter((info): info is WindowInfo & { app: string } => Boolean(info.app));
	const kinds = infos.map((info) => ({ info, kind: deriveKind(info) }));

	// Enumerate Finder folders and per-app document paths up front — get-windows
	// can't tell us the folder/document behind each window, only osascript can.
	const finderFolders = kinds.some((entry) => entry.kind === 'finder')
		? await detectFinderFolders()
		: [];
	const documentApps = [...new Set(kinds.filter((e) => e.kind === 'pdf').map((e) => e.info.app))];
	const documentsByApp = new Map<string, string[]>();
	await Promise.all(
		documentApps.map(async (appName) =>
			documentsByApp.set(appName, await detectDocumentPaths(appName)),
		),
	);

	const contexts: DetectedContext[] = [];
	const seen = new Set<string>();
	const add = (context: DetectedContext) => {
		const key = contextIdentity(context);
		if (seen.has(key)) return;
		seen.add(key);
		contexts.push({ ...context, id: context.id ?? key });
	};

	// Emit the Finder / document clusters once, at the position of that app's
	// frontmost window so ordering still tracks front-to-back.
	const clustered = new Set<string>();
	for (const { info, kind } of kinds) {
		if (kind === 'finder') {
			if (clustered.has('finder')) continue;
			clustered.add('finder');
			const base = { kind, app: info.app, bundleId: info.bundleId };
			if (finderFolders.length) {
				for (const folder of finderFolders)
					add({ ...base, windowTitle: basename(folder), path: folder });
			} else {
				add({ ...base, windowTitle: info.windowTitle }); // path unknown (e.g. no Automation)
			}
		} else if (kind === 'pdf') {
			if (clustered.has(`pdf:${info.app}`)) continue;
			clustered.add(`pdf:${info.app}`);
			const base = { kind, app: info.app, bundleId: info.bundleId };
			const documents = documentsByApp.get(info.app) ?? [];
			if (documents.length) {
				for (const doc of documents) add({ ...base, windowTitle: basename(doc), path: doc });
			} else {
				add({ ...base, windowTitle: info.windowTitle });
			}
		} else if (kind === 'browser') {
			add({
				kind,
				id: info.id,
				app: info.app,
				bundleId: info.bundleId,
				windowTitle: info.windowTitle,
				url: info.url,
			});
		} else {
			add({
				kind,
				id: info.id,
				app: info.app,
				bundleId: info.bundleId,
				windowTitle: info.windowTitle,
			});
		}
	}

	return contexts;
}
