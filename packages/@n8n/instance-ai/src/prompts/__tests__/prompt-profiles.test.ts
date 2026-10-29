import { createRuntimeSkillSource, filterRuntimeSkillSource } from '@n8n/agents';

import { getSystemPrompt } from '../../agent/system-prompt';
import { composeSkillVariants, type SkillVariant } from '../../skills/skill-variants';
import { loadInstanceAiPromptSkills, loadInstanceAiSkills } from '../../skills/skills';
import {
	assertInstanceAiPromptVersion,
	getVersionedSystemPrompt,
	describePromptProfile,
	resolvePromptProfile,
	INSTANCE_AI_PROMPT_PROFILES,
	PROMPT_FRAGMENT_SKILLS,
} from '../prompt-profiles';

describe('prompt profiles', () => {
	it('preserves the default prompt, skills, and tools', async () => {
		const selected = resolvePromptProfile({});
		const original = filterRuntimeSkillSource(loadInstanceAiSkills(), PROMPT_FRAGMENT_SKILLS);
		const result = await loadInstanceAiPromptSkills(selected.profile);
		expect(result.source.registry).toEqual(original.registry);
		expect(result.disabledTools).toEqual([]);
		expect(getVersionedSystemPrompt(selected.profile.systemPromptVersion, {})).toBe(
			getSystemPrompt({}),
		);
	});

	it('selects the progressive skill variants', async () => {
		const selected = resolvePromptProfile({ mode: 'progressive' });
		const result = await loadInstanceAiPromptSkills(selected.profile);
		expect(result.disabledTools).toEqual([]);
		await expect(result.source.loadSkill('progressive-building')).resolves.toBeNull();
		expect((await result.source.loadSkill('workflow-builder'))?.version).toBe(
			'progressive-building@1',
		);
		expect(describePromptProfile(selected, result.source)).toEqual({
			version: 'progressive@1',
			systemPromptVersion: 'instance-agent@1',
			skillVariants: ['progressive-building@1'],
			skillsHash: result.source.registry.skillsHash,
		});
	});

	it('honors explicit versions before mode and reports retired-version fallback', () => {
		expect(resolvePromptProfile({ version: 'default@1', mode: 'progressive' }).profile.mode).toBe(
			'default',
		);
		expect(resolvePromptProfile({ version: 'progressive@1', mode: 'default' }).profile.mode).toBe(
			'progressive',
		);
		const retired = resolvePromptProfile({ version: 'retired@1', mode: 'progressive' });
		expect(retired.profile.version).toBe('default@1');
		expect(retired.fallbackFrom).toBe('retired@1');
		expect(() => assertInstanceAiPromptVersion('retired@1')).toThrow(
			'Unknown Instance AI prompt version',
		);
	});

	it('varies only the communication style in the concise profile', async () => {
		const concise = resolvePromptProfile({ version: 'concise@1' });
		expect(concise.fallbackFrom).toBeUndefined();
		expect(concise.profile.mode).toBe('default');

		// Skills must be untouched: the concise profile carries no skill variants.
		const result = await loadInstanceAiPromptSkills(concise.profile);
		const original = await loadInstanceAiPromptSkills(resolvePromptProfile({}).profile);
		expect(result.source.registry).toEqual(original.source.registry);
		expect(result.disabledTools).toEqual([]);
		expect(describePromptProfile(concise, result.source)).toEqual({
			version: 'concise@1',
			systemPromptVersion: 'instance-agent-concise@1',
			skillVariants: [],
			skillsHash: result.source.registry.skillsHash,
		});
	});

	it('carries the rules each measurement put there, and omits the two rejected ones', () => {
		const concise = resolvePromptProfile({ version: 'concise@1' });
		const rendered = getVersionedSystemPrompt(concise.profile.systemPromptVersion, {});

		// Sentence limits: a formatting-only draft left mean sentence length flat and
		// raised the share of sentences over 20 words. Only this rule moves it.
		expect(rendered).toContain('Keep a sentence under 20 words.');
		expect(rendered).toContain('End with one concrete next step');
		expect(rendered).toContain('Keep the fact and drop the significance.');
		// The substance guard has to name a limit concretely; "a real limitation"
		// alone lost the platform-restriction disclosure in 2 of 3 runs.
		expect(rendered).toContain('unprompted or scheduled messages');
		// No banned-word list: measured zero hits, so it only cost prompt budget.
		expect(rendered).not.toContain('Do not use these words');
		// Hedge ban deliberately not adopted — `## Capability Honesty` needs "may not work".
		expect(rendered).toContain('may not work');
	});

	it('renders the concise style and keeps every shared system prompt section', () => {
		const conciseVersion = resolvePromptProfile({ version: 'concise@1' }).profile
			.systemPromptVersion;
		const concise = getVersionedSystemPrompt(conciseVersion, {});
		const standard = getSystemPrompt();

		expect(concise).not.toBe(standard);
		expect(concise).toContain('Say each thing once.');
		expect(concise).toContain('Brevity must not remove substance.');
		expect(standard).not.toContain('Say each thing once.');
		expect(standard).toContain('- Be concise.');
		expect(concise).not.toContain('- Be concise.');

		// The extraction must not have dropped anything outside the style block.
		for (const shared of [
			'## Capability Honesty',
			'## Setup Accuracy',
			'## Safety',
			'## Reply language',
		]) {
			expect(standard).toContain(shared);
			expect(concise).toContain(shared);
		}

		// Operational rules are tone-independent: both variants keep them.
		for (const operational of [
			'Never let an empty assistant message',
			'End every tool call sequence with a brief text summary',
			'always fill it with one plain-language line',
			'No emojis unless the user explicitly requests them.',
		]) {
			expect(standard).toContain(operational);
			expect(concise).toContain(operational);
		}
	});

	it('rejects duplicate profile identifiers', () => {
		expect(() =>
			resolvePromptProfile({}, [...INSTANCE_AI_PROMPT_PROFILES, resolvePromptProfile({}).profile]),
		).toThrow('must be unique');
	});

	it('registers another profile without changing the system prompt', async () => {
		const fixture: SkillVariant = {
			id: 'terse-fixture@1',
			changes: [{ skillId: 'answers', appendFrom: 'concise' }],
		};
		const profiles = [
			...INSTANCE_AI_PROMPT_PROFILES,
			{
				...resolvePromptProfile({}).profile,
				version: 'terse-fixture@1',
				variants: [fixture],
			},
		];
		const selected = resolvePromptProfile({ version: 'terse-fixture@1' }, profiles);
		const source = createRuntimeSkillSource([
			{
				id: 'answers',
				name: 'answers',
				description: 'Answer questions.',
				instructions: 'Answer from the evidence.',
			},
			{
				id: 'concise',
				name: 'concise',
				description: 'Keep answers short.',
				instructions: 'Use one paragraph.',
			},
		]);
		const result = await composeSkillVariants(source, selected.profile.variants);
		expect((await result.source.loadSkill('answers'))?.instructions).toBe(
			'Answer from the evidence.\n\nUse one paragraph.',
		);
		await expect(result.source.loadSkill('concise')).resolves.toBeNull();
		expect(getVersionedSystemPrompt(selected.profile.systemPromptVersion, {})).toBe(
			getSystemPrompt({}),
		);
	});
});
