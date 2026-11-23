import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';

export interface ProjectMutationHooks {
	afterTeamProjectCreated(projectId: string): Promise<void>;
}

@Service()
export class ProjectMutationHooksProxy implements ProjectMutationHooks {
	private readonly providers = new Set<ProjectMutationHooks>();

	constructor(private readonly logger: Logger) {}

	registerProvider(provider: ProjectMutationHooks): void {
		this.providers.add(provider);
	}

	async afterTeamProjectCreated(projectId: string): Promise<void> {
		for (const provider of this.providers) {
			try {
				await provider.afterTeamProjectCreated(projectId);
			} catch (error) {
				this.logger.error('Project mutation hook failed', {
					hook: 'afterTeamProjectCreated',
					projectId,
					error: ensureError(error),
				});
			}
		}
	}
}
