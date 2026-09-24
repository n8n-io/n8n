import { createRuntimeSkillSource, filterRuntimeSkillSource } from '@n8n/agents';

import { getSystemPrompt } from '../../agent/system-prompt';
import {
	loadInstanceAiPromptSkills,
	loadInstanceAiRuntimeSkillSource,
} from '../../skills/runtime-skills';
import {
	assertInstanceAiPromptVersion,
	getVersionedSystemPrompt,
	describePromptProfile,
	resolvePromptProfile,
	INSTANCE_AI_PROMPT_PROFILES,
	PROMPT_FRAGMENT_SKILLS,
} from '../prompt-profiles';
import { composeSkillVariants, type SkillVariant } from '../skill-variants';

describe('prompt profiles', () => {
	it('preserves the default prompt, skills, and tools', async () => {
		const selected = resolvePromptProfile({});
		const original = filterRuntimeSkillSource(
			loadInstanceAiRuntimeSkillSource(),
			PROMPT_FRAGMENT_SKILLS,
		);
		const result = await loadInstanceAiPromptSkills(selected.profile);
		expect(result.source.registry).toEqual(original.registry);
		expect(result.disabledTools).toEqual([]);
		expect(getVersionedSystemPrompt(selected.profile.systemPromptVersion, {})).toBe(
			getSystemPrompt({}),
		);
	});

	it('selects skills and tool exclusions together', async () => {
		const selected = resolvePromptProfile({ mode: 'progressive' });
		const result = await loadInstanceAiPromptSkills(selected.profile);
		expect(result.disabledTools).toEqual(['create-tasks']);
		await expect(result.source.loadSkill('planning')).resolves.toBeNull();
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

	it('rejects duplicate profile identifiers', () => {
		expect(() =>
			resolvePromptProfile({}, [...INSTANCE_AI_PROMPT_PROFILES, resolvePromptProfile({}).profile]),
		).toThrow('must be unique');
	});

	it('registers another profile without changing the system prompt', async () => {
		const fixture: SkillVariant = {
			id: 'concise@1',
			changes: [{ skillId: 'answers', appendFrom: 'concise' }],
		};
		const profiles = [
			...INSTANCE_AI_PROMPT_PROFILES,
			{
				...resolvePromptProfile({}).profile,
				version: 'concise@1',
				variants: [fixture],
			},
		];
		const selected = resolvePromptProfile({ version: 'concise@1' }, profiles);
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

describe('skill variant composition', () => {
	const source = createRuntimeSkillSource([
		{
			id: 'build',
			name: 'build',
			description: 'Build.',
			instructions: 'Build carefully.',
			dependencies: { tools: ['save'] },
		},
		{ id: 'review', name: 'review', description: 'Review.', instructions: 'Inspect first.' },
		{ id: 'policy', name: 'policy', description: 'Policy.', instructions: 'Check the result.' },
	]);
	const build: SkillVariant = {
		id: 'build@1',
		changes: [{ skillId: 'build', appendFrom: 'policy' }],
	};
	const review: SkillVariant = {
		id: 'review@1',
		changes: [{ skillId: 'review', appendFrom: 'policy' }],
	};

	it('composes independent changes without changing the original source', async () => {
		const result = await composeSkillVariants(source, [build, review]);
		expect((await result.source.loadSkill('build'))?.instructions).toContain('Check the result.');
		expect((await result.source.loadSkill('review'))?.instructions).toContain('Check the result.');
		expect((await source.loadSkill('build'))?.instructions).toBe('Build carefully.');
	});

	it('rejects duplicate, overlapping, disabled, and missing targets', async () => {
		await expect(composeSkillVariants(source, [build, build])).rejects.toThrow('Duplicate');
		await expect(
			composeSkillVariants(source, [build, { ...build, id: 'other@1' }]),
		).rejects.toThrow('Conflicting');
		await expect(
			composeSkillVariants(source, [{ ...build, disabledSkills: ['build'] }]),
		).rejects.toThrow('disabled skill');
		await expect(
			composeSkillVariants(source, [
				{ id: 'missing@1', changes: [{ skillId: 'missing', appendFrom: 'policy' }] },
			]),
		).rejects.toThrow('Unknown variant target');
	});

	it('rejects removing a tool that a remaining skill requires', async () => {
		await expect(
			composeSkillVariants(source, [{ id: 'no-save@1', changes: [], disabledTools: ['save'] }]),
		).rejects.toThrow('requires disabled tool');
	});

	it('removes disabled recommendations without treating them as required dependencies', async () => {
		const optional = createRuntimeSkillSource([
			{
				id: 'review',
				name: 'review',
				description: 'Review work.',
				instructions: 'Review the result.',
				recommendedTools: ['inspect', 'save'],
			},
		]);
		const result = await composeSkillVariants(optional, [
			{ id: 'read-only@1', changes: [], disabledTools: ['save'] },
		]);
		expect((await result.source.loadSkill('review'))?.recommendedTools).toEqual(['inspect']);
		expect((await result.source.loadSkill('review'))?.instructions).toBe('Review the result.');
	});
});
