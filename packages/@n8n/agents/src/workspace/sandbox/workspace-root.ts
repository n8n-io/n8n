import { runInSandbox, type SandboxCommandTarget } from './run-in-sandbox';
import type { SandboxProvider } from './types';

export const WORKSPACE_DIR = 'workspace';
export const DAYTONA_HOME = '/home/daytona';
export const DAYTONA_WORKSPACE_ROOT = `${DAYTONA_HOME}/${WORKSPACE_DIR}`;
export const N8N_SANDBOX_HOME = '/home/user';
export const N8N_SANDBOX_WORKSPACE_ROOT = `${N8N_SANDBOX_HOME}/${WORKSPACE_DIR}`;

export function getPromptWorkspaceRoot(provider: SandboxProvider): string {
	switch (provider) {
		case 'daytona':
			return DAYTONA_WORKSPACE_ROOT;
		case 'n8n-sandbox':
			return N8N_SANDBOX_WORKSPACE_ROOT;
	}
}

/**
 * Stable, cache-safe sandbox description appended via workspace tools.
 *
 * Instance AI surfaces sandbox/filesystem guidance in the system prompt's
 * `## Sandbox workspace` section instead. Returning empty here keeps the
 * workspace-appended block from duplicating that text while still providing a
 * byte-stable (empty) value across agent rebuilds/resumes — the live
 * sandbox's `getInstructions()` must not be used, because a lazily-resolved
 * workspace reports different text depending on whether its (per-build,
 * in-memory) handle happens to be resolved yet.
 */
export function getPromptSandboxInstructions(_provider: SandboxProvider): string {
	return '';
}

/**
 * Stable, cache-safe filesystem description appended via workspace tools.
 *
 * Same rationale as {@link getPromptSandboxInstructions}: content lives in the
 * system prompt's `## Sandbox workspace` section; this stays empty so the
 * lazily-resolved (and scoped) filesystem cannot shift the cached prompt
 * prefix across resumes.
 */
export function getPromptFilesystemInstructions(_provider: SandboxProvider): string {
	return '';
}

export interface SandboxWorkspace extends SandboxCommandTarget {
	filesystem?: {
		provider?: string;
		basePath?: string;
		init?: () => Promise<void>;
	};
}

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

function getFallbackHome(workspace: SandboxWorkspace): string {
	switch (workspace.sandbox?.provider) {
		case 'n8n-sandbox':
			return N8N_SANDBOX_HOME;
		case 'daytona':
			return DAYTONA_HOME;
		case undefined:
		default:
			return DAYTONA_HOME;
	}
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
	const home = result.stdout.trim() || getFallbackHome(workspace);
	const root = `${home}/${WORKSPACE_DIR}`;
	workspaceRootCache.set(workspace, root);
	return root;
}
