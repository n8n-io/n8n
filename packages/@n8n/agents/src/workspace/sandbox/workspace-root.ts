import { runInSandbox, type SandboxCommandTarget } from './run-in-sandbox';
import type { SandboxProvider } from './types';

export const WORKSPACE_DIR = 'workspace';
export const DAYTONA_HOME = '/home/daytona';
export const DAYTONA_WORKSPACE_ROOT = `${DAYTONA_HOME}/${WORKSPACE_DIR}`;
export const N8N_SANDBOX_HOME = '/home/user';
export const N8N_SANDBOX_WORKSPACE_ROOT = `${N8N_SANDBOX_HOME}/${WORKSPACE_DIR}`;
/**
 * Workspace root that is the same on every provider: the n8n sandbox service
 * uses it natively, and current Daytona snapshots bake the workspace there.
 * Sandboxes from older Daytona snapshots use {@link DAYTONA_WORKSPACE_ROOT}.
 */
export const PORTABLE_WORKSPACE_ROOT = N8N_SANDBOX_WORKSPACE_ROOT;

const DETECT_DAYTONA_WORKSPACE_ROOT_COMMAND = `if [ -d '${PORTABLE_WORKSPACE_ROOT}' ]; then echo '${PORTABLE_WORKSPACE_ROOT}'; else echo '${DAYTONA_WORKSPACE_ROOT}'; fi`;

export function getSandboxHome(provider: SandboxProvider): string {
	switch (provider) {
		case 'daytona':
			return DAYTONA_HOME;
		case 'n8n-sandbox':
			return N8N_SANDBOX_HOME;
	}
}

export function getPromptWorkspaceRoot(provider: SandboxProvider): string {
	return `${getSandboxHome(provider)}/${WORKSPACE_DIR}`;
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
	const provider = workspace.sandbox?.provider;
	return getSandboxHome(provider === 'n8n-sandbox' ? provider : 'daytona');
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

	// The Daytona home is fixed, but the snapshot decides where the workspace is baked.
	if (workspace.sandbox?.provider === 'daytona') {
		const result = await runInSandbox(workspace, DETECT_DAYTONA_WORKSPACE_ROOT_COMMAND);
		const root =
			result.stdout.trim() === PORTABLE_WORKSPACE_ROOT
				? PORTABLE_WORKSPACE_ROOT
				: DAYTONA_WORKSPACE_ROOT;
		workspaceRootCache.set(workspace, root);
		return root;
	}

	const result = await runInSandbox(workspace, 'echo $HOME');
	const home = result.stdout.trim() || getFallbackHome(workspace);
	const root = `${home}/${WORKSPACE_DIR}`;
	workspaceRootCache.set(workspace, root);
	return root;
}
