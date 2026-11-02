import { createRuntimeSkillSource } from '../../skills/registry';
import { createSkillLoadTool } from '../../skills/tools';
import type { RuntimeSkillSource } from '../../skills/types';
import type { AgentMessage } from '../../types/sdk/message';
import type { JSONValue } from '../../types/utils/json';
import { InMemoryMemory } from '../memory/memory-store';
import { AgentMessageList } from '../model/message-list';
import { ActiveSkills } from '../skills/active-skills';

const scope = { threadId: 'thread', resourceId: 'user' };
const skillId = 'case-triage';

function source(instructions: string, name = 'Case triage') {
	return {
		...createRuntimeSkillSource([
			{ id: skillId, name, description: 'Create cases.', instructions },
		]),
		shouldAppendSkillUpdates: (id: string) => id === skillId,
	};
}

function prompt(active: ActiveSkills, list: AgentMessageList) {
	const instructions = active.instructions();
	return active.modelMessages(list.forLlm(instructions ?? '').messages, list);
}

async function activate(
	memory: InMemoryMemory,
	original: RuntimeSkillSource = source('Use the inbox queue.'),
) {
	const list = new AgentMessageList();
	list.addInput([{ role: 'user', content: [{ type: 'text', text: 'Create a case.' }] }]);
	const active = new ActiveSkills(original, 'assistant', memory.skillState);
	await active.restore(list, scope);
	list.addResponse([
		{
			role: 'assistant',
			content: [
				{
					type: 'tool-call',
					toolName: 'load_skill',
					toolCallId: 'load',
					input: { skillId },
					state: 'pending',
				},
			],
		},
	]);
	const result = await createSkillLoadTool(original).handler?.(
		{ skillId },
		{
			loadSkill: async (id) => await active.load(id, { toolCallId: 'load' }),
		},
	);
	list.setToolCallResult('load', result as JSONValue);
	expect(prompt(active, list)).toHaveLength(3);
	expect(JSON.stringify(prompt(active, list).at(-1))).toContain('Use the inbox queue.');
	return list;
}

describe('skill updates in new messages', () => {
	it('preserves earlier tool results and appends one update across turns and checkpoint resume', async () => {
		const memory = new InMemoryMemory();
		const first = await activate(memory);
		const originalMessages = structuredClone([...first.messages()]);
		const next = new AgentMessageList();
		next.addHistory(originalMessages);
		next.addInput([{ role: 'user', content: [{ type: 'text', text: 'Create another case.' }] }]);
		const current = source('Use the review queue.', 'Renamed triage');
		next.addInput([
			{
				type: 'custom',
				data: {
					skillUpdate: {
						skillId,
						version: current.registry.skills[0].hash,
						content: 'App-only content.',
					},
				},
			} as AgentMessage,
		]);
		const active = new ActiveSkills(current, 'assistant', memory.skillState);
		await active.restore(next, scope);
		const messages = prompt(active, next);
		expect(messages.at(-1)).toMatchObject({ role: 'user' });
		expect(JSON.stringify(messages.at(-1))).toContain('was updated');
		expect(JSON.stringify(messages.at(-1))).toContain('automatic skill update from the runtime');
		expect(JSON.stringify(messages.at(-1))).toContain('Use the review queue.');
		expect(JSON.stringify(messages.at(-1))).toContain('Renamed triage');
		expect(JSON.stringify(messages)).not.toContain('App-only content.');
		expect(JSON.stringify(messages.find((message) => message.role === 'tool'))).toContain(
			'Use the inbox queue.',
		);
		expect(next.messages().slice(0, originalMessages.length)).toEqual(originalMessages);
		expect(prompt(active, next)).toEqual(messages);
		expect(active.takeUpdates()).toEqual([
			{
				type: 'custom',
				data: {
					type: 'n8n:runtime-skill-update',
					skillUpdate: expect.objectContaining({
						skillId,
						name: 'Renamed triage',
						change: 'updated',
					}),
				},
			},
		]);
		expect(active.takeUpdates()).toEqual([]);

		const resumed = AgentMessageList.deserialize(structuredClone(next.serialize()));
		const restored = new ActiveSkills(current, 'assistant', memory.skillState);
		await restored.restore(resumed, scope);
		expect(prompt(restored, resumed)).toEqual(messages);
		const unchanged = new AgentMessageList();
		unchanged.addHistory(structuredClone([...resumed.messages()]));
		unchanged.addInput([{ role: 'user', content: [{ type: 'text', text: 'Thanks.' }] }]);
		await restored.restore(unchanged, scope);
		expect(
			JSON.stringify(prompt(restored, unchanged)).match(/Use the review queue\./g),
		).toHaveLength(1);
	});

	it('recovers current instructions after masking and after loading a compacted thread', async () => {
		const memory = new InMemoryMemory();
		const list = await activate(memory);
		const current = source('Use the review queue.');
		const active = new ActiveSkills(current, 'assistant', memory.skillState);
		await active.restore(list, scope);
		prompt(active, list);
		const last = list.messages().at(-1)!;
		list.maskObservedMessages({ lastObservedAt: last.createdAt, lastObservedMessageId: last.id });
		const recovered = JSON.stringify(prompt(active, list));
		expect(recovered).toContain('Use the review queue.');
		expect(recovered).not.toContain('Use the inbox queue.');

		// A resumed compacted thread does not load the messages before its observation cursor.
		const compacted = new AgentMessageList();
		compacted.observationLogMemory = 'Earlier cases used the inbox queue.';
		const next = new ActiveSkills(
			source('Use the priority queue.'),
			'assistant',
			memory.skillState,
		);
		await next.restore(compacted, scope);
		const messages = JSON.stringify(prompt(next, compacted));
		expect(messages).toContain('was updated');
		expect(messages).toContain('Use the priority queue.');
		expect(messages).not.toContain('Use the review queue.');
	});

	it.each(['revoked', 'temporary failure'] as const)(
		'does not reactivate old instructions after %s',
		async (outcome) => {
			const memory = new InMemoryMemory();
			const filePath = 'references/guide.md';
			const original = source('Use the inbox queue.');
			original.registry.skills[0].linkedFiles.references.push({ path: filePath });
			const loadFile = vi.fn(async () => ({ skillId, filePath, content: 'Use the inbox guide.' }));
			const linkedSource = { ...original, loadFile };
			const list = await activate(memory, linkedSource);
			expect(
				await createSkillLoadTool(linkedSource).handler?.({ skillId, filePath }, {}),
			).toMatchObject({
				success: true,
				content: 'Use the inbox guide.',
			});
			const unavailable: RuntimeSkillSource = {
				...createRuntimeSkillSource([]),
				loadFile,
				getLoadError: () => ({
					message: 'Unavailable.',
					retryable: outcome === 'temporary failure',
				}),
			};
			const active = new ActiveSkills(unavailable, 'assistant', memory.skillState);
			await active.restore(list, scope);
			expect(JSON.stringify(prompt(active, list).at(-1))).toContain('is unavailable');
			expect(await active.load(skillId)).toBeNull();
			expect(list.activeSkillIds).toEqual(outcome === 'revoked' ? [] : [skillId]);
			const compactedUnavailable = new AgentMessageList();
			compactedUnavailable.observationLogMemory = 'Earlier cases used the inbox guide.';
			for (const history of [
				list,
				AgentMessageList.deserialize(list.serialize()),
				compactedUnavailable,
			]) {
				await active.restore(history, scope);
				expect(
					await createSkillLoadTool(unavailable).handler?.(
						{ skillId, filePath },
						{
							loadSkill: async (id) => await active.load(id),
						},
					),
				).toMatchObject({ success: false, error: expect.stringContaining('Unknown skill') });
			}
			expect(loadFile).toHaveBeenCalledTimes(1);

			const compacted = new AgentMessageList();
			const next = new ActiveSkills(
				source('Use the review queue.'),
				'assistant',
				memory.skillState,
			);
			await next.restore(compacted, scope);
			const messages = JSON.stringify(prompt(next, compacted));
			if (outcome === 'revoked') {
				expect(messages).toContain('is unavailable');
				expect(messages).not.toContain('Use the review queue.');
			} else {
				expect(messages).toContain('Use the review queue.');
			}
			expect(messages).not.toContain('Use the inbox queue.');
		},
	);

	it('keeps persisted revocations when resuming an older checkpoint until an explicit reload', async () => {
		const memory = new InMemoryMemory();
		const list = await activate(memory);
		const checkpoint = structuredClone(list.serialize());
		const unavailable = new ActiveSkills(
			createRuntimeSkillSource([]),
			'assistant',
			memory.skillState,
		);
		await unavailable.restore(list, scope);
		expect(list.activeSkillIds).toEqual([]);

		const current = source('Use the review queue.');
		const load = vi.spyOn(current, 'loadSkill');
		const resumed = AgentMessageList.deserialize(checkpoint);
		const active = new ActiveSkills(current, 'assistant', memory.skillState);
		await active.restore(resumed, scope);
		expect(load).not.toHaveBeenCalled();
		expect(resumed.activeSkillIds).toEqual([]);
		expect(resumed.activeSkillVersions).toEqual({ [skillId]: null });
		expect(JSON.stringify(prompt(active, resumed).at(-1))).toContain('is unavailable');
		await expect(memory.skillState.load({ ...scope, agentName: 'assistant' })).resolves.toEqual({
			skillIds: [],
			versions: { [skillId]: null },
		});

		await expect(active.load(skillId)).resolves.toMatchObject({
			instructions: 'Use the review queue.',
		});
		expect(resumed.activeSkillIds).toEqual([skillId]);
		expect(JSON.stringify(prompt(active, resumed).at(-1))).toContain('Use the review queue.');
	});

	it('revokes a legacy selection after its history has been compacted', async () => {
		const memory = new InMemoryMemory();
		await memory.skillState.save({ ...scope, agentName: 'assistant' }, { skillIds: [skillId] });
		const list = new AgentMessageList();
		const active = new ActiveSkills(
			{
				...createRuntimeSkillSource([]),
				shouldAppendSkillUpdates: (id) => id === skillId,
			},
			'assistant',
			memory.skillState,
		);
		await active.restore(list, scope);
		expect(JSON.stringify(prompt(active, list))).toContain('is unavailable');
		expect(list.activeSkillIds).toEqual([]);
	});
});
