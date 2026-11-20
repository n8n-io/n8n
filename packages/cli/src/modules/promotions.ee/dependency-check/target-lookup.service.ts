import type { PromotionDirection } from '@n8n/api-types';
import {
	CredentialsRepository,
	ProjectRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
	type Project,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope, type Scope } from '@n8n/permissions';
import type { INode, IWorkflowSettings } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import { userHasScopes } from '@/permissions.ee/check-access';
import { ProjectService } from '@/services/project.service.ee';

import type { AccessFact, FactProject } from './dependency-check.types';
import { PromotionAccessService } from '../promotion-access.service';
import type { PromotionOperationInput } from '../promotions.types';

/** A credential of this instance, with its owner and the projects that can use it. */
export type CredentialLookup = {
	id: string;
	name: string;
	type: string;
	usageScope: 'project' | 'instance';
	isGlobal: boolean;
	isEmpty: boolean;
	isManaged: boolean;
	isResolvable: boolean;
	owner?: FactProject;
	/** The owner and every project that the credential is shared with. */
	projectIds: string[];
};

/** A workflow of this instance, with its owner. */
export type WorkflowLookup = {
	id: string;
	name: string;
	isArchived: boolean;
	settings?: IWorkflowSettings;
	activeVersionId: string | null;
	/** Only when the lookup asked for the nodes. */
	nodes?: INode[];
	owner?: FactProject;
};

export const toFactProject = ({ id, name, type }: Pick<Project, 'id' | 'name' | 'type'>) =>
	({ id, name, kind: type === 'team' ? 'team' : 'personal' }) satisfies FactProject;

/**
 * Reads the targets of references on this instance, for a Promote (the source) and for an
 * Apply (the destination). It reads a target also when the user cannot access it: the check
 * needs that to tell a gap from a broken reference. The report decides what the user sees.
 */
@Service()
export class TargetLookupService {
	constructor(
		private readonly credentialsRepository: CredentialsRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly projectService: ProjectService,
		private readonly access: PromotionAccessService,
		private readonly credentialsService: CredentialsService,
	) {}

	async credentials(ids: string[]): Promise<Map<string, CredentialLookup>> {
		const found = new Map<string, CredentialLookup>();
		if (ids.length === 0) return found;
		const [projectScoped, others] = await Promise.all([
			this.credentialsRepository.getManyByIds(ids, { withSharings: true }),
			this.credentialsRepository.findNonProjectCredentialsByIds(ids),
		]);
		// One decrypt for each project credential that the operation references or writes.
		const withValues = new Set(
			(await this.credentialsService.keepWithValues(projectScoped)).map(({ id }) => id),
		);
		for (const credential of projectScoped) {
			const shared = credential.shared ?? [];
			const owner = shared.find(({ role }) => role === 'credential:owner')?.project;
			found.set(credential.id, {
				id: credential.id,
				name: credential.name,
				type: credential.type,
				usageScope: 'project',
				isGlobal: credential.isGlobal,
				isEmpty: !withValues.has(credential.id),
				isManaged: credential.isManaged,
				isResolvable: credential.isResolvable,
				...(owner ? { owner: toFactProject(owner) } : {}),
				projectIds: shared.map(({ projectId }) => projectId),
			});
		}
		for (const credential of others) {
			found.set(credential.id, {
				id: credential.id,
				name: credential.name,
				type: credential.type,
				usageScope: 'instance',
				isGlobal: false,
				isEmpty: false,
				isManaged: credential.isManaged,
				isResolvable: credential.isResolvable,
				projectIds: [],
			});
		}
		return found;
	}

	async workflows(ids: string[], withNodes = false): Promise<Map<string, WorkflowLookup>> {
		const found = new Map<string, WorkflowLookup>();
		if (ids.length === 0) return found;
		const [rows, owners] = await Promise.all([
			this.workflowRepository.findByIds(ids, {
				fields: [
					'name',
					'isArchived',
					'settings',
					'activeVersionId',
					...(withNodes ? ['nodes'] : []),
				],
			}),
			this.sharedWorkflowRepository.findOwnerProjectsByWorkflowIds(ids),
		]);
		for (const workflow of rows) {
			const owner = owners.get(workflow.id);
			found.set(workflow.id, {
				id: workflow.id,
				name: workflow.name,
				isArchived: workflow.isArchived,
				settings: workflow.settings,
				activeVersionId: workflow.activeVersionId,
				...(withNodes ? { nodes: workflow.nodes } : {}),
				...(owner ? { owner: toFactProject(owner) } : {}),
			});
		}
		return found;
	}

	/** Whether the user holds the scope on each resource. A resource that fails the read is false. */
	async idsWithScope(
		user: User,
		kind: 'credential' | 'workflow',
		ids: string[],
		scope: Scope,
	): Promise<Set<string>> {
		if (hasGlobalScope(user, scope)) return new Set(ids);
		const allowed = new Set<string>();
		await Promise.all(
			ids.map(async (id) => {
				try {
					const resource = kind === 'credential' ? { credentialId: id } : { workflowId: id };
					if (await userHasScopes(user, [scope], false, resource)) allowed.add(id);
				} catch {
					// A resource without a sharing row reads as "no access".
				}
			}),
		);
		return allowed;
	}

	/**
	 * The access facts for the projects that a check names.
	 * @param assumedProjects Projects of the branch that this instance does not have. A user with
	 * the global right of the direction can operate them: an Apply creates them.
	 */
	async accessFacts(args: {
		user: User;
		input: PromotionOperationInput;
		direction: PromotionDirection;
		projectIds: string[];
		knownProjects: FactProject[];
		assumedProjects?: Array<{ id: string; name: string }>;
	}): Promise<Omit<AccessFact, 'credentials' | 'createCredentialProjectIds' | 'canReadReviews'>> {
		const { user, input, direction } = args;
		const projectIds = [...new Set(args.projectIds)];
		const [readable, operable, covered, teamInfo] = await Promise.all([
			this.access.readableProjectIds(user, projectIds),
			this.access.operableProjectIds(user, direction, projectIds),
			this.access.coveredProjectIds(input, projectIds),
			this.projectRepository.findTeamProjectInfoByIds(projectIds),
		]);
		const projects: Record<string, FactProject> = {};
		for (const project of teamInfo) projects[project.id] = toFactProject(project);
		for (const project of args.knownProjects) projects[project.id] = project;

		// A project that only the branch holds is not on this instance yet.
		if (this.access.hasGlobalRight(user, direction) && input.scope === 'instance') {
			for (const { id, name } of args.assumedProjects ?? []) {
				if (id in projects) continue;
				projects[id] = { id, name, kind: 'team' };
				readable.add(id);
				operable.add(id);
				covered.add(id);
			}
		}

		return {
			readableProjectIds: [...readable],
			operableProjectIds: [...operable],
			coveredProjectIds: [...covered],
			projects,
		};
	}

	/** The team projects where the user can create a credential. */
	async createCredentialProjects(user: User): Promise<FactProject[]> {
		const ids = await this.projectService.getProjectIdsWithScope(user, ['credential:create']);
		const info = await this.projectRepository.findTeamProjectInfoByIds(ids);
		return info.map(toFactProject);
	}
}
