import type { GitConnectionPushResultDto } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import { copyFile, lstat, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import { N8N_VERSION } from '@/constants';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { PackageContentsReader } from '@/modules/n8n-packages/engine/package-contents';
import type { PackageContents } from '@/modules/n8n-packages/engine/package-contents';
import { DirectoryPackageReader } from '@/modules/n8n-packages/io/directory/directory-package-reader';
import { PackageImportConfig } from '@/modules/n8n-packages/n8n-packages.config';
import { MANIFEST_FILE } from '@/modules/n8n-packages/spec/constants';
import type { ManifestEntry, PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';
import { packageManifestSchema } from '@/modules/n8n-packages/spec/manifest.schema';

import {
	assertNoCollisions,
	containerPlacement,
	orphanedDependencies,
	pinPath,
	staleTargets,
	variableIds,
} from './branch-placement';
import type { BranchState, Placement } from './branch-placement';

const selectivePushOptionsSchema = z.object({
	projectId: z.string().min(1),
	workflowIds: z.array(z.string().min(1)),
	deletedWorkflowIds: z.array(z.string().min(1)),
});

export type SelectivePushOptions = z.infer<typeof selectivePushOptionsSchema>;

/**
 * Applies a selective export to the exported working copy of a branch. It only
 * knows directories; the caller resolves the connection, runs the exporter and
 * commits. This keeps the reconciliation independent of how connections are
 * modelled.
 */
@Service()
export class WorkingCopyUpdater {
	constructor(
		private readonly instanceSettings: InstanceSettings,
		private readonly packageImportConfig: PackageImportConfig,
		private readonly packageContents: PackageContentsReader,
	) {}

	validateSelection(selection: SelectivePushOptions): void {
		const parsed = selectivePushOptionsSchema.safeParse(selection);
		if (!parsed.success) {
			throw new BadRequestError(`Invalid selection: ${parsed.error.issues[0].message}`);
		}

		if (selection.workflowIds.length === 0 && selection.deletedWorkflowIds.length === 0) {
			throw new BadRequestError('At least one workflow must be selected or deleted');
		}

		const addSet = new Set(selection.workflowIds);
		if (addSet.size !== selection.workflowIds.length) {
			throw new BadRequestError('workflowIds contains duplicates');
		}
		const deleteSet = new Set(selection.deletedWorkflowIds);
		if (deleteSet.size !== selection.deletedWorkflowIds.length) {
			throw new BadRequestError('deletedWorkflowIds contains duplicates');
		}

		const overlap = selection.deletedWorkflowIds.filter((id) => addSet.has(id));
		if (overlap.length > 0) {
			throw new BadRequestError('A workflow cannot be both selected and deleted in the same push');
		}
	}

	/** Manifest of a branch that has no export yet. */
	emptyManifest(): PackageManifest {
		return packageManifestSchema.parse({
			packageFormatVersion: '1',
			exportedAt: new Date().toISOString(),
			sourceN8nVersion: N8N_VERSION,
			sourceId: this.instanceSettings.instanceId,
		});
	}

	async readManifest(packageDir: string): Promise<PackageManifest> {
		const manifest = await this.readManifestIfPresent(packageDir);
		if (!manifest) throw new BadRequestError('The export has no manifest.json');
		return manifest;
	}

	/**
	 * What the branch holds, read from the directories on disk. A manifest that
	 * drifted from the tree cannot steer the push.
	 *
	 * Only the entries are read: the push places and removes directories, and
	 * what a workflow needs is derived once, from the tree the push leaves
	 * behind. The one thing still taken from the manifest is the variable ids,
	 * which the package format leaves out of a variable file on purpose.
	 */
	async readBranchState(exportFolder: string): Promise<BranchState> {
		// The same reader a pull uses, so a branch this push accepts is a branch
		// an import can read: it rejects symbolic links and applies the package
		// limits.
		const entries = await this.packageContents.readEntries(
			new DirectoryPackageReader(exportFolder, this.packageImportConfig),
		);
		const manifest = await this.readManifestIfPresent(exportFolder);

		const idByTarget = new Map((manifest?.variables ?? []).map((v) => [v.target, v.id]));
		return {
			...entries,
			variables: entries.variables.map((v) => ({ ...v, id: idByTarget.get(v.target) ?? v.id })),
		};
	}

	private async readManifestIfPresent(packageDir: string): Promise<PackageManifest | undefined> {
		const file = await this.resolveContained(packageDir, MANIFEST_FILE);
		const raw = await readFile(file, 'utf-8').catch((error: NodeJS.ErrnoException) => {
			if (error.code === 'ENOENT') return undefined;
			throw error;
		});
		return raw === undefined ? undefined : packageManifestSchema.parse(jsonParse(raw));
	}

	/**
	 * Every deleted workflow must be on the branch and belong to the selected
	 * project. Membership is judged by the project's directory on the branch,
	 * the only place that records it.
	 */
	assertDeletionsOnBranch(branch: BranchState, selection: SelectivePushOptions): void {
		if (selection.deletedWorkflowIds.length === 0) return;

		const targetById = new Map((branch.workflows ?? []).map((w) => [w.id, w.target]));
		const unknown = selection.deletedWorkflowIds.filter((id) => !targetById.has(id));
		if (unknown.length > 0) {
			throw new BadRequestError(`Deleted workflows not found on the branch: ${unknown.join(', ')}`);
		}

		const projectTarget = branch.projects?.find((p) => p.id === selection.projectId)?.target;
		const foreign = selection.deletedWorkflowIds.filter(
			(id) => !projectTarget || !targetById.get(id)?.startsWith(`${projectTarget}/`),
		);
		if (foreign.length > 0) {
			throw new BadRequestError(
				`Deleted workflows do not belong to the selected project: ${foreign.join(', ')}`,
			);
		}
	}

	/**
	 * Apply the staging export to `exportFolder`: remove the directories the
	 * selection takes over or drops, then overlay the staging files at the
	 * place the branch keeps for them. `staging` is the manifest the exporter
	 * just wrote into `stagingFolder`.
	 *
	 * The result is then read back from the tree. A dependency that no
	 * workflow uses any more leaves with its last user, and `manifest.json` is
	 * written from what the directories now hold, so that file states the tree
	 * instead of predicting it. The cost is one more walk; the alternative was
	 * a second, hand-written model of the same merge.
	 */
	async applySelection(
		exportFolder: string,
		stagingFolder: string,
		staging: PackageManifest,
		existing: BranchState,
		deletedWorkflowIds: Set<string>,
	): Promise<PackageManifest> {
		const placement = containerPlacement(existing, staging);
		// Before anything is written: a copy over a colliding directory cannot be
		// found afterwards, because the tree then holds only the winner.
		assertNoCollisions(existing, staging, placement, deletedWorkflowIds);

		for (const target of staleTargets(existing, staging, placement, deletedWorkflowIds)) {
			await rm(await this.resolveContained(exportFolder, target), {
				recursive: true,
				force: true,
			});
		}
		await this.overlayDirectory(stagingFolder, exportFolder, placement);

		const contents = await this.packageContents.read(
			new DirectoryPackageReader(exportFolder, this.packageImportConfig),
		);
		const orphaned = orphanedDependencies(contents);
		for (const entry of orphaned) {
			await rm(await this.resolveContained(exportFolder, entry.target), {
				recursive: true,
				force: true,
			});
		}

		const manifest = this.stateManifest(
			contents,
			orphaned,
			staging,
			variableIds(existing, staging, placement),
		);
		await writeFile(
			await this.resolveContained(exportFolder, MANIFEST_FILE),
			JSON.stringify(manifest, null, '\t'),
		);

		return manifest;
	}

	/**
	 * The manifest for the tree the push has produced: its entries and its
	 * requirements, minus the dependencies just removed, with the metadata of
	 * the export that caused it.
	 */
	private stateManifest(
		contents: PackageContents,
		orphaned: ManifestEntry[],
		staging: PackageManifest,
		ids: Map<string, string>,
	): PackageManifest {
		const removed = new Set(orphaned.map((entry) => entry.target));
		const keep = (entries: ManifestEntry[]) => {
			const kept = entries.filter((entry) => !removed.has(entry.target));
			return kept.length > 0 ? kept : undefined;
		};

		return packageManifestSchema.parse({
			packageFormatVersion: staging.packageFormatVersion,
			exportedAt: staging.exportedAt,
			sourceN8nVersion: staging.sourceN8nVersion,
			sourceId: staging.sourceId,
			projects: keep(contents.projects),
			folders: keep(contents.folders),
			workflows: keep(contents.workflows),
			credentials: keep(contents.credentials),
			dataTables: keep(contents.dataTables),
			variables: keep(contents.variables.map((v) => ({ ...v, id: ids.get(v.target) ?? v.id }))),
			tags: keep(contents.tags),
			...(contents.requirements ? { requirements: contents.requirements } : {}),
		});
	}

	/** Entities the push added to or removed from the branch, not the export size. */
	deltaCounts(
		before: BranchState,
		after: PackageManifest,
		selection: SelectivePushOptions,
	): GitConnectionPushResultDto['counts'] {
		const delta = (
			prev: Array<{ id: string }> | undefined,
			next: Array<{ id: string }> | undefined,
		) => {
			const prevIds = new Set((prev ?? []).map((e) => e.id));
			const nextIds = new Set((next ?? []).map((e) => e.id));
			const added = (next ?? []).filter((e) => !prevIds.has(e.id)).length;
			const removed = (prev ?? []).filter((e) => !nextIds.has(e.id)).length;
			return added + removed;
		};
		return {
			workflows: selection.workflowIds.length + selection.deletedWorkflowIds.length,
			folders: delta(before.folders, after.folders),
			credentials: delta(before.credentials, after.credentials),
			dataTables: delta(before.dataTables, after.dataTables),
			variables: delta(before.variables, after.variables),
			tags: delta(before.tags, after.tags),
		};
	}

	/**
	 * Copy the staging export into `dest`, each file at the path `placement`
	 * gives it. `manifest.json` is merged separately, and a file the branch
	 * keeps — the own file of a project or folder it already holds — is not
	 * written, so a rename on the instance leaves the branch directory alone.
	 */
	private async overlayDirectory(src: string, dest: string, placement: Placement): Promise<void> {
		const verified = new Set<string>();
		const walk = async (dir: string): Promise<void> => {
			const entries = await readdir(dir, { withFileTypes: true });
			for (const entry of entries) {
				if (entry.isSymbolicLink()) continue;

				const fullPath = path.join(dir, entry.name);
				const relative = path.relative(src, fullPath).split(path.sep).join('/');
				if (relative === MANIFEST_FILE || placement.keptFiles.has(relative)) continue;

				const destPath = await this.resolveContained(
					dest,
					pinPath(relative, placement.pins),
					verified,
				);
				if (entry.isDirectory()) {
					await mkdir(destPath, { recursive: true });
					await walk(fullPath);
				} else if (entry.isFile()) {
					await mkdir(path.dirname(destPath), { recursive: true });
					await copyFile(fullPath, destPath);
				}
			}
		};
		await walk(src);
	}

	/**
	 * Resolve `relativePath` under `base`. Rejects a path that escapes `base`
	 * lexically, and a path whose existing components (including `base`) hold a
	 * symbolic link. The branch is remote content, so a committed symlink must
	 * not redirect `rm`, `mkdir`, `copyFile` or `writeFile` outside the working
	 * copy. `verified` caches components already checked in this operation.
	 */
	private async resolveContained(
		base: string,
		relativePath: string,
		verified = new Set<string>(),
	): Promise<string> {
		const resolvedBase = path.resolve(base);
		const resolved = path.resolve(base, relativePath);
		if (resolved !== resolvedBase && !resolved.startsWith(resolvedBase + path.sep)) {
			throw new BadRequestError('Manifest target resolves outside the export directory');
		}

		const components = path
			.relative(resolvedBase, resolved)
			.split(path.sep)
			.filter(Boolean)
			.reduce((acc, segment) => [...acc, path.join(acc.at(-1)!, segment)], [resolvedBase]);

		for (const component of components) {
			if (verified.has(component)) continue;
			const info = await lstat(component).catch(() => null);
			if (!info) break;
			if (info.isSymbolicLink()) {
				throw new BadRequestError(
					`"${path.relative(resolvedBase, component) || '.'}" on the branch is a symbolic link. Remove it and retry.`,
				);
			}
			if (info.isDirectory()) verified.add(component);
		}

		return resolved;
	}
}
