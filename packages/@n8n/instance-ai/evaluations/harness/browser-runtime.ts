// ---------------------------------------------------------------------------
// Browser runtime for credential-setup evals — a headless Chromium running the
// REAL browser-use extension, attached to the n8n server's own relay.
//
// This is the PRODUCTION path, not an imitation of it. Production browser use
// is `mode: 'remote'`: the n8n server owns the CDP relay and the extension
// dials in (`mcp-browser/src/adapters/playwright.ts:112-120`, composed into the
// agent's tool scope at `instance-ai.service.ts:2116-2119`). So the harness only
// has to supply a browser with the extension in it — nothing in `@n8n/mcp-browser`,
// the extension, or the relay changes.
//
// Deliberately NOT reusing mcp-browser's local-mode spawn: that path is
// `execFile(chromePath, [connectUrl])` (`playwright.ts:148`) and passes no
// flags, so `--load-extension` / `--host-resolver-rules` could not ride it, and
// local mode is not what production uses anyway.
//
// Pay-per-use: this boots per case in the credential-setup lane and dies with
// it. No other suite ever starts a browser.
// ---------------------------------------------------------------------------

import { getDefaultDiscovery } from '@n8n/mcp-browser';
import fastGlob from 'fast-glob';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { chromium, type BrowserContext } from 'playwright-core';

import type { EvalLogger } from './logger';
import type { N8nClient } from '../clients/n8n-client';

/** Built extension directory, relative to this file. */
const EXTENSION_DIST = join(__dirname, '..', '..', '..', 'mcp-browser-extension', 'dist');

/**
 * Locate a Chromium that can load an extension.
 *
 * Playwright's default download is `chromium_headless_shell-*`, which CANNOT
 * load extensions — that is the whole reason this helper exists rather than
 * calling `chromium.launch()` and hoping. Full Chromium's modern headless mode
 * does support them (verified: the MV3 service worker registers and
 * `chrome-extension://<id>/connect.html` serves 200).
 */
export function findChromiumForEval(): string {
	const override = process.env.N8N_EVAL_BROWSER_EXECUTABLE;
	if (override) {
		if (!existsSync(override)) {
			throw new Error(`N8N_EVAL_BROWSER_EXECUTABLE is set but missing: ${override}`);
		}
		return override;
	}

	// Playwright's cache — `chromium-*` only; `chromium_headless_shell-*` is
	// excluded by the glob, not by accident.
	const cacheRoots = [
		join(homedir(), 'Library', 'Caches', 'ms-playwright'),
		join(homedir(), '.cache', 'ms-playwright'),
	];
	for (const root of cacheRoots) {
		if (!existsSync(root)) continue;
		const matches = fastGlob.sync(
			[
				'chromium-*/chrome-mac*/*.app/Contents/MacOS/*',
				'chromium-*/chrome-linux*/chrome',
				'chromium-*/chrome-win*/chrome.exe',
			],
			{ cwd: root, absolute: true, onlyFiles: true, deep: 6 },
		);
		// Numeric compare: lexically `chromium-999` sorts above `chromium-1223`.
		const best = matches.sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).at(-1);
		if (best) return best;
	}

	const installed = [
		'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
		'/Applications/Chromium.app/Contents/MacOS/Chromium',
		'/usr/bin/google-chrome',
		'/usr/bin/chromium',
		'/usr/bin/chromium-browser',
	];
	for (const candidate of installed) if (existsSync(candidate)) return candidate;

	throw new Error(
		'No extension-capable Chromium found. Install one (`pnpm exec playwright install chromium`) ' +
			'or point N8N_EVAL_BROWSER_EXECUTABLE at a full Chrome/Chromium binary. ' +
			"Playwright's headless *shell* cannot load extensions and is deliberately not used.",
	);
}

/**
 * Work out what connect URL to load, and whether the browser needs a DNS rule
 * to make it reach n8n.
 *
 * The extension only honours `autoConnect` when the relay URL's host is
 * localhost (`relayAllowlist.ts` — a deliberate gate against a page pointing a
 * user's browser at someone else's relay). When the harness runs beside n8n
 * that is simply true and nothing here applies.
 *
 * It stops being true when the harness runs in a SEPARATE container from n8n —
 * the lang-tracer dispatcher. n8n still reports its base URL as `localhost`
 * (compose sets no `N8N_EDITOR_BASE_URL`), so the gate passes, but that name
 * resolves to the HARNESS's own container and the extension connects to
 * nothing. So keep the URL saying localhost — the gate is about what the page
 * was handed — and redirect that one host:port onto the real n8n at the DNS
 * layer.
 *
 * Port-scoped deliberately: an unscoped `MAP localhost <host>:<port>` captures
 * EVERY localhost port in the browser (probe-verified), which would swallow
 * any other loopback service the run depends on — the fixture server included,
 * if it were ever addressed by name rather than by provider hostname.
 */
export function planRelayConnection(
	connectUrl: string,
	n8nBaseUrl: string,
): { connectUrl: string; hostResolverRule?: string } {
	let url: URL;
	let target: URL;
	try {
		url = new URL(connectUrl);
		target = new URL(n8nBaseUrl);
	} catch {
		return { connectUrl };
	}

	const relayRaw = url.searchParams.get('mcpRelayUrl');
	if (!relayRaw) return { connectUrl };
	let relay: URL;
	try {
		relay = new URL(relayRaw);
	} catch {
		return { connectUrl };
	}

	const port = target.port || (target.protocol === 'https:' ? '443' : '80');
	// Nothing to do only when the relay URL ALREADY points at n8n — host AND
	// port. A port mismatch is the common local case: n8n in a container thinks
	// it is on :5678 while the host reaches it on the published port.
	if (relay.hostname === target.hostname && relay.port === port) return { connectUrl };

	relay.hostname = 'localhost';
	relay.port = port;
	url.searchParams.set('mcpRelayUrl', relay.toString());

	// DNS help is only needed when n8n is on a DIFFERENT host. If it is reachable
	// on loopback, rewriting the port is enough and a MAP would be noise.
	const needsDnsRule = !LOOPBACK_HOSTS.has(target.hostname);
	return {
		connectUrl: url.toString(),
		hostResolverRule: needsDnsRule ? `MAP localhost:${port} ${target.hostname}:${port}` : undefined,
	};
}

/** Hosts the extension already treats as local, so no DNS redirect is needed. */
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/** Loopback spellings the extension's own relay allowlist accepts. All of them
 *  must escape the fixture's catch-all, not just the literal "localhost". */
const LOOPBACK_EXCLUDES = ['localhost', '127.0.0.1', '[::1]'];

/**
 * The two flags that make a fixture run hermetic, assembled in one place so the
 * ordering rules are testable rather than implied.
 *
 * Comma-joined into ONE `--host-resolver-rules`, never passed twice: with two
 * flags the earlier one's rules are silently dropped (probe-verified — its host
 * came back ERR_NAME_NOT_RESOLVED).
 *
 * ORDER MATTERS AMONG MAPS, first match wins:
 *   1. the relay rule, so the relay is not swallowed by the wildcard
 *   2. the fixture's own host maps, then its `MAP *` catch-all
 *   3. loopback EXCLUDEs
 *
 * EXCLUDEs do NOT obey that order: Chromium checks them before any MAP and
 * returns on the first hit, so `EXCLUDE localhost` vetoes `MAP localhost:<port>`
 * wherever it sits (verified against Chromium 1223). A relay rule maps that
 * hostname, so its exclude is dropped when one is present.
 *
 * Returns nothing at all for a local run: no interception, and in particular no
 * `--ignore-certificate-errors`, which exists only for the fixture's
 * self-signed cert. Applying it to a real-internet run in the developer's own
 * profile would be a genuine downgrade for no benefit, so the cert flag and the
 * fixture rules are emitted together or not at all.
 */
export function fixtureInterceptionArgs(
	hostResolverRules: string | undefined,
	relayRule: string | undefined,
): string[] {
	if (!hostResolverRules) return relayRule ? [`--host-resolver-rules=${relayRule}`] : [];
	const excludes = relayRule
		? LOOPBACK_EXCLUDES.filter((host) => !relayRule.includes(`MAP ${host}:`))
		: LOOPBACK_EXCLUDES;
	const rules = [relayRule, hostResolverRules, ...excludes.map((host) => `EXCLUDE ${host}`)].filter(
		Boolean,
	);
	return [`--host-resolver-rules=${rules.join(',')}`, '--ignore-certificate-errors'];
}

export interface BrowserRuntime {
	/** The launched context — ONLY for the fixture path. Local mode attaches to
	 *  a browser it did not start, so there is nothing to hand back. */
	context?: BrowserContext;
	/** Resolves once the extension reports connected to the n8n relay. */
	connected: boolean;
	close(): Promise<void>;
}

export interface StartBrowserRuntimeOptions {
	client: N8nClient;
	logger: EvalLogger;
	/** From `FixtureServer.hostResolverRules()`. Omit to let the browser reach
	 *  the real internet — only correct for attended real-site runs. */
	hostResolverRules?: string;
	/** Attended mode: show the browser so a human can log in first. */
	headed?: boolean;
	/** How long to wait for the extension to report connected. */
	connectTimeoutMs?: number;
}

export async function startBrowserRuntime(
	options: StartBrowserRuntimeOptions,
): Promise<BrowserRuntime> {
	const { client, logger, hostResolverRules, headed = false } = options;
	const connectTimeoutMs = options.connectTimeoutMs ?? 30_000;

	if (!existsSync(join(EXTENSION_DIST, 'manifest.json'))) {
		throw new Error(
			`Browser-use extension is not built at ${EXTENSION_DIST}. ` +
				'Run `pnpm -F @n8n/mcp-browser-extension build` first.',
		);
	}

	// Mint the relay link BEFORE launching: the connect page auto-connects on
	// load, so the relay has to be waiting for it.
	const link = await client.createBrowserLink();
	// Every throw from here on must release the session — it is instance-wide, so
	// leaving it connected strands the next case. Armed now, disarmed on success.
	let relayOwned = false;
	try {
		// The server builds connectUrl without autoConnect; append it so the
		// extension clicks Connect itself and the run stays human-out-of-the-loop.
		const withAutoConnect = `${link.connectUrl}${link.connectUrl.includes('?') ? '&' : '?'}autoConnect=1`;
		const relayPlan = planRelayConnection(withAutoConnect, client.baseUrl);
		const connectUrl = relayPlan.connectUrl;
		if (relayPlan.hostResolverRule) {
			logger.verbose(`  Relay redirected to n8n: ${relayPlan.hostResolverRule}`);
		}

		const executablePath = findChromiumForEval();
		const userDataDir = await mkdtemp(join(tmpdir(), 'n8n-eval-browser-'));
		logger.verbose(`  Browser runtime: ${executablePath}`);

		const args = [
			`--disable-extensions-except=${EXTENSION_DIST}`,
			`--load-extension=${EXTENSION_DIST}`,
		];
		// Chrome stores profiles as subdirectories of the user-data-dir; the
		// discovery helper points at the profile itself, so we pass the parent as
		// --user-data-dir and name the child here.
		// Container runs (the lang-tracer dispatcher image). Chrome's setuid sandbox
		// needs a setuid helper or unprivileged user namespaces, and Docker's default
		// seccomp profile blocks the latter — Chromium then refuses to start at all.
		// Opt-in rather than auto-detected: dropping the sandbox is a real weakening,
		// and it is only defensible here because the only content this browser ever
		// loads is our own fixture. `/dev/shm` is 64 MB in a default container, which
		// crashes renderers, so the two travel together.
		if (process.env.N8N_EVAL_BROWSER_NO_SANDBOX === '1') {
			args.push('--no-sandbox', '--disable-dev-shm-usage');
		}
		args.push(...fixtureInterceptionArgs(hostResolverRules, relayPlan.hostResolverRule));

		const context = await chromium.launchPersistentContext(userDataDir, {
			executablePath,
			headless: !headed,
			args,
		});

		const cleanup = async () => {
			await context.close().catch(() => {});
			// `finally`: rm can throw, and losing the instance-wide relay session to
			// that strands the next case.
			try {
				await rm(userDataDir, { recursive: true, force: true });
			} finally {
				await client.disconnectBrowserSession().catch(() => {});
			}
		};

		try {
			const page = await context.newPage();
			await page.goto(connectUrl, { timeout: connectTimeoutMs });

			const deadline = Date.now() + connectTimeoutMs;
			let connected = false;
			while (Date.now() < deadline) {
				if ((await client.getBrowserStatus()).connected) {
					connected = true;
					break;
				}
				await new Promise((resolve) => setTimeout(resolve, 500));
			}
			if (!connected) {
				throw new Error(
					`Extension did not connect to the n8n relay within ${String(connectTimeoutMs)}ms. ` +
						'Check that Browser Use is enabled on the instance and the relay URL is loopback ' +
						'(the extension only honors autoConnect for localhost relays).',
				);
			}
			logger.info('  Browser runtime connected to the n8n relay');

			// The returned runtime owns the session from here — its `close` is what
			// releases it, so the guard below must not.
			relayOwned = true;
			return {
				context,
				connected,
				close: cleanup,
			};
		} catch (error: unknown) {
			await cleanup();
			throw error;
		}
	} finally {
		if (!relayOwned) await client.disconnectBrowserSession().catch(() => {});
	}
}

// ---------------------------------------------------------------------------
// Local (real-site) mode — attach to the browser that is ALREADY running.
// ---------------------------------------------------------------------------

/** Hostname of the relay the extension is being pointed at, or undefined when
 *  the connect URL carries no readable `mcpRelayUrl`. */
function relayHostname(connectUrl: string): string | undefined {
	try {
		const relay = new URL(connectUrl).searchParams.get('mcpRelayUrl');
		return relay === null ? undefined : new URL(relay).hostname;
	} catch {
		return undefined;
	}
}

/** Connect URL with the relay's pairing token stripped, for logging. */
function redactedConnectUrl(connectUrl: string): string {
	try {
		const url = new URL(connectUrl);
		const relay = url.searchParams.get('mcpRelayUrl');
		if (relay !== null) {
			const stripped = new URL(relay);
			stripped.search = '';
			url.searchParams.set('mcpRelayUrl', `${stripped.toString()}?token=<redacted>`);
		}
		return url.toString();
	} catch {
		return '<unparseable connect URL>';
	}
}

/** Order tried when the developer has several Chromium browsers installed. */
const LOCAL_BROWSER_PREFERENCE = ['chrome', 'brave', 'edge', 'chromium'] as const;

/** The installed browser this machine should drive in local mode. */
export function findLocalBrowser(): string {
	const override = process.env.N8N_EVAL_BROWSER_EXECUTABLE?.trim();
	if (override) {
		if (!existsSync(override)) {
			throw new Error(`N8N_EVAL_BROWSER_EXECUTABLE is set but missing: ${override}`);
		}
		return override;
	}
	const found = getDefaultDiscovery().discover();
	for (const name of LOCAL_BROWSER_PREFERENCE) {
		const path = found[name]?.executablePath;
		if (path) return path;
	}
	throw new Error(
		'No installed browser found for local mode. Install Chrome (or set ' +
			'N8N_EVAL_BROWSER_EXECUTABLE) — local mode drives YOUR browser, where you ' +
			'are logged into the provider and the browser-use extension is installed.',
	);
}

/**
 * Local mode does NOT launch a browser. It opens the relay's connect URL in the
 * browser the developer already has running, exactly as a person would: the
 * extension they already installed sees the page, auto-connects, and the agent
 * drives their real, logged-in session.
 *
 * Handing the URL to the browser BINARY is how a running instance is reached —
 * Chrome forwards the argument to the existing process (and starts normally if
 * there is none). This is the same call `@n8n/mcp-browser` makes in its own
 * local mode (`playwright.ts:148`).
 *
 * Why this rather than Playwright: launching would need the profile to itself,
 * so Chrome would have to be QUIT first, and a copied profile does not carry
 * the unpacked extension. Attaching sidesteps both — no profile lock, no
 * side-loading, no flags. It also means there is no `context` to return; the
 * browser is not ours to close.
 */
export async function attachToRunningBrowser(
	options: Pick<StartBrowserRuntimeOptions, 'client' | 'logger' | 'connectTimeoutMs'>,
): Promise<BrowserRuntime> {
	const { client, logger } = options;
	const connectTimeoutMs = options.connectTimeoutMs ?? 60_000;

	const link = await client.createBrowserLink();
	// Same ownership rule as the launch path: the session is instance-wide, so
	// every exit between here and the returned runtime has to release it.
	let relayOwned = false;
	try {
		const withAutoConnect = `${link.connectUrl}${link.connectUrl.includes('?') ? '&' : '?'}autoConnect=1`;
		// Same URL planning as the launch path — it already rewrites the relay's
		// PORT (the container case) and only asks for a DNS rule when n8n is on a
		// different HOST. That rule is the one thing we cannot supply here, since
		// flags only exist for a browser we start ourselves.
		const relayPlan = planRelayConnection(withAutoConnect, client.baseUrl);
		// Assert the loopback invariant on the URL we are about to open, rather than
		// inferring it from "planRelayConnection asked for no DNS rule". That
		// function returns the URL untouched whenever the relay already matches the
		// base URL, so a non-loopback --base-url produced no rule and slipped
		// through — pointing the developer's own browser at a remote relay. Fails
		// closed: an absent or unparseable relay param is a refusal, not a pass.
		// A requested DNS rule means n8n is NOT on loopback. The launch path fixes
		// that with `--host-resolver-rules`; we cannot, because this browser is not
		// ours to give flags to — so the connect page would resolve `localhost` on
		// the developer's machine, where nothing is listening.
		if (relayPlan.hostResolverRule) {
			throw new Error(
				'Local mode needs an n8n reachable on loopback from your own browser, but ' +
					`--base-url is ${client.baseUrl}, which needs a DNS rule only a launched ` +
					'browser can be given. Point --base-url at localhost (a published port is fine).',
			);
		}
		const relayHost = relayHostname(relayPlan.connectUrl);
		if (relayHost === undefined || !LOOPBACK_HOSTS.has(relayHost)) {
			throw new Error(
				'Local mode needs an n8n reachable on loopback, but the relay resolved to ' +
					`${relayHost ?? 'an unreadable URL'} (--base-url is ${client.baseUrl}). ` +
					'Your own browser cannot be given host-resolver rules, and the browser-use ' +
					'extension only auto-connects to localhost relays.',
			);
		}

		const executablePath = findLocalBrowser();
		logger.info(`  Local mode: handing the relay link to ${basename(executablePath)}`);
		// Origin + path only. The relay pairing token rides in the query string, and
		// these logs are uploaded as CI artifacts.
		logger.verbose(`  Connect URL: ${redactedConnectUrl(relayPlan.connectUrl)}`);
		// Deliberately NOT awaited. This hands the URL to an already-running browser,
		// whose process only exits when the BROWSER does — awaiting it hung the run
		// forever in exactly the case the "starts one if none is running" fallback is
		// for. Failures surface through `launchError` below instead.
		let launchError: Error | undefined;
		const child = execFile(executablePath, [relayPlan.connectUrl]);
		child.on('error', (error: Error) => {
			launchError = error;
		});
		child.on('exit', (code) => {
			// Exit 0 is normal — many browsers forward the URL and return. A non-zero
			// exit means the URL was never delivered, so say so instead of waiting out
			// the full connect timeout with no explanation.
			if (code !== null && code !== 0) {
				launchError = new Error(`${basename(executablePath)} exited with code ${String(code)}`);
			}
		});

		const deadline = Date.now() + connectTimeoutMs;
		while (Date.now() < deadline) {
			if (launchError) {
				throw new Error(`Could not hand the relay link to your browser: ${launchError.message}`);
			}
			if ((await client.getBrowserStatus()).connected) {
				logger.info('  Your browser is connected to the n8n relay');
				// The caller owns the session from here; `close` releases it.
				relayOwned = true;
				return {
					connected: true,
					// Their browser, their tabs — we only drop the relay session.
					close: async () => {
						await client.disconnectBrowserSession().catch(() => {});
					},
				};
			}
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
		throw new Error(
			`Your browser did not connect to the n8n relay within ${String(connectTimeoutMs)}ms. ` +
				'Check that the browser-use extension is installed and enabled in the browser ' +
				'that just opened, and that Browser Use is enabled on the n8n instance.',
		);
	} finally {
		if (!relayOwned) await client.disconnectBrowserSession().catch(() => {});
	}
}
