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
 * Stable, cache-safe sandbox description for the agent's system prompt.
 *
 * MUST NOT vary across agent rebuilds/resumes: the orchestrator prompt is
 * rebuilt on every resume, so any change here shifts the cached prompt prefix
 * and busts Anthropic prompt caching for the rest of the thread. The live
 * sandbox's `getInstructions()` is deliberately NOT used here because a
 * lazily-resolved workspace reports different text depending on whether its
 * (per-build, in-memory) handle happens to be resolved yet — the workspace is
 * available regardless. Runtime-varying details (resolution state, live command
 * timeout) are excluded; the workspace root is added to the prompt separately.
 */
export function getPromptSandboxInstructions(_provider: SandboxProvider): string {
	return 'Cloud sandbox with isolated execution (TypeScript runtime).';
}

/**
 * Stable, cache-safe filesystem description for the agent's system prompt.
 *
 * Same rationale as {@link getPromptSandboxInstructions}: the lazily-resolved
 * (and scoped) filesystem reports different text before vs after its per-build
 * handle resolves, which would shift the cached prompt prefix across resumes.
 * Derived from the (static) workspace root so it matches the resolved scoped
 * filesystem's own instructions while staying byte-stable.
 */
export function getPromptFilesystemInstructions(provider: SandboxProvider): string {
	return [
		`Filesystem access is scoped to ${getPromptWorkspaceRoot(provider)}.`,
		'Paths are relative to the workspace root unless you pass an absolute path under that root.',
	].join(' ');
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
