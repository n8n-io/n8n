import { execFile } from 'node:child_process';
import { mkdtemp, readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { CDPRelayServer } from '../cdp-relay';
import {
	AgentBrowserCommandError,
	AgentBrowserNotFoundError,
	BrowserExecutableNotFoundError,
	McpBrowserError,
	PageNotFoundError,
	StaleRefError,
	type ConnectionLostReason,
} from '../errors';
import { createLogger } from '../logger';
import type {
	BrowserAdapter,
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
	SnapshotOptions,
	SnapshotResult,
	TypeOptions,
	WaitOptions,
} from '../types';
import { generateId } from '../utils';

const log = createLogger('agent-browser');
const execFileAsync = promisify(execFile);

const BROWSER_USE_EXTENSION_ID = 'cegmdpndekdfpnafgacidejijecomlhh';

function getAgentBrowserBinary(): string {
	return process.env.AGENT_BROWSER_PATH?.trim() || 'agent-browser';
}

/** Normalize MCP ref `e1` / `@e1` to agent-browser `@e1` */
export function refToAtSelector(ref: string): string {
	const t = ref.trim();
	if (t.startsWith('@')) return t;
	if (/^e\d+$/i.test(t)) return `@${t}`;
	return t.startsWith('@') ? t : `@${t}`;
}

function elementTargetToCli(target: ElementTarget): string {
	return 'ref' in target ? refToAtSelector(target.ref) : target.selector;
}

interface AbTabRow {
	id: string;
	url?: string;
	title?: string;
	label?: string;
}

export class AgentBrowserAdapter implements BrowserAdapter {
	readonly name = 'agent-browser';

	private resolvedConfig: ResolvedConfig;
	private relay?: CDPRelayServer;
	private cdpUrl?: string;
	private sessionId?: string;
	private readonly binary = getAgentBrowserBinary();

	/** CDP target id → agent-browser tab id (`t1`, …) */
	private cdpToAb = new Map<string, string>();

	onDisconnect?: (reason: ConnectionLostReason) => void;

	constructor(config: ResolvedConfig) {
		this.resolvedConfig = config;
	}

	private globalArgs(extra: string[] = []): string[] {
		const args: string[] = ['--cdp', this.cdpUrl!, '--session', this.sessionId!, ...extra];
		return args;
	}

	/**
	 * Run agent-browser CLI. Uses `--json` when structured parsing is required.
	 */
	private async run(
		commandArgs: string[],
		opts?: { json?: boolean; skipSuccessCheck?: boolean; globalPrefix?: string[] },
	): Promise<{ stdout: string; stderr: string }> {
		const jsonFlag = opts?.json ? (['--json'] as const) : [];
		const prefix = opts?.globalPrefix ?? [];
		const fullArgs = [...this.globalArgs([...prefix, ...jsonFlag]), ...commandArgs];
		log.debug('exec:', this.binary, fullArgs.join(' '));
		try {
			const { stdout, stderr } = await execFileAsync(this.binary, fullArgs, {
				maxBuffer: 25 * 1024 * 1024,
				env: { ...process.env },
			});
			const out = stdout.toString();
			const err = stderr.toString();
			if (opts?.json && !opts.skipSuccessCheck && out.trim()) {
				this.assertJsonSuccess(out);
			}
			return { stdout: out, stderr: err };
		} catch (e: unknown) {
			const err = e as NodeJS.ErrnoException & {
				stdout?: Buffer;
				stderr?: Buffer;
				code?: string | number;
			};
			if (err.code === 'ENOENT') {
				throw new AgentBrowserNotFoundError(this.binary);
			}
			const msg = (err.stderr?.toString() || err.stdout?.toString() || err.message || '').trim();
			throw new AgentBrowserCommandError(
				msg || 'agent-browser command failed',
				'Verify agent-browser is installed and the browser bridge extension is connected.',
			);
		}
	}

	private assertJsonSuccess(stdout: string): void {
		const trimmed = stdout.trim();
		if (!trimmed) return;
		let parsed: { success?: boolean; error?: string; message?: string };
		try {
			parsed = JSON.parse(trimmed) as { success?: boolean; error?: string; message?: string };
		} catch {
			return;
		}
		if (parsed.success === false) {
			throw new AgentBrowserCommandError(
				parsed.error ?? parsed.message ?? 'agent-browser reported failure',
			);
		}
	}

	private parseJsonOutput(stdout: string): unknown {
		const trimmed = stdout.trim();
		if (!trimmed) return undefined;
		try {
			return JSON.parse(trimmed) as unknown;
		} catch {
			return undefined;
		}
	}

	private async verifyBinary(): Promise<void> {
		try {
			await execFileAsync(this.binary, ['--help'], {
				timeout: 8000,
				env: { ...process.env },
			});
		} catch (e: unknown) {
			const err = e as NodeJS.ErrnoException;
			if (err.code === 'ENOENT') throw new AgentBrowserNotFoundError(this.binary);
			throw new AgentBrowserNotFoundError(this.binary);
		}
	}

	async launch(config: ConnectConfig): Promise<void> {
		log.debug('launch: browser =', config.browser);
		await this.verifyBinary();

		this.relay = new CDPRelayServer();
		const port = await this.relay.listen();
		const extensionEndpoint = this.relay.extensionEndpoint(port);

		const connectUrl =
			`chrome-extension://${BROWSER_USE_EXTENSION_ID}/connect.html` +
			`?mcpRelayUrl=${encodeURIComponent(extensionEndpoint)}`;
		const browserInfo = this.resolvedConfig.browsers.get(config.browser);
		const chromePath = browserInfo?.executablePath;
		if (!chromePath) {
			throw new BrowserExecutableNotFoundError(config.browser);
		}

		log.debug('launching browser:', chromePath);
		await new Promise<void>((resolve, reject) => {
			const child = execFile(chromePath, [connectUrl]);
			const earlyFailTimer = setTimeout(() => resolve(), 2_000);
			child.on('error', (spawnError: Error) => {
				clearTimeout(earlyFailTimer);
				log.error('browser spawn error:', spawnError.message);
				reject(new BrowserExecutableNotFoundError(`${config.browser} (${spawnError.message})`));
			});
		});

		log.debug('waiting for extension...');
		await this.relay.waitForExtension({ browserWasLaunched: true });

		this.cdpUrl = this.relay.cdpEndpoint(port);
		this.sessionId = generateId('n8n-ab');
		log.debug('agent-browser CDP endpoint:', this.cdpUrl, 'session:', this.sessionId);

		this.relay.onExtensionDisconnect = (reason) => {
			log.debug('relay: extension disconnected, reason:', reason);
			this.onDisconnect?.(reason);
		};

		await this.syncTabMapping();
		log.debug('launch complete');
	}

	async close(): Promise<void> {
		this.cdpToAb.clear();
		if (this.relay) {
			this.relay.stop();
			this.relay = undefined;
		}
		this.cdpUrl = undefined;
		this.sessionId = undefined;
	}

	private parseTabListJson(stdout: string): AbTabRow[] {
		const parsed = this.parseJsonOutput(stdout);
		if (!parsed || typeof parsed !== 'object') return [];
		const o = parsed as Record<string, unknown>;
		const data = (o.data ?? o) as Record<string, unknown>;
		const tabs = data.tabs ?? data.list ?? (Array.isArray(parsed) ? parsed : undefined);
		if (!Array.isArray(tabs)) return [];
		return tabs
			.map((t) => {
				if (!t || typeof t !== 'object') return null;
				const row = t as Record<string, unknown>;
				const id = row.id ?? row.tabId ?? row.label;
				if (typeof id !== 'string' || !/^t\d+$/.test(id)) return null;
				return {
					id,
					url: typeof row.url === 'string' ? row.url : undefined,
					title: typeof row.title === 'string' ? row.title : undefined,
					label: typeof row.label === 'string' ? row.label : undefined,
				} as AbTabRow;
			})
			.filter((x): x is AbTabRow => x !== null);
	}

	/** Fallback: parse plain-text tab list lines */
	private parseTabListText(stdout: string): AbTabRow[] {
		const lines = stdout.split('\n').filter((l) => l.trim());
		const rows: AbTabRow[] = [];
		for (const line of lines) {
			const m = line.match(/^(t\d+)\b\s*(.*)$/);
			if (m) {
				const rest = m[2].trim();
				rows.push({ id: m[1], url: rest, title: '' });
			}
		}
		return rows;
	}

	private async syncTabMapping(): Promise<void> {
		if (!this.relay) return;
		let abTabs: AbTabRow[] = [];
		try {
			const { stdout } = await this.run(['tab', 'list', '--json'], { json: true });
			abTabs = this.parseTabListJson(stdout);
			if (abTabs.length === 0) abTabs = this.parseTabListText(stdout);
		} catch (e) {
			log.debug('tab list --json failed, trying plain:', e);
			try {
				const { stdout } = await this.run(['tab'], { json: false });
				abTabs = this.parseTabListText(stdout);
			} catch {
				abTabs = [];
			}
		}

		const relayTabs = await this.relay.listTabs();
		this.cdpToAb.clear();

		if (relayTabs.length === abTabs.length && abTabs.length > 0) {
			for (let i = 0; i < relayTabs.length; i++) {
				this.cdpToAb.set(relayTabs[i].id, abTabs[i].id);
			}
			return;
		}

		const used = new Set<string>();
		for (const rt of relayTabs) {
			const match =
				abTabs.find(
					(t) =>
						!used.has(t.id) &&
						t.url === rt.url &&
						(t.title === undefined || t.title === '' || t.title === rt.title),
				) ?? abTabs.find((t) => !used.has(t.id) && t.url === rt.url);
			if (match) {
				this.cdpToAb.set(rt.id, match.id);
				used.add(match.id);
			}
		}
	}

	private async ensureMapped(pageId: string): Promise<string> {
		const existing = this.cdpToAb.get(pageId);
		if (existing) return existing;
		await this.syncTabMapping();
		const ab = this.cdpToAb.get(pageId);
		if (!ab) throw new PageNotFoundError(pageId);
		return ab;
	}

	private async ensureActiveTab(pageId: string): Promise<void> {
		if (!this.relay?.hasTab(pageId)) throw new PageNotFoundError(pageId);
		await this.relay.activateTab(pageId);
		const abTab = await this.ensureMapped(pageId);
		await this.run(['tab', abTab]);
	}

	async newPage(url?: string, label?: string): Promise<PageInfo> {
		const args = ['tab', 'new'];
		if (label) {
			args.push('--label', label);
		}
		if (url) args.push(url);
		await this.run(args);

		const tabId = this.relay?.getLastCreatedTabId();
		await this.syncTabMapping();

		const tabs = await this.relay!.listTabs();
		const info = (tabId ? tabs.find((t) => t.id === tabId) : undefined) ?? tabs[tabs.length - 1];
		if (!info) {
			throw new McpBrowserError('Could not determine new tab id from browser bridge');
		}
		return { ...info };
	}

	async closePage(pageId: string): Promise<void> {
		this.cdpToAb.delete(pageId);
		if (this.relay) {
			await this.relay.closeTab(pageId);
		}
		await this.syncTabMapping().catch(() => {});
	}

	async focusPage(pageId: string): Promise<void> {
		await this.ensureActiveTab(pageId);
	}

	async listPages(): Promise<PageInfo[]> {
		return await this.listTabs();
	}

	async listTabs(): Promise<PageInfo[]> {
		if (!this.relay) return [];
		const tabs = await this.relay.listTabs();
		return tabs.map((t) => ({ ...t }));
	}

	listTabSessionIds(): string[] {
		return this.relay?.getRegisteredTabIds() ?? [];
	}

	async listTabIds(): Promise<string[]> {
		if (!this.relay) return [];
		const tabs = await this.relay.listTabs();
		return tabs.map((t) => t.id);
	}

	private async maybeWaitNavigation(waitUntil?: string): Promise<void> {
		if (waitUntil === 'networkidle') {
			await this.run(['wait', '--load', 'networkidle']).catch(() => {});
		} else if (waitUntil === 'domcontentloaded') {
			await this.run(['wait', '--load', 'domcontentloaded']).catch(() => {});
		}
	}

	async navigate(
		pageId: string,
		url: string,
		waitUntil: 'load' | 'domcontentloaded' | 'networkidle' = 'load',
	): Promise<NavigateResult> {
		await this.ensureActiveTab(pageId);
		await this.run(['open', url]);
		await this.maybeWaitNavigation(waitUntil);
		const { title, url: finalUrl } = await this.readTitleUrl();
		return { title, url: finalUrl, status: 0 };
	}

	private async readTitleUrl(): Promise<{ title: string; url: string }> {
		const titleOut = await this.run(['get', 'title', '--json'], { json: true });
		const urlOut = await this.run(['get', 'url', '--json'], { json: true });
		const tj = this.parseJsonOutput(titleOut.stdout) as { data?: string } | undefined;
		const uj = this.parseJsonOutput(urlOut.stdout) as { data?: string } | undefined;
		return {
			title: typeof tj?.data === 'string' ? tj.data : '',
			url: typeof uj?.data === 'string' ? uj.data : '',
		};
	}

	async back(pageId: string): Promise<NavigateResult> {
		await this.ensureActiveTab(pageId);
		await this.run(['back']);
		const { title, url } = await this.readTitleUrl();
		return { title, url, status: 0 };
	}

	async forward(pageId: string): Promise<NavigateResult> {
		await this.ensureActiveTab(pageId);
		await this.run(['forward']);
		const { title, url } = await this.readTitleUrl();
		return { title, url, status: 0 };
	}

	async reload(
		pageId: string,
		waitUntil: 'load' | 'domcontentloaded' | 'networkidle' = 'load',
	): Promise<NavigateResult> {
		await this.ensureActiveTab(pageId);
		await this.run(['reload']);
		await this.maybeWaitNavigation(waitUntil);
		const { title, url } = await this.readTitleUrl();
		return { title, url, status: 0 };
	}

	async click(pageId: string, target: ElementTarget, options?: ClickOptions): Promise<void> {
		await this.ensureActiveTab(pageId);
		const sel = elementTargetToCli(target);
		if ('ref' in target) {
			await this.assertRef(pageId, target.ref);
		}
		const count = options?.clickCount ?? 1;
		if (count >= 2) {
			await this.run(['dblclick', sel]);
			return;
		}
		await this.run(['click', sel]);
	}

	async type(
		pageId: string,
		target: ElementTarget,
		text: string,
		options?: TypeOptions,
	): Promise<void> {
		await this.ensureActiveTab(pageId);
		const sel = elementTargetToCli(target);
		if ('ref' in target) await this.assertRef(pageId, target.ref);
		if (options?.clear) {
			await this.run(['fill', sel, text]);
		} else {
			await this.run(['type', sel, text]);
		}
		if (options?.submit) {
			await this.run(['press', 'Enter']);
		}
	}

	async select(pageId: string, target: ElementTarget, values: string[]): Promise<string[]> {
		await this.ensureActiveTab(pageId);
		const sel = elementTargetToCli(target);
		await this.run(['select', sel, ...values]);
		return values;
	}

	async hover(pageId: string, target: ElementTarget): Promise<void> {
		await this.ensureActiveTab(pageId);
		await this.run(['hover', elementTargetToCli(target)]);
	}

	async press(pageId: string, keys: string): Promise<void> {
		await this.ensureActiveTab(pageId);
		await this.run(['press', keys]);
	}

	async drag(pageId: string, from: ElementTarget, to: ElementTarget): Promise<void> {
		await this.ensureActiveTab(pageId);
		await this.run(['drag', elementTargetToCli(from), elementTargetToCli(to)]);
	}

	async scroll(pageId: string, target?: ElementTarget, options?: ScrollOptions): Promise<void> {
		await this.ensureActiveTab(pageId);
		if (target) {
			await this.run(['scrollintoview', elementTargetToCli(target)]);
			return;
		}
		const amount = options?.amount ?? 500;
		const dir = options?.direction === 'up' ? 'up' : 'down';
		await this.run(['scroll', dir, String(amount)]);
	}

	async upload(pageId: string, target: ElementTarget | undefined, files: string[]): Promise<void> {
		await this.ensureActiveTab(pageId);
		if (!target) {
			throw new McpBrowserError(
				'File upload requires an element target (or use a file input ref from browser_snapshot).',
				'Take a browser_snapshot, pass the file input ref, and call browser_upload again.',
			);
		}
		await this.run(['upload', elementTargetToCli(target), ...files]);
	}

	async dialog(pageId: string, action: 'accept' | 'dismiss', text?: string): Promise<string> {
		await this.ensureActiveTab(pageId);
		if (action === 'accept') {
			const args = text !== undefined ? ['dialog', 'accept', text] : ['dialog', 'accept'];
			await this.run(args);
			return 'confirm';
		}
		await this.run(['dialog', 'dismiss']);
		return 'dismiss';
	}

	async screenshot(
		pageId: string,
		target?: ElementTarget,
		options?: ScreenshotOptions,
	): Promise<string> {
		await this.ensureActiveTab(pageId);
		const dir = await mkdtemp(join(tmpdir(), 'mcp-ab-shot-'));
		const ext = options?.format === 'jpeg' ? 'jpg' : 'png';
		const filePath = join(dir, `shot.${ext}`);
		try {
			if (options?.diffBaselinePath) {
				const out = options.diffOutputPath ?? join(dir, `diff.${ext}`);
				const dargs = ['diff', 'screenshot', '--baseline', options.diffBaselinePath, '-o', out];
				if (options.diffThreshold !== undefined) {
					dargs.push('-t', String(options.diffThreshold));
				}
				if (options?.fullPage) dargs.push('--full');
				const scopeTarget = options.element ?? target;
				if (scopeTarget) dargs.push('-s', elementTargetToCli(scopeTarget));
				await this.run(dargs);
				const buf = await readFile(out);
				return buf.toString('base64');
			}

			const args = ['screenshot', filePath];
			if (options?.fullPage) args.push('--full');
			if (options?.annotate) args.push('--annotate');
			if (options?.format === 'jpeg') {
				args.push('--screenshot-format', 'jpeg');
				if (options.quality !== undefined) {
					args.push('--screenshot-quality', String(options.quality));
				}
			}
			if (options?.screenshotDir) {
				args.push('--screenshot-dir', options.screenshotDir);
			}
			const scopeTarget = options?.element ?? target;
			if (scopeTarget) {
				args.push('-s', elementTargetToCli(scopeTarget));
			}
			await this.run(args);
			const buf = await readFile(filePath);
			return buf.toString('base64');
		} finally {
			await unlink(filePath).catch(() => {});
		}
	}

	async snapshot(
		pageId: string,
		target?: ElementTarget,
		options?: SnapshotOptions,
	): Promise<SnapshotResult> {
		await this.ensureActiveTab(pageId);

		const enrich = options?.forEnrichment === true;
		const interactive = enrich ? true : options?.interactive === true;
		const compact = enrich ? true : options?.compact === true;

		if (options?.diffMode === 'since_last' || options?.diffMode === 'baseline') {
			const args = ['diff', 'snapshot'];
			if (options.diffMode === 'baseline' && options.baselineFilePath) {
				args.push('--baseline', options.baselineFilePath);
			}
			if (target) args.push('-s', elementTargetToCli(target));
			if (options.diffCompact ?? compact) args.push('-c');
			if (options.diffMaxDepth ?? options.maxDepth) {
				args.push('-d', String(options.diffMaxDepth ?? options.maxDepth));
			}
			const { stdout } = await this.run(args);
			return { tree: stdout.trim(), refCount: countRefs(stdout) };
		}

		const snapArgs = ['snapshot'];
		if (interactive) snapArgs.push('-i');
		if (compact) snapArgs.push('-c');
		if (options?.includeLinkUrls) snapArgs.push('-u');
		if (options?.maxDepth !== undefined) snapArgs.push('-d', String(options.maxDepth));
		if (target) snapArgs.push('-s', elementTargetToCli(target));

		const globalPrefix: string[] = [];
		if (options?.maxOutputChars) {
			globalPrefix.push('--max-output', String(options.maxOutputChars));
		}
		if (options?.contentBoundaries) {
			globalPrefix.push('--content-boundaries');
		}

		const { stdout } = await this.run(snapArgs, { json: false, globalPrefix });
		const tree = stdout.trim() || '(empty page)';
		return { tree, refCount: countRefs(tree) };
	}

	async getText(pageId: string, target?: ElementTarget): Promise<string> {
		await this.ensureActiveTab(pageId);
		if (!target) {
			const { stdout } = await this.run(['eval', 'document.body?.innerText ?? ""', '--json'], {
				json: true,
			});
			const j = this.parseJsonOutput(stdout) as { data?: string };
			return typeof j?.data === 'string' ? j.data : '';
		}
		const { stdout } = await this.run(['get', 'text', elementTargetToCli(target), '--json'], {
			json: true,
		});
		const j = this.parseJsonOutput(stdout) as { data?: string } | undefined;
		return typeof j?.data === 'string' ? j.data : stdout.trim();
	}

	async evaluate(pageId: string, script: string): Promise<unknown> {
		await this.ensureActiveTab(pageId);
		const { stdout } = await this.run(['eval', script, '--json'], { json: true });
		const j = this.parseJsonOutput(stdout) as { data?: unknown } | undefined;
		return j?.data;
	}

	async getConsole(pageId: string, level?: string, clear?: boolean): Promise<ConsoleEntry[]> {
		await this.ensureActiveTab(pageId);
		const args = ['console', '--json'];
		if (clear) args.push('--clear');
		const { stdout } = await this.run(args, { json: true });
		const j = this.parseJsonOutput(stdout) as { data?: ConsoleEntry[] } | undefined;
		let entries = Array.isArray(j?.data) ? (j?.data ?? []) : [];
		if (level) {
			const order = ['debug', 'info', 'log', 'warn', 'error'];
			const min = order.indexOf(level);
			entries = entries.filter((e) => order.indexOf(e.level) >= min);
		}
		return entries;
	}

	getConsoleSummary(pageId: string): { errors: number; warnings: number } {
		void pageId;
		return { errors: 0, warnings: 0 };
	}

	async pdf(
		pageId: string,
		_options?: { format?: string; landscape?: boolean },
	): Promise<{ data: string; pages: number }> {
		void _options;
		await this.ensureActiveTab(pageId);
		const dir = await mkdtemp(join(tmpdir(), 'mcp-ab-pdf-'));
		const filePath = join(dir, 'page.pdf');
		try {
			await this.run(['pdf', filePath]);
			const buf = await readFile(filePath);
			return { data: buf.toString('base64'), pages: 1 };
		} finally {
			await unlink(filePath).catch(() => {});
		}
	}

	async getNetwork(pageId: string, filter?: string, clear?: boolean): Promise<NetworkEntry[]> {
		await this.ensureActiveTab(pageId);
		const args = ['network', 'requests', '--json'];
		if (clear) args.push('--clear');
		if (filter) args.push('--filter', filter);
		const { stdout } = await this.run(args, { json: true });
		const j = this.parseJsonOutput(stdout) as {
			data?: Array<{ url?: string; method?: string; status?: number; contentType?: string }>;
		};
		const raw = Array.isArray(j?.data) ? j.data : [];
		const now = Date.now();
		return raw.map((r, i) => ({
			url: r.url ?? '',
			method: r.method ?? 'GET',
			status: typeof r.status === 'number' ? r.status : 0,
			contentType: r.contentType,
			timestamp: now + i,
		}));
	}

	async wait(pageId: string, options: WaitOptions): Promise<number> {
		await this.ensureActiveTab(pageId);
		const start = Date.now();
		const timeout = options.timeoutMs ?? 30_000;

		if (options.downloadPath) {
			const args = ['wait', '--download', options.downloadPath];
			await this.run(args, { json: false }).catch(() => {});
			return Date.now() - start;
		}
		if (options.selector) {
			await this.run(['wait', options.selector], { json: false }).catch(() => {});
		} else if (options.url) {
			await this.run(['wait', '--url', options.url], { json: false }).catch(() => {});
		} else if (options.loadState) {
			await this.run(['wait', '--load', options.loadState], { json: false }).catch(() => {});
		} else if (options.predicate) {
			await this.run(['wait', '--fn', options.predicate], { json: false }).catch(() => {});
		} else if (options.text) {
			await this.run(['wait', '--text', options.text], { json: false }).catch(() => {});
		} else {
			await this.run(['wait', '500'], { json: false }).catch(() => {});
		}

		void timeout;
		return Date.now() - start;
	}

	async getCookies(pageId: string, url?: string): Promise<Cookie[]> {
		await this.ensureActiveTab(pageId);
		const { stdout } = await this.run(['cookies'], { json: true });
		const j = this.parseJsonOutput(stdout) as { data?: Cookie[] };
		let cookies = Array.isArray(j?.data) ? j!.data! : [];
		if (url) {
			try {
				const u = new URL(url);
				cookies = cookies.filter(
					(c) => !c.domain || u.hostname.endsWith(c.domain.replace(/^\./, '')),
				);
			} catch {
				// keep all
			}
		}
		return cookies;
	}

	async setCookies(pageId: string, cookies: Cookie[]): Promise<void> {
		await this.ensureActiveTab(pageId);
		for (const c of cookies) {
			const args = ['cookies', 'set', c.name, c.value];
			if (c.domain) args.push('--domain', c.domain);
			if (c.path) args.push('--path', c.path);
			if (c.expires) args.push('--expires', String(Math.floor(c.expires)));
			if (c.httpOnly) args.push('--httpOnly');
			if (c.secure) args.push('--secure');
			if (c.sameSite) args.push('--sameSite', c.sameSite);
			await this.run(args);
		}
	}

	async clearCookies(pageId: string): Promise<void> {
		await this.ensureActiveTab(pageId);
		await this.run(['cookies', 'clear']);
	}

	async getStorage(pageId: string, kind: 'local' | 'session'): Promise<Record<string, string>> {
		await this.ensureActiveTab(pageId);
		const { stdout } = await this.run(['storage', kind, '--json'], { json: true });
		const j = this.parseJsonOutput(stdout) as { data?: Record<string, string> };
		if (j?.data && typeof j.data === 'object') return j.data;
		return {};
	}

	async setStorage(
		pageId: string,
		kind: 'local' | 'session',
		data: Record<string, string>,
	): Promise<void> {
		await this.ensureActiveTab(pageId);
		for (const [k, v] of Object.entries(data)) {
			await this.run(['storage', kind, 'set', k, v]);
		}
	}

	async clearStorage(pageId: string, kind: 'local' | 'session'): Promise<void> {
		await this.ensureActiveTab(pageId);
		await this.run(['storage', kind, 'clear']);
	}

	async waitForCompletion<T>(pageId: string, action: () => Promise<T>): Promise<T> {
		if (!this.relay?.hasTab(pageId)) {
			return await action();
		}
		const result = await action();
		try {
			await this.ensureActiveTab(pageId);
			await this.run(['wait', '--load', 'networkidle']).catch(() => {});
		} catch {
			// best-effort
		}
		return result;
	}

	getModalStates(pageId: string): ModalState[] {
		void pageId;
		return [];
	}

	async getContent(pageId: string, selector?: string): Promise<{ html: string; url: string }> {
		await this.ensureActiveTab(pageId);
		const urlOut = await this.run(['get', 'url', '--json'], { json: true });
		const uj = this.parseJsonOutput(urlOut.stdout) as { data?: string };
		const url = typeof uj?.data === 'string' ? uj.data : '';
		if (selector) {
			const { stdout } = await this.run(['get', 'html', selector, '--json'], { json: true });
			const hj = this.parseJsonOutput(stdout) as { data?: string };
			return { html: typeof hj?.data === 'string' ? hj.data : '', url };
		}
		const { stdout } = await this.run(['eval', 'document.documentElement.outerHTML', '--json'], {
			json: true,
		});
		const ej = this.parseJsonOutput(stdout) as { data?: string };
		return { html: typeof ej?.data === 'string' ? ej.data : '', url };
	}

	getPageUrl(pageId: string): string | undefined {
		return this.relay?.getCachedTabMeta(pageId)?.url;
	}

	async diffUrls(
		urlA: string,
		urlB: string,
		options?: {
			includeScreenshot?: boolean;
			fullPage?: boolean;
			waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
			scope?: string;
			compact?: boolean;
			maxDepth?: number;
		},
	): Promise<{ snapshotDiff: string; screenshotDiff?: string }> {
		const args = ['diff', 'url', urlA, urlB];
		if (options?.includeScreenshot) args.push('--screenshot');
		if (options?.fullPage) args.push('--full');
		if (options?.waitUntil) args.push('--wait-until', options.waitUntil);
		if (options?.scope) args.push('-s', options.scope);
		if (options?.compact) args.push('-c');
		if (options?.maxDepth !== undefined) args.push('-d', String(options.maxDepth));
		const { stdout } = await this.run(args);
		return { snapshotDiff: stdout.trim() };
	}

	async setFrameContext(pageId: string, target: ElementTarget | 'main'): Promise<void> {
		await this.ensureActiveTab(pageId);
		if (target === 'main') {
			await this.run(['frame', 'main']);
			return;
		}
		await this.run(['frame', elementTargetToCli(target)]);
	}

	async highlight(pageId: string, target: ElementTarget): Promise<void> {
		await this.ensureActiveTab(pageId);
		await this.run(['highlight', elementTargetToCli(target)]);
	}

	private async assertRef(pageId: string, ref: string): Promise<void> {
		await this.ensureActiveTab(pageId);
		try {
			const { stdout } = await this.run(['get', 'count', refToAtSelector(ref), '--json'], {
				json: true,
			});
			const j = this.parseJsonOutput(stdout) as { data?: number };
			const n = typeof j?.data === 'number' ? j.data : Number(j?.data);
			if (!n || n < 1) throw new StaleRefError(ref);
		} catch (e) {
			if (e instanceof StaleRefError) throw e;
			throw new StaleRefError(ref);
		}
	}
}

function countRefs(text: string): number {
	const at = text.match(/@e\d+/g);
	if (at) return at.length;
	const br = text.match(/\[ref=e\d+\]/g);
	return br?.length ?? 0;
}
