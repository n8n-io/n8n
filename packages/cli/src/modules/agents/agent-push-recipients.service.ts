import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { RoleService } from '@/services/role.service';

@Service()
export class AgentPushRecipientsService {
	constructor(
		private readonly userRepository: UserRepository,
		private readonly roleService: RoleService,
	) {}

	async getProjectReaders(projectId: string): Promise<string[]> {
		const [globalRoleSlugs, projectRoleSlugs] = await Promise.all([
			this.roleService.rolesWithScope('global', ['agent:read']),
			this.roleService.rolesWithScope('project', ['agent:read']),
		]);
		return await this.userRepository.findIdsWithGlobalOrProjectRoles({
			projectIds: [projectId],
			projectRoleSlugs,
			globalRoleSlugs,
		});
	}
}
