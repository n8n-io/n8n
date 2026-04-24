/**
 * Manages the lifecycle of a Daytona snapshot that holds the pre-configured
 * builder image (config files + node_modules baked in).
 *
 * Snapshots are created lazily on the first builder call per process and
 * memoized in-memory. Concurrent first-callers share one in-flight
 * `snapshot.create` promise via `pendingEnsure`.
 *
 * The node-types catalog is NOT baked into the snapshot (too large for the
 * Daytona API body limit). It's written to each sandbox after creation via
 * the filesystem API.
 */

import { type Daytona, Image } from '@daytonaio/sdk';

import type { Logger } from '../logger';
import { PACKAGE_JSON, TSCONFIG_JSON, BUILD_MJS } from './sandbox-setup';

/** Base64-encode content for safe embedding in RUN commands (avoids newline/quote issues). */
function b64(s: string): string {
	return Buffer.from(s, 'utf-8').toString('base64');
}

function isAlreadyExistsError(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	const msg = error.message.toLowerCase();
	return msg.includes('already exists') || msg.includes('conflict');
}

export class SnapshotManager {
	private pendingEnsure: Promise<string> | null = null;

	constructor(
		private readonly baseImage: string | undefined,
		private readonly snapshotName: string,
		private readonly logger: Logger,
	) {}

	/**
	 * Ensure the named snapshot exists in Daytona and return its name.
	 * Idempotent and race-safe — concurrent callers share one in-flight promise,
	 * and a "already exists" response from create is treated as success.
	 */
	async ensureSnapshot(daytona: Daytona): Promise<string> {
		if (this.pendingEnsure) return await this.pendingEnsure;

		const attempt = this.runEnsure(daytona).catch((error) => {
			this.pendingEnsure = null;
			throw error;
		});
		this.pendingEnsure = attempt;
		return await attempt;
	}

	/** Invalidate cached ensure-promise (e.g. for tests or manual re-provisioning). */
	invalidate(): void {
		this.pendingEnsure = null;
	}

	private async runEnsure(daytona: Daytona): Promise<string> {
		try {
			await daytona.snapshot.get(this.snapshotName);
			this.logger.debug('Builder snapshot already present', { name: this.snapshotName });
			return this.snapshotName;
		} catch {
			// Not found (or transient get failure) — try to create.
		}

		const image = this.buildImage();
		this.logger.info('Creating builder snapshot', {
			name: this.snapshotName,
			base: this.baseImage ?? 'default',
			dockerfileLength: image.dockerfile.length,
		});

		try {
			// No `timeout` — the SDK's `timeout` here only bounds the initial
			// HTTP POST, not the subsequent build-state poll loop (which runs
			// until ACTIVE / ERROR / BUILD_FAILED with no wall-clock limit).
			// We let the poll run; Daytona's build system owns build duration.
			await daytona.snapshot.create(
				{ name: this.snapshotName, image },
				{ onLogs: (chunk) => this.logger.debug('snapshot build log', { chunk }) },
			);
		} catch (error) {
			if (isAlreadyExistsError(error)) {
				this.logger.debug('Builder snapshot created concurrently by another caller', {
					name: this.snapshotName,
				});
				return this.snapshotName;
			}
			throw error;
		}

		return this.snapshotName;
	}

	private buildImage(): Image {
		// Daytona's cache key is the underlying ref (hashed from Dockerfile +
		// build context). The snapshot *name* (e.g. `n8n-instance-ai-1.97.0`)
		// is just an alias we use for lookup — it does not affect caching, and
		// neither do image tags. Two snapshot names whose images produce the
		// same ref are deduped server-side and share storage, so versioning
		// by name is free: identical Dockerfiles across n8n versions activate
		// instantly, and different Dockerfiles get distinct refs as expected.
		const base = this.baseImage ?? 'daytonaio/sandbox:0.5.0';
		return Image.base(base)
			.runCommands(
				'mkdir -p /home/daytona/workspace/src /home/daytona/workspace/chunks /home/daytona/workspace/node-types',
			)
			.runCommands(
				`echo '${b64(PACKAGE_JSON)}' | base64 -d > /home/daytona/workspace/package.json`,
				`echo '${b64(TSCONFIG_JSON)}' | base64 -d > /home/daytona/workspace/tsconfig.json`,
				`echo '${b64(BUILD_MJS)}' | base64 -d > /home/daytona/workspace/build.mjs`,
			)
			.runCommands('cd /home/daytona/workspace && npm install --ignore-scripts');
	}
}
