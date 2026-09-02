import type { SandboxRuntimeConfig } from '@anthropic-ai/sandbox-runtime';
import { spawn, type ChildProcess } from 'node:child_process';

import { getSettingsDir, type GatewayConfig } from '../../config';
import { logger } from '../../logger';

export type ShellSandboxMode = 'sandboxed' | 'unsandboxed';

export type ShellSandboxStatus =
	| { enabled: true; mode: ShellSandboxMode }
	| { enabled: false; reason: string; hint?: string };

const SANDBOX_DOCS = 'https://www.npmjs.com/package/@n8n/computer-use#shell-sandboxing';

function buildSandboxConfig({
	dir,
	rgPath,
}: { dir: string; rgPath: string }): SandboxRuntimeConfig {
	return {
		// Use the bundled ripgrep so a system rg isn't required.
		ripgrep: { command: rgPath },
		network: {
			allowedDomains: [],
			deniedDomains: [],
		},
		filesystem: {
			denyRead: ['~/.ssh', getSettingsDir()],
			allowRead: [],
			allowWrite: [dir],
			denyWrite: [getSettingsDir()],
		},
	};
}

/**
 * Resolve whether shell execution can run inside the OS sandbox. Fail-closed:
 * when the sandbox is unavailable the shell tool is not registered, unless
 * `--dangerously-disable-shell-sandbox` opts out.
 */
export async function resolveShellSandbox({
	config,
	dir,
}: {
	config: GatewayConfig;
	dir: string;
}): Promise<ShellSandboxStatus> {
	if (config.computer.shell.dangerouslyDisableSandbox) {
		logger.warn(
			'Shell sandbox disabled via --dangerously-disable-shell-sandbox: commands run without OS-level isolation. Only use this in a trusted, isolated environment.',
		);
		return { enabled: true, mode: 'unsandboxed' };
	}

	// The native Windows backend isn't a real security boundary; require WSL2.
	if (process.platform === 'win32') {
		return {
			enabled: false,
			reason: 'Shell sandbox is not available on native Windows',
			hint: `Run inside WSL2 (needs bubblewrap + socat), or pass --dangerously-disable-shell-sandbox to run without isolation.\nDocs: ${SANDBOX_DOCS}`,
		};
	}

	const { SandboxManager } = await import('@anthropic-ai/sandbox-runtime');
	const { rgPath } = await import('@vscode/ripgrep');

	if (!SandboxManager.isSupportedPlatform()) {
		return {
			enabled: false,
			reason: 'Shell sandbox is not supported on this platform',
			hint: `Use macOS, Linux, or WSL2 (WSL1 is not supported), or pass --dangerously-disable-shell-sandbox to run without isolation.\nDocs: ${SANDBOX_DOCS}`,
		};
	}

	// Checks for required binaries (bwrap/socat on Linux); can't verify the kernel
	// allows user namespaces, so initialize() below may still fail closed.
	const deps = SandboxManager.checkDependencies({ command: rgPath });
	if (deps.errors.length > 0) {
		return {
			enabled: false,
			reason: `Shell sandbox dependencies missing: ${deps.errors.join(', ')}`,
			hint:
				process.platform === 'linux'
					? `Debian/Ubuntu: sudo apt-get install bubblewrap socat\nFedora: sudo dnf install bubblewrap socat\nUbuntu 24.04+: also allow bwrap user namespaces\nDocs: ${SANDBOX_DOCS}`
					: undefined,
		};
	}
	for (const warning of deps.warnings) {
		logger.warn('Shell sandbox degraded', { warning });
	}

	try {
		await SandboxManager.initialize(buildSandboxConfig({ dir, rgPath }));
	} catch (error) {
		return {
			enabled: false,
			reason: `Shell sandbox failed to initialize: ${error instanceof Error ? error.message : String(error)}`,
			hint: `Sandbox tools are installed but couldn't start, usually blocked user namespaces.\nUbuntu 24.04+: allow bwrap user namespaces. Docker: run with --privileged.\nDocs: ${SANDBOX_DOCS}`,
		};
	}

	return { enabled: true, mode: 'sandboxed' };
}

/** Tear down the sandbox and its proxy processes. */
export async function resetShellSandbox(): Promise<void> {
	const { SandboxManager } = await import('@anthropic-ai/sandbox-runtime');
	await SandboxManager.reset();
}

/**
 * Launch a shell command. 'sandboxed' wraps it with the OS sandbox; a wrap
 * failure throws so the caller fails closed rather than running unsandboxed.
 */
export async function spawnShell(
	command: string,
	{ cwd, mode }: { cwd?: string; mode: ShellSandboxMode },
): Promise<ChildProcess> {
	if (mode === 'sandboxed') {
		const { SandboxManager } = await import('@anthropic-ai/sandbox-runtime');
		const sandboxedCommand = await SandboxManager.wrapWithSandbox(command);
		return spawn(sandboxedCommand, { shell: true, cwd });
	}

	if (process.platform === 'win32') {
		return spawn('cmd.exe', ['/C', command], { cwd });
	}
	return spawn('sh', ['-c', command], { cwd });
}
