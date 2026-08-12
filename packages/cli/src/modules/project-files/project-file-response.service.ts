import type { ProjectFileResponse, ProjectFileUser } from '@n8n/api-types';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import type { ProjectFile } from './project-file.entity';

/**
 * Maps `ProjectFile` rows onto the API response, resolving actor ids to users.
 *
 * Actors are resolved in one extra query per page rather than per row, and the
 * binary data reference is dropped here — it must never reach a client, because
 * `GET /rest/binary-data?id=` performs no ownership check.
 */
@Service()
export class ProjectFileResponseService {
	constructor(private readonly userRepository: UserRepository) {}

	async toResponse(file: ProjectFile): Promise<ProjectFileResponse> {
		const [response] = await this.toResponses([file]);

		return response;
	}

	async toResponses(files: ProjectFile[]): Promise<ProjectFileResponse[]> {
		const usersById = await this.resolveActors(files);

		return files.map((file) => ({
			id: file.id,
			name: file.name,
			mimeType: file.mimeType,
			fileSizeBytes: file.fileSizeBytes,
			createdAt: file.createdAt.toISOString(),
			updatedAt: file.updatedAt.toISOString(),
			createdBy: file.createdById ? (usersById.get(file.createdById) ?? null) : null,
			updatedBy: file.updatedById ? (usersById.get(file.updatedById) ?? null) : null,
		}));
	}

	private async resolveActors(files: ProjectFile[]): Promise<Map<string, ProjectFileUser>> {
		const userIds = [
			...new Set(
				files.flatMap((file) =>
					[file.createdById, file.updatedById].filter((id): id is string => id !== null),
				),
			),
		];

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
}
