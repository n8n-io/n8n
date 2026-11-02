import { Agent } from '../../../sdk/agent';
import { isRuntimeSkillCatalog } from '../../../sdk/message';
import {
	createRuntimeSkillSource,
	extendRuntimeSkillSource,
	filterRuntimeSkillSource,
} from '../../../skills/registry';
import type { RuntimeSkillSource } from '../../../skills/types';
import type { AgentRuntimeConfig } from '../../../types/runtime/agent-runtime';
import { AgentMessageList } from '../../model/message-list';
import { ActiveSkills } from '../../skills/active-skills';
import { RuntimeContextBuilder } from '../runtime-context';

const builtIn = {
	id: 'notes',
	name: 'notes',
	description: 'Summarize notes.',
	instructions: 'Extract decisions.',
};
const custom = {
	id: 'custom-review',
	name: 'Project review',
	description: 'Review project invoices.',
	instructions: 'Private review instructions.',
};
const marker = { anthropic: { cacheControl: { type: 'ephemeral' } } };

class TestAgent extends Agent {
	async config() {
		return await this.build();
	}
}

function source(description = custom.description): RuntimeSkillSource {
	return {
		...createRuntimeSkillSource([builtIn, { ...custom, description }]),
		dynamicCatalog: { skillIds: [custom.id], notice: 'Load by exact skillId.' },
	};
}

async function config(skills: RuntimeSkillSource): Promise<AgentRuntimeConfig> {
	return await new TestAgent('catalog-test')
		.model('anthropic/claude-opus-4-8')
		.instructions('Base instructions.', { providerOptions: marker })
		.skills(skills)
		.promptCaching()
		.config();
}

function input(list = new AgentMessageList()) {
	list.addInput([{ role: 'user', content: [{ type: 'text', text: 'Review this invoice.' }] }]);
	return list;
}

async function prompt(
	runtime: AgentRuntimeConfig,
	list: AgentMessageList,
	activeSkills?: ActiveSkills,
) {
	const builder = new RuntimeContextBuilder(runtime, undefined);
	return builder.buildModelPrompt({
		list,
		tools: await builder.buildToolLoopContext({}),
		instructionProviderOptions: builder.buildInstructionProviderOptions(),
		hostVolatileInstructions: undefined,
		activeSkills,
	});
}

describe('dynamic skill catalogues', () => {
	it('preserves the built-in instruction bytes, cache key, and tool schema', async () => {
		const original = await config(createRuntimeSkillSource([builtIn]));
		const dynamic = await config(source());
		expect(dynamic.instructions).toBe(original.instructions);
		const before = await prompt({ ...original, model: 'openai/gpt-4.1' }, input());
		const after = await prompt({ ...dynamic, model: 'openai/gpt-4.1' }, input());
		expect(after.system).toEqual(before.system);
		expect(JSON.stringify(after.aiTools)).toBe(JSON.stringify(before.aiTools));
		const oldBuilder = new RuntimeContextBuilder(
			{ ...original, model: 'openai/gpt-4.1' },
			undefined,
		);
		const newBuilder = new RuntimeContextBuilder(
			{ ...dynamic, model: 'openai/gpt-4.1' },
			undefined,
		);
		expect(newBuilder.buildStaticLoopContext().providerOptions).toEqual(
			oldBuilder.buildStaticLoopContext().providerOptions,
		);
		expect(JSON.stringify(after.messages)).toContain(custom.description);
		expect(JSON.stringify(after.messages)).not.toContain(custom.instructions);
	});

	it('keeps the existing system catalogue for sources that do not opt in', async () => {
		const runtime = await config(createRuntimeSkillSource([builtIn, custom]));
		const list = input();
		await prompt(runtime, list);
		expect(runtime.instructions).toContain(custom.description);
		expect(list.messages().some(isRuntimeSkillCatalog)).toBe(false);
	});

	it.each([
		'anthropic/claude-opus-4-8',
		'openai/gpt-4.1',
		'google/gemini-2.5-flash',
		'moonshotai/kimi-k2.5',
		'openrouter/anthropic/claude-sonnet-4.5',
	])('sends the catalogue in a user reminder for %s', async (model) => {
		const runtime = await config(source());
		const result = await prompt({ ...runtime, model }, input());
		expect(JSON.stringify(result.system)).not.toContain(custom.description);
		expect(result.messages.at(-1)).toMatchObject({
			role: 'user',
			content: [{ type: 'text', text: expect.stringContaining('<system-reminder>') }],
		});
		expect(JSON.stringify(result.messages)).toContain('Load by exact skillId.');
		expect(result.messages.some((message) => message.role === 'system')).toBe(false);
	});

	it('reuses a persisted snapshot across iterations, turns, and checkpoint resume', async () => {
		const runtime = await config(source());
		const list = input();
		await prompt(runtime, list);
		const first = list.messages().filter(isRuntimeSkillCatalog);
		await prompt(runtime, list);
		expect(list.messages().filter(isRuntimeSkillCatalog)).toEqual(first);
		// Checkpoints encode dates as strings. A deep copy would preserve Date objects.
		const checkpoint = JSON.stringify(list.serialize());
		const resumed = AgentMessageList.deserialize(JSON.parse(checkpoint));
		await prompt(runtime, resumed);
		expect(resumed.messages().filter(isRuntimeSkillCatalog)).toEqual(first);
		const next = new AgentMessageList();
		next.addHistory(resumed.messages().slice());
		input(next);
		await prompt(runtime, next);
		expect(next.messages().filter(isRuntimeSkillCatalog)).toEqual(first);
		expect(next.responseDelta()).toEqual([]);
	});

	it('appends catalogue changes without rewriting the conversation prefix', async () => {
		const list = input();
		await prompt(await config(source()), list);
		const before = list.serialize().messages;
		input(list);
		const result = await prompt(await config(source('Review project shipments.')), list);
		expect(list.messages().slice(0, before.length)).toEqual(before);
		expect(list.messages().filter(isRuntimeSkillCatalog)).toHaveLength(2);
		expect(JSON.stringify(result.messages.at(-1))).toContain('Review project shipments.');
		expect(JSON.stringify(result.messages.at(-1))).toContain(
			'replaces earlier dynamic skill catalogues',
		);
	});

	it.each([undefined, 'Hub skills are temporarily unavailable. Do not use earlier copies.'])(
		'replaces the previous catalogue when no entries are available (%s)',
		async (notice) => {
			const list = input();
			await prompt(await config(source()), list);
			const empty = createRuntimeSkillSource([builtIn]);
			empty.dynamicCatalog = { skillIds: [], notice };
			const runtime = await config(empty);
			const result = await prompt(runtime, list);
			expect(JSON.stringify(result.messages.at(-1))).toContain('No dynamic skills are available.');
			expect(JSON.stringify(result.messages.at(-1))).not.toContain(custom.id);
			expect(runtime.instructions).not.toContain('temporarily unavailable');
			if (notice) expect(JSON.stringify(result.messages.at(-1))).toContain(notice);
		},
	);

	it('restores the current snapshot after compaction, including an empty catalogue', async () => {
		const list = input();
		const runtime = await config(source());
		await prompt(runtime, list);
		const cursor = list.messages().at(-1)!;
		list.maskObservedMessages({
			lastObservedAt: cursor.createdAt,
			lastObservedMessageId: cursor.id,
		});
		const restored = await prompt(runtime, list);
		expect(restored.messages).toHaveLength(1);
		expect(JSON.stringify(restored.messages)).toContain(custom.description);
		await prompt(runtime, list);
		expect(list.messages().filter(isRuntimeSkillCatalog)).toHaveLength(2);
		const removed = await prompt(await config(createRuntimeSkillSource([builtIn])), list);
		expect(JSON.stringify(removed.messages.at(-1))).toContain('No dynamic skills are available.');
	});

	it('preserves dynamic placement when sources are extended, prepared, or filtered', async () => {
		const original = source();
		original.prepare = vi.fn(async () => {});
		const extended = extendRuntimeSkillSource(original, [
			{
				id: 'builder',
				name: 'builder',
				description: 'Build tasks.',
				instructions: 'Build carefully.',
			},
		]);
		await extended.prepare?.();
		const runtime = await config(extended);
		expect(runtime.instructions).toContain('Build tasks.');
		expect(runtime.instructions).not.toContain(custom.description);
		await expect(extended.loadSkill(custom.id)).resolves.toMatchObject({
			instructions: custom.instructions,
		});
		const filtered = filterRuntimeSkillSource(extended, [custom.id]);
		const result = await prompt(await config(filtered), input());
		expect(JSON.stringify(result.messages)).not.toContain(custom.description);
		await expect(filtered.loadSkill(custom.id)).resolves.toBeNull();
	});

	it('revokes a previously loaded skill when the current catalogue removes it', async () => {
		const list = input();
		await prompt(await config(source()), list);
		list.activeSkillIds = [custom.id];
		list.activeSkillVersions = { [custom.id]: 'previous-version' };
		const removed = createRuntimeSkillSource([builtIn]);
		removed.dynamicCatalog = { skillIds: [] };
		const activeSkills = new ActiveSkills(removed, 'catalog-test');
		await activeSkills.restore(list);

		const result = await prompt(await config(removed), list, activeSkills);

		expect(list.activeSkillIds).toEqual([]);
		expect(list.activeSkillVersions).toEqual({ [custom.id]: null });
		expect(JSON.stringify(result.messages)).toContain('No dynamic skills are available.');
		expect(JSON.stringify(result.messages)).toContain('Do not use its earlier instructions');
		expect(JSON.stringify(result.system)).not.toContain(custom.instructions);
	});

	it('includes loading instructions when all skills are dynamic', async () => {
		const skills = createRuntimeSkillSource([custom]);
		skills.dynamicCatalog = { skillIds: [custom.id] };
		const runtime = await config(skills);
		expect(runtime.instructions).toBe('Base instructions.');
		const result = await prompt(runtime, input());
		expect(JSON.stringify(result.messages)).toContain('Skill loading protocol:');
		expect(runtime.tools?.some((tool) => tool.name === 'load_skill')).toBe(true);
	});
});
