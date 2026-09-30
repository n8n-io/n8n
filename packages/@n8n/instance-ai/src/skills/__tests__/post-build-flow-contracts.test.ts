import { resolvePromptProfile } from '../../prompts/prompt-profiles';
import { loadInstanceAiPromptSkills, loadInstanceAiRuntimeSkillSource } from '../runtime-skills';

describe('post-build-flow-contracts skill', () => {
	it('replaces post-build-flow only when node contracts are enabled', async () => {
		const runtime = loadInstanceAiRuntimeSkillSource();
		const original = await runtime.loadSkill('post-build-flow');
		const compact = await runtime.loadSkill('post-build-flow-contracts');
		const { profile } = resolvePromptProfile({});

		const off = await loadInstanceAiPromptSkills(profile);
		const on = await loadInstanceAiPromptSkills(profile, { nodeContractsEnabled: true });

		expect(await off.source.loadSkill('post-build-flow')).toEqual(original);
		const replaced = await on.source.loadSkill('post-build-flow');
		expect(replaced?.instructions).toBe(compact?.instructions);
		expect(replaced?.description).toBe(compact?.description);
		expect(replaced?.recommendedTools).toEqual(compact?.recommendedTools);
		expect(
			on.source.registry.skills.find(({ id }) => id === 'post-build-flow')?.linkedFiles.references,
		).toEqual([expect.objectContaining({ path: 'references/trigger-input-data-shapes.md' })]);
		await expect(off.source.loadSkill('post-build-flow-contracts')).resolves.toBeNull();
		await expect(on.source.loadSkill('post-build-flow-contracts')).resolves.toBeNull();
	});

	it('appends the progressive policy to the compact skill when both apply', async () => {
		const runtime = loadInstanceAiRuntimeSkillSource();
		const compact = await runtime.loadSkill('post-build-flow-contracts');
		const policy = await runtime.loadSkill('progressive-building');
		const { profile } = resolvePromptProfile({ mode: 'progressive' });

		const selected = await loadInstanceAiPromptSkills(profile, { nodeContractsEnabled: true });

		expect((await selected.source.loadSkill('post-build-flow'))?.instructions).toBe(
			`${compact?.instructions}\n\n${policy?.instructions}`,
		);
	});

	it('reads the verification from the build and keeps the follow-up routes', async () => {
		const compact = await loadInstanceAiRuntimeSkillSource().loadSkill('post-build-flow-contracts');
		const text = compact?.instructions ?? '';

		expect(compact?.description).toContain('workflow-verification-follow-up');
		expect(compact?.description).toContain('workflow-setup-required');
		for (const phrase of [
			'`verification` is present',
			'`claim.level`',
			'`nodesNotReached`',
			'`simulatedNodes`',
			'`setupRequirement.status === "required"`',
			'`triggerNodeName`',
			'`verificationDisclosure`',
			'`<workflow-test-request>`',
			'references/trigger-input-data-shapes.md',
		]) {
			expect(text).toContain(phrase);
		}
	});

	it('stays at most a third of the original size', async () => {
		const runtime = loadInstanceAiRuntimeSkillSource();
		const original = await runtime.loadSkill('post-build-flow');
		const compact = await runtime.loadSkill('post-build-flow-contracts');

		expect(Buffer.byteLength(compact?.instructions ?? '')).toBeLessThan(
			Buffer.byteLength(original?.instructions ?? '') / 3,
		);
	});
});
