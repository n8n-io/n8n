// ---------------------------------------------------------------------------
// Fixture server — serves lookalike provider console pages AS the real
// provider hostnames, for credential-setup evals.
//
// Same species as `packages/cli/.../eval/llm-wire-server.ts`: a loopback
// listener on an OS-assigned port, started and stopped around ONE case, never
// instance-wide. The difference is who is fooled — the wire server intercepts
// vendor SDK calls from the n8n process, this one serves page loads to the
// eval browser.
//
// Interception is NOT proxy-based. The browser is launched with
// `--host-resolver-rules=MAP console.anthropic.com 127.0.0.1:<port>` plus
// `--ignore-certificate-errors` (see `browser-runtime.ts`), so the agent
// navigates to the real hostname and this server answers. A forward proxy
// would additionally have to terminate TLS per host on CONNECT — a MITM CA for
// no extra benefit. Debugger-based interception is off the table entirely: it
// collides with the extension's own `chrome.debugger` session (NODE-4979).
//
// What is stored here is layout only — our own generic HTML. Never provider
// source, never recorded provider responses, never real tokens.
// ---------------------------------------------------------------------------

import { jsonParse } from 'n8n-workflow';
import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFile, readdir, mkdtemp, rm } from 'node:fs/promises';
import { createServer as createHttpServer, type Server as HttpServer } from 'node:http';
import { createServer, type Server } from 'node:https';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { z } from 'zod';

import type { EvalLogger } from './logger';

const execFileAsync = promisify(execFile);

/**
 * Bind + advertise addresses. Loopback by default: on a dev laptop the fixture
 * must not be reachable from the LAN. A CONTAINERISED run needs both overridden
 * — the fixture lives in the dispatcher container while n8n lives in another,
 * so n8n cannot reach the dispatcher's loopback. Leaving them unset there is
 * safe: the credential test simply reports itself unverifiable.
 */
function envHost(name: string): string {
	const raw = process.env[name]?.trim();
	return raw !== undefined && raw.length > 0 ? raw : '127.0.0.1';
}
const BIND_HOST = envHost('N8N_EVAL_FIXTURE_BIND');
const ADVERTISE_HOST = envHost('N8N_EVAL_FIXTURE_ADVERTISE_HOST');

/** Reserved fixture id — kept here (not imported from the lane) to avoid a
 *  cycle; the lane re-exports it as LOCAL_FIXTURE_ID. */
const RESERVED_LOCAL_FIXTURE_ID = 'local';

/** Where provider fixtures live, relative to this file. */
const FIXTURES_DIR = join(__dirname, '..', 'fixtures', 'providers');

/**
 * Shape of a provider fixture's `manifest.json`, as a zod schema.
 *
 * Parsed rather than cast: a manifest is hand-written JSON with no compiler
 * behind it, so a typo'd key or a missing route used to surface much later as
 * a confusing runtime failure (or, worse, as the default page being served for
 * a route nobody noticed was misspelled). `.strict()` turns an unknown key into
 * an error at load instead of silence.
 */
export const providerFixtureManifestSchema = z
	.object({
		/** n8n credential type this fixture stands in for, e.g. `anthropicApi`.
		 *  Fixture selection is derived from the case's credential type through
		 *  this field — deliberately NOT a case-schema field. */
		credentialType: z.string().min(1),
		/** Hostnames to route into this server. */
		hosts: z.array(z.string().min(1)).min(1),
		/** Prefix real keys of this provider carry, so a leak scan and any
		 *  prefix-sniffing code sees a realistic shape. */
		secretPrefix: z.string().min(1),
		/** URL path → HTML file in the fixture directory. */
		routes: z.record(z.string(), z.string().min(1)),
		/** Path served for any request that matches no route. Real consoles
		 *  redirect liberally; a 404 would strand the agent for the wrong reason. */
		defaultRoute: z.string().min(1),
		/** OPTIONAL provider-API stand-in, used to prove the SAVED credential really
		 *  authenticates. n8n runs the credential's own test request against this
		 *  instead of the real provider, and only the minted key is accepted — so a
		 *  pass proves the stored value without anyone ever reading it back.
		 *
		 *  Plain HTTP on its own port, deliberately: the browser-facing listener is
		 *  HTTPS-with-a-self-signed-cert so it can impersonate a hostname, and n8n's
		 *  HTTP client would (correctly) reject that cert. Omit the block entirely
		 *  and the check reports itself unverifiable rather than failing. */
		verify: z
			.object({
				/** Path the credential's test request hits, e.g. `/v1/models`. */
				path: z.string().startsWith('/'),
				/** Header the credential type sends its secret in, e.g. `x-api-key`. */
				header: z.string().min(1),
			})
			.strict()
			.optional(),
	})
	.strict()
	// Was a throw after the TLS cert had already been generated; as a refinement
	// it fails at load, with the offending value in the message.
	.refine(
		(m) => Object.keys(m.routes).includes(m.defaultRoute),
		(m) => ({
			message: `defaultRoute "${m.defaultRoute}" is not one of routes (${Object.keys(m.routes).join(', ')})`,
			path: ['defaultRoute'],
		}),
	);

export type ProviderFixtureManifest = z.infer<typeof providerFixtureManifestSchema>;

export interface ProviderFixture {
	/** Directory name, also the fixture id. */
	id: string;
	dir: string;
	manifest: ProviderFixtureManifest;
}

/** One request the fixture answered. Feeds failure attribution: a red with an
 *  empty event log is a harness problem, a red with page loads but no key
 *  creation is an agent problem. */
export interface FixtureEvent {
	method: string;
	host: string;
	path: string;
	/** Set when this request minted the secret. */
	mintedSecret?: boolean;
	/** Set on a credential-test request: whether the presented key was accepted. */
	verifyOk?: boolean;
}

export interface FixtureServer {
	port: number;
	/** Base URL n8n should point the credential's test request at, when this
	 *  fixture stands in for the provider API. Undefined when the fixture
	 *  declares no `verify` block — the value check then reports itself
	 *  unverifiable instead of failing. */
	verifyBaseUrl?: string;
	/** True once the verify endpoint accepted the minted key — evidence the
	 *  check actually exercised the provider path. */
	verifiedOk: boolean;
	/** How many credential-test requests reached the stand-in. ZERO means n8n
	 *  never got here (unreachable across a container boundary, say), which is a
	 *  harness limitation — NOT a wrong credential. The classifier keys on this
	 *  rather than on n8n's error prose. */
	verifyAttempts: number;
	hosts: string[];
	/** The exact secret this run's page will hand out — the ledger the
	 *  "correct value" check compares against. */
	mintedSecret: string;
	events: FixtureEvent[];
	/** True once the page's create-key action was actually invoked. */
	secretWasIssued: boolean;
	/** This provider's key prefix, from the manifest — the shape a leak scan looks for. */
	manifestSecretPrefix: string;
	/** Chromium flag mapping every fixture host — AND every other host — to this
	 *  server, so a fixture run cannot reach the real internet. */
	hostResolverRules(): string;
	close(): Promise<void>;
}

/** Load every provider fixture that ships in the evaluations package. */
export async function loadProviderFixtures(): Promise<ProviderFixture[]> {
	const entries = await readdir(FIXTURES_DIR, { withFileTypes: true }).catch(() => []);
	const fixtures: ProviderFixture[] = [];
	for (const entry of entries) {
		if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
		// `local` is the reserved id meaning "the real provider site". A fixture
		// directory of that name would shadow the keyword and silently turn a
		// real-site run into a lookalike one.
		if (entry.name === RESERVED_LOCAL_FIXTURE_ID) {
			throw new Error(
				`Fixture directory "${RESERVED_LOCAL_FIXTURE_ID}" is reserved — it is the id that means "run against the real provider site". Rename it.`,
			);
		}
		const dir = join(FIXTURES_DIR, entry.name);
		const raw = await readFile(join(dir, 'manifest.json'), 'utf8').catch(() => null);
		if (!raw) continue;
		const parsed = providerFixtureManifestSchema.safeParse(jsonParse<unknown>(raw));
		if (!parsed.success) {
			const detail = parsed.error.issues
				.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
				.join('; ');
			throw new Error(`Fixture ${entry.name}: invalid manifest.json — ${detail}`);
		}
		fixtures.push({ id: entry.name, dir, manifest: parsed.data });
	}
	return fixtures;
}

/** Resolve the fixture for a credential type. Returns undefined when none
 *  covers it — the caller then runs the case without a browser rather than
 *  inventing a page. */
export async function findFixtureForCredentialType(
	credentialType: string,
): Promise<ProviderFixture | undefined> {
	const fixtures = await loadProviderFixtures();
	return fixtures.find((f) => f.manifest.credentialType === credentialType);
}

/** Mint a synthetic secret carrying the provider's real prefix. Random, not
 *  seeded: two runs must never share a secret, or a leak scan could pass by
 *  matching the wrong run's value. */
export function mintSecret(prefix: string): string {
	return `${prefix}${randomBytes(24).toString('base64url')}`;
}

/** Self-signed cert for the fixture hosts. The browser is launched with
 *  `--ignore-certificate-errors`, so this only has to exist — but it names the
 *  hosts anyway so a manual `curl --resolve` session is pleasant.
 *  Shells out to openssl (present on macOS and GitHub runners) rather than
 *  adding a crypto dependency or committing a private key to the repo. */
async function generateSelfSignedCert(
	hosts: string[],
): Promise<{ key: string; cert: string; dir: string }> {
	const dir = await mkdtemp(join(tmpdir(), 'eval-fixture-cert-'));
	const san = hosts.map((h) => `DNS:${h}`).join(',');
	try {
		await execFileAsync('openssl', [
			'req',
			'-x509',
			'-newkey',
			'rsa:2048',
			'-nodes',
			'-keyout',
			join(dir, 'key.pem'),
			'-out',
			join(dir, 'cert.pem'),
			'-days',
			'1',
			'-subj',
			`/CN=${hosts[0] ?? 'fixture.local'}`,
			'-addext',
			`subjectAltName=${san}`,
		]);
	} catch (error: unknown) {
		await rm(dir, { recursive: true, force: true });
		throw new Error(
			`Fixture server needs \`openssl\` on PATH to mint its TLS cert: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}
	const [key, cert] = await Promise.all([
		readFile(join(dir, 'key.pem'), 'utf8'),
		readFile(join(dir, 'cert.pem'), 'utf8'),
	]);
	return { key, cert, dir };
}

/** Path the fixture page POSTs to when the agent creates a key. Namespaced so
 *  it can't collide with a path the lookalike page models. */
export const MINT_PATH = '/__fixture__/create-key';

export interface StartFixtureServerOptions {
	fixture: ProviderFixture;
	logger: EvalLogger;
	/** Override the minted secret (tests only). */
	secret?: string;
}

export async function startFixtureServer(
	options: StartFixtureServerOptions,
): Promise<FixtureServer> {
	const { fixture, logger } = options;
	const { manifest } = fixture;
	const mintedSecret = options.secret ?? mintSecret(manifest.secretPrefix);
	const events: FixtureEvent[] = [];
	let secretWasIssued = false;

	const { key, cert, dir: certDir } = await generateSelfSignedCert(manifest.hosts);

	// Pages are read once at boot — a fixture must not change mid-run.
	const pages = new Map<string, string>();
	for (const [route, file] of Object.entries(manifest.routes)) {
		pages.set(route, await readFile(join(fixture.dir, file), 'utf8'));
	}
	// Non-null: the schema's refinement guarantees defaultRoute is a declared route.
	const defaultPage = pages.get(manifest.defaultRoute)!;

	const server = createServer({ key, cert }, (req, res) => {
		const host = (req.headers.host ?? '').split(':')[0];
		const path = (req.url ?? '/').split('?')[0];

		if (req.method === 'POST' && path === MINT_PATH) {
			secretWasIssued = true;
			events.push({ method: 'POST', host, path, mintedSecret: true });
			logger.verbose(`  [fixture] issued secret to ${host}`);
			res.writeHead(200, { 'content-type': 'application/json' });
			res.end(JSON.stringify({ key: mintedSecret }));
			return;
		}

		events.push({ method: req.method ?? 'GET', host, path });
		if (path === '/favicon.ico') {
			res.writeHead(204).end();
			return;
		}
		const body = pages.get(path) ?? defaultPage;
		res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
		res.end(body);
	});

	await new Promise<void>((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, BIND_HOST, () => resolve());
	});
	const address = server.address();
	const port = typeof address === 'object' && address ? address.port : 0;
	logger.info(
		`  Fixture ${fixture.id} serving ${manifest.hosts.join(', ')} on ${BIND_HOST}:${port}`,
	);

	// Provider-API stand-in for the credential test. n8n calls this, not the
	// browser, so it is plain HTTP on its own port (see the manifest comment).
	let verifyServer: HttpServer | undefined;
	let verifyBaseUrl: string | undefined;
	let verifiedOk = false;
	let verifyAttempts = 0;
	if (manifest.verify) {
		const { path: verifyPath, header } = manifest.verify;
		verifyServer = createHttpServer((req, res) => {
			const path = (req.url ?? '/').split('?')[0];
			if (path !== verifyPath) {
				events.push({ method: req.method ?? 'GET', host: 'verify', path });
				res.writeHead(404).end();
				return;
			}
			// ONLY the minted key authenticates. That is the whole proof: a
			// truncated or re-typed key cannot pass, so a 200 means the stored
			// value is exactly what the page issued — without reading it back.
			const presented = req.headers[header.toLowerCase()];
			const ok = typeof presented === 'string' && presented === mintedSecret;
			verifyAttempts += 1;
			if (ok) verifiedOk = true;
			events.push({ method: req.method ?? 'GET', host: 'verify', path, verifyOk: ok });
			logger.verbose(`  [fixture] credential test ${ok ? 'ACCEPTED' : 'REJECTED'}`);
			res.writeHead(ok ? 200 : 401, { 'content-type': 'application/json' });
			res.end(JSON.stringify(ok ? { data: [{ id: 'fixture-model' }] } : { error: 'invalid key' }));
		});
		await new Promise<void>((resolve, reject) => {
			verifyServer!.once('error', reject);
			verifyServer!.listen(0, BIND_HOST, () => resolve());
		});
		const vAddr = verifyServer.address();
		const vPort = typeof vAddr === 'object' && vAddr ? vAddr.port : 0;
		verifyBaseUrl = `http://${ADVERTISE_HOST}:${vPort}`;
		logger.info(
			`  Fixture ${fixture.id} credential-test endpoint at ${verifyBaseUrl}${verifyPath}`,
		);
	}

	return {
		port,
		hosts: manifest.hosts,
		manifestSecretPrefix: manifest.secretPrefix,
		mintedSecret,
		events,
		verifyBaseUrl,
		get verifiedOk() {
			return verifiedOk;
		},
		get verifyAttempts() {
			return verifyAttempts;
		},
		get secretWasIssued() {
			return secretWasIssued;
		},
		hostResolverRules() {
			// Declared hosts first, then a WILDCARD catch-all. Without the
			// catch-all the run is only hermetic for hosts we happened to list —
			// verified: an unlisted host (docs.anthropic.com, example.com) reaches
			// the real internet, so an agent that follows a link silently leaves
			// the fixture. First-match-wins, so the specific relay rule the caller
			// appends still beats this.
			return [
				...manifest.hosts.map((h) => `MAP ${h} 127.0.0.1:${port}`),
				`MAP * 127.0.0.1:${port}`,
			].join(',');
		},
		async close() {
			// `close()` only stops NEW connections; it resolves when the last live
			// one ends. n8n's HTTP client keep-alives against the verify listener,
			// so one retained socket would hang this forever — and it is awaited
			// from buildWorkflow's `finally`, so that hangs the whole run, not just
			// the case. Drop the sockets explicitly.
			const shutDown = async (target: typeof server | typeof verifyServer) => {
				if (!target) return;
				const closed = new Promise<void>((resolve) => target.close(() => resolve()));
				target.closeAllConnections();
				await closed;
			};
			await shutDown(server);
			await shutDown(verifyServer);
			await rm(certDir, { recursive: true, force: true });
		},
	} satisfies FixtureServer;
}

/** Kept for callers that want the raw server type without importing node:https. */
export type { Server as FixtureHttpServer };
