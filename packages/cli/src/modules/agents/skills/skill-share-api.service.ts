import type {
	CheckSkillContentDto,
	ImportSharedSkillDto,
	SkillCheckResult,
	SkillDetail,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError } from '@n8n/errors';

import { checkSkillContent } from './skill-security-check';
import { SkillsApiService } from './skills-api.service';

type ExternalSkill = CheckSkillContentDto['skill'];

/** The files of a skill as the check reads them. SKILL.md holds the frontmatter fields too. */
function filesOf(skill: ExternalSkill) {
	return [
		{
			path: 'SKILL.md',
			content: [skill.name, skill.description, skill.instructions].join('\n'),
		},
		...(skill.references ?? []),
	];
}

/**
 * Skills that come from a share link. The link and its relay stay in the browser: the
 * server only sees the decrypted skill, checks it and stores it like any other create.
 */
@Service()
export class SkillShareApiService {
	constructor(private readonly skillsApi: SkillsApiService) {}

	check(payload: CheckSkillContentDto): SkillCheckResult {
		return checkSkillContent(filesOf(payload.skill), []);
	}

	async importShared(user: User, payload: ImportSharedSkillDto): Promise<SkillDetail> {
		// The browser showed the result, but only this check decides.
		const { result } = this.check(payload);
		if (result === 'blocked') {
			throw new BadRequestError('This skill did not pass the security check.');
		}
		if (result === 'review' && !payload.acknowledgeWarnings) {
			throw new BadRequestError('Confirm the security check findings to add this skill.');
		}
		const { scope, projectId, agentId, skill } = payload;
		return await this.skillsApi.create(user, { scope, projectId, agentId, skill }, 'link');
	}
}
