import type { GitConnectionPushResultDto } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import {
	copyFile,
	lstat,
	mkdir,
	mkdtemp,
	readdir,
	readFile,
	rm,
	stat,
	writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import { N8N_VERSION } from '@/constants';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';
import { packageManifestSchema } from '@/modules/n8n-packages/spec/manifest.schema';

import { entryRelocations, mergeManifests, staleTargets } from './manifest-merge';
import type { Relocation } from './manifest-merge';

const selectivePushOptionsSchema = z.object({
	projectId: z.string().min(1),
	workflowIds: z.array(z.string().min(1)),
	deletedWorkflowIds: z.array(z.string().min(1)),
});

export type SelectivePushOptions = z.infer<typeof selectivePushOptionsSchema>;

/**
 * Applies a selective export to the exported working copy of a branch. It
 * only knows directories and manifests; the caller resolves the connection,
 * runs the exporter and commits. This keeps the reconciliation independent
 * of how connections are modelled.
 */
@Service()
export class WorkingCopyUpdater {
	constructor(private readonly instanceSettings: InstanceSettings) {}

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
		const raw = await readFile(await this.resolveContained(packageDir, 'manifest.json'), 'utf-8');
		return packageManifestSchema.parse(jsonParse(raw));
	}

	/**
	 * Every deleted workflow must be on the branch and belong to the selected
	 * project. Membership is judged by the project's directory on the branch,
	 * the only place the manifest records it.
	 */
	assertDeletionsOnBranch(manifest: PackageManifest, selection: SelectivePushOptions): void {
		if (selection.deletedWorkflowIds.length === 0) return;

		const targetById = new Map((manifest.workflows ?? []).map((w) => [w.id, w.target]));
		const unknown = selection.deletedWorkflowIds.filter((id) => !targetById.has(id));
		if (unknown.length > 0) {
			throw new BadRequestError(`Deleted workflows not found on the branch: ${unknown.join(', ')}`);
		}

		const projectTarget = manifest.projects?.find((p) => p.id === selection.projectId)?.target;
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
	 * Merge the staging export into `exportFolder` and write the merged
	 * manifest. Unselected entries under a renamed container are copied to a
	 * scratch tree first, so removing the stale directories and placing the
	 * copies cannot collide even when two containers swap names. The staging
	 * export is overlaid last. Returns the merged manifest.
	 */
	async applySelection(
		exportFolder: string,
		stagingFolder: string,
		existing: PackageManifest,
		deletedWorkflowIds: Set<string>,
	): Promise<PackageManifest> {
		const staging = await this.readManifest(stagingFolder);
		const merged = mergeManifests(existing, staging, deletedWorkflowIds);

		const relocations = entryRelocations(existing, staging, merged);
		const scratch = await mkdtemp(
			path.join(path.dirname(exportFolder), `.${path.basename(exportFolder)}-move-`),
		);

		try {
			for (const relocation of relocations) {
				await this.copyEntry(exportFolder, scratch, relocation);
			}
			for (const target of staleTargets(existing, merged, staging)) {
				await rm(await this.resolveContained(exportFolder, target), {
					recursive: true,
					force: true,
				});
			}
			await this.overlayDirectory(scratch, exportFolder);
			await this.overlayDirectory(stagingFolder, exportFolder);
		} finally {
			await rm(scratch, { recursive: true, force: true });
		}

		await writeFile(
			await this.resolveContained(exportFolder, 'manifest.json'),
			JSON.stringify(merged, null, '\t'),
		);

		return merged;
	}

	/** Entities the push added to or removed from the branch, not the export size. */
	deltaCounts(
		before: PackageManifest,
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
	 * Copy one relocated entry into the scratch tree at its new path. A
	 * container brings only its own files; the entries beneath it are
	 * relocated on their own, so a deleted workflow inside it is not carried.
	 */
	private async copyEntry(from: string, to: string, { kind, ...move }: Relocation): Promise<void> {
		const src = await this.resolveContained(from, move.from);
		const dest = await this.resolveContained(to, move.to);

		const srcStat = await stat(src).catch(() => null);
		if (!srcStat?.isDirectory()) {
			throw new BadRequestError(
				`The branch manifest lists "${move.from}" but the directory is missing. Push the whole project to repair the branch.`,
			);
		}

		if (kind === 'leaf') {
			await this.overlayDirectory(src, dest);
			return;
		}

		await mkdir(dest, { recursive: true });
		for (const entry of await readdir(src, { withFileTypes: true })) {
			if (entry.isFile()) await copyFile(path.join(src, entry.name), path.join(dest, entry.name));
		}
	}

	/** Copy `src` into `dest`, except `manifest.json`, which is merged separately. */
	private async overlayDirectory(src: string, dest: string): Promise<void> {
		const verified = new Set<string>();
		const walk = async (dir: string): Promise<void> => {
			const entries = await readdir(dir, { withFileTypes: true });
			for (const entry of entries) {
				if (entry.isSymbolicLink()) continue;

				const fullPath = path.join(dir, entry.name);
				const relative = path.relative(src, fullPath).split(path.sep).join('/');
				if (relative === 'manifest.json') continue;

				const destPath = await this.resolveContained(dest, relative, verified);
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
