import { Logger } from '@n8n/backend-common';
import type { Workspace } from '@n8n/agents';
import { createScopedWorkspace } from '@n8n/agents';
import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { MAX_TARBALL_BYTES } from '@/modules/apps/app-version.service';
import { AppRepository } from '@/modules/apps/app.repository';
import { AppsService } from '@/modules/apps/apps.service';
import { userHasScopes } from '@/permissions.ee/check-access';

/** Same list `apps build` uses for the source tarball (`apps.tool.ts`); keep them in step. */
const SNAPSHOT_EXCLUDES = [
	'node_modules',
	'dist',
	'.git',
	'.n8n-dev.log',
	'.n8n-dev.pid',
	'.n8n-preview-dist',
];
/** Same staging directory `apps build` uses: the scoped filesystem only reads inside the workspace root. */
const STAGING_DIR = '.app-builds';
const APPS_DIR = 'apps';
const SNAPSHOT_TIMEOUT_MS = 60_000;

const excludes = SNAPSHOT_EXCLUDES.map((pattern) => `--exclude=${pattern}`).join(' ');

/** Namespaces of the app directories that hold a `package.json`, one per line. */
export const LIST_APPS_SCRIPT = `for d in ${APPS_DIR}/*/; do [ -f "\${d}package.json" ] && basename "$d"; done; true`;

/**
 * Hashes the app directory and packs it only when the hash differs from
 * `lastHash`. An uncompressed tar of unchanged files is byte-stable, so its
 * digest tells "nothing changed since the last snapshot" without a second
 * copy of the sources; the gzip header (mtime) makes compressed bytes useless
 * for that. Prints `UNCHANGED`, or `SNAPSHOT <hash> <bytes>`.
 */
export function buildSnapshotScript(input: {
	root: string;
	namespace: string;
	/** Root-relative; the script runs inside the app directory. */
	tarball: string;
	lastHash: string | undefined;
}): string {
	const tarball = `${input.root}/${input.tarball}`;
	return [
		'set -e',
		`mkdir -p '${input.root}/${STAGING_DIR}'`,
		`cd '${input.root}/${APPS_DIR}/${input.namespace}'`,
		`hash=$(tar -cf - ${excludes} . | (sha256sum 2>/dev/null || cksum) | cut -d' ' -f1)`,
		`if [ "$hash" = '${input.lastHash ?? ''}' ]; then echo UNCHANGED; exit 0; fi`,
		`tar -czf '${tarball}' ${excludes} .`,
		`echo "SNAPSHOT $hash $(stat -c %s '${tarball}')"`,
	].join('\n');
}

/**
 * Stores the source of every app in an app's sandbox at the end of a turn, so
 * the working copy survives the sandbox without a build. Best-effort by
 * design: a failed snapshot is logged, never surfaced to the run.
 */
@Service()
export class AppSourceSnapshotService {
	/** `appId:namespace` → digest of the last stored snapshot, to skip unchanged turns. */
	private readonly lastHashes = new Map<string, string>();

	constructor(
		private readonly appsService: AppsService,
		private readonly appRepository: AppRepository,
		private readonly logger: Logger,
	) {
		this.logger = logger.scoped('instance-ai');
	}

	/** `label`: what the version is for, when the caller knows (a Theme- or Code-tab save); assistant turns are labeled afterwards. */
	async snapshotAfterRun(
		appId: string,
		user: User,
		rawWorkspace: Workspace,
		label: string | null = null,
	): Promise<void> {
		const root = await getWorkspaceRoot(rawWorkspace);
		const workspace = createScopedWorkspace(rawWorkspace, root);
		const executeCommand = workspace.sandbox?.executeCommand?.bind(workspace.sandbox);
		const filesystem = workspace.filesystem;
		if (!executeCommand || !filesystem) return;

		const listed = await executeCommand(LIST_APPS_SCRIPT, [], { cwd: root });
		const namespaces = listed.stdout.split('\n').filter((line) => /^[a-z0-9-]+$/.test(line));
		if (namespaces.length === 0) {
			this.logger.debug('No app to snapshot in the app sandbox', { appId });
			return;
		}

		for (const namespace of namespaces) {
			const app = await this.appRepository.findByNamespace(namespace);
			if (
				!app ||
				!(await userHasScopes(user, ['app:update'], false, { projectId: app.projectId }))
			) {
				this.logger.debug('Skipping app snapshot: unknown app or no update scope', {
					appId,
					namespace,
				});
				continue;
			}

			const key = `${appId}:${namespace}`;
			const tarball = `${STAGING_DIR}/${namespace}-${Date.now()}-snapshot.tgz`;
			try {
				const packed = await executeCommand(
					buildSnapshotScript({ root, namespace, tarball, lastHash: this.lastHashes.get(key) }),
					[],
					{ cwd: root, timeout: SNAPSHOT_TIMEOUT_MS },
				);
				const match = /^SNAPSHOT (\S+) (\d+)$/m.exec(packed.stdout);
				if (packed.exitCode !== 0 || !match) {
					if (!packed.stdout.includes('UNCHANGED')) {
						this.logger.debug('App snapshot script did not produce a tarball', {
							appId,
							namespace,
							exitCode: packed.exitCode,
							output: packed.stdout.slice(-1024),
						});
					}
					continue;
				}
				const [, hash, size] = match;
				if (Number(size) > MAX_TARBALL_BYTES) {
					this.logger.warn('App source is too large to snapshot', { appId, namespace, size });
					continue;
				}
				const source = await filesystem.readFile(tarball);
				if (!Buffer.isBuffer(source)) {
					this.logger.warn('App snapshot read-out was not binary', { appId, namespace });
					continue;
				}
				const version = await this.appsService.createSourceSnapshot(app.id, source, label);
				this.lastHashes.set(key, hash);
				this.logger.debug('Stored app source snapshot', {
					appId,
					namespace,
					versionId: version.id,
				});
			} finally {
				await executeCommand(`rm -f '${root}/${tarball}'`, [], { cwd: root }).catch(
					() => undefined,
				);
			}
		}
	}

	async labelVersionsSince(appId: string, since: Date, label: string): Promise<void> {
		await this.appsService.labelVersionsSince(appId, since, label);
	}

	/** A new sandbox starts from a restore, so the next turn must snapshot again. */
	clearApp(appId: string): void {
		for (const key of this.lastHashes.keys()) {
			if (key.startsWith(`${appId}:`)) this.lastHashes.delete(key);
		}
	}
}
