import {
	AcceptSkillSourceUpdatesDto,
	ConnectSkillSourceDto,
	DiscoverSkillSourceDto,
	DeleteSkillSourceQueryDto,
	SKILL_SOURCE_MAX_SKILLS,
} from '../skill-sources.schema';

const target = { url: 'https://github.com/acme/skills', scope: 'instance' };

const keys = (count: number) => Array.from({ length: count }, (_, index) => `key-${index}`);

describe('DeleteSkillSourceQueryDto', () => {
	it.each([
		[undefined, undefined],
		['false', false],
		['true', true],
	])('parses keepSkills=%s', (input, expected) => {
		expect(DeleteSkillSourceQueryDto.parse({ keepSkills: input }).keepSkills).toBe(expected);
	});

	it.each(['yes', '0', '', ['true'], {}])('rejects invalid keepSkills=%j', (keepSkills) => {
		expect(DeleteSkillSourceQueryDto.safeParse({ keepSkills }).success).toBe(false);
	});

	it('accepts a skill ID and rejects an empty ID for last-skill removal', () => {
		expect(DeleteSkillSourceQueryDto.parse({ onlySkillId: 'skill-1' }).onlySkillId).toBe('skill-1');
		expect(DeleteSkillSourceQueryDto.safeParse({ onlySkillId: '' }).success).toBe(false);
	});
});

describe('ConnectSkillSourceDto', () => {
	it.each([
		[0, false],
		[1, true],
		[SKILL_SOURCE_MAX_SKILLS, true],
		[SKILL_SOURCE_MAX_SKILLS + 1, false],
	])('with %i skill keys, accepts: %s', (count, accepted) => {
		const result = ConnectSkillSourceDto.safeParse({ ...target, skillKeys: keys(count) });

		expect(result.success).toBe(accepted);
	});

	it('allows as many keys as discover lists', () => {
		expect(SKILL_SOURCE_MAX_SKILLS).toBe(200);
	});
});

describe('DiscoverSkillSourceDto', () => {
	const urlOfLength = (length: number) => {
		const base = 'https://github.com/acme/';
		return base + 'a'.repeat(length - base.length);
	};

	it.each([
		[2048, true],
		[2049, false],
	])('with a link of %i characters, accepts: %s', (length, accepted) => {
		const result = DiscoverSkillSourceDto.safeParse({ ...target, url: urlOfLength(length) });

		expect(result.success).toBe(accepted);
	});

	it('refuses a link of only spaces', () => {
		expect(DiscoverSkillSourceDto.safeParse({ ...target, url: '   ' }).success).toBe(false);
	});

	it('trims the link', () => {
		const result = DiscoverSkillSourceDto.safeParse({
			...target,
			url: '  https://github.com/a/b ',
		});

		expect(result.data?.url).toBe('https://github.com/a/b');
	});
});

describe('AcceptSkillSourceUpdatesDto', () => {
	const update = { skillId: 'skill-1', contentHash: 'a'.repeat(64), baseVersionId: 'version-1' };
	it.each(['contentHash', 'baseVersionId'])('requires %s independently', (field) => {
		expect(
			AcceptSkillSourceUpdatesDto.safeParse({ updates: [{ ...update, [field]: undefined }] })
				.success,
		).toBe(false);
	});
	it('requires warning acknowledgment by default', () => {
		expect(
			AcceptSkillSourceUpdatesDto.safeParse({ updates: [update] }).data?.reviewedWarnings,
		).toBe(false);
	});
	it('refuses a duplicate skill in one selection', () => {
		expect(AcceptSkillSourceUpdatesDto.safeParse({ updates: [update, update] }).success).toBe(
			false,
		);
	});
	it('refuses an empty or oversized selection', () => {
		expect(AcceptSkillSourceUpdatesDto.safeParse({ updates: [] }).success).toBe(false);
		expect(
			AcceptSkillSourceUpdatesDto.safeParse({
				updates: keys(SKILL_SOURCE_MAX_SKILLS + 1).map((skillId) => ({ ...update, skillId })),
			}).success,
		).toBe(false);
	});
	it('allows new-only imports and skips, but refuses duplicate or oversized mixed selections', () => {
		const newSkill = { key: 'new-skill', contentHash: 'b'.repeat(64) };
		expect(
			AcceptSkillSourceUpdatesDto.safeParse({ updates: [], newSkills: [newSkill] }).success,
		).toBe(true);
		expect(
			AcceptSkillSourceUpdatesDto.safeParse({ updates: [], skippedNewSkills: [newSkill] }).success,
		).toBe(true);
		expect(
			AcceptSkillSourceUpdatesDto.safeParse({ updates: [], newSkills: [newSkill, newSkill] })
				.success,
		).toBe(false);
		expect(
			AcceptSkillSourceUpdatesDto.safeParse({
				updates: [],
				newSkills: [newSkill],
				skippedNewSkills: [newSkill],
			}).success,
		).toBe(false);
		expect(
			AcceptSkillSourceUpdatesDto.safeParse({
				updates: [update],
				newSkills: keys(SKILL_SOURCE_MAX_SKILLS).map((key) => ({ ...newSkill, key })),
			}).success,
		).toBe(false);
	});
});
