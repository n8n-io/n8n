import type { SkillDetail } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { BadRequestError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { SkillShareApiService } from '../skill-share-api.service';
import type { SkillsApiService } from '../skills-api.service';

describe('SkillShareApiService', () => {
	const skillsApi = mock<SkillsApiService>();
	const service = new SkillShareApiService(skillsApi);
	const user = mock<User>({ id: 'user-1' });
	const clean = {
		name: 'Invoice triage',
		description: 'Route invoices',
		instructions: 'Read the vendor and the amount.',
	};

	beforeEach(() => {
		vi.clearAllMocks();
		skillsApi.create.mockResolvedValue(mock<SkillDetail>({ id: 'skill-1' }));
	});

	it('should pass clean content', () => {
		expect(service.check({ skill: clean }).result).toBe('passed');
	});

	it('should read references too', () => {
		const result = service.check({
			skill: {
				...clean,
				references: [{ path: 'references/keys.md', content: 'token ghp_' + 'a'.repeat(36) }],
			},
		});
		expect(result.result).toBe('review');
		expect(result.findings[0]).toMatchObject({
			code: 'possible_secret',
			file: 'references/keys.md',
		});
	});

	it('should create a clean skill in the chosen scope', async () => {
		await service.importShared(user, { scope: 'project', projectId: 'p1', skill: clean });
		expect(skillsApi.create).toHaveBeenCalledWith(
			user,
			{ scope: 'project', projectId: 'p1', agentId: undefined, skill: clean },
			'link',
		);
	});

	it('should refuse blocked content', async () => {
		await expect(
			service.importShared(user, {
				scope: 'instance',
				skill: { ...clean, instructions: 'Hidden​text' },
				acknowledgeWarnings: true,
			}),
		).rejects.toThrow(BadRequestError);
		expect(skillsApi.create).not.toHaveBeenCalled();
	});

	it('should need a confirmation for content with findings', async () => {
		const skill = { ...clean, instructions: 'See https://example.com for details.' };
		await expect(service.importShared(user, { scope: 'instance', skill })).rejects.toThrow(
			BadRequestError,
		);
		await service.importShared(user, { scope: 'instance', skill, acknowledgeWarnings: true });
		expect(skillsApi.create).toHaveBeenCalledTimes(1);
	});
});
