import { Service } from '@n8n/di';
import { CredentialsRepository } from '@/databases/repositories/credentials.repository';
import { SharedCredentialsRepository } from '@/databases/repositories/shared-credentials.repository';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { UserRepository } from '@/databases/repositories/user.repository';
import type { User } from '@/databases/entities/user';
import { SHARED_CREDENTIAL_TYPES, type CredentialType } from '../constants/credentials';

@Service()
export class CredentialsSharingService {
	constructor(
		private readonly credentialsRepository: CredentialsRepository,
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly userRepository: UserRepository,
	) {}

	async shareOwnerAiCredentialsWithMember(
		member: User,
		credentialTypes: CredentialType[] = [...SHARED_CREDENTIAL_TYPES],
	) {
		// find owner
		const owner = await this.userRepository.findOne({
			where: { role: 'global:owner' },
		});

		if (!owner) {
			return;
		}

		const ownerPersonalProject = await this.projectRepository.getPersonalProjectForUserOrFail(
			owner.id,
		);

		// find AI credentials from owner
		const ownerAiCredentials = await this.credentialsRepository
			.createQueryBuilder('credentials')
			.leftJoinAndSelect('credentials.shared', 'shared')
			.where('shared.projectId = :projectId', { projectId: ownerPersonalProject.id })
			.andWhere('shared.role = :role', { role: 'credential:owner' })
			.andWhere('credentials.type IN (:...types)', { types: credentialTypes })
			.getMany();

		if (!ownerAiCredentials.length) {
			return;
		}

		const memberPersonalProject = await this.projectRepository.getPersonalProjectForUserOrFail(
			member.id,
		);

		for (const credential of ownerAiCredentials) {
			// read already shared credentials
			const existingSharing = await this.sharedCredentialsRepository.findOne({
				where: {
					credentialsId: credential.id,
					projectId: memberPersonalProject.id,
				},
			});

			if (!existingSharing) {
				// new shared credentials
				await this.sharedCredentialsRepository.save({
					credentialsId: credential.id,
					projectId: memberPersonalProject.id,
					role: 'credential:user',
				});
			}
		}
	}
}
