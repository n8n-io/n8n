import { CredentialsFinderService } from '@n8n/backend-services';
import {
	CredentialsRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	type Project,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';

import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';
import { ProjectService } from '@/services/project.service.ee';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import {
	checkPromoteDependencies,
	type DependencyOwner,
	type PromoteDependencyCheck,
} from './promote-dependency-check';

/** Reads what the Promote dependency check needs to know about this instance, then runs it. */
@Service()
export class PromoteDependencyCheckService {
	constructor(
		private readonly credentialsRepository: CredentialsRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly credentialsFinder: CredentialsFinderService,
		private readonly workflowFinder: WorkflowFinderService,
		private readonly projectService: ProjectService,
		private readonly variablesService: VariablesService,
	) {}

	async check({
		user,
		manifest,
		projectIds,
		branchManifest,
		stopsOnWorkflowOutsideExport,
	}: {
		user: User;
		/** The export of the promoted projects. */
		manifest: PackageManifest;
		projectIds: readonly string[];
		/** `null` when the branch holds no package, or when the Promote replaces the whole package. */
		branchManifest: PackageManifest | null;
		stopsOnWorkflowOutsideExport: boolean;
	}): Promise<PromoteDependencyCheck> {
		const { requirements } = manifest;
		const credentialIds = (requirements?.credentials ?? []).map(({ id }) => id);
		// A workflow of the export belongs to a promoted project, so it needs no lookup.
		const exportedWorkflowIds = new Set((manifest.workflows ?? []).map(({ id }) => id));
		const workflowIds = (requirements?.workflows ?? [])
			.map(({ id }) => id)
			.filter((id) => !exportedWorkflowIds.has(id));

		const [existingCredentialIds, credentialOwners, workflowOwners, variables] = await Promise.all([
			this.credentialsRepository.findExistingIds(credentialIds),
			this.sharedCredentialsRepository.findOwnerProjectsByCredentialIds(credentialIds),
			this.sharedWorkflowRepository.findOwnerProjectsByWorkflowIds(workflowIds),
			// The unfiltered list, because a workflow resolves a variable that the user cannot see.
			requirements?.variables?.length ? this.variablesService.getAllCached() : [],
		]);
		const promotedProjectIds = new Set(projectIds);

		return checkPromoteDependencies({
			manifest,
			promotedProjectIds,
			branchManifest,
			existingCredentialIds: new Set(existingCredentialIds),
			credentialOwners: toOwners(credentialOwners),
			workflowOwners: toOwners(workflowOwners),
			...(await this.readAccess(user, promotedProjectIds, credentialOwners, workflowOwners)),
			variables: variables.map(({ key, project }) => ({
				name: key,
				projectId: project?.id ?? null,
			})),
			stopsOnWorkflowOutsideExport,
		});
	}

	/**
	 * What the user can read of the dependencies outside the promoted projects: the team projects
	 * that own one, and the credentials and workflows of personal projects.
	 */
	private async readAccess(
		user: User,
		promotedProjectIds: ReadonlySet<string>,
		credentialOwners: ReadonlyMap<string, Project>,
		workflowOwners: ReadonlyMap<string, Project>,
	) {
		const outside = (owners: ReadonlyMap<string, Project>, type: Project['type']) =>
			[...owners].filter(([, owner]) => owner.type === type && !promotedProjectIds.has(owner.id));
		const teamOwnerIds = [
			...new Set(
				[...outside(credentialOwners, 'team'), ...outside(workflowOwners, 'team')].map(
					([, owner]) => owner.id,
				),
			),
		];
		const [readableProjectIds, readableCredentialIds, readableWorkflowIds] = await Promise.all([
			teamOwnerIds.length > 0
				? this.projectService.getProjectIdsWithScope(user, ['project:read'], teamOwnerIds)
				: [],
			this.credentialsFinder.findCredentialIdsWithScopeForUser(
				outside(credentialOwners, 'personal').map(([id]) => id),
				user,
				['credential:read'],
			),
			this.workflowFinder.findWorkflowIdsWithScopeForUser(
				outside(workflowOwners, 'personal').map(([id]) => id),
				user,
				['workflow:read'],
			),
		]);
		return {
			readableProjectIds: new Set(readableProjectIds),
			readableCredentialIds,
			readableWorkflowIds,
		};
	}
}

/** Keeps the id and type only. The check must not see the name of an owner project. */
function toOwners(projects: ReadonlyMap<string, Project>): Map<string, DependencyOwner> {
	return new Map(
		[...projects].map(([id, { id: projectId, type }]) => [id, { id: projectId, type }]),
	);
}
