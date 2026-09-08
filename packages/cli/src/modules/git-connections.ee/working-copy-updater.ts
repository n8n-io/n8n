import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import { N8N_VERSION } from '@/constants';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { MANIFEST_FILE } from '@/modules/n8n-packages/spec/constants';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';
import { packageManifestSchema } from '@/modules/n8n-packages/spec/manifest.schema';

import { containerPlacement, mergeManifests, pinPath, staleTargets } from './manifest-merge';
import type { BranchState, Placement } from './manifest-merge';

const isUnder = (target: string, prefix: string) => target.startsWith(`${prefix}/`);

const selectivePushOptionsSchema = z.object({
	projectId: z.string().min(1),
	workflowIds: z.array(z.string().min(1)),
	deletedWorkflowIds: z.array(z.string().min(1)),
});

export type SelectivePushOptions = z.infer<typeof selectivePushOptionsSchema>;

/**
 * Applies a selective export to the exported working copy of a branch. It only
 * knows directories — the caller resolves the connection, runs the exporter and
 * commits — so the reconciliation is independent of how connections are modelled.
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
		const manifest = await this.readManifestIfPresent(packageDir);
		if (!manifest) throw new BadRequestError('The export has no manifest.json');
		return manifest;
	}

	/**
	 * What the branch holds, from the `manifest.json` it carries. Everything
	 * downstream consumes `BranchState`, so when the manifest leaves the branch
	 * only this method has to derive the same shape from the files.
	 */
	async readBranchState(exportFolder: string): Promise<BranchState> {
		const {
			packageFormatVersion: _version,
			exportedAt: _exportedAt,
			sourceN8nVersion: _sourceVersion,
			sourceId: _sourceId,
			...state
		} = await this.readManifest(exportFolder);
		return state;
	}

	private async readManifestIfPresent(packageDir: string): Promise<PackageManifest | undefined> {
		const file = await this.resolveContained(packageDir, MANIFEST_FILE);
		const raw = await fs.readFile(file, 'utf-8').catch((error: NodeJS.ErrnoException) => {
			if (error.code === 'ENOENT') return undefined;
			throw error;
		});
		if (raw === undefined) return undefined;
		try {
			return packageManifestSchema.parse(jsonParse(raw));
		} catch (error) {
			if (error instanceof BadRequestError) throw error;
			throw new BadRequestError('Package manifest failed validation');
		}
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
	 * A selected workflow the branch holds under another project moved between
	 * projects. Applying it would write outside the selected project and orphan
	 * the dependencies it left, so a selective push refuses it.
	 */
	assertNoCrossProjectMoves(branch: BranchState, selection: SelectivePushOptions): void {
		if (selection.workflowIds.length === 0) return;

		const projectTarget = branch.projects?.find((p) => p.id === selection.projectId)?.target;
		const selected = new Set(selection.workflowIds);
		const moved = (branch.workflows ?? []).filter(
			(w) => selected.has(w.id) && (!projectTarget || !w.target.startsWith(`${projectTarget}/`)),
		);
		if (moved.length > 0) {
			throw new BadRequestError(
				`These workflows moved to another project: ${moved.map((w) => w.id).join(', ')}. A selective push cannot move them. Push all projects instead.`,
			);
		}
	}

	/**
	 * Merge the staging export into `exportFolder`. The merge runs first and can
	 * reject the push. File work runs on a copy, then the copy replaces the
	 * export, so a failed write leaves the working copy untouched.
	 */
	async applySelection(
		exportFolder: string,
		stagingFolder: string,
		staging: PackageManifest,
		existing: BranchState,
		selection: SelectivePushOptions,
	): Promise<PackageManifest> {
		const merged = mergeManifests(
			existing,
			staging,
			new Set(selection.deletedWorkflowIds),
			selection.projectId,
		);
		const placement = containerPlacement(existing, staging);
		const parent = path.dirname(exportFolder);
		const workFolder = await fs.mkdtemp(path.join(parent, `.${path.basename(exportFolder)}-`));
		let backupFolder: string | undefined;

		try {
			await fs.rm(workFolder, { recursive: true, force: true });
			await fs.cp(exportFolder, workFolder, { recursive: true, verbatimSymlinks: true });

			for (const target of staleTargets(existing, merged, staging)) {
				await fs.rm(await this.assertRemovableLeafTarget(workFolder, target, merged, staging), {
					recursive: true,
					force: true,
				});
			}
			await this.overlayDirectory(stagingFolder, workFolder, placement);
			await fs.writeFile(
				await this.resolveContained(workFolder, MANIFEST_FILE),
				JSON.stringify(merged, null, '\t'),
			);

			const backupPath = `${exportFolder}.bak`;
			await fs.rm(backupPath, { recursive: true, force: true });
			await fs.rename(exportFolder, backupPath);
			backupFolder = backupPath;
			await fs.rename(workFolder, exportFolder);
			await fs.rm(backupFolder, { recursive: true, force: true });
			backupFolder = undefined;
		} catch (error) {
			if (backupFolder !== undefined) {
				await fs.rm(exportFolder, { recursive: true, force: true }).catch(() => undefined);
				await fs.rename(backupFolder, exportFolder).catch(() => undefined);
			}
			throw error;
		} finally {
			await fs.rm(workFolder, { recursive: true, force: true });
		}

		return merged;
	}

	/**
	 * A stale target must be a leaf directory inside the export. The branch is
	 * remote content, so a target of `.` or a container ancestor must not wipe
	 * the working copy or unselected workflows.
	 */
	private async assertRemovableLeafTarget(
		exportFolder: string,
		target: string,
		remaining: PackageManifest,
		staging: PackageManifest,
	): Promise<string> {
		const segments = target.split(/[\\/]/).filter(Boolean);
		if (segments.length === 0 || segments.includes('.') || segments.includes('..')) {
			throw new BadRequestError(
				`Manifest target "${target}" is not a managed leaf directory. Remove it and retry.`,
			);
		}

		const resolved = await this.resolveContained(exportFolder, target);
		if (resolved === path.resolve(exportFolder)) {
			throw new BadRequestError(
				`Manifest target "${target}" is not a managed leaf directory. Remove it and retry.`,
			);
		}

		const leafKinds = ['workflows', 'credentials', 'dataTables', 'variables', 'tags'] as const;
		for (const kind of leafKinds) {
			const writtenIds = new Set((staging[kind] ?? []).map((entry) => entry.id));
			for (const entry of remaining[kind] ?? []) {
				if (isUnder(entry.target, target)) {
					throw new BadRequestError(
						`Removing "${target}" would delete content the selection keeps. Remove it and retry.`,
					);
				}
				if (entry.target === target && !writtenIds.has(entry.id)) {
					throw new BadRequestError(
						`Removing "${target}" would delete content the selection keeps. Remove it and retry.`,
					);
				}
			}
		}

		const containers = [...(remaining.projects ?? []), ...(remaining.folders ?? [])].map(
			(entry) => entry.target,
		);
		if (containers.includes(target)) {
			throw new BadRequestError(
				`Removing "${target}" would delete content the selection keeps. Remove it and retry.`,
			);
		}

		return resolved;
	}

	/**
	 * Copy the staging export into `dest`, each file where `placement` puts it.
	 * A file the branch keeps is skipped, so a rename on the instance leaves the
	 * `project.json` or `folder.json` the branch holds alone.
	 */
	private async overlayDirectory(src: string, dest: string, placement: Placement): Promise<void> {
		const verified = new Set<string>();
		const walk = async (dir: string): Promise<void> => {
			const entries = await fs.readdir(dir, { withFileTypes: true });
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
					await fs.mkdir(destPath, { recursive: true });
					await walk(fullPath);
				} else if (entry.isFile()) {
					await fs.mkdir(path.dirname(destPath), { recursive: true });
					await fs.copyFile(fullPath, destPath);
				}
			}
		};
		await walk(src);
	}

	/**
	 * Resolve `relativePath` under `base`, rejecting one that escapes it or that
	 * passes through a symbolic link: the branch is remote content, so a
	 * committed link must not redirect a write.
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
			const info = await fs.lstat(component).catch(() => null);
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
