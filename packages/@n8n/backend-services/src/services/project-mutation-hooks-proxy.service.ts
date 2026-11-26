import { Logger } from '@n8n/backend-common';
import type { OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';

export interface ProjectDeletion {
	projectId: string;
	/** The user who deletes the project. */
	userId: string;
	loginId?: string;
}

export type AfterProjectDeleted = () => Promise<void>;

export interface ProjectMutationHooks {
	afterTeamProjectCreated(projectId: string): Promise<void>;

	/**
	 * Runs in the transaction that deletes the project, so a failure rolls the delete back.
	 * The returned callback runs after the commit.
	 */
	beforeProjectDeleted(
		deletion: ProjectDeletion,
		ctx: OperationContext,
	): Promise<AfterProjectDeleted | undefined>;
}

@Service()
export class ProjectMutationHooksProxy implements ProjectMutationHooks {
	private readonly providers = new Set<Partial<ProjectMutationHooks>>();

	constructor(private readonly logger: Logger) {}

	registerProvider(provider: Partial<ProjectMutationHooks>): void {
		this.providers.add(provider);
	}

	async afterTeamProjectCreated(projectId: string): Promise<void> {
		for (const provider of this.providers) {
			try {
				await provider.afterTeamProjectCreated?.(projectId);
			} catch (error) {
				this.logFailure('afterTeamProjectCreated', projectId, error);
			}
		}
	}

	async beforeProjectDeleted(
		deletion: ProjectDeletion,
		ctx: OperationContext,
	): Promise<AfterProjectDeleted> {
		const afterCommits: AfterProjectDeleted[] = [];
		for (const provider of this.providers) {
			const afterCommit = await provider.beforeProjectDeleted?.(deletion, ctx);
			if (afterCommit) afterCommits.push(afterCommit);
		}

		// The project is already deleted here, so a failure must not fail the delete.
		return async () => {
			for (const afterCommit of afterCommits) {
				try {
					await afterCommit();
				} catch (error) {
					this.logFailure('afterProjectDeleted', deletion.projectId, error);
				}
			}
		};
	}

	private logFailure(hook: string, projectId: string, error: unknown): void {
		this.logger.error('Project mutation hook failed', {
			hook,
			projectId,
			error: ensureError(error),
		});
	}
}
