import type {
	PromotionBindingConflict,
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
	DataTableMissingMode,
	DataTableSchemaConflictPolicy,
	FolderConflictPolicy,
	ImportConflictPolicy,
	LayoutConflictPolicy,
	MissingNodeTypeMode,
	OverwriteDeletionPolicy,
	ProjectConflictPolicy,
	TagConflictPolicy,
	TagMissingMode,
	VariableConflictPolicy,
	VariableMissingMode,
	WorkflowIdPolicy,
	WorkflowPublishingPolicy,
	type ImportRequest,
	type ImportSelection,
	type ImportSelectionRequest,
} from '@/modules/n8n-packages/n8n-packages.types';

import { plannedChanges, previewRevision, toPreviewCheck } from './apply-preview';
import { PACKAGE_SUBFOLDER } from './constants';
import { crossProjectMoves, foldersInScope, type CrossProjectMoves } from './cross-project-moves';
import { GitCommitPackageReader } from './git-commit-package-reader';
import { LocalPackageEntities } from './local-package-entities.service';
import { exportInstancePackage, type InstancePackage } from './instance-package';
import {
	collectCredentialReferences,
	collectVariableReferences,
	compare,
} from './package-references';
import { buildPreview, resourceKey, type PreviewSide } from './promotion-preview';

export type ApplyPreview = {
	resources: PromotionResource[];
	dependencies: PromotionResourceDependency[];
	check: PromotionPreviewCheck;
	revision: string;
};

/**
 * The request of a selective Apply. The package is the source of truth, also for the project
 * details, and a destructive data table change waits for a confirmation.
 */
export function applySelectionRequest(
	user: User,
	confirmDestructiveChanges = false,
): ImportSelectionRequest {
	return {
		user,
		projectConflictPolicy: ProjectConflictPolicy.Overwrite,
		// Hard delete, so that the next preview has nothing left to show.
		overwriteDeletionPolicy: OverwriteDeletionPolicy.HardDelete,
		dataTableSchemaConflictPolicy: confirmDestructiveChanges
			? DataTableSchemaConflictPolicy.Overwrite
			: DataTableSchemaConflictPolicy.OverwriteNonDestructive,
		tagConflictPolicy: TagConflictPolicy.Rename,
		credentialConflictPolicy: CredentialConflictPolicy.Overwrite,
		// Promotion moves content only. Publish state stays with the target until autopublish exists.
		publishingPolicy: WorkflowPublishingPolicy.PreserveTargetState,
		// Apply moves and renames workflows and folders within their project to match the branch.
		layoutConflictPolicy: LayoutConflictPolicy.FollowPackage,
		// A credential must be usable by the project, not only by the user who applies.
		credentialPersonalRoute: CredentialPersonalRoute.Exclude,
	};
}

// A whole-instance Apply treats the package as source of truth. Callers cannot override this
// policy, but a confirmed Continue uses `overwrite` for data tables.
const INSTANCE_IMPORT_POLICY: Omit<ImportRequest, 'user'> = {
	projectConflictPolicy: ProjectConflictPolicy.Overwrite,
	conflictPolicy: ImportConflictPolicy.NewVersion,
	idPolicy: WorkflowIdPolicy.Source,
	// Promotion moves content only. Publish state stays with the target until autopublish exists.
	publishingPolicy: WorkflowPublishingPolicy.PreserveTargetState,
	missingNodeTypeMode: MissingNodeTypeMode.Fail,
	credentialMatchingMode: 'id-only',
	credentialMissingMode: 'must-preexist',
	credentialConflictPolicy: CredentialConflictPolicy.Overwrite,
	folderConflictPolicy: FolderConflictPolicy.Overwrite,
	overwriteDeletionPolicy: OverwriteDeletionPolicy.HardDelete,
	dataTableMatchingMode: 'by-id',
	dataTableMissingMode: DataTableMissingMode.Create,
	dataTableSchemaConflictPolicy: DataTableSchemaConflictPolicy.OverwriteNonDestructive,
	variableMissingMode: VariableMissingMode.MustPreexist,
	variableConflictPolicy: VariableConflictPolicy.KeepExisting,
	tagMissingMode: TagMissingMode.Create,
	tagConflictPolicy: TagConflictPolicy.Rename,
};

/** The request of a whole-instance Apply. The preview and the Apply plan with the same one. */
export function instanceApplyRequest(
	user: User,
	confirmDestructiveChanges = false,
): Parameters<N8nPackagesService['planPackage']>[0] {
	// Both Apply flows share the policies of a selection.
	return { ...INSTANCE_IMPORT_POLICY, ...applySelectionRequest(user, confirmDestructiveChanges) };
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
		const { reader, inventory } = await this.readPackage(files);
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
		const { resources, dependencies } = compareWithBranch({
			operation: { direction: 'apply', planned: plan && plannedChanges(plan) },
			projectIds: [projectId],
			instance,
			files,
			manifest: plan?.manifest ?? (await reader.readManifest()),
		});
		return await this.finish(resources, dependencies, check);
	}

	/**
	 * Plans the Apply of the whole package, as the whole-instance Apply does. The preview also
	 * lists what Apply deletes: workflows and folders that a kept project no longer holds, and the
	 * team projects that the package lacks, with what they own.
	 */
	async buildInstance({
		user,
		files,
	}: {
		user: User;
		files: ReadonlyMap<string, Buffer>;
	}): Promise<ApplyPreview> {
		const { reader, inventory } = await this.readPackage(files);
		const teamProjectIds = await this.projectRepository.findTeamProjectIds();
		const [moves, deletedProjects, instance] = await Promise.all([
			this.findCrossProjectMoves(inventory),
			this.deletionsOf(inventory, teamProjectIds),
			exportInstancePackage(this.packagesService, user, teamProjectIds),
		]);
		const plan = await this.packagesService.planPackage(
			instanceApplyRequest(user),
			reader,
			'check',
		);
		const planCheck = this.check(plan, inventory, undefined, moves);
		const check = { ...planCheck, conflicts: [...planCheck.conflicts, ...deletedProjects] };

		const deletedProjectIds = deletedProjects.flatMap((conflict) =>
			conflict.code === 'project-deletion' ? conflict.project.id : [],
		);
		const owned = await this.localEntities.ownedByProjects(deletedProjectIds);
		const { resources, dependencies } = compareWithBranch({
			operation: {
				direction: 'apply',
				planned: plannedChanges(plan),
				removals: new Set([
					...plannedRemovals(plan),
					...contentOfProjects(instance, deletedProjectIds),
					...owned.map(({ key }) => key),
				]),
			},
			projectIds: [...new Set([...teamProjectIds, ...inventory.projects.map(({ id }) => id)])],
			instance,
			files,
			manifest: plan.manifest,
		});
		// What a deleted project owns but no listed workflow uses is not in the comparison.
		const listed = new Set(resources.map(({ key }) => key));
		for (const resource of owned) if (!listed.has(resource.key)) resources.push(resource);
		// Apply applies the whole package, so nothing can be selected.
		for (const resource of resources) resource.selectable = false;
		return await this.finish(resources, dependencies, check);
	}

	/** A whole-instance Apply deletes the team projects that the package does not hold. */
	async projectDeletions(
		inventory: PackageDirectoryInventory,
	): Promise<PromotionBindingConflict[]> {
		return await this.deletionsOf(inventory, await this.projectRepository.findTeamProjectIds());
	}

	private async deletionsOf(
		inventory: PackageDirectoryInventory,
		teamProjectIds: readonly string[],
	): Promise<PromotionBindingConflict[]> {
		const packageProjectIds = new Set(inventory.projects.map(({ id }) => id));
		const deletedIds = teamProjectIds.filter((id) => !packageProjectIds.has(id));
		if (deletedIds.length === 0) return [];

		const projects = await this.projectRepository.findTeamProjectInfoByIds(deletedIds);
		return projects
			.sort((a, b) => compare(a.name, b.name) || compare(a.id, b.id))
			.map(({ id, name }) => ({
				kind: 'project',
				code: 'project-deletion',
				project: { id, name },
			}));
	}

	private async readPackage(files: ReadonlyMap<string, Buffer>) {
		if (files.size === 0) {
			throw new BadRequestError(
				'The remote branch has no exported package to import. Promote to it first.',
			);
		}
		const reader = new GitCommitPackageReader(files);
		return { reader, inventory: await this.inventoryReader.read(reader) };
	}

	/** Adds the local state of resources that the export lacks, then identifies the preview. */
	private async finish(
		resources: PromotionResource[],
		dependencies: PromotionResourceDependency[],
		check: PromotionPreviewCheck,
	): Promise<ApplyPreview> {
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

/** The workflows and folders that the plan removes from the projects that Apply keeps. */
/** Compares this instance with the package files at the branch commit, by the rules of the operation. */
function compareWithBranch({
	operation,
	projectIds,
	instance,
	files,
	manifest,
}: Pick<Parameters<typeof buildPreview>[0], 'operation' | 'projectIds'> & {
	instance: InstancePackage;
	files: ReadonlyMap<string, Buffer>;
	manifest: PreviewSide['manifest'];
}) {
	return buildPreview({
		operation,
		projectIds,
		base: {
			manifest: instance.manifest,
			blobByPath: new Map(instance.files.map(({ path, blobSha }) => [path, blobSha])),
		},
		desired: {
			manifest,
			blobByPath: new Map(
				[...files].map(([path, content]) => [`${PACKAGE_SUBFOLDER}/${path}`, gitBlobSha(content)]),
			),
		},
	});
}

function plannedRemovals(plan: PackageImportPlan): string[] {
	return plan.scopes.flatMap(({ plan: scope }) => [
		...scope.removalPlan.removals.map(({ id }) => resourceKey('workflow', id)),
		...scope.folderRemovalPlan.removals.map(({ id }) => resourceKey('folder', id)),
	]);
}

/** The deleted projects, and the folders and workflows inside them. */
function contentOfProjects(instance: InstancePackage, projectIds: readonly string[]): string[] {
	const { manifest } = instance;
	return projectIds.flatMap((projectId) => {
		const project = manifest.projects?.find(({ id }) => id === projectId);
		if (!project) return [];
		const inside = ({ target }: { target: string }) => target.startsWith(`${project.target}/`);
		return [
			resourceKey('project', projectId),
			...(manifest.folders ?? []).filter(inside).map(({ id }) => resourceKey('folder', id)),
			...(manifest.workflows ?? []).filter(inside).map(({ id }) => resourceKey('workflow', id)),
		];
	});
}

/**
 * Every workflow and folder of the project that the branch holds is applied. A workflow that this
 * instance owns and the branch lacks is deleted, unless it moved to another project: that is
 * reported.
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
		selectedFolderIds: inventory.folders
			.filter((folder) => folder.projectId === projectId)
			.map(({ folder }) => folder.id),
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
