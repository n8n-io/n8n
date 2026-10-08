import { execFileSync, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { link, rm } from 'node:fs/promises';
import path from 'node:path';
import { UserError } from 'n8n-workflow';

import { connectChild, type GuestRuntime } from '../sandbox';

/** `node:24-slim` (linux/amd64 and linux/arm64), pinned so a tag push cannot change the guest. */
export const CONTAINER_IMAGE =
	'node@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6';

/** The Node guest that the package build writes (`scripts/node-guest.ts`). */
export const CONTAINER_GUEST = path.resolve(__dirname, '..', '..', 'dist', 'guest', 'action.cjs');

const GUEST_PATH = '/guest/action.cjs';
const BUNDLE_PATH = '/bundle/bundle.js';
const SDK_PATH = '/bundle/sdk.js';

/** The guest, the image, the permissions and the limits of `containerRuntime`. */
export interface ContainerOptions {
	/** The Node guest of both kinds. Default: `CONTAINER_GUEST`. */
	readonly guest?: string;
	/**
	 * An image with `node` on the PATH, pinned by digest or image id, for a manifest without
	 * `runtime`. Default: `CONTAINER_IMAGE`.
	 */
	readonly image?: string;
	/** Lets the bundle run the tools of the image, with `/tmp` to read and write their files. */
	readonly allowChildProcess?: boolean;
	/** Directories in the image from which the bundle can load native addons, e.g. `sharp`. */
	readonly allowAddons?: readonly string[];
	/** The OCI runtime of docker, e.g. `runsc` for gVisor. Default: the default of docker. */
	readonly ociRuntime?: 'runc' | 'runsc';
	/** Per container. Memory comes from `SandboxLimits.memoryMb`. */
	readonly limits?: {
		/** CPUs of the container. Default: 1. */
		readonly cpus?: number;
		/** Processes and threads of the container. Default: 256. */
		readonly pids?: number;
	};
}

/**
 * The default limit of processes and threads. Chromium starts about 110 and hangs at 64. The limit
 * still stops a fork bomb.
 */
const DEFAULT_PIDS = 256;

/** The exit code of `docker run` when the kernel kills the container, e.g. at its memory limit. */
const KILLED_EXIT = 137;

/** An image id cannot come from `docker pull`. A tag can come from a registry or a local build. */
const pullHint = (image: string) =>
	/^[^@\s]+@sha256:[0-9a-f]{64}$/.test(image)
		? `Run: docker pull ${image}`
		: /^(sha256:)?[0-9a-f]{12,64}$/.test(image)
			? 'Build or load it on this host, e.g. with docker build or docker load'
			: `Run: docker pull ${image}, or build or load it on this host`;

/** Throws a clear error when docker is missing or the pinned image is not pulled. */
function checkImage(image: string) {
	try {
		execFileSync('docker', ['image', 'inspect', '--format', '{{.Id}}', image], {
			stdio: ['ignore', 'ignore', 'pipe'],
			encoding: 'utf8',
		});
	} catch (error) {
		const code = error instanceof Error && 'code' in error ? error.code : undefined;
		if (code === 'ENOENT') throw new Error('The container runtime needs docker on the PATH');
		const stderr =
			error instanceof Error && 'stderr' in error && typeof error.stderr === 'string'
				? error.stderr.trim()
				: '';
		throw new Error(
			stderr.includes('No such image')
				? `The container runtime needs the image ${image}. ${pullHint(image)}`
				: `The container runtime cannot use docker: ${stderr || String(error)}`,
		);
	}
}

const permissionsOf = (childProcess: boolean, addons: readonly string[]) => [
	...(childProcess
		? ['--allow-child-process', '--allow-fs-read=/tmp', '--allow-fs-write=/tmp']
		: []),
	...(addons.length > 0
		? ['--allow-addons', ...addons.map((dir) => `--allow-fs-read=${dir}`)]
		: []),
];

/**
 * One container per session with the Node guest. A contract with `runtime` runs in its own image
 * with its own permissions; the image and permission options apply to every other contract.
 * Docker must see the paths of the guest and the bundle: a bind mount of a path that the daemon
 * does not share fails at `docker run`.
 */
export function containerRuntime({
	guest = CONTAINER_GUEST,
	image = CONTAINER_IMAGE,
	allowChildProcess = false,
	allowAddons = [],
	ociRuntime,
	limits: { cpus = 1, pids = DEFAULT_PIDS } = {},
}: ContainerOptions = {}): GuestRuntime {
	checkImage(image);
	const checked = new Set([image]);
	return {
		name: 'container',
		async start(session) {
			const { kind, limits, manifest, bundleFile, sdk, grants } = session;
			const own = manifest.contract?.runtime;
			const used = own?.image ?? image;
			if (!checked.has(used)) {
				checkImage(used);
				checked.add(used);
			}
			const permissions = own
				? permissionsOf(own.childProcess ?? false, own.addons ?? [])
				: permissionsOf(allowChildProcess, allowAddons);
			const name = `n8n-guest-${randomUUID()}`;
			// Docker in a VM with virtiofs (colima) can mount a stale file at a path that the cache
			// renamed a new bundle to a moment ago. A new name for each session avoids that.
			const mounted = `${bundleFile}.${name}`;
			await link(bundleFile, mounted);
			const sdkMounted = sdk ? `${sdk.file}.${name}` : undefined;
			if (sdk && sdkMounted) await link(sdk.file, sdkMounted);
			const child = spawn(
				'docker',
				[
					...['run', '-i', '--rm', '--name', name, '--pull', 'never'],
					...['--network', 'none', '--read-only', '--tmpfs', '/tmp', '--cap-drop', 'ALL'],
					...['--security-opt', 'no-new-privileges', '--user', '10001:10001'],
					...['--memory', `${limits.memoryMb}m`, '--memory-swap', `${limits.memoryMb}m`],
					...['--cpus', String(cpus), '--pids-limit', String(pids)],
					...(ociRuntime ? ['--runtime', ociRuntime] : []),
					...['--mount', `type=bind,src=${guest},dst=${GUEST_PATH},readonly`],
					...['--mount', `type=bind,src=${mounted},dst=${BUNDLE_PATH},readonly`],
					...(sdkMounted
						? ['--mount', `type=bind,src=${sdkMounted},dst=${SDK_PATH},readonly`]
						: []),
					used,
					...['node', '--permission', `--allow-fs-read=${BUNDLE_PATH}`],
					...(sdk ? [`--allow-fs-read=${SDK_PATH}`] : []),
					...[...permissions, GUEST_PATH],
					...['--kind', kind],
					...grants.flatMap((grant) => ['--grant', grant]),
					...['--bundle', BUNDLE_PATH, '--bundle-sha256', manifest.bundleHash],
					...(sdk ? ['--sdk', SDK_PATH, '--sdk-sha256', sdk.sha256] : []),
					...['--node-contract', manifest.nodeContract],
				],
				{ stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true },
			);
			// Killing the docker client does not stop the container, e.g. a guest in an endless loop.
			child.once('close', () => {
				spawn('docker', ['rm', '--force', name], { stdio: 'ignore' }).on('error', () => {});
				void rm(mounted, { force: true });
				if (sdkMounted) void rm(sdkMounted, { force: true });
			});
			return connectChild(child, {
				limits,
				label: manifest.id,
				// The client gets no signal of its container, so 137 is a kill in the container. The
				// container has no other process that kills, so it is most likely the memory limit.
				stoppedError: (code) =>
					code === KILLED_EXIT
						? new UserError(
								`The bundle was killed in its container (exit 137), most likely at its memory limit of ${limits.memoryMb} MB`,
							)
						: undefined,
			});
		},
	};
}
