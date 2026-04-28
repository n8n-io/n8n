/**
 * Prepares and caches a Daytona Image descriptor with config files and
 * node_modules pre-installed, and resolves a versioned named snapshot
 * (`n8n-instance-ai-<n8nVersion>`) for sandbox creation.
 *
 * Two strategies for `ensureSnapshot`:
 * - 'direct' mode (self-hosted): optimistic create via `snapshot.create`.
 *   Treats a 409 / "already exists" response as success.
 * - 'proxy' mode (cloud): read-only `snapshot.get`. Falls back to `null`
 *   when the snapshot is missing, leaving the caller to use the declarative
 *   image path. Snapshots are pre-built by CI, never by the runtime.
 *
 * The node-types catalog is NOT baked into the image (too large for API body limit).
 * It's written to each sandbox after creation via the filesystem API.
 */

import type { Daytona } from '@daytonaio/sdk';
import { DaytonaError, Image } from '@daytonaio/sdk';

import type { Logger } from '../logger';
import { PACKAGE_JSON, TSCONFIG_JSON, BUILD_MJS } from './sandbox-setup';

export type SnapshotMode = 'direct' | 'proxy';

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
	 * Resolve the named snapshot for the running n8n version, returning the
	 * snapshot name if it can be used, or null if the caller should fall back
	 * to the declarative image. Memoized per process.
	 *
	 * Memoization differs by mode:
	 * - 'proxy': verdict (including null) is cached for the lifetime of the
	 *   process. CI builds these snapshots once per release, so a miss this
	 *   request is a miss for the version.
	 * - 'direct': successes are cached; failures clear the memo so the next
	 *   request retries the create (transient errors shouldn't pin a process
	 *   to the declarative path forever).
	 */
	async ensureSnapshot(daytona: Daytona, mode: SnapshotMode): Promise<string | null> {
		if (!this.n8nVersion) return null;

		const name = `n8n-instance-ai-${this.n8nVersion}`;
		this.snapshotPromise ??= this.resolveSnapshot(daytona, mode, name).catch((error) => {
			this.logger.warn('Snapshot resolution failed; falling back to declarative image', {
				name,
				mode,
				error: error instanceof Error ? error.message : String(error),
			});
			return null;
		});

		const result = await this.snapshotPromise;
		if (result === null && mode === 'direct') this.snapshotPromise = null;
		return result;
	}

	private async resolveSnapshot(
		daytona: Daytona,
		mode: SnapshotMode,
		name: string,
	): Promise<string | null> {
		if (mode === 'proxy') {
			try {
				await daytona.snapshot.get(name);
				this.logger.info('Resolved prebuilt Daytona snapshot', { name, mode });
				return name;
			} catch (error) {
				this.logger.info('Prebuilt snapshot unavailable; using declarative image', {
					name,
					mode,
					error: error instanceof Error ? error.message : String(error),
				});
				return null;
			}
		}

		try {
			await daytona.snapshot.create({ name, image: this.ensureImage() });
			this.logger.info('Created versioned Daytona snapshot', { name });
			return name;
		} catch (error) {
			if (isAlreadyExistsError(error)) {
				this.logger.info('Versioned Daytona snapshot already exists', { name });
				return name;
			}
			this.logger.warn('Failed to create versioned snapshot; using declarative image', {
				name,
				error: error instanceof Error ? error.message : String(error),
			});
			return null;
		}
	}

	/** Invalidate cached image (e.g., when base image changes). */
	invalidate(): void {
		this.cachedImage = null;
		this.snapshotPromise = null;
	}
}
