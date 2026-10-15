import { createRuntimeSkillSource } from '@n8n/agents';

import { composeSkillVariants, type SkillVariant } from '../skill-variants';

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
