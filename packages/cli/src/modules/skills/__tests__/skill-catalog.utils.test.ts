import { categorizeSkill, readPublicLeaderboard } from '../utils/skill-catalog';

describe('public skill catalog data', () => {
	it('reads leaderboard props split across serialized page chunks', () => {
		const skills = [{ source: 'acme/skills', skillId: 'pdf', name: 'pdf', installs: 42 }];
		const stream = `1:I[123]\n2:["$","$L3",null,${JSON.stringify({ initialSkills: skills })}]\n`;
		const chunks = [stream.slice(0, 40), stream.slice(40)];
		const html = chunks
			.map((chunk) => `<script>self.__next_f.push(${JSON.stringify([1, chunk])})</script>`)
			.join('');
		expect(readPublicLeaderboard(html)).toEqual(skills);
	});

	it('ignores executable scripts and rejects missing leaderboard props', () => {
		expect(() => readPublicLeaderboard('<script>self.__next_f.push(run())</script>')).toThrow(
			'unavailable',
		);
	});

	it('groups known tasks and leaves ambiguous skills in Other', () => {
		expect(categorizeSkill('pdf')).toBe('documents');
		expect(categorizeSkill('frontend-design')).toBe('design');
		expect(categorizeSkill('agent-browser', 'Automate Figma and other apps')).toBe('research');
		expect(categorizeSkill('reporting', 'Analyze SQL data')).toBe('data');
		expect(categorizeSkill('my-helper')).toBe('other');
	});
});
