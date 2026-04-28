import { skillNameToId } from '../agents';

describe('skillNameToId', () => {
	it('lowercases and trims', () => {
		expect(skillNameToId('  Summarize Notes  ')).toBe('summarize_notes');
	});

	it('preserves underscores and hyphens', () => {
		expect(skillNameToId('summarize-notes_v2')).toBe('summarize-notes_v2');
	});

	it('collapses unsupported runs into a single underscore', () => {
		expect(skillNameToId('Hello!! World??')).toBe('hello_world');
	});

	it('strips leading and trailing underscores', () => {
		expect(skillNameToId('__hello__')).toBe('hello');
	});

	it('falls back to "skill" when normalisation produces an empty string', () => {
		expect(skillNameToId('   ')).toBe('skill');
		expect(skillNameToId('!!!')).toBe('skill');
		expect(skillNameToId('')).toBe('skill');
	});
});
