import {
	CredentialsRepository,
	ProjectRepository,
	VariablesRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';

import type { Package } from '../engine/types';
import {
	credentialPath,
	projectCredential,
	projectTeamProject,
	projectVariable,
	projectWorkflow,
	teamProjectPath,
	variablePath,
	workflowPath,
} from '../spec/projections';

/**
 * Serialize a scope's live state into a package. The snapshot MUST be complete
 * for the scope (archived workflows included): under D006 a path absent from
 * `live` reads as a live-side deletion, so a silently dropped row would propose
 * deleting it from the branch (the B7 trap).
 */
@Service()
export class LiveSnapshotService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly variablesRepository: VariablesRepository,
		private readonly projectRepository: ProjectRepository,
	) {}

	async snapshot(projectId: string | null): Promise<Package> {
		const pkg: Package = {};
		const isInstanceScope = projectId === null;

		// At instance scope, team-project entities travel too so the destination
		// can recreate the structure. Personal projects never travel (their ids
		// are bound to users and unstable across instances).
		if (isInstanceScope) {
			const teamProjects = await this.projectRepository.find({ where: { type: 'team' } });
			for (const project of teamProjects) {
				pkg[teamProjectPath(project.id)] = projectTeamProject(project);
			}
		}

		const workflows = await this.workflowRepository.find({
			where: projectId ? { shared: { role: 'workflow:owner', project: { id: projectId } } } : {},
			relations: { parentFolder: true, shared: { project: true } },
		});
		for (const workflow of workflows) {
			const ownerProject = workflow.shared?.find((s) => s.role === 'workflow:owner')?.project;
			// Project-scoped trees imply the project → omit the field there.
			const homeProjectId = isInstanceScope
				? ownerProject?.type === 'team'
					? ownerProject.id
					: null
				: undefined;
			pkg[workflowPath(workflow.id)] = projectWorkflow(workflow, homeProjectId);
		}

		const credentials = await this.credentialsRepository.find({
			// Instance credentials (provider connections) are instance-local and never
			// synced — same exclusion as source-control's scoped service.
			where: projectId
				? { shared: { role: 'credential:owner', project: { id: projectId } } }
				: { usageScope: 'project' },
		});
		for (const credential of credentials) {
			pkg[credentialPath(credential.id)] = projectCredential(credential);
		}

		const variables = await this.variablesRepository.find({ relations: { project: true } });
		for (const variable of variables) {
			const inScope = projectId ? variable.project?.id === projectId : !variable.project;
			if (inScope) pkg[variablePath(variable.id)] = projectVariable(variable);
		}

		return pkg;
	}
}
