import type {
	AcceptSkillGitUpdateDto,
	DiscoverGitHubSkillsDto,
	DiscoverGitHubSkillsResponse,
	ImportGitHubSkillsDto,
	ImportGitHubSkillsResponse,
	SkillGitUpdateDetail,
	SkipSkillGitUpdateDto,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { SkillsApiService } from '../skills-api.service';
import { SkillGitSyncService } from './skill-git-sync.service';

/**
 * GitHub sync as the settings page uses it. Importing needs the create permission in the
 * chosen place, as "Add skill" does. Everything on a synced skill needs the permission to
 * edit it, as Save does.
 */
@Service()
export class SkillsGitHubApiService {
	constructor(
		private readonly skillsApi: SkillsApiService,
		private readonly sync: SkillGitSyncService,
	) {}

	async discover(
		_user: User,
		payload: DiscoverGitHubSkillsDto,
	): Promise<DiscoverGitHubSkillsResponse> {
		return await this.sync.discover(payload.url);
	}

	async import(user: User, payload: ImportGitHubSkillsDto): Promise<ImportGitHubSkillsResponse> {
		const target = await this.skillsApi.targetForCreate(user, {
			scope: payload.scope,
			projectId: payload.projectId,
		});
		return await this.sync.import({
			url: payload.url,
			commitSha: payload.commitSha,
			paths: payload.paths,
			target,
			acknowledgeWarnings: payload.acknowledgeWarnings ?? false,
			userId: user.id,
		});
	}

	async getUpdate(user: User, skillId: string): Promise<SkillGitUpdateDetail> {
		await this.skillsApi.requireAccess(user, skillId, 'update');
		return await this.sync.getUpdate(skillId);
	}

	async accept(user: User, skillId: string, payload: AcceptSkillGitUpdateDto) {
		await this.skillsApi.requireAccess(user, skillId, 'update');
		return await this.sync.accept(
			skillId,
			payload.toCommitSha,
			payload.acknowledgeWarnings ?? false,
			user.id,
		);
	}

	async skip(user: User, skillId: string, payload: SkipSkillGitUpdateDto): Promise<void> {
		await this.skillsApi.requireAccess(user, skillId, 'update');
		await this.sync.skip(skillId, payload.toCommitSha);
	}

	async checkNow(user: User, skillId: string) {
		await this.skillsApi.requireAccess(user, skillId, 'update');
		await this.sync.checkSkill(skillId);
		return await this.skillsApi.get(user, skillId);
	}

	async stopSyncing(user: User, skillId: string): Promise<void> {
		await this.skillsApi.requireAccess(user, skillId, 'update');
		await this.sync.stopSyncing(skillId);
	}
}
