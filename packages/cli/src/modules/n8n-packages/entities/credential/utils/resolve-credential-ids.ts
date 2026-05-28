import type { Project, SharedCredentialsRepository, User } from '@n8n/db';
import { In } from '@n8n/typeorm';

import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';

const READ_SCOPE = ['credential:read'] as const;

export async function resolveCredentialIdsById(
	sourceIds: string[],
	targetProject: Project,
	user: User,
	sharedCredentialsRepository: SharedCredentialsRepository,
	credentialsFinderService: CredentialsFinderService,
): Promise<Set<string>> {
	const uniqueIds = [...new Set(sourceIds)];
	if (uniqueIds.length === 0) {
		return new Set();
	}

	const ownedByTargetProject = new Set(
		(
			await sharedCredentialsRepository.find({
				where: {
					credentialsId: In(uniqueIds),
					role: 'credential:owner',
					projectId: targetProject.id,
				},
				select: { credentialsId: true },
			})
		).map((row) => row.credentialsId),
	);

	const allCredentials = await credentialsFinderService.findAllCredentialsForUser(
		user,
		[...READ_SCOPE],
		undefined,
		{ includeGlobalCredentials: true },
	);

	const credentialById = new Map(allCredentials.map((credential) => [credential.id, credential]));

	const matches = uniqueIds.filter((id) => {
		const credential = credentialById.get(id);
		return credential !== undefined && (ownedByTargetProject.has(id) || credential.isGlobal);
	});

	return new Set(matches);
}
