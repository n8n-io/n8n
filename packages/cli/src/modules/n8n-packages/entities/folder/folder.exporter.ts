import type { Folder, User } from '@n8n/db';
import { Service } from '@n8n/di';

import { FolderFinderService } from '@/services/folder-finder.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { FolderSerializer } from './folder.serializer';
import type { PackageWriter } from '../../io/package-writer';
import { createManifestEntry, packageDirectory } from '../../io/manifest-entry';
import type { ManifestEntry } from '../../spec/manifest.schema';
import type { WorkflowVersionPolicy } from '../../n8n-packages.types';
import { assertEveryRequestedEntityAccessible } from '../package-export.errors';
import { mergeRequirements } from '../requirements.types';
import type { WorkflowExportRequirements } from '../requirements.types';
import { WorkflowExporter } from '../workflow/workflow.exporter';
import type { WorkflowExportResult } from '../workflow/workflow.exporter';

export interface FolderExportRequest {
	user: User;
	folderIds: string[];
	writer: PackageWriter;
	includeTags: boolean;
	workflowVersionPolicy: WorkflowVersionPolicy;
	/**
	 * Directory the folder tree is written under. Empty for a top-level folder
	 * export (`folders/...`); a project exporter passes `projects/<slug>-<id>` so
	 * the same walk nests under `projects/<slug>-<id>/folders/...`.
	 */
	basePrefix?: string;
}

export interface FolderExportResult {
	/** Folder shells → `manifest.folders[]`. */
	entries: ManifestEntry[];
	/** Workflows contained in the exported folders → `manifest.workflows[]`. */
	workflowEntries: ManifestEntry[];
	/** What the contained workflows need, gathered at the package top level (credentials today). */
	requirements: WorkflowExportRequirements;
}

interface FolderWriteContext {
	childrenByParent: Map<string, Folder[]>;
	workflowIdsByFolder: Map<string, string[]>;
	request: FolderExportRequest;
}

@Service()
export class FolderExporter {
	constructor(
		private readonly folderFinder: FolderFinderService,
		private readonly folderSerializer: FolderSerializer,
		private readonly workflowFinder: WorkflowFinderService,
		private readonly workflowExporter: WorkflowExporter,
	) {}

	async export(request: FolderExportRequest): Promise<FolderExportResult> {
		const folders = await this.folderFinder.findFolderSubtreesForUser(
			request.folderIds,
			request.user,
			['folder:read'],
		);

		await assertEveryRequestedEntityAccessible(
			'folder',
			request.folderIds,
			folders,
			async (ids) => await this.folderFinder.findExistingFolderIds(ids),
		);

		const { roots, childrenByParent } = this.buildForest(folders);

		const workflowIdsByFolder = await this.workflowFinder.findWorkflowIdsByFolder(
			folders.map((folder) => folder.id),
		);

		const foldersDir = packageDirectory('folders', request.basePrefix);
		return await this.exportLevel(roots, foldersDir, null, {
			childrenByParent,
			workflowIdsByFolder,
			request,
		});
	}

	/**
	 * Groups the exported folders into a forest. A folder whose parent is also in
	 * the exported set nests under it; any other folder roots the forest and is
	 * re-rooted (its serialized `parentFolderId` becomes null), so every parent
	 * reference in the package resolves in-package.
	 */
	private buildForest(folders: Folder[]): {
		roots: Folder[];
		childrenByParent: Map<string, Folder[]>;
	} {
		const idsInSet = new Set(folders.map((folder) => folder.id));
		const roots: Folder[] = [];
		const childrenByParent = new Map<string, Folder[]>();

		for (const folder of folders) {
			const parentId = folder.parentFolderId;
			if (parentId && idsInSet.has(parentId)) {
				const siblings = childrenByParent.get(parentId) ?? [];
				siblings.push(folder);
				childrenByParent.set(parentId, siblings);
			} else {
				roots.push(folder);
			}
		}

		return { roots, childrenByParent };
	}

	private async exportLevel(
		siblings: Folder[],
		parentDir: string,
		effectiveParentId: string | null,
		context: FolderWriteContext,
	): Promise<FolderExportResult> {
		const results: FolderExportResult[] = [];
		for (const folder of this.orderedByCreation(siblings)) {
			const entry = createManifestEntry('folders', parentDir, folder);
			results.push(await this.exportFolder(folder, entry, effectiveParentId, context));
		}

		return this.mergeFolderExportResults(results);
	}

	private async exportFolder(
		folder: Folder,
		entry: ManifestEntry,
		effectiveParentId: string | null,
		context: FolderWriteContext,
	): Promise<FolderExportResult> {
		const { childrenByParent, workflowIdsByFolder, request } = context;
		const { target } = entry;

		await this.exportFolderShell(folder, target, effectiveParentId, request.writer);

		const workflowIds = workflowIdsByFolder.get(folder.id) ?? [];
		const contained = await this.exportContainedWorkflows(workflowIds, target, request);

		const descendants = await this.exportLevel(
			childrenByParent.get(folder.id) ?? [],
			target,
			folder.id,
			context,
		);

		const own: FolderExportResult = {
			entries: [entry],
			workflowEntries: contained.entries,
			requirements: contained.requirements,
		};

		return this.mergeFolderExportResults([own, descendants]);
	}

	private async exportFolderShell(
		folder: Folder,
		target: string,
		effectiveParentId: string | null,
		writer: PackageWriter,
	): Promise<void> {
		const serialized = this.folderSerializer.serialize(folder, effectiveParentId);
		await writer.writeDirectory(target);
		await writer.writeFile(`${target}/folder.json`, JSON.stringify(serialized, null, '\t'));
	}

	private async exportContainedWorkflows(
		workflowIds: string[],
		basePrefix: string,
		request: FolderExportRequest,
	): Promise<WorkflowExportResult> {
		if (workflowIds.length === 0) {
			return { entries: [], requirements: mergeRequirements() };
		}

		return await this.workflowExporter.export({
			user: request.user,
			writer: request.writer,
			workflowIds,
			includeTags: request.includeTags,
			workflowVersionPolicy: request.workflowVersionPolicy,
			basePrefix,
		});
	}

	private mergeFolderExportResults(results: FolderExportResult[]): FolderExportResult {
		return {
			entries: results.flatMap((result) => result.entries),
			workflowEntries: results.flatMap((result) => result.workflowEntries),
			requirements: mergeRequirements(...results.map((result) => result.requirements)),
		};
	}

	/**
	 * Sorts siblings oldest-first (tie-broken by id) so the manifest lists a
	 * parent's folders in the same order on every export.
	 */
	private orderedByCreation(folders: Folder[]): Folder[] {
		return [...folders].sort((a, b) => {
			const byCreatedAt = a.createdAt.getTime() - b.createdAt.getTime();
			return byCreatedAt !== 0 ? byCreatedAt : a.id.localeCompare(b.id);
		});
	}
}
