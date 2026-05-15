/**
 * Builder templates service: fetches the curated workflow-template bundle from
 * the n8n-sdk-templates CDN, caches it on disk, and exposes it to the sandbox
 * setup as a ready-to-write `ExampleFilesBundle`.
 *
 * Behaviour:
 *   - First call: read disk cache if present; otherwise do a blocking fetch
 *     with a hard timeout. On any fetch error, return an empty bundle.
 *   - Subsequent calls: return memoised bundle synchronously. If the disk
 *     cache is older than the TTL, fire a background refresh.
 *   - Refresh: GET manifest.json. If `version` matches the cached version,
 *     skip re-fetching workflows. Otherwise concurrently fetch all
 *     `workflows/<slug>.json` listed in the new manifest (bounded at 16),
 *     atomically swap on success, keep stale bundle on any failure.
 *
 * Never throws.
 */
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import {
	buildExampleFiles,
	type ExampleFile,
	type ManifestFile,
} from '@n8n/workflow-sdk/examples-loader';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { Logger } from '../logger';

const DEFAULT_CDN_BASE_URL = 'https://cdn.n8n.io/n8n-sdk-templates/v1';
const DEFAULT_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_FETCH_TIMEOUT_MS = 30_000;
const DEFAULT_CACHE_SUBDIR = 'n8n-sdk-templates';
const FETCH_CONCURRENCY = 16;

export interface BuilderTemplatesServiceOptions {
	/** Base URL hosting `manifest.json` + `workflows/<slug>.json`. */
	cdnBaseUrl?: string;
	/** Directory where the service persists manifest + workflows between runs. */
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

export interface BuilderTemplatesBundle {
	files: ExampleFile[];
	indexTxt: string;
	/** Version string from the manifest (e.g. short git SHA), or null when no bundle has been loaded. */
	version: string | null;
}

const EMPTY_BUNDLE: BuilderTemplatesBundle = { files: [], indexTxt: '', version: null };

interface CacheState {
	bundle: BuilderTemplatesBundle;
	lastFetched: number;
}

export class BuilderTemplatesService {
	private readonly cdnBaseUrl: string;
	private readonly cacheDir: string;
	private readonly refreshIntervalMs: number;
	private readonly fetchTimeoutMs: number;
	private readonly disabled: boolean;
	private readonly logger?: Logger;

	private state: CacheState | null = null;
	private hydratePromise: Promise<void> | null = null;
	private backgroundRefresh: Promise<void> | null = null;

	constructor(opts: BuilderTemplatesServiceOptions = {}) {
		this.cdnBaseUrl = (opts.cdnBaseUrl ?? DEFAULT_CDN_BASE_URL).replace(/\/+$/, '');
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
			if (!this.hydratePromise) this.hydratePromise = this.hydrate();
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

	/** Return the cached manifest version, or null if no bundle has been loaded. */
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
		try {
			const manifestPath = path.join(this.cacheDir, 'manifest.json');
			const stat = await fsp.stat(manifestPath);
			const raw = await fsp.readFile(manifestPath, 'utf-8');
			const manifest = JSON.parse(raw) as ManifestFile;
			const workflows = await this.readWorkflowsFromDisk(manifest);
			const bundle: BuilderTemplatesBundle = {
				...buildExampleFiles({ manifest, workflows }),
				version: manifest.version ?? null,
			};
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

	private async readWorkflowsFromDisk(manifest: ManifestFile): Promise<Map<string, WorkflowJSON>> {
		const workflows = new Map<string, WorkflowJSON>();
		const workflowsDir = path.join(this.cacheDir, 'workflows');
		await Promise.all(
			(manifest.workflows ?? [])
				.filter((e) => e.success && !e.skip)
				.map(async (entry) => {
					try {
						const raw = await fsp.readFile(path.join(workflowsDir, `${entry.slug}.json`), 'utf-8');
						workflows.set(entry.slug, JSON.parse(raw) as WorkflowJSON);
					} catch {
						// Missing files trigger a refresh anyway.
					}
				}),
		);
		return workflows;
	}

	private async refresh(): Promise<void> {
		try {
			const manifest = await this.fetchManifest();
			if (!manifest) return;

			const cachedVersion = this.state?.bundle.version ?? null;
			const newVersion = manifest.version ?? null;
			const versionsMatch =
				cachedVersion !== null && newVersion !== null && cachedVersion === newVersion;

			if (versionsMatch && this.state) {
				// Same content, just refresh the disk-cache timestamp so we stop probing.
				await this.persistManifest(manifest);
				this.state = { ...this.state, lastFetched: Date.now() };
				return;
			}

			const workflows = await this.fetchWorkflows(manifest);
			if (!workflows) return;

			await this.persistManifest(manifest);
			await this.persistWorkflows(manifest, workflows);

			const bundle: BuilderTemplatesBundle = {
				...buildExampleFiles({ manifest, workflows }),
				version: newVersion,
			};
			this.state = { bundle, lastFetched: Date.now() };
		} catch (error) {
			this.logger?.warn('[builder-templates] refresh failed', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private async fetchManifest(): Promise<ManifestFile | null> {
		const url = `${this.cdnBaseUrl}/manifest.json`;
		try {
			const response = await fetch(url, { signal: AbortSignal.timeout(this.fetchTimeoutMs) });
			if (!response.ok) {
				this.logger?.warn('[builder-templates] manifest fetch returned non-OK', {
					status: response.status,
					url,
				});
				return null;
			}
			return (await response.json()) as ManifestFile;
		} catch (error) {
			this.logger?.warn('[builder-templates] manifest fetch failed', {
				error: error instanceof Error ? error.message : String(error),
				url,
			});
			return null;
		}
	}

	private async fetchWorkflows(manifest: ManifestFile): Promise<Map<string, WorkflowJSON> | null> {
		const entries = (manifest.workflows ?? []).filter((e) => e.success && !e.skip);
		const workflows = new Map<string, WorkflowJSON>();

		let cursor = 0;
		const workers = Array.from(
			{ length: Math.min(FETCH_CONCURRENCY, entries.length) },
			async () => {
				while (cursor < entries.length) {
					const entry = entries[cursor++];
					if (!entry) return;
					const url = `${this.cdnBaseUrl}/workflows/${entry.slug}.json`;
					try {
						const response = await fetch(url, {
							signal: AbortSignal.timeout(this.fetchTimeoutMs),
						});
						if (!response.ok) {
							this.logger?.warn('[builder-templates] workflow fetch returned non-OK', {
								status: response.status,
								slug: entry.slug,
							});
							continue;
						}
						workflows.set(entry.slug, (await response.json()) as WorkflowJSON);
					} catch (error) {
						this.logger?.warn('[builder-templates] workflow fetch failed', {
							error: error instanceof Error ? error.message : String(error),
							slug: entry.slug,
						});
					}
				}
			},
		);

		await Promise.all(workers);
		return workflows;
	}

	private async persistManifest(manifest: ManifestFile): Promise<void> {
		await fsp.mkdir(this.cacheDir, { recursive: true });
		await atomicWriteFile(path.join(this.cacheDir, 'manifest.json'), JSON.stringify(manifest));
	}

	private async persistWorkflows(
		manifest: ManifestFile,
		workflows: Map<string, WorkflowJSON>,
	): Promise<void> {
		const workflowsDir = path.join(this.cacheDir, 'workflows');
		await fsp.mkdir(workflowsDir, { recursive: true });

		await Promise.all(
			Array.from(workflows).map(async ([slug, wf]) => {
				await atomicWriteFile(path.join(workflowsDir, `${slug}.json`), JSON.stringify(wf));
			}),
		);

		// Remove any workflow files no longer referenced by the manifest.
		const keep = new Set<string>();
		for (const entry of manifest.workflows ?? []) {
			if (entry.success && !entry.skip) keep.add(`${entry.slug}.json`);
		}
		try {
			const existing = await fsp.readdir(workflowsDir);
			await Promise.all(
				existing
					.filter((name) => name.endsWith('.json') && !keep.has(name))
					.map(async (name) => {
						try {
							await fsp.unlink(path.join(workflowsDir, name));
						} catch {
							// best-effort cleanup
						}
					}),
			);
		} catch {
			// readdir failure is non-fatal
		}
	}
}

async function atomicWriteFile(target: string, contents: string): Promise<void> {
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

/**
 * Read the env-driven configuration into a `BuilderTemplatesServiceOptions`.
 * Returned options can be overridden at the call site.
 */
export function builderTemplatesOptionsFromEnv(): BuilderTemplatesServiceOptions {
	const url = process.env.N8N_INSTANCE_AI_TEMPLATES_URL;
	const hours = process.env.N8N_INSTANCE_AI_TEMPLATES_REFRESH_HOURS;
	const disabled = process.env.N8N_INSTANCE_AI_TEMPLATES_DISABLED;
	return {
		...(url ? { cdnBaseUrl: url } : {}),
		...(hours ? { refreshIntervalMs: Number(hours) * 60 * 60 * 1000 } : {}),
		disabled: disabled === '1' || disabled?.toLowerCase() === 'true',
	};
}
