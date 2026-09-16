import type {
	PromotableResource,
	PromotionChanges,
	PromotionChangesQueryDto,
	PromotionDirection,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { WorkflowRepository, type User, type WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope, type Scope } from '@n8n/permissions';
import { jsonParse } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { HashingPackageWriter } from '@/modules/n8n-packages/io/hashing-package-writer';
import {
	PACKAGE_ENTITY_LAYOUT,
	entityFilePath,
	type ManifestEntityCollection,
} from '@/modules/n8n-packages/io/manifest-entry';
import { generateSlug } from '@/modules/n8n-packages/io/slug.utils';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import {
	MissingWorkflowDependencyPolicy,
	WorkflowVersionPolicy,
} from '@/modules/n8n-packages/n8n-packages.types';
import { MANIFEST_FILE } from '@/modules/n8n-packages/spec/constants';
import {
	packageManifestSchema,
	type ManifestEntry,
	type PackageManifest,
} from '@/modules/n8n-packages/spec/manifest.schema';
import type { PackageRequirements } from '@/modules/n8n-packages/spec/requirements.schema';
import type { SerializedWorkflow } from '@/modules/n8n-packages/spec/serialized/workflow.schema';
import { userHasScopes } from '@/permissions.ee/check-access';

import { parsePackageFiles, type PackageFile } from './base-branch-files';
import { PACKAGE_SUBFOLDER } from './constants';
import { diffPackageFiles } from './diff-package-files';
import { PromotionsService } from './promotions.service';
import type { BranchPackage } from './promotions.types';

const DEPENDENCY_COLLECTIONS = {
	credentials: 'credentials',
	dataTables: 'dataTables',
	variables: 'variables',
	tags: 'tags',
	workflows: 'workflows',
	nodeTypes: null,
} as const satisfies Record<keyof PackageRequirements, ManifestEntityCollection | null>;

const REQUIRED_SCOPES = {
	promote: {
		global: 'gitConnection:push',
		project: 'project:export',
		label: 'project export and promotion push',
	},
	apply: {
		global: 'gitConnection:pull',
		project: 'project:update',
		label: 'project update and promotion pull',
	},
} as const satisfies Record<PromotionDirection, { global: Scope; project: Scope; label: string }>;

type DesiredPackage = {
	files: readonly PackageFile[];
	manifest: PackageManifest;
	isWorkflowArchived: (path: string) => Promise<boolean | undefined>;
};

@Service()
export class PromotionChangeService {
	constructor(
		private readonly promotionsService: PromotionsService,
		private readonly packagesService: N8nPackagesService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('promotions');
	}

	/**
	 * Lists the workflows that differ between the project on this instance and the
	 * branch of its config for `direction`. The rows describe the receiving side.
	 * Promote compares the branch (base) with the instance (desired). Apply swaps the
	 * sides: the instance is the base, and the branch is what the instance becomes.
	 */
	async getChanges(
		user: User,
		projectId: string,
		query: PromotionChangesQueryDto,
	): Promise<PromotionChanges> {
		const { direction } = query;
		await this.assertCanPreview(user, projectId, direction);
		const branch = await this.promotionsService.readBranchPackage(projectId, direction);
		const instance = await this.exportInstancePackage(user, projectId);
		const rows =
			direction === 'promote'
				? await this.buildRows({ projectId, direction, base: branch.files, desired: instance })
				: await this.buildRows({
						projectId,
						direction,
						base: instance.files,
						desired: await this.readBranchDesired(branch, projectId),
					});

		return { commitSha: branch.commitSha, changes: applyQuery(rows, query) };
	}

	private async assertCanPreview(user: User, projectId: string, direction: PromotionDirection) {
		const required = REQUIRED_SCOPES[direction];
		if (
			!hasGlobalScope(user, required.global) ||
			!(await userHasScopes(user, [required.project], false, { projectId }))
		) {
			throw new ForbiddenError(
				`Change preview requires ${required.label} permissions. Ask an administrator for access.`,
			);
		}
	}

	private async buildRows({
		projectId,
		direction,
		base,
		desired,
	}: {
		projectId: string;
		direction: PromotionDirection;
		base: readonly PackageFile[];
		desired: DesiredPackage;
	}): Promise<PromotableResource[]> {
		const previewId = randomUUID();
		const { manifest } = desired;
		const changes = diffPackageFiles(base, desired.files);
		const changedIds = new Set<string>();
		const renamedIds = new Set<string>();
		const modifiedIds = new Set<string>();
		const changedPaths = new Set<string>();
		for (const fileChange of changes) {
			if (fileChange.change !== 'added') changedPaths.add(fileChange.base.path);
			if (fileChange.change !== 'deleted') changedPaths.add(fileChange.desired.path);
			const file = fileChange.change === 'deleted' ? fileChange.base : fileChange.desired;
			if (file.type === 'workflow') {
				changedIds.add(file.entityId);
				if (fileChange.change === 'renamed' || fileChange.change === 'renamed-and-modified') {
					renamedIds.add(file.entityId);
				}
				if (fileChange.change !== 'renamed') modifiedIds.add(file.entityId);
			}
			this.logger.debug('Promotion file change', {
				previewId,
				projectId,
				direction,
				...fileChange,
			});
		}
		const { affectedWorkflowIds, dependencyCounts } = calculateDependencyImpact({
			base,
			manifest,
			changedPaths,
			projectId,
		});
		for (const workflowId of affectedWorkflowIds) {
			changedIds.add(workflowId);
			modifiedIds.add(workflowId);
		}
		const desiredWorkflows = new Map(manifest.workflows?.map((entry) => [entry.id, entry]));
		this.logger.debug('Promotion change preview', {
			previewId,
			projectId,
			direction,
			baseFileCount: base.length,
			desiredFileCount: desired.files.length,
			fileChangeCount: changes.length,
			workflowIds: [...changedIds],
		});
		const metadata = await this.workflowRepository.findByIds(
			[...changedIds].filter((id) => desiredWorkflows.has(id)),
			{ fields: ['updatedAt', 'versionCounter'] },
		);
		return await buildPromotableResources({
			base,
			desired,
			desiredWorkflows,
			changedIds,
			renamedIds,
			modifiedIds,
			metadata,
			dependencyCounts,
		});
	}

	private async exportInstancePackage(user: User, projectId: string): Promise<DesiredPackage> {
		const writer = new HashingPackageWriter();
		const archiveState = new Map<string, boolean>();
		const { manifest } = await this.packagesService.exportPackageToWriter(
			{
				user,
				projectIds: [projectId],
				includeArchivedWorkflows: true,
				includeTags: true,
				includeVariableValues: true,
				workflowVersionPolicy: WorkflowVersionPolicy.Latest,
				missingWorkflowDependencyPolicy: MissingWorkflowDependencyPolicy.ReferenceOnly,
			},
			{
				writeDirectory: (path) => writer.writeDirectory(path),
				writeFile(path, content) {
					writer.writeFile(path, content);
					if (path.endsWith(`/${PACKAGE_ENTITY_LAYOUT.workflows.fileName}`)) {
						const workflow = jsonParse<SerializedWorkflow>(String(content));
						archiveState.set(`${PACKAGE_SUBFOLDER}/${path}`, workflow.isArchived);
					}
				},
			},
		);
		const files = parsePackageFiles(
			writer.finalize().map((file) => ({
				...file,
				path: `${PACKAGE_SUBFOLDER}/${file.path}`,
			})),
			{ exportRoot: PACKAGE_SUBFOLDER, projectId },
		);
		return { files, manifest, isWorkflowArchived: async (path) => archiveState.get(path) };
	}

	private async readBranchDesired(
		branch: BranchPackage,
		projectId: string,
	): Promise<DesiredPackage> {
		const manifest = packageManifestSchema.safeParse(
			parseBranchJson(await branch.readFile(`${PACKAGE_SUBFOLDER}/${MANIFEST_FILE}`)),
		);
		if (!manifest.success) {
			throw new BadRequestError('The package manifest on the branch cannot be read');
		}
		return {
			files: branch.files,
			manifest: scopeManifestToProject(manifest.data, projectId),
			isWorkflowArchived: async (path) => {
				// A workflow whose archive state cannot be read still lists as modified.
				// Apply reports the real problem when it imports the file.
				try {
					return jsonParse<SerializedWorkflow>(await branch.readFile(path)).isArchived;
				} catch {
					return undefined;
				}
			},
		};
	}
}

function parseBranchJson(raw: string): unknown {
	try {
		return jsonParse<unknown>(raw);
	} catch {
		return undefined;
	}
}

/**
 * Keeps only this project's workflows and the requirement rows they use, so a
 * dependency change on the branch cannot list another project's workflows.
 */
function scopeManifestToProject(manifest: PackageManifest, projectId: string): PackageManifest {
	const projectTarget = manifest.projects?.find(({ id }) => id === projectId)?.target;
	const workflows =
		projectTarget === undefined
			? []
			: (manifest.workflows ?? []).filter(({ target }) => target.startsWith(`${projectTarget}/`));
	const workflowIds = new Set(workflows.map(({ id }) => id));
	const scopeRows = <T extends { usedByWorkflows: string[] }>(rows: T[] | undefined) => {
		const kept = rows
			?.map((row) => ({
				...row,
				usedByWorkflows: row.usedByWorkflows.filter((id) => workflowIds.has(id)),
			}))
			.filter((row) => row.usedByWorkflows.length > 0);
		return kept?.length ? kept : undefined;
	};
	const { requirements } = manifest;
	return {
		...manifest,
		workflows,
		requirements: requirements && {
			credentials: scopeRows(requirements.credentials),
			dataTables: scopeRows(requirements.dataTables),
			workflows: scopeRows(requirements.workflows),
			variables: scopeRows(requirements.variables),
			tags: scopeRows(requirements.tags),
			nodeTypes: scopeRows(requirements.nodeTypes),
		},
	};
}

function applyQuery(
	changes: PromotableResource[],
	query: Pick<PromotionChangesQueryDto, 'search' | 'sort' | 'order'>,
): PromotableResource[] {
	const search = query.search?.toLowerCase();
	return changes
		.filter(({ name }) => !search || name.toLowerCase().includes(search))
		.sort((a, b) => {
			const comparison = (a[query.sort] ?? '').localeCompare(b[query.sort] ?? '');
			return (query.order === 'desc' ? -comparison : comparison) || a.id.localeCompare(b.id);
		});
}

function calculateDependencyImpact({
	base,
	manifest,
	changedPaths,
	projectId,
}: {
	base: readonly PackageFile[];
	manifest: PackageManifest;
	changedPaths: ReadonlySet<string>;
	projectId: string;
}) {
	const baseDependencies = new Map<string, PackageFile[]>();
	for (const file of base) {
		const key = JSON.stringify([
			file.fileName,
			file.type === 'variable' ? file.slug : file.entityId,
		]);
		const group = baseDependencies.get(key) ?? [];
		group.push(file);
		baseDependencies.set(key, group);
	}
	const affectedWorkflowIds = new Set<string>();
	const dependencyCounts = new Map<string, number>();
	for (const collection of Object.values(DEPENDENCY_COLLECTIONS)) {
		if (collection === null) continue;
		const entries = new Map(
			manifest[collection]?.map((entry) => [
				collection === 'variables' ? entry.name : entry.id,
				entry,
			]),
		);
		for (const requirement of manifest.requirements?.[collection] ?? []) {
			const key = 'id' in requirement ? requirement.id : requirement.name;
			const entry = entries.get(key);
			const baseKey = collection === 'variables' ? generateSlug(key, 'variable') : key;
			const group =
				baseDependencies.get(
					JSON.stringify([PACKAGE_ENTITY_LAYOUT[collection].fileName, baseKey]),
				) ?? [];
			const projectFiles = group.filter((file) => file.projectId === projectId);
			const scopedFiles = projectFiles.length ? projectFiles : group;
			const sameId = entry ? scopedFiles.filter(({ entityId }) => entityId === entry.id) : [];
			const previous = sameId.length ? sameId : scopedFiles;
			const currentPath = entry
				? `${PACKAGE_SUBFOLDER}/${entityFilePath(collection, entry.target)}`
				: undefined;
			const dependencyChanged =
				collection !== 'workflows' &&
				(previous.some(({ path }) => changedPaths.has(path)) ||
					(currentPath !== undefined && changedPaths.has(currentPath)));
			for (const workflowId of requirement.usedByWorkflows) {
				dependencyCounts.set(workflowId, (dependencyCounts.get(workflowId) ?? 0) + 1);
				if (dependencyChanged) affectedWorkflowIds.add(workflowId);
			}
		}
	}
	return { affectedWorkflowIds, dependencyCounts };
}

async function buildPromotableResources({
	base,
	desired,
	desiredWorkflows,
	changedIds,
	renamedIds,
	modifiedIds,
	metadata,
	dependencyCounts,
}: {
	base: readonly PackageFile[];
	desired: DesiredPackage;
	desiredWorkflows: ReadonlyMap<string, ManifestEntry>;
	changedIds: ReadonlySet<string>;
	renamedIds: ReadonlySet<string>;
	modifiedIds: ReadonlySet<string>;
	metadata: ReadonlyArray<Pick<WorkflowEntity, 'id' | 'updatedAt' | 'versionCounter'>>;
	dependencyCounts: ReadonlyMap<string, number>;
}): Promise<PromotableResource[]> {
	const metadataById = new Map(metadata.map((workflow) => [workflow.id, workflow]));
	const baseWorkflowSlugs = new Map(
		base.filter(({ type }) => type === 'workflow').map(({ entityId, slug }) => [entityId, slug]),
	);
	const desiredWorkflowPaths = new Map(
		desired.files
			.filter(
				({ type, fileName }) =>
					type === 'workflow' && fileName === PACKAGE_ENTITY_LAYOUT.workflows.fileName,
			)
			.map(({ entityId, path }) => [entityId, path]),
	);
	const resources: PromotableResource[] = [];
	for (const id of changedIds) {
		const entry = desiredWorkflows.get(id);
		const workflow = metadataById.get(id);
		const path = desiredWorkflowPaths.get(id);
		let status: PromotableResource['status'] = 'modified';
		if (!entry) status = 'deleted';
		else if (!baseWorkflowSlugs.has(id)) status = 'new';
		else if (path !== undefined && (await desired.isWorkflowArchived(path))) status = 'archived';
		else if (renamedIds.has(id)) {
			status = modifiedIds.has(id) ? 'renamed-and-modified' : 'renamed';
		}
		resources.push({
			id,
			name: entry?.name ?? baseWorkflowSlugs.get(id) ?? id,
			type: 'workflow',
			status,
			version: workflow?.versionCounter ?? null,
			updatedAt: workflow?.updatedAt.toISOString() ?? null,
			updatedBy: null,
			dependencyCount: dependencyCounts.get(id) ?? 0,
		});
	}
	return resources;
}
