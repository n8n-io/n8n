import type {
	ProjectFileActorResponse,
	ProjectFileResponse,
	ProjectFileUser,
	ProjectFileWorkflow,
} from '@n8n/api-types';
import { UserRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import type { ProjectFile } from './project-file.entity';

/**
 * Maps `ProjectFile` rows onto the API response, resolving actor ids to users
 * and workflows.
 *
 * Actors are resolved in one extra query per kind per page rather than per row,
 * and the binary data reference is dropped here — it must never reach a client,
 * because `GET /rest/binary-data?id=` performs no ownership check.
 */
@Service()
export class ProjectFileResponseService {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	async toResponse(file: ProjectFile): Promise<ProjectFileResponse> {
		const [response] = await this.toResponses([file]);

		return response;
	}

	async toResponses(files: ProjectFile[]): Promise<ProjectFileResponse[]> {
		const [usersById, workflowsById] = await Promise.all([
			this.resolveUsers(files),
			this.resolveWorkflows(files),
		]);

		/**
		 * Only one of the two id columns is ever set, so whichever is present
		 * decides the actor's kind. Neither being set means the user or workflow was
		 * deleted — both FKs are `ON DELETE SET NULL` — which the client renders as
		 * "Unknown".
		 */
		const toActor = (
			userId: string | null,
			workflowId: string | null,
		): ProjectFileActorResponse | null => {
			if (userId) {
				const user = usersById.get(userId);

				return user ? { type: 'user', ...user } : null;
			}

			if (workflowId) {
				const workflow = workflowsById.get(workflowId);

				return workflow ? { type: 'workflow', ...workflow } : null;
			}

			return null;
		};

		return files.map((file) => ({
			id: file.id,
			name: file.name,
			mimeType: file.mimeType,
			fileSizeBytes: file.fileSizeBytes,
			createdAt: file.createdAt.toISOString(),
			updatedAt: file.updatedAt.toISOString(),
			createdBy: toActor(file.createdById, file.createdByWorkflowId),
			updatedBy: toActor(file.updatedById, file.updatedByWorkflowId),
		}));
	}

	private async resolveUsers(files: ProjectFile[]): Promise<Map<string, ProjectFileUser>> {
		const userIds = unique(files.flatMap((file) => [file.createdById, file.updatedById]));

		if (userIds.length === 0) return new Map();

		const users = await this.userRepository.findManyByIds(userIds);

		return new Map(
			users.map((user) => [
				user.id,
				{
					id: user.id,
					email: user.email,
					firstName: user.firstName,
					lastName: user.lastName,
				},
			]),
		);
	}

	private async resolveWorkflows(files: ProjectFile[]): Promise<Map<string, ProjectFileWorkflow>> {
		const workflowIds = unique(
			files.flatMap((file) => [file.createdByWorkflowId, file.updatedByWorkflowId]),
		);

		if (workflowIds.length === 0) return new Map();

		const workflows = await this.workflowRepository.findByIds(workflowIds, {
			fields: ['id', 'name'],
		});

		return new Map(
			workflows.map((workflow) => [workflow.id, { id: workflow.id, name: workflow.name }]),
		);
	}
}

function unique(ids: Array<string | null>): string[] {
	return [...new Set(ids.filter((id): id is string => id !== null))];
}
