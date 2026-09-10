import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { MANIFEST_FILE } from '@/modules/n8n-packages/spec/constants';
import type { ManifestEntry, PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

import { containerPlacement, isUnder, pinPath, staleWorkflowTargets } from './branch-placement';
import type { BranchLayout, Placement } from './branch-placement';
import { writeImportManifest } from './import-manifest-bridge';

const selectivePushOptionsSchema = z.object({
	projectId: z.string().min(1),
	workflowIds: z.array(z.string().min(1)),
	deletedWorkflowIds: z.array(z.string().min(1)),
});

export type SelectivePushOptions = z.infer<typeof selectivePushOptionsSchema>;

const ENTITY_FILES = {
	'project.json': 'projects',
	'folder.json': 'folders',
	'workflow.json': 'workflows',
} as const satisfies Record<string, keyof BranchLayout>;

/** Dependency collections whose directory a rename relocates (name-derived slug). */
const DEPENDENCY_COLLECTIONS = ['credentials', 'dataTables', 'tags'] as const;

type DependencyCollection = (typeof DEPENDENCY_COLLECTIONS)[number];

const DEPENDENCY_FILES = {
	'credential.json': 'credentials',
	'data-table.json': 'dataTables',
	'tag.json': 'tags',
} as const satisfies Record<string, DependencyCollection>;

const DEPENDENCY_FILE_BY_COLLECTION = {
	credentials: 'credential.json',
	dataTables: 'data-table.json',
	tags: 'tag.json',
} as const satisfies Record<DependencyCollection, string>;

/** A credential/dataTable/tag directory the branch holds. */
interface DependencyRef {
	collection: DependencyCollection;
	id: string;
	target: string;
}

/**
 * Applies a selective export to the exported working copy of a branch. It reads
 * the branch, runs the guards, then overlays. The caller resolves the
 * connection, runs the exporter and commits.
 *
 */
@Service()
export class WorkingCopyUpdater {
	constructor(
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('promotions');
	}

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

	/**
	 * What the branch holds, from `project.json`, `folder.json` and
	 * `workflow.json`. Placement and guards only need those collections.
	 */
	async readBranchLayout(exportFolder: string): Promise<BranchLayout> {
		return (await this.scanBranch(exportFolder)).state;
	}

	private async scanBranch(
		exportFolder: string,
	): Promise<{ state: BranchLayout; dependencies: DependencyRef[] }> {
		const resolvedBase = await this.resolveContained(exportFolder, '.');
		// A fresh branch holds no export yet, so a first push has nothing to read.
		const rootInfo = await fs.stat(resolvedBase).catch(() => null);
		if (rootInfo === null || !rootInfo.isDirectory()) return { state: {}, dependencies: [] };

		const collected: Required<BranchLayout> = { projects: [], folders: [], workflows: [] };
		const dependencies: DependencyRef[] = [];

		const walk = async (absDir: string): Promise<void> => {
			const entries = await fs.readdir(absDir, { withFileTypes: true });
			for (const entry of entries) {
				const fullPath = path.join(absDir, entry.name);
				if (entry.isSymbolicLink()) {
					throw new BadRequestError(
						`"${path.relative(resolvedBase, fullPath) || '.'}" on the branch is a symbolic link. Remove it and retry.`,
					);
				}
				if (entry.isDirectory()) {
					await walk(fullPath);
					continue;
				}
				if (!entry.isFile()) continue;

				const relativeFile = path.relative(resolvedBase, fullPath).split(path.sep).join('/');
				const target = path.posix.dirname(relativeFile);

				const kind = ENTITY_FILES[entry.name as keyof typeof ENTITY_FILES];
				if (kind !== undefined) {
					collected[kind].push(await this.readEntityFile(fullPath, target, relativeFile));
					continue;
				}

				const collection = DEPENDENCY_FILES[entry.name as keyof typeof DEPENDENCY_FILES];
				if (collection !== undefined) {
					const id = await this.readEntityId(fullPath);
					if (id !== undefined) dependencies.push({ collection, id, target });
				}
			}
		};

		await walk(resolvedBase);
		this.assertUniqueEntityIds(collected);
		const state: BranchLayout = {
			...(collected.projects.length > 0 ? { projects: collected.projects } : {}),
			...(collected.folders.length > 0 ? { folders: collected.folders } : {}),
			...(collected.workflows.length > 0 ? { workflows: collected.workflows } : {}),
		};
		return { state, dependencies };
	}

	/**
	 * Duplicate ids make the project-scope Map keep one target and the stale
	 * walk delete every copy. The package schema already rejects this.
	 */
	private assertUniqueEntityIds(state: BranchLayout): void {
		for (const [label, entries] of [
			['projects', state.projects],
			['folders', state.folders],
			['workflows', state.workflows],
		] as const) {
			const seen = new Map<string, string>();
			for (const entry of entries ?? []) {
				const previous = seen.get(entry.id);
				if (previous !== undefined) {
					throw new BadRequestError(
						`The branch holds two ${label} with id "${entry.id}" (${previous} and ${entry.target}). Remove the duplicate and retry.`,
					);
				}
				seen.set(entry.id, entry.target);
			}
		}
	}

	private async readEntityFile(
		file: string,
		target: string,
		relativeFile: string,
	): Promise<ManifestEntry> {
		let raw: string;
		try {
			raw = await fs.readFile(file, 'utf-8');
		} catch {
			throw new BadRequestError(
				`Cannot read "${relativeFile}" on the branch. Remove it and retry.`,
			);
		}
		let parsed: unknown;
		try {
			parsed = jsonParse(raw);
		} catch {
			throw new BadRequestError(
				`"${relativeFile}" on the branch is not valid JSON. Remove it and retry.`,
			);
		}
		if (
			typeof parsed !== 'object' ||
			parsed === null ||
			typeof (parsed as { id?: unknown }).id !== 'string' ||
			typeof (parsed as { name?: unknown }).name !== 'string'
		) {
			throw new BadRequestError(
				`"${relativeFile}" on the branch is missing an id or a name. Remove it and retry.`,
			);
		}
		return { id: (parsed as { id: string }).id, name: (parsed as { name: string }).name, target };
	}

	/**
	 * Every deleted workflow must be on the branch and belong to the selected
	 * project. Membership is judged by the project's directory on the branch,
	 * the only place that records it.
	 */
	assertDeletionsOnBranch(branch: BranchLayout, selection: SelectivePushOptions): void {
		if (selection.deletedWorkflowIds.length === 0) return;

		const targetById = new Map((branch.workflows ?? []).map((w) => [w.id, w.target]));
		const unknown = selection.deletedWorkflowIds.filter((id) => !targetById.has(id));
		if (unknown.length > 0) {
			throw new BadRequestError(`Deleted workflows not found on the branch: ${unknown.join(', ')}`);
		}

		const projectTarget = branch.projects?.find((p) => p.id === selection.projectId)?.target;
		const foreign = selection.deletedWorkflowIds.filter((id) => {
			const target = targetById.get(id);
			return !projectTarget || !target || !isUnder(target, projectTarget);
		});
		if (foreign.length > 0) {
			throw new BadRequestError(
				`Deleted workflows do not belong to the selected project: ${foreign.join(', ')}`,
			);
		}
	}

	/**
	 * A selected workflow the branch holds under another project moved between
	 * projects. Applying it would write outside the selected project, so a
	 * selective push refuses it.
	 */
	assertNoCrossProjectMoves(branch: BranchLayout, selection: SelectivePushOptions): void {
		if (selection.workflowIds.length === 0) return;

		const projectTarget = branch.projects?.find((p) => p.id === selection.projectId)?.target;
		const selected = new Set(selection.workflowIds);
		const moved = (branch.workflows ?? []).filter(
			(w) => selected.has(w.id) && (!projectTarget || !isUnder(w.target, projectTarget)),
		);
		if (moved.length > 0) {
			throw new BadRequestError(
				`These workflows moved to another project: ${moved.map((w) => w.id).join(', ')}. A selective push cannot move them. Push all projects instead.`,
			);
		}
	}

	/**
	 * Overlay the staging export onto `exportFolder`. Reads the branch, then
	 * runs the guards. File work runs on a copy, then the copy replaces the
	 * export, so a failed write leaves the working copy untouched. After overlay,
	 * write an import inventory of the remaining files. Delete that write with
	 * import-manifest-bridge when import walks entity files.
	 */
	async applySelection(
		exportFolder: string,
		stagingFolder: string,
		staging: PackageManifest,
		selection: SelectivePushOptions,
	): Promise<void> {
		this.validateSelection(selection);
		const { state: existing, dependencies } = await this.scanBranch(exportFolder);
		this.assertDeletionsOnBranch(existing, selection);
		this.assertNoCrossProjectMoves(existing, selection);

		const placement = containerPlacement(existing, staging);
		const otherProjectTargets = (existing.projects ?? [])
			.filter((p) => p.id !== selection.projectId)
			.map((p) => p.target);
		const remaining: BranchLayout = {
			...existing,
			workflows: (existing.workflows ?? []).filter(
				(workflow) => !selection.deletedWorkflowIds.includes(workflow.id),
			),
		};
		const parent = path.dirname(exportFolder);
		// Reject a symlinked ancestor: realpath resolves every component, so a
		// mismatch with the logical path means an intermediate directory is a
		// symbolic link. resolveContained only checks from `parent` downward.
		const resolvedParent = path.resolve(parent);
		const realParent = await fs.realpath(parent).catch(() => resolvedParent);
		if (realParent !== resolvedParent) {
			throw new BadRequestError('The export path traverses a symbolic link. Remove it and retry.');
		}
		// Reject a symlink at the export path itself before any writes.
		await this.resolveContained(parent, path.basename(exportFolder));

		let workFolder: string | undefined;
		let backupFolder: string | undefined;

		try {
			// A first push meets a branch with no export yet; create it so the temp
			// copy and the later swap have a directory to work with.
			await fs.mkdir(exportFolder, { recursive: true });
			workFolder = await fs.mkdtemp(path.join(parent, `.${path.basename(exportFolder)}-`));

			await fs.cp(exportFolder, workFolder, { recursive: true, verbatimSymlinks: true });

			for (const target of staleWorkflowTargets(
				existing,
				staging,
				new Set(selection.deletedWorkflowIds),
			)) {
				await fs.rm(await this.assertRemovableLeafTarget(workFolder, target, remaining, staging), {
					recursive: true,
					force: true,
				});
			}
			// Drop a renamed dependency's old file so it does not collide on id with
			// the new one when the import manifest is written. Remove only that file,
			// not the directory, so a sibling dependency sharing it is not dropped;
			// remove the directory once it is empty.
			const { renamedInScope, outOfScopeInStaging } = this.partitionChangedDependencies(
				dependencies,
				staging,
				otherProjectTargets,
			);
			for (const { collection, target } of renamedInScope) {
				const dir = await this.resolveDependencyDir(workFolder, target);
				await fs.rm(path.join(dir, DEPENDENCY_FILE_BY_COLLECTION[collection]), { force: true });
				if ((await fs.readdir(dir)).length === 0) await fs.rmdir(dir);
			}
			for (const target of outOfScopeInStaging) {
				placement.keptFiles.add(target);
			}
			await this.overlayDirectory(stagingFolder, workFolder, placement);
			await writeImportManifest({
				exportFolder: workFolder,
				staging,
				sourceId: this.instanceSettings.instanceId,
				selectedWorkflowIds: selection.workflowIds,
			});

			const backupPath = path.join(parent, `.${path.basename(exportFolder)}-bak-${randomUUID()}`);
			await fs.rename(exportFolder, backupPath);
			backupFolder = backupPath;
			await fs.rename(workFolder, exportFolder);
			// The swap is done. Do not restore the backup if cleanup fails.
			backupFolder = undefined;
			try {
				await fs.rm(backupPath, { recursive: true, force: true });
			} catch (cleanupError: unknown) {
				this.logger.warn('Failed to remove the export backup after a successful swap', {
					backupFolder: backupPath,
					error: cleanupError,
				});
			}
		} catch (error) {
			if (backupFolder !== undefined) {
				await fs
					.rm(exportFolder, { recursive: true, force: true })
					.catch((restoreError: unknown) => {
						this.logger.warn('Failed to remove the incomplete export after a failed swap', {
							exportFolder,
							error: restoreError,
						});
					});
				await fs.rename(backupFolder, exportFolder).catch((restoreError: unknown) => {
					this.logger.warn(
						'Failed to restore the export from backup. The copy is at the backup path.',
						{ exportFolder, backupFolder, error: restoreError },
					);
				});
			}
			if (error instanceof BadRequestError) throw error;
			this.logger.error('Failed to apply the selective push to the working copy', { error });
			throw new InternalServerError(
				'Failed to apply the selection to the branch. Check the server logs for details.',
			);
		} finally {
			if (workFolder) await fs.rm(workFolder, { recursive: true, force: true });
		}
	}

	/**
	 * A stale target must be a leaf directory inside the export. The branch is
	 * remote content, so a target of `.` or a container ancestor must not wipe
	 * the working copy or unselected workflows.
	 */
	private async assertRemovableLeafTarget(
		exportFolder: string,
		target: string,
		remaining: BranchLayout,
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

		const writtenIds = new Set((staging.workflows ?? []).map((entry) => entry.id));
		for (const entry of remaining.workflows ?? []) {
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

		// A malformed entity file can make the scanner treat a container directory
		// as a workflow target. Reject a target that is, or holds, a kept project
		// or folder, so a recursive remove never wipes a legitimate container.
		const containers = [...(remaining.projects ?? []), ...(remaining.folders ?? [])].map(
			(entry) => entry.target,
		);
		if (containers.some((container) => container === target || isUnder(container, target))) {
			throw new BadRequestError(
				`Removing "${target}" would delete content the selection keeps. Remove it and retry.`,
			);
		}

		return resolved;
	}

	/**
	 * Partition dependencies whose staging target differs from the branch target.
	 *
	 * - **renamedInScope** — the branch copy sits under the selected project or
	 *   at the top level. The target change is a real rename or a move into
	 *   scope. Delete the old file before overlay.
	 * - **outOfScopeInStaging** — the branch copy sits under a different project
	 *   (e.g. a credential owned by Beta while pushing Alpha). The exporter
	 *   placed it at a fallback path because the owning project was not exported.
	 *   The overlay must skip it so it does not duplicate the dependency.
	 */
	private partitionChangedDependencies(
		dependencies: DependencyRef[],
		staging: PackageManifest,
		otherProjectTargets: string[],
	): {
		renamedInScope: Array<{ collection: DependencyCollection; target: string }>;
		outOfScopeInStaging: string[];
	} {
		const stagingTargets = new Map<string, string>();
		for (const collection of DEPENDENCY_COLLECTIONS) {
			for (const entry of staging[collection] ?? []) {
				stagingTargets.set(`${collection}:${entry.id}`, entry.target);
			}
		}

		const renamedInScope: Array<{ collection: DependencyCollection; target: string }> = [];
		const outOfScopeInStaging: string[] = [];

		if (stagingTargets.size === 0) {
			return { renamedInScope, outOfScopeInStaging };
		}

		for (const dependency of dependencies) {
			const newTarget = stagingTargets.get(`${dependency.collection}:${dependency.id}`);
			if (newTarget === undefined || newTarget === dependency.target) continue;

			const underOtherProject = otherProjectTargets.some((pt) => isUnder(dependency.target, pt));
			if (underOtherProject) {
				outOfScopeInStaging.push(newTarget);
			} else {
				renamedInScope.push({ collection: dependency.collection, target: dependency.target });
			}
		}

		return { renamedInScope, outOfScopeInStaging };
	}

	/** Id in a dependency file, or undefined when unreadable — a malformed leftover is skipped, not fatal. */
	private async readEntityId(file: string): Promise<string | undefined> {
		let parsed: unknown;
		try {
			parsed = jsonParse(await fs.readFile(file, 'utf-8'));
		} catch {
			return undefined;
		}
		if (
			typeof parsed === 'object' &&
			parsed !== null &&
			typeof (parsed as { id?: unknown }).id === 'string'
		) {
			return (parsed as { id: string }).id;
		}
		return undefined;
	}

	/**
	 * Resolve a dependency directory to remove a file from, rejecting a non-leaf
	 * target, an escape, or a symlinked path (via `resolveContained`).
	 */
	private async resolveDependencyDir(exportFolder: string, target: string): Promise<string> {
		const segments = target.split(/[\\/]/).filter(Boolean);
		if (segments.length === 0 || segments.includes('.') || segments.includes('..')) {
			throw new BadRequestError(
				`Dependency target "${target}" is not a managed leaf directory. Remove it and retry.`,
			);
		}

		const resolved = await this.resolveContained(exportFolder, target);
		if (resolved === path.resolve(exportFolder)) {
			throw new BadRequestError(
				`Dependency target "${target}" is not a managed leaf directory. Remove it and retry.`,
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
