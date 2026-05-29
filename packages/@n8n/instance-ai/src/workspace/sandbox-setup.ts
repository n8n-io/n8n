/**
 * Sandbox Workspace Setup
 *
 * Handles first-time initialization of the sandbox workspace for runtime
 * workspace-backed skills. Lazy and idempotent — checks for marker file before running.
 *
 * File I/O uses the workspace filesystem when available, with a sandbox command
 * fallback for providers that do not expose one.
 *
 * Workspace layout:
 *   <workspace-root>/
 *     package.json                    # @n8n/workflow-sdk dependency
 *     tsconfig.json                   # strict, noEmit, skipLibCheck
 *     node_modules/@n8n/workflow-sdk/ # full SDK with .d.ts types
 *     workflows/                      # existing n8n workflows as JSON
 *     node-types/
 *       index.txt                     # searchable catalog: nodeType | displayName | description | version
 *     src/
 *       workflow.ts                   # agent writes main workflow here
 *     chunks/
 *       *.ts                          # reusable node/workflow modules
 */

import { createRequire } from 'node:module';
import { gunzipSync } from 'node:zlib';

import type { Logger } from '../logger';
import type { InstanceAiContext, SearchableNodeDescription } from '../types';
import type { BuilderTemplatesBundle } from './builder-templates-service';
import {
	isLinkWorkspaceSdkEnabled,
	packWorkspaceSdk,
	type WorkspaceSdkTarball,
} from './pack-workspace-sdk';
import {
	runInSandbox,
	readFileViaSandbox,
	escapeSingleQuotes,
	type SandboxWorkspace,
	writeFileViaSandbox,
} from './sandbox-fs';

const hostRequire = createRequire(__filename);
const NOOP_LOGGER: Logger = {
	info: () => {},
	warn: () => {},
	error: () => {},
	debug: () => {},
};
const TAR_BLOCK_SIZE = 512;
const TAR_TYPE_REGULAR = '0';
const TEMPLATE_ENTRY_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.ts$/;

type SandboxWorkspaceSetupStep =
	| 'resolve-workspace-root'
	| 'read-initialization-marker'
	| 'list-node-types'
	| 'write-workspace-files'
	| 'write-curated-examples'
	| 'install-dependencies'
	| 'link-workspace-sdk'
	| 'write-initialization-marker';

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export class SandboxWorkspaceSetupError extends Error {
	constructor(
		readonly step: SandboxWorkspaceSetupStep,
		readonly originalError: unknown,
	) {
		super(`Sandbox workspace setup failed during ${step}: ${getErrorMessage(originalError)}`);
		this.name = 'SandboxWorkspaceSetupError';
	}
}

async function setupStep<T>(step: SandboxWorkspaceSetupStep, action: () => Promise<T>): Promise<T> {
	try {
		return await action();
	} catch (error) {
		throw new SandboxWorkspaceSetupError(step, error);
	}
}

export const WORKSPACE_DIR = 'workspace';

/** Default home directory inside the n8n sandbox service container. */
export const N8N_SANDBOX_HOME = '/home/user';

/** Absolute workspace root for n8n sandbox service Dockerfile steps (build-time). */
export const N8N_SANDBOX_WORKSPACE_ROOT = `${N8N_SANDBOX_HOME}/${WORKSPACE_DIR}`;

/**
 * Resolve a dependency's installed version from the host's node_modules.
 * Falls back to `'*'` if the package is unresolvable (should only happen in
 * out-of-tree test setups — production always has these as real deps).
 */
function resolveHostDepVersion(name: string): string {
	try {
		const pkg = hostRequire(`${name}/package.json`) as { version?: string };
		return pkg.version ?? '*';
	} catch {
		return '*';
	}
}

/**
 * Versions pinned from the host's installed packages. Pinning is load-bearing
 * for two reasons:
 *   1. `npm install '@n8n/workflow-sdk': '*'` inside the sandbox resolves to
 *      the dist-tag `latest`, which lags well behind the version the CLI was
 *      built against. Host-pinned versions keep the sandbox SDK in lock-step
 *      with the server that orchestrates it.
 *   2. Sandbox images are content-addressed by their Dockerfile bytes. When
 *      the SDK version bumps on a new release, PACKAGE_JSON changes, the
 *      `npm install` RUN layer's hash changes, and the sandbox service
 *      rebuilds the image. Floating `'*'` never changes the bytes, so stale
 *      images are reused indefinitely.
 *
 * When `N8N_INSTANCE_AI_SANDBOX_LINK_SDK=1` is set we deliberately fall
 * back to `latest` instead of the host version. The image's npm install
 * runs *before* the host SDK can be packed and uploaded, so a host version
 * that has not been published yet (e.g., a dev's freshly-bumped workspace
 * version) would otherwise fail the image build with `npm install` non-zero.
 * Both invariants above are intentionally relaxed in this mode: cache
 * stability is irrelevant for dev iteration, and the post-creation
 * `--force` install overrides whichever `latest` resolved to.
 */
const SANDBOX_SDK_VERSION = resolveSandboxSdkVersion();

function resolveSandboxSdkVersion(): string {
	const linkFlag = process.env.N8N_INSTANCE_AI_SANDBOX_LINK_SDK;
	if (linkFlag === '1' || linkFlag === 'true') return 'latest';
	return resolveHostDepVersion('@n8n/workflow-sdk');
}
const SANDBOX_TSX_VERSION = resolveHostDepVersion('tsx');

/**
 * Hard-coded to match the monorepo-wide `@types/node` catalog entry in
 * `pnpm-workspace.yaml`. `@types/node` isn't a direct dep of this package, so
 * `resolveHostDepVersion` wouldn't find it reliably; a fixed version also
 * keeps Dockerfile bytes stable and avoids the floating-`*` dist-tag problem
 * described above. Keep this in sync with the catalog entry on upgrades.
 */
const SANDBOX_TYPES_NODE_VERSION = '24.10.1';

function assertSafeWorkspaceRelativePath(path: string): void {
	const segments = path.split('/');
	if (
		path.length === 0 ||
		path.startsWith('/') ||
		path.includes('\\') ||
		path.includes('\0') ||
		segments.some((segment) => segment === '..')
	) {
		throw new Error(`Sandbox workspace path must stay within the workspace root: ${path}`);
	}
}

function joinWorkspacePath(root: string, path: string): string {
	assertSafeWorkspaceRelativePath(path);

	const normalizedRoot = root.replace(/\/+$/, '') || '/';
	const normalizedPath = path
		.split('/')
		.filter((segment) => segment.length > 0 && segment !== '.')
		.join('/');

	if (normalizedPath.length === 0) {
		throw new Error(`Sandbox workspace path must stay within the workspace root: ${path}`);
	}

	return normalizedRoot === '/' ? `/${normalizedPath}` : `${normalizedRoot}/${normalizedPath}`;
}

function buildPackageJson(sdkSpecifier: string | null): string {
	const dependencies: Record<string, string> = {
		tsx: SANDBOX_TSX_VERSION,
	};
	if (sdkSpecifier) {
		dependencies['@n8n/workflow-sdk'] = sdkSpecifier;
	}

	return JSON.stringify(
		{
			name: 'sandbox-workspace',
			private: true,
			dependencies,
			devDependencies: {
				'@types/node': SANDBOX_TYPES_NODE_VERSION,
			},
		},
		null,
		2,
	);
}

/**
 * PACKAGE_JSON used for Dockerfile-baked images (Daytona / n8n-sandbox).
 *
 * Normal mode pins to the host SDK version. See `resolveHostDepVersion` for
 * why pinning matters.
 *
 * Linked-SDK mode intentionally omits @n8n/workflow-sdk from the baked image:
 * the host SDK may be ahead of npm on master, and the packed workspace tarball
 * is installed after sandbox creation.
 */
export const PACKAGE_JSON = buildPackageJson(
	isLinkWorkspaceSdkEnabled() ? null : SANDBOX_SDK_VERSION,
);

/**
 * Return the absolute on-disk path of a host-installed package, or `null`
 * if it can't be resolved. Used by the local provider to point the sandbox
 * at the workspace SDK via a `file:` reference instead of the npm registry.
 */
function resolveHostDepPath(name: string): string | null {
	try {
		const pkgPath = hostRequire.resolve(`${name}/package.json`);
		return pkgPath.slice(0, pkgPath.length - '/package.json'.length);
	} catch {
		return null;
	}
}

/**
 * Build a PACKAGE_JSON that points `@n8n/workflow-sdk` at its host-resolved
 * location via `file:` — so the local provider picks up workspace SDK
 * changes after `pnpm build` without needing a publish.
 *
 * Falls back to the registry-pinned PACKAGE_JSON if the SDK can't be
 * resolved on disk (e.g. a stripped-down test harness).
 */
function buildLocalProviderPackageJson(): string {
	const sdkPath = resolveHostDepPath('@n8n/workflow-sdk');
	if (!sdkPath) return PACKAGE_JSON;
	return buildPackageJson(`file:${sdkPath}`);
}

function getSandboxProvider(workspace: SandboxWorkspace): string | undefined {
	return workspace.filesystem?.provider ?? workspace.sandbox?.provider;
}

function buildWorkspacePackageJson(workspace: SandboxWorkspace): string {
	return getSandboxProvider(workspace) === 'local' ? buildLocalProviderPackageJson() : PACKAGE_JSON;
}

let sdkTarballPromise: Promise<WorkspaceSdkTarball | null> | null = null;

export async function linkWorkspaceSdkIfEnabled(
	workspace: SandboxWorkspace,
	root: string,
	logger?: Logger,
): Promise<void> {
	if (!isLinkWorkspaceSdkEnabled() || getSandboxProvider(workspace) === 'local') return;

	sdkTarballPromise ??= packWorkspaceSdk(logger ?? NOOP_LOGGER).catch((error: unknown) => {
		sdkTarballPromise = null;
		throw error;
	});
	const packed = await sdkTarballPromise;
	if (!packed) {
		sdkTarballPromise = null;
		throw new Error(
			'N8N_INSTANCE_AI_SANDBOX_LINK_SDK is enabled, but the workspace SDK could not be packed. Run `pnpm build` in packages/@n8n/workflow-sdk or unset N8N_INSTANCE_AI_SANDBOX_LINK_SDK.',
		);
	}

	const remotePath = joinWorkspacePath(root, packed.filename);
	if (workspace.filesystem) {
		await writeWorkspaceFile(workspace, workspace.filesystem, remotePath, packed.tarball);
	} else {
		await writeFileViaSandbox(workspace, remotePath, packed.tarball);
	}

	const install = await runInSandbox(
		workspace,
		`npm install '${escapeSingleQuotes(remotePath)}' --no-save --ignore-scripts --force`,
		root,
	);
	if (install.exitCode !== 0) {
		logger?.error('Failed to link workspace SDK into sandbox', {
			exitCode: install.exitCode,
			stderr: install.stderr,
		});
		throw new Error(`Failed to install workspace SDK tarball: ${install.stderr}`);
	}

	logger?.info('Linked workspace SDK into sandbox', {
		version: packed.version,
		sdkPath: packed.sdkPath,
	});
}

/**
 * Runner script that executes a workflow TS file via tsx, calls validate() + toJSON(),
 * and outputs structured JSON to stdout. Executed via: node --import tsx build.mjs ./src/workflow.ts
 */
export const BUILD_MJS = `const filePath = process.argv[2] || './src/workflow.ts';
try {
  const mod = await import(filePath);
  const wf = mod.default;
  if (!wf || typeof wf.toJSON !== 'function') {
    console.log(JSON.stringify({ success: false, errors: ['Default export is not a workflow. Make sure your file has: export default workflow(...)'] }));
    process.exit(1);
  }
  const validation = wf.validate();
  const json = wf.toJSON({ tidyUp: true });
  const warnings = [...(validation.errors || []), ...(validation.warnings || [])];
  // Use a replacer to preserve undefined values as null — newCredential() produces
  // NewCredentialImpl which serializes to undefined in toJSON(). Without this,
  // JSON.stringify drops the credential keys entirely and the server can't resolve them.
  const replacer = (k, v) => v === undefined ? null : v;
  console.log(JSON.stringify({ success: true, workflow: json, warnings }, replacer));
} catch (e) {
  console.log(JSON.stringify({ success: false, errors: [e instanceof Error ? e.message : String(e)] }));
  process.exit(1);
}
`;

export const TSCONFIG_JSON = JSON.stringify(
	{
		compilerOptions: {
			strict: true,
			// Disable strictNullChecks because the SDK's ifElse() returns NodeInstance
			// where onTrue?/onFalse? are optional in the type (they're always present at runtime).
			// Without this, tsc rejects `.onTrue()` / `.onFalse()` calls.
			strictNullChecks: false,
			noEmit: true,
			target: 'ES2022',
			module: 'ES2022',
			moduleResolution: 'bundler',
			esModuleInterop: true,
			skipLibCheck: true,
		},
		include: ['src/**/*.ts', 'chunks/**/*.ts'],
	},
	null,
	2,
);

/**
 * Build a searchable catalog line for a node type.
 * Format: nodeType | displayName | description | version | aliases: ...
 */
export function formatNodeCatalogLine(node: SearchableNodeDescription): string {
	const version = Array.isArray(node.version)
		? `v${node.version[node.version.length - 1]}`
		: `v${node.version}`;

	const parts = [node.name, node.displayName, node.description, version];

	if (node.codex?.alias && node.codex.alias.length > 0) {
		parts.push(`aliases: ${node.codex.alias.join(', ')}`);
	}

	return parts.join(' | ');
}

/** Dirs the agent's `list_files` may probe; some providers 404 on missing dirs. */
const ALWAYS_PRESENT_DIRS: readonly string[] = ['src', 'chunks', 'workflows'];

async function writeWorkspaceFiles(
	workspace: SandboxWorkspace,
	root: string,
	files: Map<string, string>,
): Promise<void> {
	const filesystem = workspace.filesystem;
	if (filesystem) {
		// `writeFile` only creates parent dirs as a side-effect of writing a file.
		await Promise.all(
			ALWAYS_PRESENT_DIRS.map(
				async (dir) =>
					await createWorkspaceDirectory(workspace, filesystem, joinWorkspacePath(root, dir)),
			),
		);
		await Promise.all(
			[...files].map(
				async ([path, content]) =>
					await writeWorkspaceFile(workspace, filesystem, joinWorkspacePath(root, path), content),
			),
		);
		return;
	}

	const dirList = ALWAYS_PRESENT_DIRS.map(
		(dir) => `'${escapeSingleQuotes(joinWorkspacePath(root, dir))}'`,
	).join(' ');
	const result = await runInSandbox(workspace, `mkdir -p ${dirList}`);
	if (result.exitCode !== 0) {
		throw new Error(`Sandbox setup failed: ${result.stderr}`);
	}

	for (const [path, content] of files) {
		await writeFileViaSandbox(workspace, joinWorkspacePath(root, path), content);
	}
}

type WorkspaceFilesystem = NonNullable<SandboxWorkspace['filesystem']>;

async function createWorkspaceDirectory(
	workspace: SandboxWorkspace,
	filesystem: WorkspaceFilesystem,
	path: string,
): Promise<void> {
	try {
		await filesystem.mkdir(path, { recursive: true });
	} catch (error) {
		try {
			const result = await runInSandbox(workspace, `mkdir -p '${escapeSingleQuotes(path)}'`);
			if (result.exitCode === 0) return;

			throw new Error(result.stderr || `mkdir exited with code ${result.exitCode}`);
		} catch (fallbackError) {
			throw new Error(
				`Failed to create sandbox workspace directory "${path}": ${getErrorMessage(error)}; command fallback failed: ${getErrorMessage(fallbackError)}`,
			);
		}
	}
}

async function writeWorkspaceFile(
	workspace: SandboxWorkspace,
	filesystem: WorkspaceFilesystem,
	path: string,
	content: string | Buffer,
): Promise<void> {
	try {
		await filesystem.writeFile(path, content, { recursive: true });
	} catch (error) {
		try {
			await writeFileViaSandbox(workspace, path, content);
		} catch (fallbackError) {
			throw new Error(
				`Failed to write sandbox workspace file "${path}": ${getErrorMessage(error)}; command fallback failed: ${getErrorMessage(fallbackError)}`,
			);
		}
	}
}

/**
 * Resolve the absolute workspace root by querying $HOME from the sandbox.
 * Caches per workspace instance (WeakMap) so parallel sandboxes don't collide.
 */
const workspaceRootCache = new WeakMap<SandboxWorkspace, string>();

function getLocalFilesystemRoot(workspace: SandboxWorkspace): string | null {
	const filesystem = workspace.filesystem;
	if (!filesystem) return null;

	const provider = filesystem.provider;
	if (provider !== 'local' && provider !== 'lazy') return null;

	const basePath = Reflect.get(filesystem, 'basePath');
	return typeof basePath === 'string' && basePath.length > 0 ? basePath : null;
}

async function initializeLazyFilesystem(workspace: SandboxWorkspace): Promise<void> {
	const filesystem = workspace.filesystem;
	if (filesystem?.provider !== 'lazy') return;

	await filesystem.init?.();
}

export async function getWorkspaceRoot(workspace: SandboxWorkspace): Promise<string> {
	const cached = workspaceRootCache.get(workspace);
	if (cached) return cached;

	const localRoot = getLocalFilesystemRoot(workspace);
	if (localRoot) {
		workspaceRootCache.set(workspace, localRoot);
		return localRoot;
	}

	await initializeLazyFilesystem(workspace);
	const initializedLocalRoot = getLocalFilesystemRoot(workspace);
	if (initializedLocalRoot) {
		workspaceRootCache.set(workspace, initializedLocalRoot);
		return initializedLocalRoot;
	}

	const result = await runInSandbox(workspace, 'echo $HOME');
	const home = result.stdout.trim() || '/home/daytona';
	const root = `${home}/${WORKSPACE_DIR}`;
	workspaceRootCache.set(workspace, root);
	return root;
}

/**
 * Validate the exact archive shape published by n8n-sdk-templates before the
 * sandbox ever sees the bytes. This is intentionally narrow: a gzip-wrapped tar
 * with only regular top-level files (`index.txt` and `<slug>.ts`). Rejecting
 * everything else prevents path traversal, symlink/hardlink writes, and nested
 * output when the sandbox later runs `tar -xzf`.
 */
function validateBuilderTemplatesArchive(archive: Buffer): string | null {
	let tar: Buffer;
	try {
		tar = gunzipSync(archive);
	} catch (error) {
		return `failed to gunzip archive: ${getErrorMessage(error)}`;
	}

	let offset = 0;
	while (offset + TAR_BLOCK_SIZE <= tar.length) {
		const header = tar.subarray(offset, offset + TAR_BLOCK_SIZE);
		// A zero header marks the end of a tar archive. We do not require the
		// optional second zero block because `tar` itself accepts archives with
		// one terminator, and this is only a preflight guard before extraction.
		if (isZeroBlock(header)) return null;

		// USTAR stores long path components as `prefix` + `name`. Combining them
		// before validation ensures nested or absolute paths cannot hide in either
		// field independently.
		const name = readTarString(header, 0, 100);
		const prefix = readTarString(header, 345, 155);
		const entryName = prefix ? `${prefix}/${name}` : name;
		const typeFlag = readTarString(header, 156, 1);
		const size = parseTarOctal(header, 124, 12);

		if (size === null) return `invalid size for archive entry "${entryName}"`;
		// Empty type is the old tar spelling for a regular file; `0` is the USTAR
		// spelling. All other types include directories, symlinks, hardlinks, and
		// metadata extensions, none of which belong in the curated bundle.
		if (typeFlag !== '' && typeFlag !== TAR_TYPE_REGULAR) {
			return `unsupported archive entry type "${typeFlag}" for "${entryName}"`;
		}
		if (!isAllowedTemplateEntryName(entryName)) {
			return `unsupported archive entry path "${entryName}"`;
		}

		// Tar payloads are padded to 512-byte blocks, so jump over the file content
		// plus padding to land exactly on the next header.
		const dataBlocks = Math.ceil(size / TAR_BLOCK_SIZE);
		offset += TAR_BLOCK_SIZE + dataBlocks * TAR_BLOCK_SIZE;
	}

	return offset === tar.length ? null : 'trailing partial tar header';
}

function isAllowedTemplateEntryName(name: string): boolean {
	if (name === 'index.txt') return true;
	return TEMPLATE_ENTRY_PATTERN.test(name);
}

function isZeroBlock(block: Buffer): boolean {
	return block.every((byte) => byte === 0);
}

function readTarString(block: Buffer, start: number, length: number): string {
	const field = block.subarray(start, start + length);
	const nullIndex = field.indexOf(0);
	return field.subarray(0, nullIndex === -1 ? field.length : nullIndex).toString('utf-8');
}

function parseTarOctal(block: Buffer, start: number, length: number): number | null {
	const raw = readTarString(block, start, length).trim();
	if (!/^[0-7]+$/.test(raw)) return null;
	const parsed = Number.parseInt(raw, 8);
	return Number.isSafeInteger(parsed) ? parsed : null;
}

/**
 * Write the curated workflow examples archive into `${root}/examples/`.
 *
 * Used by `setupSandboxWorkspace` (local provider) and by the Daytona /
 * n8n-sandbox factory paths, which skip the full setup but still need the
 * curated reference material the agent can grep against.
 *
 * The CDN payload is a flat `.tar.gz` of `<slug>.ts` + `index.txt`. We
 * write the bytes into the sandbox and run `tar -xzf` in-sandbox to
 * expand them into `examples/` — far cheaper than 100+ individual
 * `writeFile` round-trips for remote providers. The archive file is
 * removed after extraction so it doesn't leak into the agent's view.
 *
 * No-op when the bundle is empty (e.g. `templatesService` was not
 * configured, or the CDN fetch failed and there was no disk cache).
 */
export async function writeCuratedExamples(
	workspace: SandboxWorkspace,
	bundle: BuilderTemplatesBundle | null,
	logger?: Logger,
): Promise<void> {
	if (!bundle?.archive) return;

	if (workspace.filesystem?.provider === 'local') {
		logger?.debug('[sandbox-setup] skipping curated examples for local provider');
		return;
	}

	// Defense-in-depth for the curated CDN bundle. This validates the narrow
	// archive shape we publish, not arbitrary user-supplied tar files.
	const validationError = validateBuilderTemplatesArchive(bundle.archive);
	if (validationError) {
		logger?.warn('[sandbox-setup] rejected curated examples archive', {
			error: validationError,
			archiveBytes: bundle.archive.byteLength,
			archiveVersion: bundle.version,
		});
		return;
	}

	const start = Date.now();
	const root = await getWorkspaceRoot(workspace);
	const archivePath = `${root}/.templates.tar.gz`;
	const examplesDir = `${root}/examples`;

	if (workspace.filesystem) {
		await workspace.filesystem.mkdir(examplesDir, { recursive: true });
		await workspace.filesystem.writeFile(archivePath, bundle.archive, { recursive: true });
	} else {
		const mkdirResult = await runInSandbox(
			workspace,
			`mkdir -p '${escapeSingleQuotes(examplesDir)}'`,
		);
		if (mkdirResult.exitCode !== 0) {
			logger?.warn('[sandbox-setup] failed to create examples/ dir', {
				stderr: mkdirResult.stderr,
			});
			return;
		}
		await writeFileViaSandbox(workspace, archivePath, bundle.archive);
	}

	// Extract and clean up in one command so a partial state isn't left
	// behind if `tar` exits non-zero. `rm -f` is always run; the exec's
	// status is `tar`'s exit code. `2>&1` folds tar's stderr into stdout so
	// the failure cause is still visible if the sandbox runtime drops stderr.
	// Avoid the variable name `status` — it's a read-only builtin in zsh.
	const extract = await runInSandbox(
		workspace,
		`tar -xzf '${escapeSingleQuotes(archivePath)}' -C '${escapeSingleQuotes(examplesDir)}' 2>&1; rc=$?; rm -f '${escapeSingleQuotes(archivePath)}'; exit $rc`,
	);
	if (extract.exitCode !== 0) {
		logger?.warn('[sandbox-setup] failed to extract curated examples', {
			exitCode: extract.exitCode,
			stderr: extract.stderr,
			stdout: extract.stdout,
			archivePath,
			archiveBytes: bundle.archive.byteLength,
			archiveVersion: bundle.version,
		});
		return;
	}

	logger?.debug('[sandbox-setup] prepared curated examples', {
		bytes: bundle.archive.byteLength,
		version: bundle.version,
		durationMs: Date.now() - start,
	});
}

/**
 * Initialize the sandbox workspace for runtime workspace-backed skills.
 * Idempotent — skips if already initialized (checks marker file).
 *
 * Writes config files, workflow JSONs, and the node catalog into the workspace.
 *
 * @returns true if initialization ran, false if already initialized
 */
export async function setupSandboxWorkspace(
	workspace: SandboxWorkspace,
	context: InstanceAiContext,
): Promise<boolean> {
	const root = await setupStep(
		'resolve-workspace-root',
		async () => await getWorkspaceRoot(workspace),
	);
	const markerFile = joinWorkspacePath(root, '.sandbox-initialized');

	// Check marker file for idempotency
	const marker = await setupStep(
		'read-initialization-marker',
		async () => await readFileViaSandbox(workspace, markerFile),
	);
	if (marker !== null) return false;

	// ── Collect all files ──────────────────────────────────────────────────

	const files = new Map<string, string>();

	// Config files. Local provider runs on the dev host, so point the SDK at
	// its workspace location via `file:` — this makes SDK changes visible in
	// the sandbox after `pnpm build`, without a publish. Daytona/n8n-sandbox
	// stay on the registry-pinned PACKAGE_JSON (they can't see the host FS).
	files.set('package.json', buildWorkspacePackageJson(workspace));
	files.set('tsconfig.json', TSCONFIG_JSON);
	files.set('build.mjs', BUILD_MJS);

	// Node types catalog
	const nodeTypes = await setupStep(
		'list-node-types',
		async () => await context.nodeService.listSearchable(),
	);
	const catalogLines = nodeTypes.map(formatNodeCatalogLine);
	files.set('node-types/index.txt', catalogLines.join('\n'));

	// Existing workflows as JSON (fetch in parallel)
	try {
		const workflows = await context.workflowService.list({ limit: 100 });
		const results = await Promise.allSettled(
			workflows.map(async (summary) => {
				const detail = await context.workflowService.get(summary.id);
				return { id: summary.id, json: JSON.stringify(detail, null, 2) };
			}),
		);
		for (const r of results) {
			if (r.status === 'fulfilled') {
				files.set(`workflows/${r.value.id}.json`, r.value.json);
			}
		}
	} catch {
		// Workflow listing failed — continue without syncing
	}

	// ── Write workspace files ──────────────────────────────────────────────

	await setupStep(
		'write-workspace-files',
		async () => await writeWorkspaceFiles(workspace, root, files),
	);
	await setupStep(
		'write-curated-examples',
		async () =>
			await writeCuratedExamples(
				workspace,
				(await context.templatesService?.getBundle()) ?? null,
				context.logger,
			),
	);

	// npm install (must run after package.json is in place)
	await setupStep('install-dependencies', async () => {
		const npmResult = await runInSandbox(workspace, 'npm install --ignore-scripts', root);
		if (npmResult.exitCode !== 0) {
			throw new Error(`Sandbox npm install failed: ${npmResult.stderr}`);
		}
	});

	await setupStep(
		'link-workspace-sdk',
		async () => await linkWorkspaceSdkIfEnabled(workspace, root, context.logger),
	);

	await setupStep(
		'write-initialization-marker',
		async () =>
			await writeWorkspaceFiles(
				workspace,
				root,
				new Map([['.sandbox-initialized', new Date().toISOString()]]),
			),
	);

	return true;
}
