import { createScopedWorkspace, type Workspace } from '@n8n/agents';
import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { restoreApp } from '@n8n/instance-ai';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { create as createTar, extract as extractTar } from 'tar';

import { AppSourceSnapshotService } from '@/modules/instance-ai/app-preview/app-source-snapshot.service';

import { AppPublishService } from './app-publish.service';
import { AppsService } from './apps.service';
import { createDistTarFilter } from './serving/dist-tar-filter';

/** Same budget `AppVersionService` accepts for a source upload. */
const SOURCE_TAR_LIMITS = { maxEntries: 50_000, maxBytes: 200 * 1024 * 1024 };

/** Reads one file of the draft (`undefined` when it does not exist) and returns the files to write. */
export type DraftFilesFor = (
	read: (file: string) => Promise<string | undefined>,
) => Promise<Record<string, string>>;

export type DraftWriteResult = { versionId: string | null } | { error: true; message: string };

/**
 * The app's draft source: the app's sandbox, shared by every thread that
 * builds the app. Nothing here builds or publishes — the dev server reloads
 * what is written and the draft is snapshotted. Without a sandbox (the
 * provider is disabled) the newest stored source is patched into a new
 * snapshot instead. The user publishes explicitly afterwards.
 */
@Service()
export class AppDraftService {
	constructor(
		private readonly appsService: AppsService,
		private readonly appPublishService: AppPublishService,
		private readonly snapshotService: AppSourceSnapshotService,
	) {}

	/**
	 * Files of the newest stored source, after storing the sandbox's current
	 * edits when the app has one. `null` when the app has no source yet.
	 */
	async listFiles(
		appId: string,
		user: User,
		draft?: Workspace,
	): Promise<{ versionId: string; files: string[] } | null> {
		if (draft) await this.snapshotService.snapshotAfterRun(appId, user, draft);
		const [newest] = await this.appsService.listVersions(appId);
		if (!newest) return null;
		return {
			versionId: newest.id,
			files: await this.appsService.listVersionFiles(appId, newest.id),
		};
	}

	/** `draft`: the app's sandbox workspace; a sandbox that does not hold the app yet gets it restored first. */
	async write(
		appId: string,
		user: User,
		filesFor: DraftFilesFor,
		draft?: Workspace,
	): Promise<DraftWriteResult> {
		const app = await this.appsService.getApp(appId);

		if (draft) {
			const written = await this.writeIntoDraft(app.id, app.namespace, filesFor, draft);
			if (written !== true) return written;
			await this.snapshotService.snapshotAfterRun(appId, user, draft);
			const [newest] = await this.appsService.listVersions(appId);
			return { versionId: newest?.id ?? null };
		}

		const source = await this.appsService.getSourceTarball(appId);
		if (!source) {
			return {
				error: true,
				message: `App "${app.name}" has no source yet. Ask the AI Assistant to create it first.`,
			};
		}
		const patched = await patchTarball(source.data, filesFor);
		const version = await this.appsService.createSourceSnapshot(appId, patched);
		return { versionId: version.id };
	}

	private async writeIntoDraft(
		appId: string,
		namespace: string,
		filesFor: DraftFilesFor,
		draft: Workspace,
	): Promise<true | { error: true; message: string }> {
		// Handlers pass root-relative paths; the raw app workspace resolves against `/`.
		const root = await getWorkspaceRoot(draft);
		const workspace = createScopedWorkspace(draft, root);
		const filesystem = workspace.filesystem;
		if (!filesystem)
			return { error: true, message: 'The sandbox is not available on this instance.' };

		const appDir = `apps/${namespace}`;
		if (!(await filesystem.exists(`${appDir}/package.json`))) {
			const restored = await restoreApp(
				{ appService: this.appPublishService.createAppServiceAdapter(), appWorkspace: workspace },
				{ action: 'restore', appId },
			);
			if ('denied' in restored) return { error: true, message: restored.reason };
			if ('error' in restored) return { error: true, message: restored.message };
		}

		const files = await filesFor(async (file) => {
			if (!(await filesystem.exists(`${appDir}/${file}`))) return undefined;
			const content = await filesystem.readFile(`${appDir}/${file}`);
			return Buffer.isBuffer(content) ? content.toString('utf8') : content;
		});
		await Promise.all(
			Object.entries(files).map(
				async ([file, content]) => await filesystem.writeFile(`${appDir}/${file}`, content),
			),
		);
		return true;
	}
}

/**
 * Unpacks the source into a fresh temp directory, writes the files and packs
 * it again. `tar` has no in-memory entry API, and extracting keeps every other
 * entry (modes, mtimes) as it was. Links and out-of-tree paths are dropped by
 * the same filter the dist extraction uses.
 */
export async function patchTarball(tarball: Buffer, filesFor: DraftFilesFor): Promise<Buffer> {
	const dir = await mkdtemp(path.join(os.tmpdir(), 'n8n-app-draft-'));
	try {
		await new Promise<void>((resolve, reject) => {
			const unpack = extractTar({ cwd: dir, filter: createDistTarFilter(SOURCE_TAR_LIMITS) });
			unpack.on('error', reject);
			unpack.on('end', resolve);
			unpack.end(tarball);
		});
		const files = await filesFor(
			async (file) => await readFile(path.join(dir, file), 'utf8').catch(() => undefined),
		);
		for (const [file, content] of Object.entries(files)) {
			const target = path.join(dir, file);
			await mkdir(path.dirname(target), { recursive: true });
			await writeFile(target, content);
		}
		const chunks: Buffer[] = [];
		for await (const chunk of createTar({ gzip: true, cwd: dir, portable: true }, ['.'])) {
			chunks.push(chunk);
		}
		return Buffer.concat(chunks);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}
