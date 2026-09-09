import type { PromotableResource } from '@n8n/api-types';
import { WorkflowRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import { jsonParse } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { HashingPackageWriter } from '@/modules/n8n-packages/io/hashing-package-writer';
import {
	PACKAGE_ENTITY_LAYOUT,
	WORKFLOW_LIFECYCLE_FILE_NAME,
	entityFilePath,
	workflowLifecycleFilePath,
	type ManifestEntityCollection,
} from '@/modules/n8n-packages/io/manifest-entry';
import { generateSlug } from '@/modules/n8n-packages/io/slug.utils';
import { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import {
	MissingWorkflowDependencyPolicy,
	WorkflowVersionPolicy,
} from '@/modules/n8n-packages/n8n-packages.types';
import { serializedWorkflowLifecycleSchema } from '@/modules/n8n-packages/spec/serialized/workflow-lifecycle.schema';
import type { PackageRequirements } from '@/modules/n8n-packages/spec/requirements.schema';
import { userHasScopes } from '@/permissions.ee/check-access';

import { parsePackageFiles, type BaseBranchFile } from './base-branch-files';
import { PACKAGE_SUBFOLDER } from './constants';
import { diffPackageFiles } from './diff-package-files';
import { PromotionsService } from './promotions.service';

const DEPENDENCY_COLLECTIONS = {
	credentials: 'credentials',
	dataTables: 'dataTables',
	variables: 'variables',
	tags: 'tags',
	workflows: 'workflows',
	nodeTypes: null,
} as const satisfies Record<keyof PackageRequirements, ManifestEntityCollection | null>;

@Service()
export class PromotionChangeService {
	constructor(
		private readonly promotionsService: PromotionsService,
		private readonly packagesService: N8nPackagesService,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	async getChanges(user: User, projectId: string): Promise<PromotableResource[]> {
		if (
			!hasGlobalScope(user, 'gitConnection:push') ||
			!(await userHasScopes(user, ['project:export'], false, { projectId }))
		) {
			throw new ForbiddenError(
				'Change preview requires project export and promotion push permissions. Ask an administrator for access.',
			);
		}
		const base = await this.promotionsService.listBaseBranchFiles(projectId);
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
					if (path.endsWith(`/${WORKFLOW_LIFECYCLE_FILE_NAME}`)) {
						archiveState.set(
							path,
							serializedWorkflowLifecycleSchema.parse(jsonParse(String(content))).isArchived,
						);
					}
				},
			},
		);
		const desired = parsePackageFiles(
			writer.finalize().map((file) => ({
				...file,
				path: `${PACKAGE_SUBFOLDER}/${file.path}`,
			})),
			{ exportRoot: PACKAGE_SUBFOLDER, projectId },
		);
		const differences = diffPackageFiles(base, desired);
		const changedIds = new Set(
			differences.filter(({ type }) => type === 'workflow').map(({ key }) => key),
		);
		const changedPaths = new Set(
			differences.flatMap(({ base, desired }) => [base?.path, desired?.path]),
		);
		const projectPrefix = `${PACKAGE_SUBFOLDER}/${PACKAGE_ENTITY_LAYOUT.projects.directory}/`;
		const baseDependencies = new Map<string, BaseBranchFile[]>();
		for (const file of base) {
			const key = JSON.stringify([file.path.split('/').at(-1), file.key]);
			const group = baseDependencies.get(key) ?? [];
			group.push(file);
			baseDependencies.set(key, group);
		}
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
				const projectFiles = group.filter(({ path }) => path.startsWith(projectPrefix));
				const scopedFiles = projectFiles.length ? projectFiles : group;
				const sameId = entry
					? scopedFiles.filter(({ path }) =>
							path.endsWith(`-${entry.id}/${PACKAGE_ENTITY_LAYOUT[collection].fileName}`),
						)
					: [];
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
					if (dependencyChanged) changedIds.add(workflowId);
				}
			}
		}
		const desiredWorkflows = new Map(manifest.workflows?.map((entry) => [entry.id, entry]));
		const metadata = await this.workflowRepository.findByIds([...changedIds], {
			fields: ['updatedAt', 'versionCounter'],
		});
		const metadataById = new Map(metadata.map((workflow) => [workflow.id, workflow]));
		const baseIds = new Set(base.filter(({ type }) => type === 'workflow').map(({ key }) => key));
		return [...changedIds].map((id) => {
			const entry = desiredWorkflows.get(id);
			const workflow = metadataById.get(id);
			if (!entry && workflow) {
				throw new BadRequestError('A workflow moved out of this project. Use a full promotion.');
			}
			let status: PromotableResource['status'] = 'modified';
			if (!entry) status = 'deleted';
			else if (!baseIds.has(id)) status = 'new';
			else if (archiveState.get(workflowLifecycleFilePath(entry.target))) status = 'archived';
			return {
				id,
				name: entry?.name ?? id,
				type: 'workflow',
				status,
				version: workflow?.versionCounter ?? null,
				updatedAt: workflow?.updatedAt.toISOString() ?? null,
				updatedBy: null,
				dependencyCount: dependencyCounts.get(id) ?? 0,
			};
		});
	}
}
