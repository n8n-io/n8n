import { Logger } from '@n8n/backend-common';
import type { Project } from '@n8n/db';
import { ProjectRelationRepository, ProjectRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { PROJECT_OWNER_ROLE_SLUG } from '@n8n/permissions';

const DEFAULT_WORKSPACE_NAME = 'General';

/**
 * PROTOTYPE (workspaces): puts existing data into the workspace model on startup.
 * It is idempotent, so it also fixes users created by paths that skip
 * `createUserWithProject`.
 */
@Service()
export class WorkspacesBootstrapService {
	constructor(
		private readonly projectRepository: ProjectRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly logger: Logger,
	) {}

	async run() {
		await this.ensureInstanceProject();
		await this.ensurePersonalWorkspaces();
		await this.ensureTeamProjectsHaveWorkspace();
	}

	private async ensureInstanceProject() {
		if (await this.projectRepository.findInstanceProject()) return;
		await this.projectRepository.save(
			this.projectRepository.create({
				type: 'instance',
				name: 'Instance',
				icon: { type: 'icon', value: 'earth' },
				description: 'Credentials, data tables and variables available to every workspace.',
			}),
		);
		this.logger.info('Created the instance-wide resource scope');
	}

	private async ensurePersonalWorkspaces() {
		const orphans = await this.projectRepository.findPersonalProjectsWithoutParent();
		for (const personalProject of orphans) {
			if (!personalProject.creatorId) continue;
			const workspace =
				(await this.projectRepository.findPersonalWorkspaceForUser(personalProject.creatorId)) ??
				(await this.createPersonalWorkspace(personalProject));
			await this.projectRepository.setParent([personalProject.id], workspace.id);
		}
		if (orphans.length > 0) {
			this.logger.info(`Moved ${orphans.length} personal projects into personal workspaces`);
		}
	}

	private async createPersonalWorkspace(personalProject: Project) {
		const workspace = await this.projectRepository.save(
			this.projectRepository.create({
				type: 'personalWorkspace',
				name: personalProject.name,
				creatorId: personalProject.creatorId,
			}),
		);
		const ownerRelation = await this.projectRelationRepository.findOne({
			where: { projectId: personalProject.id, userId: personalProject.creatorId ?? undefined },
			relations: { role: true },
		});
		await this.projectRelationRepository.insert({
			projectId: workspace.id,
			userId: personalProject.creatorId ?? undefined,
			role: { slug: ownerRelation?.role?.slug ?? PROJECT_OWNER_ROLE_SLUG },
		});
		return workspace;
	}

	private async ensureTeamProjectsHaveWorkspace() {
		const orphans = await this.projectRepository.findTeamProjectsWithoutParent();
		if (orphans.length === 0) return;
		const workspaces = await this.projectRepository.findAllWorkspaces();
		const workspace =
			workspaces.find((w) => w.name === DEFAULT_WORKSPACE_NAME) ??
			(await this.projectRepository.save(
				this.projectRepository.create({
					type: 'workspace',
					name: DEFAULT_WORKSPACE_NAME,
					icon: { type: 'icon', value: 'box' },
				}),
			));
		await this.projectRepository.setParent(
			orphans.map((p) => p.id),
			workspace.id,
		);
		this.logger.info(
			`Moved ${orphans.length} team projects into the "${workspace.name}" workspace`,
		);
	}
}
