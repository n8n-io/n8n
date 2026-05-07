import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { CDPRelayServer } from '../cdp-relay';
import {
	BrowserExecutableNotFoundError,
	PageNotFoundError,
	UnsupportedOperationError,
	type ConnectionLostReason,
} from '../errors';
import { createLogger } from '../logger';
import type {
	Adapter,
	ClickOptions,
	ConnectConfig,
	ConsoleEntry,
	Cookie,
	ElementTarget,
	ModalState,
	NavigateResult,
	NetworkEntry,
	PageInfo,
	ResolvedConfig,
	ScreenshotOptions,
	ScrollOptions,
	SnapshotResult,
	TypeOptions,
	WaitOptions,
} from '../types';

const log = createLogger('agent-browser');

const execFileAsync = promisify(execFile);

const SESSION_NAME = 'n8n-computer-use';
// Stable extension ID derived from the "key" field in mcp-browser-extension/manifest.json
const BROWSER_USE_EXTENSION_ID = 'cegmdpndekdfpnafgacidejijecomlhh';

interface TabData {
	tabId: string;
	title: string;
	url: string;
	active: boolean;
}

interface AgentBrowserResponse {
	success: boolean;
	data?: unknown;
	error?: string | null;
}

export class AgentBrowserAdapter implements Adapter {
	readonly name = 'agent-browser';

	private resolvedConfig: ResolvedConfig;
	private relay?: CDPRelayServer;
	private cdpEndpoint?: string;
	private urlCache = new Map<string, string>();
	private tabCache: TabData[] = [];

	onDisconnect?: (reason: ConnectionLostReason) => void;

	constructor(config: ResolvedConfig) {
		this.resolvedConfig = config;
	}

	// =========================================================================
	// Private helpers
	// =========================================================================

	private async run(args: string[], timeoutMs = 30_000): Promise<AgentBrowserResponse> {
		log.debug('run:', args[0]);
		const cdpArgs = this.cdpEndpoint ? ['--cdp', this.cdpEndpoint] : [];
		try {
			const { stdout } = await execFileAsync(
				'agent-browser',
				['--json', '--session', SESSION_NAME, ...cdpArgs, ...args],
				{ encoding: 'utf8', timeout: timeoutMs },
			);
			const out = stdout?.trim() ?? '';
			if (!out) return { success: true };
			try {
				return JSON.parse(out) as AgentBrowserResponse;
			} catch {
				return { success: true };
			}
		} catch (execError) {
			const e = execError as { stderr?: string; stdout?: string; message?: string };
			const detail = e.stderr?.trim() ?? e.stdout?.trim();

			log.error('agent-browser execution error', { error: e });
			throw new Error(detail ?? e.message ?? 'agent-browser failed');
		}
	}

	private async refreshTabs(): Promise<TabData[]> {
		try {
			const response = await this.run(['tab', 'list']);
			const data = response.data as { tabs?: TabData[] } | undefined;
			this.tabCache = data?.tabs ?? [];
			for (const tab of this.tabCache) {
				this.urlCache.set(tab.tabId, tab.url);
			}
		} catch (e) {
			log.debug('refreshTabs failed, assuming no active tabs available', { error: e });
			this.tabCache = [];
			this.urlCache.clear();
		}
		return this.tabCache;
	}

	private async switchToTab(pageId: string): Promise<void> {
		let tab = this.tabCache.find((t) => t.tabId === pageId);
		if (!tab) {
			await this.refreshTabs();
			tab = this.tabCache.find((t) => t.tabId === pageId);
			if (!tab) throw new PageNotFoundError(pageId);
		}
		if (tab.active) return;
		await this.run(['tab', tab.tabId]);
		for (const t of this.tabCache) t.active = t.tabId === pageId;
	}

	private resolveTarget(target: ElementTarget): string {
		const value =
			'ref' in target
				? target.ref.startsWith('@')
					? target.ref
					: `@${target.ref}`
				: target.selector;
		return AgentBrowserAdapter.assertSafeArg(value, 'element target');
	}

	private static assertSafeArg(value: string, role: string): string {
		if (value.length > 1 && value.startsWith('-')) {
			throw new Error(
				`Invalid ${role}: argument cannot start with '-' (got: ${JSON.stringify(value.slice(0, 20))})`,
			);
		}
		return value;
	}

	private async runAction(args: string[]): Promise<void> {
		const resp = await this.run(args);
		if (!resp.success) {
			throw new Error(resp.error ?? 'agent-browser action failed');
		}
	}

	private async navResult(pageId: string): Promise<NavigateResult> {
		const tabs = await this.refreshTabs();
		const tab = tabs.find((t) => t.tabId === pageId);
		return { title: tab?.title ?? '', url: tab?.url ?? '', status: 0 };
	}

	/** Kill the agent-browser session directly (no --cdp, no relay dependency). */
	private async killSession(): Promise<void> {
		try {
			await execFileAsync('agent-browser', ['--session', SESSION_NAME, 'close'], {
				timeout: 5_000,
			});
		} catch {
			// no existing session — that's fine
		}
	}

	// =========================================================================
	// Lifecycle
	// =========================================================================

	async launch(config: ConnectConfig): Promise<void> {
		log.debug('launch: killing stale session');
		await this.killSession();
		log.debug('launch: stale session killed');

		const browserInfo = this.resolvedConfig.browsers.get(config.browser);
		const chromePath = browserInfo?.executablePath;
		if (!chromePath) throw new BrowserExecutableNotFoundError(config.browser);
		log.debug('launch: browser executable:', chromePath);

		this.relay = new CDPRelayServer();
		log.debug('launch: starting relay');
		const port = await this.relay.listen();
		log.debug('launch: relay listening on port', port);
		const extensionEndpoint = this.relay.extensionEndpoint(port);

		const connectUrl =
			`chrome-extension://${BROWSER_USE_EXTENSION_ID}/connect.html` +
			`?mcpRelayUrl=${encodeURIComponent(extensionEndpoint)}`;
		log.debug('launch: opening browser at', connectUrl);

		await new Promise<void>((resolve, reject) => {
			const child = execFile(chromePath, [connectUrl]);
			const earlyFailTimer = setTimeout(() => resolve(), 2_000);
			child.on('error', (error: Error) => {
				clearTimeout(earlyFailTimer);
				reject(new BrowserExecutableNotFoundError(`${config.browser} (${error.message})`));
			});
		});
		log.debug('launch: browser launched (2 s early-fail window passed)');

		log.debug('launch: waiting for extension to connect');
		await this.relay.waitForExtension({ browserWasLaunched: true });
		log.debug('launch: extension connected');

		this.cdpEndpoint = this.relay.cdpEndpoint(port);
		log.debug('launch: cdp endpoint:', this.cdpEndpoint);

		this.relay.onExtensionDisconnect = (reason) => {
			log.debug('relay: extension disconnected, reason:', reason);
			this.onDisconnect?.(reason);
		};

		log.debug('launch: refreshing tabs');
		await this.refreshTabs();
		log.debug('launch: complete, tabs:', this.tabCache.length);
	}

	async close(): Promise<void> {
		if (this.relay) {
			this.relay.stop();
			this.relay = undefined;
		}
		this.cdpEndpoint = undefined;
		try {
			await this.killSession();
		} catch {
			// session may already be gone
		}
		this.urlCache.clear();
		this.tabCache = [];
	}

	// =========================================================================
	// Tabs
	// =========================================================================

	async listTabs(): Promise<PageInfo[]> {
		return (await this.refreshTabs()).map((t) => ({ id: t.tabId, title: t.title, url: t.url }));
	}

	async listTabSessionIds(): Promise<string[]> {
		return await Promise.resolve(this.tabCache.map((t) => t.tabId));
	}

	async listTabIds(): Promise<string[]> {
		return (await this.listTabs()).map((t) => t.id);
	}

	async newPage(url?: string): Promise<PageInfo> {
		if (url) AgentBrowserAdapter.assertSafeArg(url, 'URL');
		await this.run(['tab', 'new', ...(url ? [url] : [])]);
		const tabs = await this.refreshTabs();
		const active = tabs.find((t) => t.active) ?? tabs[tabs.length - 1];
		if (!active) throw new Error('Failed to create new tab');
		return { id: active.tabId, title: active.title, url: active.url };
	}

	async closePage(pageId: string): Promise<void> {
		await this.switchToTab(pageId);
		await this.run(['tab', 'close']);
		this.tabCache = this.tabCache.filter((t) => t.tabId !== pageId);
		this.urlCache.delete(pageId);
	}

	async focusPage(pageId: string): Promise<void> {
		await this.switchToTab(pageId);
	}

	// =========================================================================
	// Navigation
	// =========================================================================

	async navigate(
		pageId: string,
		url: string,
		_waitUntil?: 'load' | 'domcontentloaded' | 'networkidle',
	): Promise<NavigateResult> {
		AgentBrowserAdapter.assertSafeArg(url, 'URL');
		await this.switchToTab(pageId);
		await this.run(['open', url]);
		const tabs = await this.refreshTabs();
		const tab = tabs.find((t) => t.tabId === pageId);
		const currentUrl = tab?.url ?? url;
		this.urlCache.set(pageId, currentUrl);
		return { title: tab?.title ?? '', url: currentUrl, status: 200 };
	}

	async back(pageId: string): Promise<NavigateResult> {
		await this.switchToTab(pageId);
		await this.run(['back']);
		return await this.navResult(pageId);
	}

	async forward(pageId: string): Promise<NavigateResult> {
		await this.switchToTab(pageId);
		await this.run(['forward']);
		return await this.navResult(pageId);
	}

	async reload(
		pageId: string,
		_waitUntil?: 'load' | 'domcontentloaded' | 'networkidle',
	): Promise<NavigateResult> {
		await this.switchToTab(pageId);
		await this.run(['reload']);
		return await this.navResult(pageId);
	}

	// =========================================================================
	// Interaction
	// =========================================================================

	async click(pageId: string, target: ElementTarget, options?: ClickOptions): Promise<void> {
		await this.switchToTab(pageId);
		await this.runAction([
			options?.clickCount === 2 ? 'dblclick' : 'click',
			this.resolveTarget(target),
		]);
	}

	async type(
		pageId: string,
		target: ElementTarget,
		text: string,
		options?: TypeOptions,
	): Promise<void> {
		await this.switchToTab(pageId);
		const ref = this.resolveTarget(target);
		const baseCmd = options?.clear ? 'fill' : 'type';

		// agent-browser's CLI scans all raw args for "--help"/"-h" before parsing,
		// so any arg starting with "-" would be misinterpreted as a flag.
		// Peel each leading "-" into a separate type call so no single arg starts with "-".
		let remaining = text;
		let firstChunk = true;
		while (remaining.startsWith('-')) {
			await this.runAction([firstChunk ? baseCmd : 'type', ref, '-']);
			remaining = remaining.slice(1);
			firstChunk = false;
		}
		if (remaining.length > 0 || firstChunk) {
			await this.runAction([firstChunk ? baseCmd : 'type', ref, remaining]);
		}

		if (options?.submit) await this.runAction(['press', 'Enter']);
	}

	async select(pageId: string, target: ElementTarget, values: string[]): Promise<string[]> {
		await this.switchToTab(pageId);
		// Click to focus the <select> element (agent-browser does not inject aria-ref attributes)
		await this.runAction(['click', this.resolveTarget(target)]);
		// Set the value on document.activeElement, which is the <select> after click
		const script =
			'(function(){' +
			'const el=document.activeElement;' +
			'if(!el||el.tagName!=="SELECT")return[];' +
			`const v=${JSON.stringify(values)};` +
			'Array.from(el.options).forEach(o=>o.selected=v.includes(o.value)||v.includes(o.text.trim()));' +
			"el.dispatchEvent(new Event('change',{bubbles:true}));" +
			'return Array.from(el.selectedOptions).map(o=>o.value);})()';
		const resp = await this.run(['eval', script]);
		if (!resp.success) throw new Error(resp.error ?? 'select failed');
		return Array.isArray(resp.data) ? (resp.data as string[]) : values;
	}

	async hover(pageId: string, target: ElementTarget): Promise<void> {
		await this.switchToTab(pageId);
		await this.runAction(['hover', this.resolveTarget(target)]);
	}

	async press(pageId: string, keys: string): Promise<void> {
		AgentBrowserAdapter.assertSafeArg(keys, 'key');
		await this.switchToTab(pageId);
		await this.runAction(['press', keys]);
	}

	async drag(_pageId: string, _from: ElementTarget, _to: ElementTarget): Promise<void> {
		await Promise.resolve();
		throw new UnsupportedOperationError('drag', this.name);
	}

	async scroll(pageId: string, target?: ElementTarget, options?: ScrollOptions): Promise<void> {
		await this.switchToTab(pageId);
		if (target) {
			await this.runAction(['scrollintoview', this.resolveTarget(target)]);
		} else {
			await this.runAction([
				'scroll',
				options?.direction ?? 'down',
				String(options?.amount ?? 300),
			]);
		}
	}

	async upload(
		_pageId: string,
		_target: ElementTarget | undefined,
		_files: string[],
	): Promise<void> {
		await Promise.resolve();
		throw new UnsupportedOperationError('upload', this.name);
	}

	async dialog(_pageId: string, _action: 'accept' | 'dismiss', _text?: string): Promise<string> {
		await Promise.resolve();
		throw new UnsupportedOperationError('dialog', this.name);
	}

	// =========================================================================
	// Inspection
	// =========================================================================

	async snapshot(
		pageId: string,
		_target?: ElementTarget,
		interactive = true,
	): Promise<SnapshotResult> {
		await this.switchToTab(pageId);
		const args = interactive ? ['snapshot', '-i'] : ['snapshot'];
		const response = await this.run(args);
		const tree =
			typeof response.data === 'string' ? response.data : JSON.stringify(response.data ?? '');
		const refCount = (tree.match(/@e\d+/g) ?? []).length;
		return { tree: tree || '(empty page)', refCount };
	}

	async screenshot(
		pageId: string,
		_target?: ElementTarget,
		_options?: ScreenshotOptions,
	): Promise<string> {
		await this.switchToTab(pageId);
		const dir = mkdtempSync(join(tmpdir(), 'mcp-browser-'));
		const path = join(dir, 'screenshot.png');
		try {
			await this.run(['screenshot', path]);
			return readFileSync(path).toString('base64');
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	}

	async getText(pageId: string, target?: ElementTarget): Promise<string> {
		await this.switchToTab(pageId);
		const script = target
			? `document.querySelector('[aria-ref=${JSON.stringify(this.resolveTarget(target))}]')?.innerText??''`
			: "document.body?.innerText??''";
		const resp = await this.run(['eval', script]);
		return typeof resp.data === 'string' ? resp.data : '';
	}

	async getContent(pageId: string, selector?: string): Promise<{ html: string; url: string }> {
		await this.switchToTab(pageId);
		const script = selector
			? `document.querySelector(${JSON.stringify(selector)})?.outerHTML??''`
			: "document.documentElement?.outerHTML??''";
		const resp = await this.run(['eval', script]);
		const tabs = await this.refreshTabs();
		const tab = tabs.find((t) => t.tabId === pageId);
		return { html: typeof resp.data === 'string' ? resp.data : '', url: tab?.url ?? '' };
	}

	async evaluate(pageId: string, script: string): Promise<unknown> {
		await this.switchToTab(pageId);
		const encoded = Buffer.from(script).toString('base64');
		return (await this.run(['eval', '-b', encoded])).data;
	}

	async getConsole(_pageId: string, _level?: string, _clear?: boolean): Promise<ConsoleEntry[]> {
		await Promise.resolve();
		return [];
	}

	getConsoleSummary(_pageId: string): { errors: number; warnings: number } {
		return { errors: 0, warnings: 0 };
	}

	getModalStates(_pageId: string): ModalState[] {
		return [];
	}

	async getNetwork(_pageId: string, _filter?: string, _clear?: boolean): Promise<NetworkEntry[]> {
		await Promise.resolve();
		return [];
	}

	async pdf(
		_pageId: string,
		_options?: { format?: string; landscape?: boolean },
	): Promise<{ data: string; pages: number }> {
		await Promise.resolve();
		throw new UnsupportedOperationError('pdf', this.name);
	}

	// =========================================================================
	// Wait
	// =========================================================================

	async wait(pageId: string, options: WaitOptions): Promise<number> {
		await this.switchToTab(pageId);
		const timeout = options.timeoutMs ?? 30_000;
		const start = Date.now();
		if (options.selector) {
			AgentBrowserAdapter.assertSafeArg(options.selector, 'selector');
			await this.run(['wait', options.selector], timeout + 5_000);
		} else if (options.text) {
			await this.run(['wait', 'text=' + options.text], timeout + 5_000);
		} else if (options.timeoutMs) {
			await this.run(['wait', String(options.timeoutMs)], timeout + 5_000);
		} else {
			await this.run(['wait', '500']);
		}
		return Date.now() - start;
	}

	async waitForCompletion<T>(_pageId: string, action: () => Promise<T>): Promise<T> {
		return await action();
	}

	// =========================================================================
	// State
	// =========================================================================

	async getCookies(pageId: string, _url?: string): Promise<Cookie[]> {
		await this.switchToTab(pageId);
		const script =
			"document.cookie.split('; ').filter(Boolean)" +
			".map(c=>{const i=c.indexOf('=');return{name:c.slice(0,i),value:c.slice(i+1)}})";
		const resp = await this.run(['eval', script]);
		return Array.isArray(resp.data) ? (resp.data as Cookie[]) : [];
	}

	async setCookies(pageId: string, cookies: Cookie[]): Promise<void> {
		await this.switchToTab(pageId);
		const assignments = cookies
			.map((c) => {
				let s = `${c.name}=${c.value}`;
				if (c.path) s += ';path=' + c.path;
				if (c.domain) s += ';domain=' + c.domain;
				if (c.expires) s += ';expires=' + new Date(c.expires * 1000).toUTCString();
				return 'document.cookie=' + JSON.stringify(s);
			})
			.join(';');
		await this.run(['eval', assignments]);
	}

	async clearCookies(pageId: string): Promise<void> {
		await this.switchToTab(pageId);
		const script =
			"document.cookie.split(';').forEach(c=>{" +
			"const n=c.split('=')[0].trim();" +
			"document.cookie=n+'=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;'})";
		await this.run(['eval', script]);
	}

	async getStorage(pageId: string, kind: 'local' | 'session'): Promise<Record<string, string>> {
		await this.switchToTab(pageId);
		const s = kind === 'local' ? 'localStorage' : 'sessionStorage';
		const script =
			'(function(){const s=' +
			s +
			",r={};for(let i=0;i<s.length;i++){const k=s.key(i);if(k)r[k]=s.getItem(k)??''}return r})()";
		const resp = await this.run(['eval', script]);
		return (resp.data as Record<string, string>) ?? {};
	}

	async setStorage(
		pageId: string,
		kind: 'local' | 'session',
		data: Record<string, string>,
	): Promise<void> {
		await this.switchToTab(pageId);
		const s = kind === 'local' ? 'localStorage' : 'sessionStorage';
		const script =
			'(function(){const s=' +
			s +
			',d=' +
			JSON.stringify(data) +
			';for(const[k,v]of Object.entries(d))s.setItem(k,v)})()';
		await this.run(['eval', script]);
	}

	async clearStorage(pageId: string, kind: 'local' | 'session'): Promise<void> {
		await this.switchToTab(pageId);
		const s = kind === 'local' ? 'localStorage' : 'sessionStorage';
		await this.run(['eval', s + '.clear()']);
	}

	// =========================================================================
	// Sync helpers
	// =========================================================================

	getPageUrl(pageId: string): string | undefined {
		return this.urlCache.get(pageId);
	}
}
