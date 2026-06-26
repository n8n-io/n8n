/**
 * Prepares and caches a Daytona Image descriptor with config files,
 * node_modules, and runtime skills pre-installed, and resolves a versioned
 * named snapshot (`n8n/instance-ai:<n8nVersion>`) for sandbox creation.
 *
 * `snapshotName` derives the versioned snapshot name for the running n8n
 * version. CI is the producer of snapshots
 * (see `scripts/build-snapshot.cjs`); the sandbox-create request validates
 * existence and falls back to the declarative image when missing.
 *
 * The node-types catalog is NOT baked into the image (too large for API body limit).
 * It's written to each sandbox after creation via the filesystem API.
 */

import type { Daytona, DaytonaError as TDaytonaError, Image } from '@daytona/sdk';
import type { RuntimeSkillSource } from '@n8n/agents';
import { DAYTONA_WORKSPACE_ROOT, loadDaytona } from '@n8n/agents/sandbox';

import {
	buildKnowledgeBaseWorkspaceBundle,
	type KnowledgeBaseWorkspaceBundle,
} from '../knowledge-base/materialize-knowledge-base';
import type { Logger } from '../logger';
import {
	BuilderTemplatesService,
	builderTemplatesOptionsFromEnv,
} from './builder-templates-service';
import { PACKAGE_JSON, TSCONFIG_JSON, BUILD_MJS } from './sandbox-setup';
import { disposeSnapshotImageContext, stageWorkspaceFilesForImage } from './snapshot-image-context';
import { buildRuntimeSkillWorkspaceBundle } from '../skills/materialize-runtime-skills';
import { loadInstanceAiRuntimeSkillSource } from '../skills/runtime-skills';

export interface CreateSnapshotOptions {
	timeout?: number;
	onLogs?: (chunk: string) => void;
}

const DAYTONA_WORKSPACE_BAKE_ROOT = '/tmp/n8n-workspace-bake';
const SNAPSHOT_WORKSPACE_LAYOUT_DIRS = ['src', 'chunks', 'node-types'] as const;
function isAlreadyExistsError(error: unknown): error is TDaytonaError {
	const { DaytonaError } = loadDaytona();
	if (!(error instanceof DaytonaError)) return false;
	if (error.statusCode === 409) return true;
	return /already exists/i.test(error.message);
}

export class SnapshotManager {
	private cachedImage: Promise<Image> | null = null;

	private runtimeSkillBundlePromise: ReturnType<typeof buildRuntimeSkillWorkspaceBundle> | null =
		null;

	private knowledgeBaseBundlePromise: Promise<KnowledgeBaseWorkspaceBundle> | null = null;

	private stagingDir: string | null = null;

	constructor(
		private readonly baseImage: string | undefined,
		private readonly logger: Logger,
		private readonly n8nVersion: string | undefined,
		private readonly runtimeSkillSource?: RuntimeSkillSource,
		private readonly templatesService?: BuilderTemplatesService,
	) {}

	/** Get or prepare the image descriptor. */
	async ensureImage(): Promise<Image> {
		this.cachedImage ??= this.prepareImage();
		return await this.cachedImage;
	}

	private async prepareImage(): Promise<Image> {
		const base = this.baseImage ?? 'daytonaio/sandbox:0.5.0';
		const runtimeSkillBundle = await this.runtimeSkillBundle();
		const knowledgeBaseBundle = await this.knowledgeBaseBundle();
		const cacheKey =
			this.n8nVersion ?? `${runtimeSkillBundle?.skillsHash}-${knowledgeBaseBundle.contentHash}`;

		const workspaceFiles = new Map<string, string>([
			...(runtimeSkillBundle?.files ?? []),
			...(knowledgeBaseBundle?.files ?? []),
		]);
		workspaceFiles.set(`${DAYTONA_WORKSPACE_ROOT}/package.json`, PACKAGE_JSON);
		workspaceFiles.set(`${DAYTONA_WORKSPACE_ROOT}/tsconfig.json`, TSCONFIG_JSON);
		workspaceFiles.set(`${DAYTONA_WORKSPACE_ROOT}/build.mjs`, BUILD_MJS);

		const { stagingDir } = await stageWorkspaceFilesForImage(
			workspaceFiles,
			DAYTONA_WORKSPACE_ROOT,
			cacheKey,
		);
		this.stagingDir = stagingDir;

		const { Image } = loadDaytona();
		const layoutDirs = SNAPSHOT_WORKSPACE_LAYOUT_DIRS.map(
			(dir) => `${DAYTONA_WORKSPACE_ROOT}/${dir}`,
		).join(' ');
		const image = Image.base(base)
			.addLocalDir(stagingDir, DAYTONA_WORKSPACE_BAKE_ROOT)
			.runCommands(
				`cp -a ${DAYTONA_WORKSPACE_BAKE_ROOT}/. ${DAYTONA_WORKSPACE_ROOT}/ && mkdir -p ${layoutDirs} && cd ${DAYTONA_WORKSPACE_ROOT} && npm install --ignore-scripts`,
			);

		this.logger.info('Builder image descriptor prepared', {
			base,
			dockerfileLength: image.dockerfile.length,
			runtimeSkillsHash: runtimeSkillBundle?.skillsHash,
			runtimeSkillFiles: runtimeSkillBundle?.files.size ?? 0,
			knowledgeBaseHash: knowledgeBaseBundle.contentHash,
			knowledgeBaseFiles: knowledgeBaseBundle.files.size,
			stagingDir,
		});

		return image;
	}

	/**
	 * Create the versioned Daytona snapshot for the configured n8n version.
	 * Treats 409 / "already exists" as success — re-runs against the same
	 * version are idempotent. Throws on transient or unexpected errors so
	 * callers can decide whether to retry, fall back, or fail loudly.
	 *
	 * Single source of truth for snapshot creation in the CI release pipeline
	 * (`scripts/build-snapshot.cjs`). Runtime never calls this.
	 */
	async createSnapshot(daytona: Daytona, options?: CreateSnapshotOptions): Promise<string> {
		const name = this.snapshotName();
		if (!name) {
			throw new Error('SnapshotManager: n8nVersion is required to derive a snapshot name');
		}

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
	 * Derive the versioned snapshot name for the running n8n version, or null
	 * when no version is configured. Existence is validated implicitly by the
	 * subsequent `daytona.create({ snapshot })`.
	 */
	snapshotName(): string | null {
		if (!this.n8nVersion) return null;
		return `n8n/instance-ai:${this.n8nVersion}`;
	}

	private async runtimeSkillBundle(): ReturnType<typeof buildRuntimeSkillWorkspaceBundle> {
		this.runtimeSkillBundlePromise ??= buildRuntimeSkillWorkspaceBundle({
			source: this.runtimeSkillSource ?? loadInstanceAiRuntimeSkillSource(),
			root: DAYTONA_WORKSPACE_ROOT,
			logger: this.logger,
		});

		return await this.runtimeSkillBundlePromise;
	}

	private async knowledgeBaseBundle(): Promise<KnowledgeBaseWorkspaceBundle> {
		this.knowledgeBaseBundlePromise ??= this.buildKnowledgeBaseBundle();
		return await this.knowledgeBaseBundlePromise;
	}

	private async buildKnowledgeBaseBundle(): Promise<KnowledgeBaseWorkspaceBundle> {
		const templatesService =
			this.templatesService ??
			new BuilderTemplatesService(builderTemplatesOptionsFromEnv({ logger: this.logger }));
		const templatesBundle = await templatesService.getBundle();

		return await buildKnowledgeBaseWorkspaceBundle({
			root: DAYTONA_WORKSPACE_ROOT,
			templatesArchive: templatesBundle.archive,
			logger: this.logger,
		});
	}

	/** Invalidate cached image (e.g., when base image changes). */
	invalidate(): void {
		const stagingDir = this.stagingDir;
		this.cachedImage = null;
		this.runtimeSkillBundlePromise = null;
		this.knowledgeBaseBundlePromise = null;
		this.stagingDir = null;
		if (stagingDir) {
			void disposeSnapshotImageContext(stagingDir);
		}
	}
}
