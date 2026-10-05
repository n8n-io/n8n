import {
	ProjectRelationRepository,
	ProjectRepository,
	SettingsRepository,
	SharedCredentialsRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { ForbiddenError } from '@n8n/errors';

/** PROTOTYPE (workspaces): the security policy that gives every user a personal workspace. */
export const PERSONAL_SPACES_ENABLED_SETTING_KEY = 'security.personalSpacesEnabled';

/**
 * PROTOTYPE (workspaces): resolves which projects a project inherits resources
 * from. A project uses its own resources, then its workspace's, then the
 * instance-wide ones. Sibling projects never see each other's resources.
 */
@Service()
export class ProjectHierarchyService {
	private instanceProjectId: string | undefined;

	constructor(
		private readonly projectRepository: ProjectRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly settingsRepository: SettingsRepository,
	) {}

	async arePersonalSpacesEnabled(): Promise<boolean> {
		const row = await this.settingsRepository.findByKey(PERSONAL_SPACES_ENABLED_SETTING_KEY);
		return row?.value !== 'false';
	}

	async setPersonalSpacesEnabled(enabled: boolean): Promise<void> {
		await this.settingsRepository.upsert(
			{ key: PERSONAL_SPACES_ENABLED_SETTING_KEY, value: String(enabled), loadOnStartup: false },
			['key'],
		);
	}

	/** Rejects new resources in a personal space when the security policy turns them off. */
	async assertCanCreateIn(projectId: string): Promise<void> {
		if (await this.arePersonalSpacesEnabled()) return;
		const project = await this.projectRepository.findOne({
			where: { id: projectId },
			relations: { parent: true },
		});
		const inPersonalSpace =
			project?.type === 'personal' ||
			project?.type === 'personalWorkspace' ||
			project?.parent?.type === 'personalWorkspace';
		if (inPersonalSpace) {
			throw new ForbiddenError(
				'Personal spaces are turned off on this instance. Create it in a project instead.',
			);
		}
	}

	/**
	 * Gives the workspace members the same role on every project in the workspace,
	 * when the workspace cascades its members. A direct role on a project wins.
	 * The cascaded rows are tagged, so the cascade can be removed again.
	 */
	async syncCascadedMembers(workspaceId: string): Promise<void> {
		const workspace = await this.projectRepository.findOneBy({ id: workspaceId });
		if (workspace?.type !== 'workspace') return;

		const childIds = (await this.projectRepository.findChildProjects([workspaceId])).map(
			(c) => c.id,
		);
		const rows = await this.projectRelationRepository.findMembershipRows([
			workspaceId,
			...childIds,
		]);

		const desired: Array<{ projectId: string; userId: string; role: string }> = [];
		if (workspace.cascadeMembers) {
			const members = rows.filter((r) => r.projectId === workspaceId && !r.inheritedFromId);
			for (const projectId of childIds) {
				for (const member of members) {
					const existing = rows.find(
						(r) => r.projectId === projectId && r.userId === member.userId,
					);
					if (existing && existing.inheritedFromId !== workspaceId) continue;
					desired.push({ projectId, userId: member.userId, role: member.role });
				}
			}
		}

		await this.projectRelationRepository.replaceInheritedRelations(workspaceId, desired);
	}

	async getInstanceProjectId(): Promise<string | undefined> {
		if (this.instanceProjectId) return this.instanceProjectId;
		const instance = await this.projectRepository.findInstanceProject();
		this.instanceProjectId = instance?.id;
		return this.instanceProjectId;
	}

	/** The project ids to search for resources, nearest first. */
	async getResourceChain(projectId: string): Promise<string[]> {
		const chain = [projectId];
		const project = await this.projectRepository.findOneBy({ id: projectId });
		if (project?.parentId) chain.push(project.parentId);
		const instanceProjectId = await this.getInstanceProjectId();
		if (instanceProjectId && !chain.includes(instanceProjectId)) chain.push(instanceProjectId);
		return chain;
	}

	/** Only the inherited part of the chain: the workspace and the instance scope. */
	async getAncestorIds(projectId: string): Promise<string[]> {
		return (await this.getResourceChain(projectId)).slice(1);
	}

	/** The ids, among `credentialIds`, that the project inherits from its ancestors. */
	async filterInheritedCredentialIds(
		projectId: string,
		credentialIds: string[],
	): Promise<Set<string>> {
		if (credentialIds.length === 0) return new Set();
		const ancestorIds = await this.getAncestorIds(projectId);
		if (ancestorIds.length === 0) return new Set();
		return new Set(
			await this.sharedCredentialsRepository.getFilteredAccessibleCredentials(
				ancestorIds,
				credentialIds,
			),
		);
	}

	/** `projectIds` plus every project they inherit from, without duplicates. */
	async expandWithAncestors(projectIds: string[]): Promise<string[]> {
		const result = new Set(projectIds);
		for (const project of await this.projectRepository.findManyByIds(projectIds)) {
			if (project.parentId) result.add(project.parentId);
		}
		const instanceProjectId = await this.getInstanceProjectId();
		if (instanceProjectId && projectIds.length > 0) result.add(instanceProjectId);
		return [...result];
	}
}
