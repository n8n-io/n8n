/**
 * Prepares and caches a Daytona Image descriptor with config files and
 * node_modules pre-installed, and resolves a versioned named snapshot
 * (`n8n/instance-ai:<n8nVersion>`) for sandbox creation.
 *
 * Two strategies for `ensureSnapshot`:
 * - 'direct' mode (self-hosted): optimistic create via `snapshot.create`.
 *   Treats a 409 / "already exists" response as success. Any other failure
 *   is reported (when an `errorReporter` is wired) and the manager falls
 *   back to declarative image so the next request retries the create.
 * - 'proxy' mode (cloud): trusts CI to have published the snapshot for
 *   this version and returns the name without an upstream call. The
 *   sandbox-create request validates existence; missing-snapshot failures
 *   surface there with a discriminable Daytona error.
 *
 * The node-types catalog is NOT baked into the image (too large for API body limit).
 * It's written to each sandbox after creation via the filesystem API.
 */

import type { Daytona } from '@daytonaio/sdk';
import { DaytonaError, Image } from '@daytonaio/sdk';

import type { ErrorReporter, Logger } from '../logger';
import { PACKAGE_JSON, TSCONFIG_JSON, BUILD_MJS } from './sandbox-setup';

export type SnapshotMode = 'direct' | 'proxy';

export interface CreateSnapshotOptions {
	timeout?: number;
	onLogs?: (chunk: string) => void;
}

/** Base64-encode content for safe embedding in RUN commands (avoids newline/quote issues). */
function b64(s: string): string {
	return Buffer.from(s, 'utf-8').toString('base64');
}

function isAlreadyExistsError(error: unknown): boolean {
	if (!(error instanceof DaytonaError)) return false;
	if (error.statusCode === 409) return true;
	return /already exists/i.test(error.message);
}

export class SnapshotManager {
	private cachedImage: Image | null = null;

	private snapshotPromise: Promise<string | null> | null = null;

	constructor(
		private readonly baseImage: string | undefined,
		private readonly logger: Logger,
		private readonly n8nVersion: string | undefined,
		private readonly errorReporter?: ErrorReporter,
	) {}

	/** Get or prepare the image descriptor. Synchronous after first call. */
	ensureImage(): Image {
		if (this.cachedImage) return this.cachedImage;

		const base = this.baseImage ?? 'daytonaio/sandbox:0.5.0';

		this.cachedImage = Image.base(base)
			.runCommands(
				'mkdir -p /home/daytona/workspace/src /home/daytona/workspace/chunks /home/daytona/workspace/node-types',
			)
			.runCommands(
				`echo '${b64(PACKAGE_JSON)}' | base64 -d > /home/daytona/workspace/package.json`,
				`echo '${b64(TSCONFIG_JSON)}' | base64 -d > /home/daytona/workspace/tsconfig.json`,
				`echo '${b64(BUILD_MJS)}' | base64 -d > /home/daytona/workspace/build.mjs`,
			)
			.runCommands('cd /home/daytona/workspace && npm install --ignore-scripts');

		this.logger.info('Builder image descriptor prepared', {
			base,
			dockerfileLength: this.cachedImage.dockerfile.length,
		});

		return this.cachedImage;
	}

	/**
	 * Create the versioned Daytona snapshot for the configured n8n version.
	 * Treats 409 / "already exists" as success — re-runs against the same
	 * version are idempotent. Throws on transient or unexpected errors so
	 * callers can decide whether to retry, fall back, or fail loudly.
	 *
	 * Single source of truth for snapshot creation across:
	 * - Runtime direct mode (lazy create on first builder invocation)
	 * - CI release pipeline (`scripts/build-snapshot.mjs`)
	 */
	async createSnapshot(daytona: Daytona, options?: CreateSnapshotOptions): Promise<string> {
		const name = this.snapshotName();
		try {
			await daytona.snapshot.create({ name, image: this.ensureImage() }, options);
			this.logger.info('Created versioned Daytona snapshot', { name });
			return name;
		} catch (error) {
			if (isAlreadyExistsError(error)) {
				this.logger.info('Versioned Daytona snapshot already exists', { name });
				return name;
			}
			throw error;
		}
	}

	/**
	 * Resolve the named snapshot for the running n8n version, returning the
	 * snapshot name if it can be used, or null if the caller should fall back
	 * to the declarative image.
	 *
	 * - 'proxy': returns the name without an upstream call. CI is the only
	 *   producer of cloud snapshots; trusting the name keeps the proxy
	 *   surface minimal (no `snapshot.get` allow-list needed). Existence is
	 *   validated implicitly by the subsequent `daytona.create({ snapshot })`.
	 * - 'direct': lazy-creates the snapshot via `createSnapshot`, memoized
	 *   per process. On transient failure, clears the memo so the next
	 *   request retries, and reports the error.
	 */
	async ensureSnapshot(daytona: Daytona, mode: SnapshotMode): Promise<string | null> {
		if (!this.n8nVersion) return null;
		const name = this.snapshotName();

		if (mode === 'proxy') return name;

		this.snapshotPromise ??= this.createSnapshot(daytona).catch((error) => {
			this.errorReporter?.error(error, {
				tags: { component: 'snapshot-manager', operation: 'create-snapshot' },
				extra: { snapshotName: name },
			});
			this.logger.warn('Failed to create versioned snapshot; using declarative image', {
				name,
				error: error instanceof Error ? error.message : String(error),
			});
			return null;
		});

		const result = await this.snapshotPromise;
		if (result === null) this.snapshotPromise = null;
		return result;
	}

	private snapshotName(): string {
		if (!this.n8nVersion) {
			throw new Error('SnapshotManager: n8nVersion is required to derive a snapshot name');
		}
		return `n8n/instance-ai:${this.n8nVersion}`;
	}

	/** Invalidate cached image (e.g., when base image changes). */
	invalidate(): void {
		this.cachedImage = null;
		this.snapshotPromise = null;
	}
}
