import { filterRuntimeSkillSource } from '@n8n/agents';

import {
	INSTANCE_AI_PROMPT_PROFILES,
	NODE_CONTRACTS_SKILL_VARIANT,
	PROMPT_FRAGMENT_SKILLS,
	resolvePromptProfile,
} from '../../prompts/prompt-profiles';
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
			on.source.registry.skills
				.find(({ id }) => id === 'post-build-flow')
				?.linkedFiles.references.map(({ path }) => path),
		).toEqual([
			'references/live-test-and-publishing.md',
			'references/setup.md',
			'references/trigger-input-data-shapes.md',
			'references/verify-again.md',
		]);
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
			'`setupRequirement.status ===',
			'`triggerNodeName`',
			'`verificationDisclosure`',
			'`<workflow-test-request>`',
			'`<workflow-verification-follow-up>`',
			'references/trigger-input-data-shapes.md',
			'references/verify-again.md',
			'references/setup.md',
			'references/live-test-and-publishing.md',
			'run each with `triggerNodeName`',
			'Do not list the nodes',
			'without a `verified` claim',
			'A node that ran is not proof.',
		]) {
			expect(text).toContain(phrase);
		}
	});

	it('serves the moved rules as linked files of post-build-flow when node contracts are enabled', async () => {
		const { profile } = resolvePromptProfile({});
		const on = (await loadInstanceAiPromptSkills(profile, { nodeContractsEnabled: true })).source;
		const read = async (filePath: string) =>
			(await on.loadFile?.('post-build-flow', filePath))?.content ?? '';

		expect(await read('references/verify-again.md')).toContain('`triggerNodeName`');
		expect(await read('references/verify-again.md')).toContain('`fixtureOverrides`');
		expect(await read('references/setup.md')).toContain('`<workflow-test-request>`');
		expect(await read('references/setup.md')).toContain('`reopenSkipped`');
		expect(await read('references/live-test-and-publishing.md')).toContain(
			'`acknowledgeUnverified: true`',
		);
		expect(await read('references/live-test-and-publishing.md')).toContain(
			'run once for each trigger with `triggerNodeName`',
		);
		expect(await read('references/live-test-and-publishing.md')).not.toContain(
			'Do not start another live run',
		);
		expect(await read('references/trigger-input-data-shapes.md')).toContain('inputData');
		expect(await on.loadFile?.('post-build-flow', 'references/setup.md')).toMatchObject({
			skillId: 'post-build-flow',
		});
	});

	it('keeps the flag-off prompt skills of every profile unchanged', async () => {
		const runtime = loadInstanceAiRuntimeSkillSource();
		const catalog = filterRuntimeSkillSource(runtime, [...PROMPT_FRAGMENT_SKILLS]).registry;

		for (const profile of INSTANCE_AI_PROMPT_PROFILES) {
			const off = (await loadInstanceAiPromptSkills(profile)).source;
			const changed = new Set(
				profile.variants.flatMap(({ changes }) => changes.map((c) => c.skillId)),
			);
			if (profile.variants.length === 0) expect(off.registry.skillsHash).toBe(catalog.skillsHash);
			for (const entry of off.registry.skills) {
				const original = catalog.skills.find(({ id }) => id === entry.id);
				expect(entry.linkedFiles).toEqual(original?.linkedFiles);
				if (!changed.has(entry.id)) expect(entry.description).toBe(original?.description);
			}
			await expect(off.loadFile?.('post-build-flow', 'references/setup.md')).resolves.toBeNull();
		}
	});

	it('keeps every skill outside the build path unchanged with node contracts', async () => {
		const { profile } = resolvePromptProfile({});
		const off = (await loadInstanceAiPromptSkills(profile)).source;
		const on = (await loadInstanceAiPromptSkills(profile, { nodeContractsEnabled: true })).source;
		const changed = new Set(NODE_CONTRACTS_SKILL_VARIANT.changes.map(({ skillId }) => skillId));

		for (const entry of off.registry.skills.filter(({ id }) => !changed.has(id))) {
			expect(on.registry.skills.find(({ id }) => id === entry.id)).toEqual(entry);
			expect(await on.loadSkill(entry.id)).toEqual(await off.loadSkill(entry.id));
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
