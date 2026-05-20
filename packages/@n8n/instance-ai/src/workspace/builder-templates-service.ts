/**
 * Builder templates service: fetches the curated workflow-template bundle from
 * the n8n-sdk-templates CDN as a single `templates.tar.gz`, caches it on disk,
 * and hands the raw bytes to the sandbox where `tar -xzf` expands them into
 * `examples/`. No host-side extraction.
 *
 * The archive is produced by `n8n-io/n8n-sdk-templates` and is flat:
 *   - `index.txt`        — pipe-delimited catalog used for grep-style lookup
 *   - `<slug>.ts`        — one pre-rendered SDK file per publishable template
 *
 * Versioning:
 *   - The companion repo emits one archive per supported SDK minor and
 *     uploads it to `/v<major>.<minor>/templates.tar.gz`. The newest minor
 *     is mirrored to `/latest/templates.tar.gz`.
 *   - The instance derives its CDN path from the bundled `@n8n/workflow-sdk`
 *     version and prefers that exact path. On 404 (no archive published for
 *     this minor yet) the service falls back to `/latest/`. Other transport
 *     failures keep the existing cached bundle and do not trigger fallback.
 *   - The current channel (`exact` or `latest`) is persisted on disk so warm
 *     restarts pick the same URL on refresh and the cached ETag is only
 *     echoed back to its originating path.
 *
 * Behaviour:
 *   - First call: read disk cache if present; otherwise do a blocking fetch
 *     with a hard timeout. On any fetch error, return an empty bundle.
 *   - Subsequent calls: return memoised bundle synchronously. If the disk
 *     cache is older than the TTL, fire a background refresh.
 *   - Refresh: GET `templates.tar.gz` with `If-None-Match`. On 304 just bump
 *     the timestamp; on 200 atomically swap the cache. On any failure keep
 *     the existing bundle.
 *   - Cold-start retry: the initial (blocking) refresh retries transient
 *     errors (network/5xx/408/429) with exponential backoff. Background
 *     refreshes stay single-attempt to avoid log spam on persistent outages.
 *   - Integrity: alongside `templates.tar.gz` the CDN serves
 *     `templates.tar.gz.sha256` (hex digest). When present, every fresh
 *     bundle and every disk-loaded cache is verified against it. On mismatch
 *     the bundle is rejected; on 404 we proceed and warn. This guards
 *     against transport corruption and accidental CDN inconsistency — not
 *     against tampering, since the sidecar shares the archive's trust root.
 *
 * The HTTP ETag is exposed via `getVersion()` prefixed with the channel
 * (`v0.15:<etag>` or `latest:<etag>`) so telemetry can track template-set
 * revisions and fallback rate.
 *
 * Never throws.
 */
import workflowSdkPackage from '@n8n/workflow-sdk/package.json';
import { createHash } from 'node:crypto';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import type { Logger } from '../logger';

const DEFAULT_CDN_BASE_URL = 'https://sdk-templates.n8n.io';
const WORKFLOW_SDK_VERSION = (workflowSdkPackage as { version: string }).version;
const DEFAULT_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_FETCH_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_BACKOFF_BASE_MS = 1_000;
const RETRY_BACKOFF_CAP_MS = 5_000;
const DEFAULT_CACHE_SUBDIR = 'n8n-sdk-templates';
const ARCHIVE_FILENAME = 'templates.tar.gz';
const ETAG_FILENAME = 'etag.txt';
const SHA256_FILENAME = 'templates.tar.gz.sha256';
const CHANNEL_FILENAME = 'channel.txt';

export interface BuilderTemplatesServiceOptions {
	/**
	 * CDN root. The service appends a channel prefix:
	 *   - `<base>/v<major>.<minor>/templates.tar.gz` (matched to `sdkVersion`)
	 *   - `<base>/latest/templates.tar.gz` (404-fallback)
	 */
	cdnBaseUrl?: string;
	/**
	 * SDK version the instance is running, used to build `/v<major>.<minor>/`.
	 * Defaults to the version of `@n8n/workflow-sdk` resolved at module load.
	 */
	sdkVersion?: string;
	/** Directory where the service persists the archive + ETag + sha sidecar between runs. */
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

export interface BuilderTemplatesBundle {
	/** Raw .tar.gz bytes for the sandbox to extract. Null when no bundle is loaded. */
	archive: Buffer | null;
	/** ETag of the archive (content-hashed by R2), or null when no bundle has been loaded. */
	version: string | null;
}

const EMPTY_BUNDLE: BuilderTemplatesBundle = { archive: null, version: null };

type Channel = 'exact' | 'latest';

interface CacheState {
	bundle: BuilderTemplatesBundle;
	lastFetched: number;
	/** sha256 hex of the archive currently in `bundle`, when known. */
	sha256: string | null;
	/** Which CDN folder the cached bundle came from. */
	channel: Channel;
}

interface FetchedBundle {
	bundle: BuilderTemplatesBundle;
	sha256: string | null;
}

export class BuilderTemplatesService {
	private readonly cdnBase: string;
	private readonly versionPrefix: string;
	private readonly sdkVersion: string;
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
		this.cdnBase = (opts.cdnBaseUrl ?? DEFAULT_CDN_BASE_URL).replace(/\/+$/, '');
		this.sdkVersion = opts.sdkVersion ?? WORKFLOW_SDK_VERSION;
		this.versionPrefix = sdkVersionToPrefix(this.sdkVersion);
		this.cacheDir = opts.cacheDir ?? path.join(os.homedir(), '.n8n', DEFAULT_CACHE_SUBDIR);
		this.refreshIntervalMs = opts.refreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL_MS;
		this.fetchTimeoutMs = opts.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
		this.maxAttempts = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
		this.retryBackoffBaseMs = opts.retryBackoffBaseMs ?? DEFAULT_RETRY_BACKOFF_BASE_MS;
		this.disabled = opts.disabled ?? false;
		this.logger = opts.logger;
	}

	private channelPrefix(channel: Channel): string {
		return channel === 'exact' ? this.versionPrefix : 'latest';
	}

	private archiveUrlFor(channel: Channel): string {
		return `${this.cdnBase}/${this.channelPrefix(channel)}/${ARCHIVE_FILENAME}`;
	}

	private sha256UrlFor(channel: Channel): string {
		return `${this.cdnBase}/${this.channelPrefix(channel)}/${SHA256_FILENAME}`;
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
		const state = this.state;
		const raw = state?.bundle.version ?? null;
		if (!raw || !state) return null;
		const normalised = raw.replace(/^W\//, '').replace(/^"|"$/g, '');
		return `${this.channelPrefix(state.channel)}:${normalised}`;
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
		const archivePath = path.join(this.cacheDir, ARCHIVE_FILENAME);
		try {
			const stat = await fsp.stat(archivePath);
			const buffer = await fsp.readFile(archivePath);
			const actualSha = sha256Hex(buffer);
			const expectedSha = await this.readSha256FromDisk();

			if (expectedSha && expectedSha !== actualSha) {
				this.logger?.warn('[builder-templates] disk cache sha256 mismatch, dropping cache', {
					expected: expectedSha,
					actual: actualSha,
				});
				return null;
			}

			const channel = await this.readChannelFromDisk();
			if (!channel) {
				// Pre-versioned cache layout (no channel.txt). We can't tell which
				// CDN folder this archive came from, so its etag is unsafe to echo
				// back in If-None-Match. Drop the cache and let the next refresh
				// repopulate from scratch.
				this.logger?.debug(
					'[builder-templates] disk cache missing channel.txt, treating as legacy and refetching',
				);
				return null;
			}

			const etag = await this.readEtagFromDisk();
			return {
				bundle: { archive: buffer, version: etag },
				lastFetched: stat.mtimeMs,
				sha256: actualSha,
				channel,
			};
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

	private async readChannelFromDisk(): Promise<Channel | null> {
		try {
			const raw = (await fsp.readFile(path.join(this.cacheDir, CHANNEL_FILENAME), 'utf-8')).trim();
			if (raw === 'exact' || raw === 'latest') return raw;
			return null;
		} catch {
			return null;
		}
	}

	private async refresh({ isInitial }: { isInitial: boolean }): Promise<void> {
		try {
			const maxAttempts = isInitial ? this.maxAttempts : 1;

			let outcome = await this.fetchBundleWithRetries('exact', maxAttempts);
			let channel: Channel = 'exact';

			if (outcome.kind === 'not-found') {
				this.logger?.warn(
					'[builder-templates] no archive at /v<minor>/, falling back to /latest/',
					{ sdkVersion: this.sdkVersion },
				);
				outcome = await this.fetchBundleWithRetries('latest', maxAttempts);
				channel = 'latest';
			}

			if (outcome.kind !== 'fetched') return;

			await this.persist(
				outcome.bundle.bundle.archive,
				outcome.bundle.bundle.version,
				outcome.bundle.sha256,
				channel,
			);
			this.state = {
				bundle: outcome.bundle.bundle,
				lastFetched: Date.now(),
				sha256: outcome.bundle.sha256,
				channel,
			};
		} catch (error) {
			this.logger?.warn('[builder-templates] refresh failed', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private async fetchBundleWithRetries(
		channel: Channel,
		maxAttempts: number,
	): Promise<
		| { kind: 'fetched'; bundle: FetchedBundle }
		| { kind: 'not-modified' }
		| { kind: 'not-found' }
		| { kind: 'failed' }
	> {
		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			const outcome = await this.tryFetchBundleOnce(channel);
			if (outcome.kind === 'fetched') return outcome;
			if (outcome.kind === 'not-modified') return outcome;
			if (outcome.kind === 'not-found') return outcome;
			if (!outcome.retryable || attempt === maxAttempts) return { kind: 'failed' };

			const delay = Math.min(this.retryBackoffBaseMs * 2 ** (attempt - 1), RETRY_BACKOFF_CAP_MS);
			await sleep(delay);
		}
		return { kind: 'failed' };
	}

	private async tryFetchBundleOnce(
		channel: Channel,
	): Promise<
		| { kind: 'fetched'; bundle: FetchedBundle }
		| { kind: 'not-modified' }
		| { kind: 'not-found' }
		| { kind: 'failed'; retryable: boolean }
	> {
		const archiveUrl = this.archiveUrlFor(channel);

		// Only send a conditional request when we already have a bundle in
		// memory from the SAME channel — etags from /v<minor>/ don't match
		// /latest/ even when the file is byte-identical, since R2 hashes per
		// path. Sending If-None-Match with an orphan etag would also risk a
		// stale 304 that leaves the service empty for the process.
		const headers: Record<string, string> = {};
		const cachedEtag = this.state?.channel === channel ? (this.state.bundle.version ?? null) : null;
		if (cachedEtag) headers['If-None-Match'] = cachedEtag;

		let response: Response;
		try {
			response = await fetch(archiveUrl, {
				headers,
				signal: AbortSignal.timeout(this.fetchTimeoutMs),
			});
		} catch (error) {
			// Network / abort errors — assume transient.
			this.logger?.warn('[builder-templates] archive fetch threw', {
				error: error instanceof Error ? error.message : String(error),
				url: archiveUrl,
			});
			return { kind: 'failed', retryable: true };
		}

		if (response.status === 304 && this.state?.channel === channel) {
			await touchArchiveFile(path.join(this.cacheDir, ARCHIVE_FILENAME));
			this.state = { ...this.state, lastFetched: Date.now() };
			return { kind: 'not-modified' };
		}

		if (response.status === 404) {
			// 404 is the unique trigger for fallback — the folder simply isn't
			// published. Other non-OK statuses are transport-level failures.
			return { kind: 'not-found' };
		}

		if (!response.ok) {
			this.logger?.warn('[builder-templates] archive fetch returned non-OK', {
				status: response.status,
				url: archiveUrl,
			});
			return { kind: 'failed', retryable: isRetryableStatus(response.status) };
		}

		const buffer = Buffer.from(await response.arrayBuffer());
		const actualSha = sha256Hex(buffer);
		const expectedSha = await this.fetchSha256Sidecar(channel);

		if (expectedSha && expectedSha !== actualSha) {
			this.logger?.warn('[builder-templates] sha256 mismatch on downloaded archive, rejecting', {
				expected: expectedSha,
				actual: actualSha,
				url: archiveUrl,
			});
			// Treat as a hard failure that isn't worth retrying — the sidecar
			// and archive come from the same origin, so a retry will almost
			// certainly return the same mismatched pair.
			return { kind: 'failed', retryable: false };
		}

		const etag = normaliseEtag(response.headers.get('etag'));
		return {
			kind: 'fetched',
			bundle: {
				bundle: { archive: buffer, version: etag },
				sha256: actualSha,
			},
		};
	}

	private async fetchSha256Sidecar(channel: Channel): Promise<string | null> {
		const sha256Url = this.sha256UrlFor(channel);
		try {
			const response = await fetch(sha256Url, {
				signal: AbortSignal.timeout(this.fetchTimeoutMs),
			});
			if (response.status === 404) {
				this.logger?.warn(
					'[builder-templates] sha256 sidecar missing — proceeding without integrity check',
					{ url: sha256Url },
				);
				return null;
			}
			if (!response.ok) {
				this.logger?.warn(
					'[builder-templates] sha256 sidecar fetch returned non-OK — proceeding without integrity check',
					{ status: response.status, url: sha256Url },
				);
				return null;
			}
			return parseSha256(await response.text());
		} catch (error) {
			this.logger?.warn(
				'[builder-templates] sha256 sidecar fetch threw — proceeding without integrity check',
				{
					error: error instanceof Error ? error.message : String(error),
					url: sha256Url,
				},
			);
			return null;
		}
	}

	private async persist(
		buffer: Buffer | null,
		etag: string | null,
		sha256: string | null,
		channel: Channel,
	): Promise<void> {
		if (!buffer) return;
		await fsp.mkdir(this.cacheDir, { recursive: true });
		// Write metadata first, payload last. If we crash between the metadata
		// write and the archive write, the disk is left in an "orphan metadata"
		// state — `loadFromDisk` will see no archive → return null → next
		// refresh goes out unconditionally (no stale If-None-Match echoed back).
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
		await atomicWriteFile(path.join(this.cacheDir, CHANNEL_FILENAME), channel);
		await atomicWriteFile(path.join(this.cacheDir, ARCHIVE_FILENAME), buffer);
	}
}

/**
 * Turn an SDK version like `0.15.0` (or `0.15.0-beta.3`) into the `v0.15`
 * channel prefix used in the CDN URL. Falls back to `latest` if the version
 * can't be parsed — defensive against unexpected pkg.json shapes at boot.
 */
function sdkVersionToPrefix(sdkVersion: string): string {
	const match = sdkVersion.match(/^(\d+)\.(\d+)/);
	if (!match) return 'latest';
	return `v${match[1]}.${match[2]}`;
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

async function touchArchiveFile(target: string): Promise<void> {
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
