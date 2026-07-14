import { describe, it, expect } from 'vitest';
import type { InlineAgentConfig } from '@n8n/api-types';

import { generateInlineSkillId, inlineAgentToCapabilitySummary } from '../inlineAgent';

describe('generateInlineSkillId', () => {
	it('mints ids in the backend skill_<nanoid> format', () => {
		expect(generateInlineSkillId()).toMatch(/^skill_[A-Za-z0-9_-]+$/);
	});

	it('avoids existing ids', () => {
		const first = generateInlineSkillId();
		expect(generateInlineSkillId([first])).not.toBe(first);
	});
});

describe('inlineAgentToCapabilitySummary', () => {
	const base: InlineAgentConfig = {
		config: {
			name: 'Embedded',
			model: 'openai/gpt-5',
			instructions: 'You are a helpful agent',
		},
	};

	it('maps skill refs to id + body name', () => {
		const summary = inlineAgentToCapabilitySummary('node-1', {
			config: {
				...base.config,
				skills: [{ type: 'skill', id: 'skill_triage' }],
			},
			skills: {
				skill_triage: {
					name: 'Triage',
					description: 'Triage incoming requests',
					instructions: 'Categorize the request and route it.',
				},
			},
		});

		expect(summary.skills).toEqual([{ id: 'skill_triage', name: 'Triage' }]);
	});

	it('falls back to the ref id when the body is missing', () => {
		const summary = inlineAgentToCapabilitySummary('node-1', {
			config: {
				...base.config,
				skills: [{ type: 'skill', id: 'skill_gone' }],
			},
		});

		expect(summary.skills).toEqual([{ id: 'skill_gone', name: 'skill_gone' }]);
	});

	it('reports no skills for a config without refs', () => {
		expect(inlineAgentToCapabilitySummary('node-1', base).skills).toEqual([]);
	});
});
