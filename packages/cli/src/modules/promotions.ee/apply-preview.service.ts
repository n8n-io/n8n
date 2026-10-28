import type {
	PromotionPreviewCheck,
	PromotionResource,
	PromotionResourceDependency,
} from '@n8n/api-types';
import { ProjectRepository, SharedWorkflowRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';

import { BadRequestError } from '@n8n/errors';

import type { PackageImportPlan } from '@/modules/n8n-packages/engine/project-package-importer';
import { VariableRequirementsExtractor } from '@/modules/n8n-packages/entities/variable/variable-requirements.extractor';
import {
	PackageDirectoryInventoryReader,
	type PackageDirectoryInventory,
} from '@/modules/n8n-packages/io/directory/package-directory-inventory-reader';
import { gitBlobSha } from '@/modules/n8n-packages/io/hashing-package-writer';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import { FolderService } from '@/services/folder.service';
import {
	CredentialConflictPolicy,
	CredentialPersonalRoute,
	DataTableSchemaConflictPolicy,
	LayoutConflictPolicy,
	OverwriteDeletionPolicy,
	TagConflictPolicy,
	type ImportSelection,
	type ImportSelectionRequest,
} from '@/modules/n8n-packages/n8n-packages.types';

import { plannedChanges, previewRevision, toPreviewCheck } from './apply-preview';
import { PACKAGE_SUBFOLDER } from './constants';
import { crossProjectMoves, foldersInScope, type CrossProjectMoves } from './cross-project-moves';
import { GitCommitPackageReader } from './git-commit-package-reader';
import { LocalPackageEntities } from './local-package-entities.service';
import type { InstancePackage } from './instance-package';
import { collectCredentialReferences, collectVariableReferences } from './package-references';
import { buildPreview } from './promotion-preview';

export type ApplyPreview = {
	resources: PromotionResource[];
	dependencies: PromotionResourceDependency[];
	check: PromotionPreviewCheck;
	revision: string;
};

/**
 * The request of a selective Apply. The package is the source of truth, and a destructive data
 * table change waits for a confirmation.
 */
export function applySelectionRequest(
	user: User,
	confirmDestructiveChanges = false,
): ImportSelectionRequest {
	return {
		user,
		// Hard delete, so that the next preview has nothing left to show.
		overwriteDeletionPolicy: OverwriteDeletionPolicy.HardDelete,
		dataTableSchemaConflictPolicy: confirmDestructiveChanges
			? DataTableSchemaConflictPolicy.Overwrite
			: DataTableSchemaConflictPolicy.OverwriteNonDestructive,
		tagConflictPolicy: TagConflictPolicy.Rename,
		credentialConflictPolicy: CredentialConflictPolicy.Overwrite,
		// Apply moves and renames workflows and folders within their project to match the branch.
		layoutConflictPolicy: LayoutConflictPolicy.FollowPackage,
		// A credential must be usable by the project, not only by the user who applies.
		credentialPersonalRoute: CredentialPersonalRoute.Exclude,
	};
}

/**
 * Builds the Apply preview of a project from the import plan, so that the preview shows what
 * Apply does and what stops it. Writes nothing.
 */
@Service()
export class ApplyPreviewService {
	constructor(
		private readonly packagesService: N8nPackagesService,
		private readonly inventoryReader: PackageDirectoryInventoryReader,
		private readonly variableExtractor: VariableRequirementsExtractor,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly folderService: FolderService,
		private readonly localEntities: LocalPackageEntities,
	) {}

	/**
	 * Plans the Apply of every workflow of the project that the branch or this instance holds.
	 * `files` are the package files at the branch commit, keyed by their path in the package.
	 */
	async build({
		user,
		projectId,
		files,
		instance,
	}: {
		user: User;
		projectId: string;
		files: ReadonlyMap<string, Buffer>;
		instance: InstancePackage;
	}): Promise<ApplyPreview> {
		if (files.size === 0) {
			throw new BadRequestError(
				'The remote branch has no exported package to import. Promote to it first.',
			);
		}
		const reader = new GitCommitPackageReader(files);
		const inventory = await this.inventoryReader.read(reader);
		const moves = await this.findCrossProjectMoves(inventory, projectId);
		const selection = classifyProjectWorkflows(
			inventory,
			projectId,
			await this.sharedWorkflowRepository.findOwnedWorkflowIdsByProjects([projectId]),
			new Set(moves.workflows.map(({ id }) => id)),
		);
		// The import needs the project on the branch. Without it, the preview still shows what the
		// branch lacks, and the check stops Apply.
		const onBranch = inventory.projects.some(({ id }) => id === projectId);
		const plan = onBranch
			? await this.packagesService.planPackageSelection(
					applySelectionRequest(user),
					reader,
					selection,
					'check',
				)
			: null;

		const check = plan
			? this.check(plan, inventory, selection, moves)
			: projectNotOnBranch(projectId, instance);
		const { resources, dependencies } = buildPreview({
			operation: { direction: 'apply', planned: plan && plannedChanges(plan) },
			projectIds: [projectId],
			base: {
				manifest: instance.manifest,
				blobByPath: new Map(instance.files.map(({ path, blobSha }) => [path, blobSha])),
			},
			desired: {
				manifest: plan?.manifest ?? (await reader.readManifest()),
				blobByPath: new Map(
					[...files].map(([path, content]) => [
						`${PACKAGE_SUBFOLDER}/${path}`,
						gitBlobSha(content),
					]),
				),
			},
		});
		await this.addLocalState(resources);

		return { resources, dependencies, check, revision: previewRevision(resources, check) };
	}

	/**
	 * A tag, data table or credential that no local workflow uses is not in the local export, but
	 * Apply reuses it. Its revision is read here as the detail endpoint reads it, so the two compare,
	 * and a bound credential shows its local name.
	 */
	private async addLocalState(resources: PromotionResource[]): Promise<void> {
		const unexported = (type: PromotionResource['type']) =>
			resources.filter((resource) => resource.type === type && resource.revision.before === null);
		const [tags, tables, credentialNames] = await Promise.all([
			this.localEntities.tags(unexported('tag')),
			this.localEntities.dataTables(unexported('dataTable').map(({ id }) => id)),
			this.localEntities.credentialNames(
				unexported('credential')
					.filter(({ change }) => change === 'unchanged')
					.map(({ id }) => id),
			),
		]);
		for (const resource of resources) {
			if (resource.revision.before !== null) continue;
			if (resource.type === 'credential') {
				resource.name = credentialNames.get(resource.id) ?? resource.name;
				continue;
			}
			const local =
				resource.type === 'tag'
					? tags.get(resource.id)
					: resource.type === 'dataTable'
						? tables.get(resource.id)
						: undefined;
			if (local) resource.revision = { ...resource.revision, before: local.blobSha };
		}
	}

	/**
	 * What stops the Apply of a plan. Without a selection, it checks the whole package. It reads
	 * credential and variable references only from the workflows that the plan imports.
	 */
	check(
		plan: PackageImportPlan,
		inventory: PackageDirectoryInventory,
		selection: ImportSelection | undefined,
		moves: CrossProjectMoves,
	): PromotionPreviewCheck {
		const selected = selection && new Set(selection.selectedWorkflowIds);
		const scoped = {
			...inventory,
			workflows: inventory.workflows.filter(
				({ id, projectId }) =>
					!selection || (projectId === selection.selectedProjectId && selected?.has(id)),
			),
		};
		return toPreviewCheck({
			plan,
			inventory,
			credentials: collectCredentialReferences(scoped),
			variables: collectVariableReferences(scoped, this.variableExtractor),
			moves,
		});
	}

	/**
	 * Workflows and folders that the package holds under one project and this instance holds under
	 * another. With `projectId`, only the moves that touch that project count.
	 */
	async findCrossProjectMoves(
		inventory: PackageDirectoryInventory,
		projectId?: string,
	): Promise<CrossProjectMoves> {
		const [owners, folders, existingProjects] = await Promise.all([
			this.sharedWorkflowRepository.findOwnerProjectsByWorkflowIds(
				inventory.workflows.map(({ id }) => id),
			),
			this.folderService.getFoldersByIds(
				foldersInScope(inventory.folders, projectId).map(({ folder }) => folder.id),
			),
			// Instance-wide Apply creates missing projects, but only after this check refuses a move.
			this.projectRepository.findTypesByIds(inventory.projects.map(({ id }) => id)),
		]);
		return crossProjectMoves({
			inventory,
			owners,
			folderHomes: new Map(folders.map(({ id, homeProject }) => [id, homeProject])),
			existingProjectIds: new Set(existingProjects.map(({ id }) => id)),
			projectId,
		});
	}
}

/**
 * Every workflow of the project that the branch holds is applied. A workflow that this instance
 * owns and the branch lacks is deleted, unless it moved to another project: that is reported.
 */
function classifyProjectWorkflows(
	inventory: PackageDirectoryInventory,
	projectId: string,
	ownedWorkflowIds: string[],
	movedWorkflowIds: ReadonlySet<string>,
): ImportSelection {
	const selectedWorkflowIds = inventory.workflows
		.filter((workflow) => workflow.projectId === projectId)
		.map(({ id }) => id);
	const selected = new Set(selectedWorkflowIds);
	return {
		selectedProjectId: projectId,
		selectedWorkflowIds,
		deletedWorkflowIds: ownedWorkflowIds.filter(
			(id) => !selected.has(id) && !movedWorkflowIds.has(id),
		),
	};
}

function projectNotOnBranch(projectId: string, instance: InstancePackage): PromotionPreviewCheck {
	const name = instance.manifest.projects?.find(({ id }) => id === projectId)?.name ?? projectId;
	return {
		missingProjects: [],
		missingBindings: [],
		accessRequirements: [],
		conflicts: [
			{
				kind: 'project',
				code: 'project-not-on-branch',
				project: { id: projectId, name },
			},
		],
		warnings: [],
		movedWorkflows: [],
		movedFolders: [],
	};
}
