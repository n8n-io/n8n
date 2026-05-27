/**
 * Prepares and caches a Daytona Image descriptor with config files,
 * node_modules, and runtime skills pre-installed, and resolves a versioned
 * named snapshot (`n8n/instance-ai:<n8nVersion>-<setupHash>`) for sandbox
 * creation.
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

import type { Daytona, DaytonaError as TDaytonaError, Image } from '@daytonaio/sdk';
import type { RuntimeSkillSource } from '@n8n/agents';
import { createHash } from 'node:crypto';
import { dirname as posixDirname } from 'node:path/posix';

import { loadDaytona } from './lazy-daytona';
import type { ErrorReporter, Logger } from '../logger';
import { PACKAGE_JSON, TSCONFIG_JSON, BUILD_MJS } from './sandbox-setup';
import { buildRuntimeSkillWorkspaceBundle } from '../skills/materialize-runtime-skills';
import { loadInstanceAiRuntimeSkillSource } from '../skills/runtime-skills';

export type SnapshotMode = 'direct' | 'proxy';

export interface CreateSnapshotOptions {
	timeout?: number;
	onLogs?: (chunk: string) => void;
}

const DAYTONA_WORKSPACE_ROOT = '/home/daytona/workspace';
const SETUP_HASH_LENGTH = 12;

/** Base64-encode content for safe embedding in RUN commands (avoids newline/quote issues). */
function b64(s: string): string {
	return Buffer.from(s, 'utf-8').toString('base64');
}

function shellQuote(value: string): string {
	return `'${value.replaceAll("'", "'\"'\"'")}'`;
}

function isAlreadyExistsError(error: unknown): error is TDaytonaError {
	const { DaytonaError } = loadDaytona();
	if (!(error instanceof DaytonaError)) return false;
	if (error.statusCode === 409) return true;
	return /already exists/i.test(error.message);
}

export class SnapshotManager {
	private cachedImage: Promise<Image> | null = null;

	private snapshotPromise: Promise<string | null> | null = null;

	private setupHashPromise: Promise<string> | null = null;

	private runtimeSkillBundlePromise: ReturnType<typeof buildRuntimeSkillWorkspaceBundle> | null =
		null;

	constructor(
		private readonly baseImage: string | undefined,
		private readonly logger: Logger,
		private readonly n8nVersion: string | undefined,
		private readonly errorReporter?: ErrorReporter,
		private readonly runtimeSkillSource?: RuntimeSkillSource,
	) {}

	/** Get or prepare the image descriptor. */
	async ensureImage(): Promise<Image> {
		this.cachedImage ??= this.prepareImage();
		return await this.cachedImage;
	}

	private async prepareImage(): Promise<Image> {
		const base = this.baseImage ?? 'daytonaio/sandbox:0.5.0';
		const runtimeSkillBundle = await this.runtimeSkillBundle();
		const runtimeSkillCommands =
			runtimeSkillBundle === undefined
				? []
				: [...runtimeSkillBundle.files].map(([filePath, content]) => {
						return `mkdir -p ${shellQuote(posixDirname(filePath))} && echo '${b64(content)}' | base64 -d > ${shellQuote(filePath)}`;
					});

		const { Image } = loadDaytona();
		let image = Image.base(base)
			.runCommands(
				`mkdir -p ${DAYTONA_WORKSPACE_ROOT}/src ${DAYTONA_WORKSPACE_ROOT}/chunks ${DAYTONA_WORKSPACE_ROOT}/node-types`,
			)
			.runCommands(
				`echo '${b64(PACKAGE_JSON)}' | base64 -d > ${DAYTONA_WORKSPACE_ROOT}/package.json`,
				`echo '${b64(TSCONFIG_JSON)}' | base64 -d > ${DAYTONA_WORKSPACE_ROOT}/tsconfig.json`,
				`echo '${b64(BUILD_MJS)}' | base64 -d > ${DAYTONA_WORKSPACE_ROOT}/build.mjs`,
			);

		if (runtimeSkillCommands.length > 0) {
			image = image.runCommands(...runtimeSkillCommands);
		}

		image = image.runCommands(`cd ${DAYTONA_WORKSPACE_ROOT} && npm install --ignore-scripts`);

		this.logger.info('Builder image descriptor prepared', {
			base,
			dockerfileLength: image.dockerfile.length,
			runtimeSkillsHash: runtimeSkillBundle?.skillsHash,
			runtimeSkillFiles: runtimeSkillBundle?.files.size ?? 0,
		});

		return image;
	}

	/**
	 * Create the versioned Daytona snapshot for the configured n8n version.
	 * Treats 409 / "already exists" as success — re-runs against the same
	 * version are idempotent. Throws on transient or unexpected errors so
	 * callers can decide whether to retry, fall back, or fail loudly.
	 *
	 * Single source of truth for snapshot creation across:
	 * - Runtime direct mode (lazy create on first builder invocation)
	 * - CI release pipeline (`scripts/build-snapshot.cjs`)
	 */
	async createSnapshot(daytona: Daytona, options?: CreateSnapshotOptions): Promise<string> {
		const name = await this.snapshotName();
		try {
			await daytona.snapshot.create({ name, image: await this.ensureImage() }, options);
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
	async ensureSnapshot(daytona: Daytona | undefined, mode: SnapshotMode): Promise<string | null> {
		if (!this.n8nVersion) return null;
		const name = await this.snapshotName();

		if (mode === 'proxy') return name;
		if (!daytona) {
			throw new Error('SnapshotManager: Daytona client is required to create a snapshot');
		}

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

	private async setupHash(): Promise<string> {
		this.setupHashPromise ??= (async () => {
			const runtimeSkillBundle = await this.runtimeSkillBundle();
			return createHash('sha256')
				.update(
					JSON.stringify({
						baseImage: this.baseImage ?? 'daytonaio/sandbox:0.5.0',
						packageJson: PACKAGE_JSON,
						tsconfigJson: TSCONFIG_JSON,
						buildMjs: BUILD_MJS,
						skillsHash: runtimeSkillBundle?.skillsHash ?? '',
					}),
				)
				.digest('hex')
				.slice(0, SETUP_HASH_LENGTH);
		})();

		return await this.setupHashPromise;
	}

	private async runtimeSkillBundle(): ReturnType<typeof buildRuntimeSkillWorkspaceBundle> {
		this.runtimeSkillBundlePromise ??= buildRuntimeSkillWorkspaceBundle({
			source: this.runtimeSkillSource ?? loadInstanceAiRuntimeSkillSource(),
			root: DAYTONA_WORKSPACE_ROOT,
			logger: this.logger,
		});

		return await this.runtimeSkillBundlePromise;
	}

	private async snapshotName(): Promise<string> {
		if (!this.n8nVersion) {
			throw new Error('SnapshotManager: n8nVersion is required to derive a snapshot name');
		}
		return `n8n/instance-ai:${this.n8nVersion}-${await this.setupHash()}`;
	}

	/** Invalidate cached image (e.g., when base image changes). */
	invalidate(): void {
		this.cachedImage = null;
		this.snapshotPromise = null;
		this.setupHashPromise = null;
		this.runtimeSkillBundlePromise = null;
	}
}
