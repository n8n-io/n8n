import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

// Mirrors the engine resolution in scripts/dockerize-n8n.mjs (getContainerEngine).
// Duplicated rather than shared: ~40 lines, and this is a published CLI that
// must not depend on the monorepo.
export const SUPPORTED_ENGINES = ['docker', 'podman'] as const;
export type ContainerEngine = (typeof SUPPORTED_ENGINES)[number];

async function commandExists(command: string): Promise<boolean> {
	try {
		// `--version` rather than `command -v`, which needs a POSIX shell
		await exec(command, ['--version']);
		return true;
	} catch {
		return false;
	}
}

/** The local `docker` CLI can be a Podman shim, which rejects docker-only flags. */
async function isDockerPodmanShim(): Promise<boolean> {
	try {
		const { stdout } = await exec('docker', ['version']);
		return stdout.toLowerCase().includes('podman');
	} catch {
		return false;
	}
}

const INSTALL_HINT = `Install one, or run n8n yourself and use --external-n8n.
  Linux / WSL:   curl -fsSL https://get.docker.com | sh
  macOS:         https://docs.docker.com/desktop/setup/install/mac-install/
  Windows:       https://docs.docker.com/desktop/setup/install/windows-install/
Podman, Colima, Rancher Desktop and OrbStack work too. Set CONTAINER_ENGINE=docker|podman to override detection.`;

export async function detectContainerEngine(): Promise<ContainerEngine> {
	const override = process.env.CONTAINER_ENGINE?.toLowerCase();
	if (override) {
		if (!(SUPPORTED_ENGINES as readonly string[]).includes(override)) {
			throw new Error(
				`CONTAINER_ENGINE is set to "${override}", which is not supported. Use one of: ${SUPPORTED_ENGINES.join(', ')}.`,
			);
		}
		return override as ContainerEngine;
	}

	const [hasDocker, hasPodman] = await Promise.all([
		commandExists('docker'),
		commandExists('podman'),
	]);

	if (hasDocker) {
		if (hasPodman && (await isDockerPodmanShim())) return 'podman';
		return 'docker';
	}
	if (hasPodman) return 'podman';

	throw new Error(
		`No container engine found — n8n-node dev needs Docker or Podman.\n${INSTALL_HINT}`,
	);
}

/** Fails with an actionable message when the engine is installed but not running. */
export async function assertEngineRunning(engine: ContainerEngine): Promise<void> {
	try {
		await exec(engine, ['info']);
	} catch {
		throw new Error(
			`The ${engine} daemon is not reachable.\n` +
				"  Start it (e.g. open Docker Desktop, 'podman machine start', 'colima start') and re-run.\n" +
				'  Or run n8n yourself and use --external-n8n.',
		);
	}
}

/** Best-effort removal, used on exit so `q` never leaves a container behind. */
export function removeContainer(engine: ContainerEngine, name: string): void {
	try {
		execFileSync(engine, ['rm', '-f', name], { stdio: 'ignore' });
	} catch {
		// Container already gone
	}
}
