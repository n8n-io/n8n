/**
 * Builder templates service: fetches the curated workflow-template bundle from
 * the n8n-sdk-templates CDN as a single `templates.zip`, caches it on disk,
 * and exposes its contents to the sandbox setup as a ready-to-write
 * `BuilderTemplatesBundle`.
 *
 * The zip is produced by `n8n-io/n8n-sdk-templates` and contains:
 *   - `index.txt`        — pipe-delimited catalog used for grep-style lookup
 *   - `<slug>.ts`        — one pre-rendered SDK file per publishable template
 *
 * Behaviour:
 *   - First call: read disk cache if present; otherwise do a blocking fetch
 *     with a hard timeout. On any fetch error, return an empty bundle.
 *   - Subsequent calls: return memoised bundle synchronously. If the disk
 *     cache is older than the TTL, fire a background refresh.
 *   - Refresh: GET `templates.zip` with `If-None-Match`. On 304 just bump the
 *     timestamp; on 200 extract the new zip and atomically swap. On any
 *     failure keep the existing bundle.
 *   - Cold-start retry: the initial (blocking) refresh retries transient
 *     errors (network/5xx/408/429) with exponential backoff. Background
 *     refreshes stay single-attempt to avoid log spam on persistent outages.
 *   - Integrity: alongside `templates.zip` the CDN serves
 *     `templates.zip.sha256` (hex digest). When present, every fresh bundle
 *     and every disk-loaded cache is verified against it. On mismatch the
 *     bundle is rejected; on 404 we proceed and warn (the companion repo may
 *     pre-date the sidecar requirement). This is a defence against transport
 *     corruption and accidental CDN inconsistency — not a tamper-proof
 *     security boundary, since the sidecar shares the zip's trust root.
 *
 * The HTTP ETag doubles as the bundle version — surfaced via telemetry so we
 * can correlate template-set revisions with usage events.
 *
 * Never throws.
 */
import JSZip from 'jszip';
import { createHash } from 'node:crypto';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import type { Logger } from '../logger';

const DEFAULT_CDN_BASE_URL = 'https://sdk-templates.n8n.io/v1';
const DEFAULT_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_FETCH_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_BACKOFF_BASE_MS = 1_000;
const RETRY_BACKOFF_CAP_MS = 5_000;
const DEFAULT_CACHE_SUBDIR = 'n8n-sdk-templates';
const ZIP_FILENAME = 'templates.zip';
const ETAG_FILENAME = 'etag.txt';
const SHA256_FILENAME = 'templates.zip.sha256';
const INDEX_ENTRY = 'index.txt';

export interface BuilderTemplatesServiceOptions {
	/** Base URL hosting `templates.zip` and `templates.zip.sha256`. */
	cdnBaseUrl?: string;
	/** Directory where the service persists the zip + ETag + sha sidecar between runs. */
	cacheDir?: string;
	/** Time-to-live before a refresh fires in the background. Default 24h. */
	refreshIntervalMs?: number;
	/** Per-request timeout for HTTP fetches. Default 30s. */
	fetchTimeoutMs?: number;
	/** Max attempts for the cold-start refresh on transient failures. Default 3. */
	maxAttempts?: number;
	/** Base for the exponential retry backoff (capped at 5s). Default 1s. */
	retryBackoffBaseMs?: number;
	/** When true, the service short-circuits to an empty bundle and never fetches. */
	disabled?: boolean;
	/** Optional structured logger. */
	logger?: Logger;
}

export interface ExampleFile {
	filename: string;
	content: string;
}

export interface BuilderTemplatesBundle {
	files: ExampleFile[];
	indexTxt: string;
	/** ETag of the zip (content-hashed by R2), or null when no bundle has been loaded. */
	version: string | null;
}

const EMPTY_BUNDLE: BuilderTemplatesBundle = { files: [], indexTxt: '', version: null };

interface CacheState {
	bundle: BuilderTemplatesBundle;
	lastFetched: number;
	/** sha256 hex of the zip currently in `bundle`, when known. */
	sha256: string | null;
}

interface FetchedBundle {
	bundle: BuilderTemplatesBundle;
	rawBuffer: Buffer;
	sha256: string | null;
}

export class BuilderTemplatesService {
	private readonly zipUrl: string;
	private readonly sha256Url: string;
	private readonly cacheDir: string;
	private readonly refreshIntervalMs: number;
	private readonly fetchTimeoutMs: number;
	private readonly maxAttempts: number;
	private readonly retryBackoffBaseMs: number;
	private readonly disabled: boolean;
	private readonly logger?: Logger;

	private state: CacheState | null = null;
	private hydratePromise: Promise<void> | null = null;
	private backgroundRefresh: Promise<void> | null = null;

	constructor(opts: BuilderTemplatesServiceOptions = {}) {
		const base = (opts.cdnBaseUrl ?? DEFAULT_CDN_BASE_URL).replace(/\/+$/, '');
		this.zipUrl = `${base}/${ZIP_FILENAME}`;
		this.sha256Url = `${base}/${SHA256_FILENAME}`;
		this.cacheDir = opts.cacheDir ?? path.join(os.homedir(), '.n8n', DEFAULT_CACHE_SUBDIR);
		this.refreshIntervalMs = opts.refreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL_MS;
		this.fetchTimeoutMs = opts.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
		this.maxAttempts = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
		this.retryBackoffBaseMs = opts.retryBackoffBaseMs ?? DEFAULT_RETRY_BACKOFF_BASE_MS;
		this.disabled = opts.disabled ?? false;
		this.logger = opts.logger;
	}

	/** Return the memoised bundle, hydrating from disk or network on first call. */
	async getBundle(): Promise<BuilderTemplatesBundle> {
		if (this.disabled) return EMPTY_BUNDLE;

		if (!this.state) {
			this.hydratePromise ??= this.hydrate();
			await this.hydratePromise;
		}

		const state = this.state;
		if (!state) return EMPTY_BUNDLE;

		if (Date.now() - state.lastFetched > this.refreshIntervalMs && !this.backgroundRefresh) {
			this.backgroundRefresh = this.refresh({ isInitial: false }).finally(() => {
				this.backgroundRefresh = null;
			});
		}

		return state.bundle;
	}

	/**
	 * Return the bundle version for telemetry: the underlying ETag stripped of
	 * its `W/` weak prefix and surrounding double quotes. The raw ETag is kept
	 * in `state.bundle.version` so `If-None-Match` echoes back the server's
	 * exact token.
	 */
	getVersion(): string | null {
		const raw = this.state?.bundle.version ?? null;
		if (!raw) return null;
		return raw.replace(/^W\//, '').replace(/^"|"$/g, '');
	}

	private async hydrate(): Promise<void> {
		const fromDisk = await this.loadFromDisk();
		if (fromDisk) {
			this.state = fromDisk;
			if (Date.now() - fromDisk.lastFetched > this.refreshIntervalMs) {
				this.backgroundRefresh = this.refresh({ isInitial: false }).finally(() => {
					this.backgroundRefresh = null;
				});
			}
			return;
		}
		await this.refresh({ isInitial: true });
	}

	private async loadFromDisk(): Promise<CacheState | null> {
		const zipPath = path.join(this.cacheDir, ZIP_FILENAME);
		try {
			const stat = await fsp.stat(zipPath);
			const buffer = await fsp.readFile(zipPath);
			const actualSha = sha256Hex(buffer);
			const expectedSha = await this.readSha256FromDisk();

			if (expectedSha && expectedSha !== actualSha) {
				this.logger?.warn('[builder-templates] disk cache sha256 mismatch, dropping cache', {
					expected: expectedSha,
					actual: actualSha,
				});
				return null;
			}

			const etag = await this.readEtagFromDisk();
			const bundle = await extractBundle(buffer, etag);
			return { bundle, lastFetched: stat.mtimeMs, sha256: actualSha };
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
				this.logger?.warn('[builder-templates] failed to load disk cache', {
					error: error instanceof Error ? error.message : String(error),
				});
			}
			return null;
		}
	}

	private async readEtagFromDisk(): Promise<string | null> {
		try {
			const raw = await fsp.readFile(path.join(this.cacheDir, ETAG_FILENAME), 'utf-8');
			return raw.trim() || null;
		} catch {
			return null;
		}
	}

	private async readSha256FromDisk(): Promise<string | null> {
		try {
			const raw = await fsp.readFile(path.join(this.cacheDir, SHA256_FILENAME), 'utf-8');
			return parseSha256(raw);
		} catch {
			return null;
		}
	}

	private async refresh({ isInitial }: { isInitial: boolean }): Promise<void> {
		try {
			const maxAttempts = isInitial ? this.maxAttempts : 1;
			const fetched = await this.fetchBundleWithRetries(maxAttempts);
			if (!fetched) return;

			await this.persist(fetched.rawBuffer, fetched.bundle.version, fetched.sha256);
			this.state = {
				bundle: fetched.bundle,
				lastFetched: Date.now(),
				sha256: fetched.sha256,
			};
		} catch (error) {
			this.logger?.warn('[builder-templates] refresh failed', {
				error: error instanceof Error ? error.message : String(error),
				url: this.zipUrl,
			});
		}
	}

	private async fetchBundleWithRetries(maxAttempts: number): Promise<FetchedBundle | null> {
		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			const outcome = await this.tryFetchBundleOnce();
			if (outcome.kind === 'fetched') return outcome.bundle;
			if (outcome.kind === 'not-modified') return null;
			if (!outcome.retryable || attempt === maxAttempts) return null;

			const delay = Math.min(this.retryBackoffBaseMs * 2 ** (attempt - 1), RETRY_BACKOFF_CAP_MS);
			await sleep(delay);
		}
		return null;
	}

	private async tryFetchBundleOnce(): Promise<
		| { kind: 'fetched'; bundle: FetchedBundle }
		| { kind: 'not-modified' }
		| { kind: 'failed'; retryable: boolean }
	> {
		// Only send a conditional request when we already have a bundle in
		// memory to fall back to. Sending If-None-Match with an orphan etag
		// (e.g. zip missing/corrupt but etag.txt present) could return 304
		// and leave the service permanently empty for this process.
		const headers: Record<string, string> = {};
		const cachedEtag = this.state?.bundle.version ?? null;
		if (cachedEtag) headers['If-None-Match'] = cachedEtag;

		let response: Response;
		try {
			response = await fetch(this.zipUrl, {
				headers,
				signal: AbortSignal.timeout(this.fetchTimeoutMs),
			});
		} catch (error) {
			// Network / abort errors — assume transient.
			this.logger?.warn('[builder-templates] zip fetch threw', {
				error: error instanceof Error ? error.message : String(error),
				url: this.zipUrl,
			});
			return { kind: 'failed', retryable: true };
		}

		if (response.status === 304 && this.state) {
			await touchZipFile(path.join(this.cacheDir, ZIP_FILENAME));
			this.state = { ...this.state, lastFetched: Date.now() };
			return { kind: 'not-modified' };
		}

		if (!response.ok) {
			this.logger?.warn('[builder-templates] zip fetch returned non-OK', {
				status: response.status,
				url: this.zipUrl,
			});
			return { kind: 'failed', retryable: isRetryableStatus(response.status) };
		}

		const buffer = Buffer.from(await response.arrayBuffer());
		const actualSha = sha256Hex(buffer);
		const expectedSha = await this.fetchSha256Sidecar();

		if (expectedSha && expectedSha !== actualSha) {
			this.logger?.warn('[builder-templates] sha256 mismatch on downloaded zip, rejecting', {
				expected: expectedSha,
				actual: actualSha,
				url: this.zipUrl,
			});
			// Treat as a hard failure that isn't worth retrying — the sidecar
			// and zip come from the same origin, so a retry will almost
			// certainly return the same mismatched pair.
			return { kind: 'failed', retryable: false };
		}

		const etag = normaliseEtag(response.headers.get('etag'));
		const bundle = await extractBundle(buffer, etag);
		return {
			kind: 'fetched',
			bundle: { bundle, rawBuffer: buffer, sha256: actualSha },
		};
	}

	private async fetchSha256Sidecar(): Promise<string | null> {
		try {
			const response = await fetch(this.sha256Url, {
				signal: AbortSignal.timeout(this.fetchTimeoutMs),
			});
			if (response.status === 404) {
				this.logger?.warn(
					'[builder-templates] sha256 sidecar missing — proceeding without integrity check',
					{ url: this.sha256Url },
				);
				return null;
			}
			if (!response.ok) {
				this.logger?.warn(
					'[builder-templates] sha256 sidecar fetch returned non-OK — proceeding without integrity check',
					{ status: response.status, url: this.sha256Url },
				);
				return null;
			}
			return parseSha256(await response.text());
		} catch (error) {
			this.logger?.warn(
				'[builder-templates] sha256 sidecar fetch threw — proceeding without integrity check',
				{
					error: error instanceof Error ? error.message : String(error),
					url: this.sha256Url,
				},
			);
			return null;
		}
	}

	private async persist(buffer: Buffer, etag: string | null, sha256: string | null): Promise<void> {
		await fsp.mkdir(this.cacheDir, { recursive: true });
		// Write metadata first, payload last. If we crash between the metadata
		// write and the zip write, the disk is left in an "orphan metadata"
		// state — `loadFromDisk` will see no zip → return null → next refresh
		// goes out unconditionally (no stale If-None-Match echoed back).
		if (etag) {
			await atomicWriteFile(path.join(this.cacheDir, ETAG_FILENAME), etag);
		} else {
			await unlinkIfExists(path.join(this.cacheDir, ETAG_FILENAME));
		}
		if (sha256) {
			await atomicWriteFile(path.join(this.cacheDir, SHA256_FILENAME), sha256);
		} else {
			await unlinkIfExists(path.join(this.cacheDir, SHA256_FILENAME));
		}
		await atomicWriteFile(path.join(this.cacheDir, ZIP_FILENAME), buffer);
	}
}

function normaliseEtag(raw: string | null): string | null {
	if (!raw) return null;
	const trimmed = raw.trim();
	if (!trimmed) return null;
	// R2 emits weak ETags as `W/"hex"` — keep the full token so `If-None-Match`
	// echoes it verbatim and the server can match.
	return trimmed;
}

function sha256Hex(buffer: Buffer): string {
	return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Parse a sha256 sidecar body. Accepts either a bare hex digest or the
 * `<hex>  <filename>` format `sha256sum` emits. Returns the lowercased hex
 * digest, or `null` if the body is empty/malformed.
 */
function parseSha256(raw: string): string | null {
	const first = raw.trim().split(/\s+/, 1)[0];
	if (!first || !/^[0-9a-fA-F]{64}$/.test(first)) return null;
	return first.toLowerCase();
}

function isRetryableStatus(status: number): boolean {
	if (status >= 500) return true;
	return status === 408 || status === 429;
}

async function sleep(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

async function extractBundle(buffer: Buffer, etag: string | null): Promise<BuilderTemplatesBundle> {
	const zip = await JSZip.loadAsync(buffer);
	const files: ExampleFile[] = [];
	let indexTxt = '';

	const entries = Object.entries(zip.files).filter(([, entry]) => !entry.dir);
	const reads = await Promise.all(
		entries.map(async ([name, entry]) => ({ name, content: await entry.async('string') })),
	);

	for (const { name, content } of reads) {
		if (name === INDEX_ENTRY) {
			indexTxt = content;
			continue;
		}
		if (name.endsWith('.ts')) {
			files.push({ filename: name, content });
		}
	}

	files.sort((a, b) => a.filename.localeCompare(b.filename));
	return { files, indexTxt, version: etag };
}

async function atomicWriteFile(target: string, contents: Buffer | string): Promise<void> {
	const tmp = `${target}.tmp-${process.pid}-${Date.now()}`;
	try {
		await fsp.writeFile(tmp, contents);
		await fsp.rename(tmp, target);
	} catch (error) {
		try {
			await fsp.unlink(tmp);
		} catch {
			// best-effort cleanup
		}
		throw error;
	}
}

async function unlinkIfExists(target: string): Promise<void> {
	try {
		await fsp.unlink(target);
	} catch {
		// best-effort cleanup
	}
}

async function touchZipFile(target: string): Promise<void> {
	const now = new Date();
	try {
		await fsp.utimes(target, now, now);
	} catch {
		// non-fatal — next refresh will reset state.lastFetched anyway
	}
}

/**
 * Read the env-driven configuration into a `BuilderTemplatesServiceOptions`.
 * Returned options can be overridden at the call site.
 *
 * Invalid `N8N_INSTANCE_AI_TEMPLATES_REFRESH_HOURS` values are warned about and
 * dropped so the constructor's default kicks in — otherwise `Number("abc")`
 * would yield `NaN` and silently disable refreshes.
 */
export function builderTemplatesOptionsFromEnv({
	logger,
}: { logger?: Logger } = {}): BuilderTemplatesServiceOptions {
	const url = process.env.N8N_INSTANCE_AI_TEMPLATES_URL;
	const hoursRaw = process.env.N8N_INSTANCE_AI_TEMPLATES_REFRESH_HOURS;
	const disabled = process.env.N8N_INSTANCE_AI_TEMPLATES_DISABLED;

	const refreshIntervalMs = parseRefreshHoursMs(hoursRaw, logger);

	return {
		...(url ? { cdnBaseUrl: url } : {}),
		...(refreshIntervalMs !== null ? { refreshIntervalMs } : {}),
		disabled: disabled === '1' || disabled?.toLowerCase() === 'true',
	};
}

function parseRefreshHoursMs(raw: string | undefined, logger?: Logger): number | null {
	if (raw === undefined || raw === '') return null;
	const hours = Number(raw);
	if (!Number.isFinite(hours) || hours <= 0) {
		logger?.warn(
			'[builder-templates] ignoring invalid N8N_INSTANCE_AI_TEMPLATES_REFRESH_HOURS, using default',
			{ value: raw },
		);
		return null;
	}
	return hours * 60 * 60 * 1000;
}
