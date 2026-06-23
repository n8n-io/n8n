/**
 * Sandbox Workspace Setup
 *
 * Handles first-time initialization of the sandbox workspace for the workflow
 * builder agent. Lazy and idempotent — checks for marker file before running.
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
 *     knowledge-base/
 *       index.json                    # combined catalog of guides and templates
 *       best-practices/
 *         index.json                  # technique guide catalog
 *         *.md                        # guide content per technique
 *       templates/
 *         index.json                  # curated template catalog
 *         *.ts                        # SDK workflow examples
 */

import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import { createRequire } from 'node:module';

import type { Logger } from '../logger';
import type { InstanceAiContext, SearchableNodeDescription } from '../types';
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
import { joinWorkspacePath } from './workspace-paths';
import { materializeKnowledgeBaseIntoWorkspace } from '../knowledge-base/materialize-knowledge-base';

const hostRequire = createRequire(__filename);

type SandboxWorkspaceSetupStep =
	| 'resolve-workspace-root'
	| 'read-initialization-marker'
	| 'list-node-types'
	| 'write-workspace-files'
	| 'materialize-knowledge-base'
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

let sdkTarballPromise: Promise<WorkspaceSdkTarball | null> | null = null;

export async function linkWorkspaceSdkIfEnabled(
	workspace: SandboxWorkspace,
	root: string,
	logger: Logger,
): Promise<void> {
	if (!isLinkWorkspaceSdkEnabled()) return;

	sdkTarballPromise ??= packWorkspaceSdk(logger).catch((error: unknown) => {
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
		logger.error('Failed to link workspace SDK into sandbox', {
			exitCode: install.exitCode,
			stderr: install.stderr,
		});
		throw new Error(`Failed to install workspace SDK tarball: ${install.stderr}`);
	}

	logger.info('Linked workspace SDK into sandbox', {
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

async function readWorkspaceFile(
	workspace: SandboxWorkspace,
	path: string,
): Promise<string | null> {
	const filesystem = workspace.filesystem;
	if (filesystem?.readFile) {
		try {
			const content = await filesystem.readFile(path, { encoding: 'utf-8' });
			return typeof content === 'string' ? content : content.toString('utf-8');
		} catch {
			if (!workspace.sandbox) return null;
		}
	}

	return await readFileViaSandbox(workspace, path);
}

async function materializeKnowledgeBaseStep(
	workspace: SandboxWorkspace,
	root: string,
	context: InstanceAiContext,
): Promise<void> {
	await setupStep('materialize-knowledge-base', async () => {
		const templatesBundle = (await context.templatesService?.getBundle()) ?? null;
		await materializeKnowledgeBaseIntoWorkspace({
			workspace,
			root,
			logger: context.logger,
			templatesArchive: templatesBundle?.archive ?? null,
		});
	});
}

/**
 * Initialize the sandbox workspace for the workflow builder agent.
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
		async () => await readWorkspaceFile(workspace, markerFile),
	);
	if (marker !== null) {
		await materializeKnowledgeBaseStep(workspace, root, context);
		return false;
	}

	// ── Collect all files ──────────────────────────────────────────────────

	const files = new Map<string, string>();

	files.set('package.json', PACKAGE_JSON);
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
	await materializeKnowledgeBaseStep(workspace, root, context);

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
