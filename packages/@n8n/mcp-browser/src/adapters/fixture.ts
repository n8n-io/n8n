import { UnsupportedOperationError } from '../errors';
import type {
	Adapter,
	ClickOptions,
	ConnectConfig,
	Cookie,
	ConsoleEntry,
	ElementTarget,
	HtmlProbeResult,
	ModalState,
	NavigateResult,
	NetworkEntry,
	PageInfo,
	ScreenshotOptions,
	ScrollOptions,
	SnapshotResult,
	TypeOptions,
	WaitOptions,
} from '../types';

// ---------------------------------------------------------------------------
// Fixture bundle — the cross-repo contract with LangTracer's `CuFixtureBundle`
// (packages/shared/src/types/cu-fixture.ts). Keep these in lockstep; bump
// `version` on any shape change. A bundle is a small page-state machine
// recorded from a real browser-use conversation (the LangTracer import IS the
// recorder) and replayed here with no real browser.
// ---------------------------------------------------------------------------

export interface FixturePageState {
	id: string;
	url: string;
	/** ARIA accessibility tree (what `browser_snapshot` returns). */
	ariaTree: string;
	/** Page HTML for `probePageHtml` — optional; import-derived bundles carry
	 *  the tree, not HTML (probe HTML is server-side enrichment only). */
	html?: string;
	/** ref → value, for `getElementValue` (secret capture by ref). */
	elementValues?: Record<string, string>;
	/** `[REDACTED:…]` marker → value, for capture by redacted-key (see
	 *  `resolveRedactedSecret`). Lets the redacted-key capture path replay
	 *  without re-deriving markers from page HTML. */
	redactedSecrets?: Record<string, string>;
}

export type FixtureAction =
	| { tool: 'browser_navigate'; url: string }
	| { tool: 'browser_click'; selector: string }
	| { tool: 'browser_type'; selector: string };

export interface FixtureTransition {
	from: string;
	action: FixtureAction;
	to: string;
}

export interface FixtureBundle {
	version: number;
	initialStateId: string;
	states: FixturePageState[];
	transitions: FixtureTransition[];
	sourceThreadId?: string;
}

/** Env var pointing at a JSON fixture-bundle file, used when the bundle isn't
 *  passed programmatically (the eval server sets this per scenario). */
export const FIXTURE_BUNDLE_ENV = 'N8N_EVAL_BROWSER_FIXTURES';

/** Load a bundle from the {@link FIXTURE_BUNDLE_ENV} path. Throws a clear error
 *  when the env var is unset or the file can't be read/parsed — the fixture
 *  adapter is useless without a bundle. */
export async function loadFixtureBundleFromEnv(): Promise<FixtureBundle> {
	const path = process.env[FIXTURE_BUNDLE_ENV];
	if (!path) {
		throw new Error(`Fixture adapter selected but ${FIXTURE_BUNDLE_ENV} is not set`);
	}
	const { readFile } = await import('node:fs/promises');
	const raw = await readFile(path, 'utf8');
	return JSON.parse(raw) as FixtureBundle;
}

const PAGE_ID = 'fixture-page-1';
/** Bundle shape this adapter understands. Must match LangTracer's
 *  `CU_FIXTURE_BUNDLE_VERSION` (cross-repo contract; bump both in lockstep). */
const SUPPORTED_FIXTURE_BUNDLE_VERSION = 1;
// 1x1 transparent PNG — a placeholder for the rare screenshot request.
const BLANK_PNG =
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function selectorOf(target: ElementTarget): string {
	return 'selector' in target ? target.selector : target.ref;
}

/**
 * Deterministic browser Adapter that replays a recorded fixture bundle — no
 * real Chrome, extension, CDP relay, or daemon. Everything ABOVE the adapter
 * (tool wrappers, enrichment, jsdom sensitivity analysis, redaction, secret
 * capture → create_credential) runs for real; only browser I/O is served from
 * the bundle. See goal `computer-use-evals`.
 */
export class FixtureAdapter implements Adapter {
	onDisconnect?: (reason: import('../errors').ConnectionLostReason) => void;

	private readonly states: Map<string, FixturePageState>;
	private currentId: string;
	/** Set when an action has no matching transition — the agent walked off the
	 *  recorded trajectory. We serve a legible "no fixture" page rather than
	 *  crash, so the run fails cleanly and the grader can see it. */
	private deadEnd = false;

	/** Set when the bundle's `version` isn't one this adapter understands — a
	 *  cross-repo contract guard. LangTracer's builder stamps `version`; a bundle
	 *  from a drifted/newer shape must fail LOUDLY (a legible error page) rather
	 *  than mis-replay as silent dead-ends indistinguishable from a real failure. */
	private readonly unsupportedVersion: boolean;

	constructor(private readonly bundle: FixtureBundle) {
		this.states = new Map(bundle.states.map((s) => [s.id, s]));
		this.currentId = bundle.initialStateId;
		if (!this.states.has(this.currentId) && bundle.states.length > 0) {
			this.currentId = bundle.states[0].id;
		}
		this.unsupportedVersion = bundle.version !== SUPPORTED_FIXTURE_BUNDLE_VERSION;
		if (this.unsupportedVersion) {
			console.warn(
				`[fixture] unsupported CuFixtureBundle version ${String(bundle.version)} ` +
					`(this adapter supports ${SUPPORTED_FIXTURE_BUNDLE_VERSION}) — serving an error page. ` +
					`Rebuild the fixture or align the adapter/LangTracer contract.`,
			);
		}
	}

	// --- lifecycle -----------------------------------------------------------
	async launch(_config: ConnectConfig): Promise<void> {
		this.currentId = this.bundle.initialStateId;
		this.deadEnd = false;
	}
	async close(): Promise<void> {}

	// --- current-state helpers ----------------------------------------------
	private state(): FixturePageState | undefined {
		return this.states.get(this.currentId);
	}
	private currentUrl(): string {
		return this.state()?.url ?? '';
	}
	private advance(match: (a: FixtureAction) => boolean): void {
		const t = this.bundle.transitions.find((tr) => tr.from === this.currentId && match(tr.action));
		if (t && this.states.has(t.to)) {
			this.currentId = t.to;
			this.deadEnd = false;
		} else {
			this.deadEnd = true;
		}
	}

	// --- tabs (single-tab model) --------------------------------------------
	async listTabs(): Promise<PageInfo[]> {
		return [{ id: PAGE_ID, title: '', url: this.currentUrl() }];
	}
	async listTabIds(): Promise<string[]> {
		return [PAGE_ID];
	}
	async listTabSessionIds(): Promise<string[]> {
		return [PAGE_ID];
	}
	async newPage(_url?: string): Promise<PageInfo> {
		return { id: PAGE_ID, title: '', url: this.currentUrl() };
	}
	async closePage(_pageId: string): Promise<void> {}
	async focusPage(_pageId: string): Promise<void> {}

	// --- navigation ----------------------------------------------------------
	private navResult(): NavigateResult {
		return { title: '', url: this.currentUrl(), status: this.deadEnd ? 404 : 200 };
	}
	async navigate(_pageId: string, url: string): Promise<NavigateResult> {
		this.advance((a) => a.tool === 'browser_navigate' && a.url === url);
		// Fallback: a recorded state with this exact url, reachable directly.
		if (this.deadEnd) {
			const target = [...this.states.values()].find((s) => s.url === url);
			if (target) {
				this.currentId = target.id;
				this.deadEnd = false;
			}
		}
		return this.navResult();
	}
	async back(_pageId: string): Promise<NavigateResult> {
		return this.navResult();
	}
	async forward(_pageId: string): Promise<NavigateResult> {
		return this.navResult();
	}
	async reload(_pageId: string): Promise<NavigateResult> {
		return this.navResult();
	}

	// --- interaction ---------------------------------------------------------
	async click(_pageId: string, target: ElementTarget, _options?: ClickOptions): Promise<void> {
		const selector = selectorOf(target);
		this.advance((a) => a.tool === 'browser_click' && a.selector === selector);
	}
	async type(
		_pageId: string,
		target: ElementTarget,
		_text: string,
		_options?: TypeOptions,
	): Promise<void> {
		const selector = selectorOf(target);
		this.advance((a) => a.tool === 'browser_type' && a.selector === selector);
	}
	async select(_pageId: string, _target: ElementTarget, values: string[]): Promise<string[]> {
		return values;
	}
	async hover(_pageId: string, _target: ElementTarget): Promise<void> {}
	async press(_pageId: string, _keys: string): Promise<void> {}
	async drag(_pageId: string, _from: ElementTarget, _to: ElementTarget): Promise<void> {}
	async scroll(_pageId: string, _target?: ElementTarget, _options?: ScrollOptions): Promise<void> {}
	async upload(
		_pageId: string,
		_target: ElementTarget | undefined,
		_files: string[],
	): Promise<void> {}
	async dialog(_pageId: string, _action: 'accept' | 'dismiss', text?: string): Promise<string> {
		return text ?? '';
	}

	// --- inspection ----------------------------------------------------------
	async snapshot(): Promise<SnapshotResult> {
		if (this.unsupportedVersion) {
			return {
				tree: `- text "Fixture bundle version ${String(this.bundle.version)} is not supported by this n8n build (expected ${SUPPORTED_FIXTURE_BUNDLE_VERSION})."`,
				refCount: 0,
			};
		}
		if (this.deadEnd) {
			const tree = `- text "No fixture page for this state (url: ${this.currentUrl()}); the agent left the recorded trajectory."`;
			return { tree, refCount: 0 };
		}
		const tree = this.state()?.ariaTree ?? '';
		const refCount = (tree.match(/\[ref=[^\]]+\]/g) ?? []).length;
		return { tree, refCount };
	}
	async probePageHtml(): Promise<HtmlProbeResult> {
		const html = this.deadEnd ? '' : (this.state()?.html ?? '');
		return {
			ok: true,
			root: { kind: 'document', html, url: this.currentUrl(), children: [], errors: [] },
		};
	}
	async screenshot(): Promise<string> {
		return BLANK_PNG;
	}
	async getText(): Promise<string> {
		return this.deadEnd ? '' : (this.state()?.ariaTree ?? '');
	}
	async getContent(): Promise<{ html: string; url: string }> {
		return { html: this.state()?.html ?? '', url: this.currentUrl() };
	}
	async evaluate(): Promise<unknown> {
		return null;
	}
	async getConsole(): Promise<ConsoleEntry[]> {
		return [];
	}
	getConsoleSummary(): { errors: number; warnings: number } {
		return { errors: 0, warnings: 0 };
	}
	getModalStates(): ModalState[] {
		return [];
	}
	async getNetwork(): Promise<NetworkEntry[]> {
		return [];
	}
	async pdf(): Promise<{ data: string; pages: number }> {
		throw new UnsupportedOperationError('pdf', 'fixture');
	}

	// --- wait ----------------------------------------------------------------
	async wait(_pageId: string, _options: WaitOptions): Promise<number> {
		return 0;
	}
	async waitForCompletion<T>(_pageId: string, action: () => Promise<T>): Promise<T> {
		return await action();
	}

	// --- state (no persistence) ---------------------------------------------
	async getCookies(): Promise<Cookie[]> {
		return [];
	}
	async setCookies(): Promise<void> {}
	async clearCookies(): Promise<void> {}
	async getStorage(): Promise<Record<string, string>> {
		return {};
	}
	async setStorage(): Promise<void> {}
	async clearStorage(): Promise<void> {}

	// --- sync helpers --------------------------------------------------------
	getPageUrl(): string | undefined {
		return this.currentUrl();
	}

	// --- credential capture --------------------------------------------------
	/** Resolve a `[REDACTED:…]` marker to its recorded synthetic secret, so the
	 *  redacted-key capture path replays without re-deriving markers from HTML
	 *  (fixtures carry no page HTML). Undefined ⇒ fall back to the HTML path. */
	async resolveRedactedSecret(_pageId: string, marker: string): Promise<string | undefined> {
		if (this.deadEnd) return undefined;
		return this.state()?.redactedSecrets?.[marker];
	}

	async getElementValue(_pageId: string, target: ElementTarget): Promise<string> {
		if (this.deadEnd) throw new UnsupportedOperationError('getElementValue (dead-end)', 'fixture');
		const ref = selectorOf(target);
		const value = this.state()?.elementValues?.[ref];
		if (value === undefined) {
			throw new UnsupportedOperationError(
				`getElementValue (no recorded value for ${ref})`,
				'fixture',
			);
		}
		return value;
	}
}
