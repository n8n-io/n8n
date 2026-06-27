import {
	createBuiltinRuntimeSkillSource,
	createFullBuiltinRuntimeSkillSource,
} from '../skills/builtin-runtime-skills';

describe('built-in runtime skills', () => {
	it('hides script files from the model-facing source while preserving them for snapshots', async () => {
		const source = createBuiltinRuntimeSkillSource();
		const fullSource = createFullBuiltinRuntimeSkillSource();

		const skill = source.registry.skills.find((entry) => entry.id === 'aiq-research');
		const fullSkill = fullSource.registry.skills.find((entry) => entry.id === 'aiq-research');

		expect(skill?.linkedFiles.scripts).toEqual([]);
		expect(source.loadFile).toBeUndefined();
		expect((await source.loadSkill('aiq-research'))?.linkedFiles?.scripts).toEqual([]);
		expect(fullSkill?.linkedFiles.scripts).toEqual([
			expect.objectContaining({ path: 'scripts/aiq.py' }),
		]);
	});
});
