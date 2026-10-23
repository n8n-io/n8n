import type { StoredAgentConfig } from '@n8n/api-types';

import { keepLegacySkillRefs, withoutLegacySkillRefs } from '../agent-document';

const next = { name: 'Next', model: '', instructions: 'New.' } as StoredAgentConfig;
const legacyRefs = [{ type: 'skill', id: 'legacy' }];

describe('keepLegacySkillRefs', () => {
	it('keeps the legacy skills key of the previous config', () => {
		const previous = { name: 'Old', model: '', skills: legacyRefs } as unknown as StoredAgentConfig;

		expect(keepLegacySkillRefs(previous, next)).toEqual({ ...next, skills: legacyRefs });
	});

	it('adds no skills key when the previous config has none', () => {
		const previous = { name: 'Old', model: '' } as StoredAgentConfig;

		expect(keepLegacySkillRefs(previous, next)).not.toHaveProperty('skills');
		expect(keepLegacySkillRefs(null, next)).toBe(next);
	});

	it('is undone by withoutLegacySkillRefs', () => {
		const previous = { name: 'Old', model: '', skills: legacyRefs } as unknown as StoredAgentConfig;

		expect(withoutLegacySkillRefs(keepLegacySkillRefs(previous, next))).toEqual(next);
	});
});
