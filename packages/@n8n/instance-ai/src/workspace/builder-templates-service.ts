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
 *
 * The HTTP ETag doubles as the bundle version — surfaced via telemetry so we
 * can correlate template-set revisions with usage events.
 *
 * Never throws.
 */
import JSZip from 'jszip';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import type { Logger } from '../logger';

const DEFAULT_CDN_BASE_URL = 'https://sdk-templates.n8n.io/v1';
const DEFAULT_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_FETCH_TIMEOUT_MS = 30_000;
const DEFAULT_CACHE_SUBDIR = 'n8n-sdk-templates';
const ZIP_FILENAME = 'templates.zip';
const ETAG_FILENAME = 'etag.txt';
const INDEX_ENTRY = 'index.txt';

export interface BuilderTemplatesServiceOptions {
	/** Base URL hosting `templates.zip`. */
	cdnBaseUrl?: string;
	/** Directory where the service persists the zip + ETag between runs. */
	cacheDir?: string;
	/** Time-to-live before a refresh fires in the background. Default 24h. */
	refreshIntervalMs?: number;
	/** Per-request timeout for HTTP fetches. Default 30s. */
	fetchTimeoutMs?: number;
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
}

export class BuilderTemplatesService {
	private readonly zipUrl: string;
	private readonly cacheDir: string;
	private readonly refreshIntervalMs: number;
	private readonly fetchTimeoutMs: number;
	private readonly disabled: boolean;
	private readonly logger?: Logger;

	private state: CacheState | null = null;
	private hydratePromise: Promise<void> | null = null;
	private backgroundRefresh: Promise<void> | null = null;

	constructor(opts: BuilderTemplatesServiceOptions = {}) {
		const base = (opts.cdnBaseUrl ?? DEFAULT_CDN_BASE_URL).replace(/\/+$/, '');
		this.zipUrl = `${base}/${ZIP_FILENAME}`;
		this.cacheDir = opts.cacheDir ?? path.join(os.homedir(), '.n8n', DEFAULT_CACHE_SUBDIR);
		this.refreshIntervalMs = opts.refreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL_MS;
		this.fetchTimeoutMs = opts.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
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
			this.backgroundRefresh = this.refresh().finally(() => {
				this.backgroundRefresh = null;
			});
		}

		return state.bundle;
	}

	/** Return the cached bundle version (ETag), or null if no bundle has been loaded. */
	getVersion(): string | null {
		return this.state?.bundle.version ?? null;
	}

	private async hydrate(): Promise<void> {
		const fromDisk = await this.loadFromDisk();
		if (fromDisk) {
			this.state = fromDisk;
			if (Date.now() - fromDisk.lastFetched > this.refreshIntervalMs) {
				this.backgroundRefresh = this.refresh().finally(() => {
					this.backgroundRefresh = null;
				});
			}
			return;
		}
		await this.refresh();
	}

	private async loadFromDisk(): Promise<CacheState | null> {
		const zipPath = path.join(this.cacheDir, ZIP_FILENAME);
		try {
			const stat = await fsp.stat(zipPath);
			const buffer = await fsp.readFile(zipPath);
			const etag = await this.readEtagFromDisk();
			const bundle = await extractBundle(buffer, etag);
			return { bundle, lastFetched: stat.mtimeMs };
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

	private async refresh(): Promise<void> {
		try {
			// Only send a conditional request when we already have a bundle in
			// memory to fall back to. Sending If-None-Match with an orphan etag
			// (e.g. zip missing/corrupt but etag.txt present) could return 304
			// and leave the service permanently empty for this process.
			const headers: Record<string, string> = {};
			const cachedEtag = this.state?.bundle.version ?? null;
			if (cachedEtag) headers['If-None-Match'] = cachedEtag;

			const response = await fetch(this.zipUrl, {
				headers,
				signal: AbortSignal.timeout(this.fetchTimeoutMs),
			});

			if (response.status === 304 && this.state) {
				await touchZipFile(path.join(this.cacheDir, ZIP_FILENAME));
				this.state = { ...this.state, lastFetched: Date.now() };
				return;
			}

			if (!response.ok) {
				this.logger?.warn('[builder-templates] zip fetch returned non-OK', {
					status: response.status,
					url: this.zipUrl,
				});
				return;
			}

			const buffer = Buffer.from(await response.arrayBuffer());
			const etag = normaliseEtag(response.headers.get('etag'));
			const bundle = await extractBundle(buffer, etag);

			await this.persist(buffer, etag);
			this.state = { bundle, lastFetched: Date.now() };
		} catch (error) {
			this.logger?.warn('[builder-templates] refresh failed', {
				error: error instanceof Error ? error.message : String(error),
				url: this.zipUrl,
			});
		}
	}

	private async persist(buffer: Buffer, etag: string | null): Promise<void> {
		await fsp.mkdir(this.cacheDir, { recursive: true });
		await atomicWriteFile(path.join(this.cacheDir, ZIP_FILENAME), buffer);
		if (etag) {
			await atomicWriteFile(path.join(this.cacheDir, ETAG_FILENAME), etag);
		} else {
			try {
				await fsp.unlink(path.join(this.cacheDir, ETAG_FILENAME));
			} catch {
				// best-effort cleanup
			}
		}
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
