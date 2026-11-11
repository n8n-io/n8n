import {
	ConnectSkillSourceDto,
	DiscoverSkillSourceDto,
	SKILL_SOURCE_MAX_SKILLS,
} from '../skill-sources.schema';

const target = { url: 'https://github.com/acme/skills', scope: 'instance' };

const keys = (count: number) => Array.from({ length: count }, (_, index) => `key-${index}`);

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
