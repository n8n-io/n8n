import { makeRestApiRequest } from '@n8n/rest-api-client';

import type { AquariumEntity, AquariumSourceContext } from '../aquarium.types';

interface MyProject {
	id: string;
	/** `project:…` for a membership. An admin also gets other team projects with a `global:…` role. */
	role: string;
}

/** Ids of the projects that the current account is a direct member of. */
export async function fetchMemberProjectIds({
	restApiContext,
}: AquariumSourceContext): Promise<Set<string>> {
	const projects = await makeRestApiRequest<MyProject[]>(
		restApiContext,
		'GET',
		'/projects/my-projects',
	);
	return new Set(
		projects.filter((project) => project.role.startsWith('project:')).map((project) => project.id),
	);
}

/** Marks each entity's project as a membership or not. Entities without a project stay as they are. */
export function applyMembership(
	entities: AquariumEntity[],
	memberProjectIds: Set<string>,
): AquariumEntity[] {
	return entities.map((entity) =>
		entity.project
			? {
					...entity,
					project: { ...entity.project, isMember: memberProjectIds.has(entity.project.id) },
				}
			: entity,
	);
}

/** True when an entity's project is a membership. */
export function isInMemberProject(entity: AquariumEntity): boolean {
	return entity.project?.isMember === true;
}

/** True when the entities carry membership, so a "my projects" filter can work. */
export function hasMembership(entities: AquariumEntity[]): boolean {
	return entities.some((entity) => entity.project?.isMember !== undefined);
}
