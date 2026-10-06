import { createRuntimeSkillSource, filterRuntimeSkillSource } from '../../skills/registry';
import type { RuntimeSkillSource } from '../../skills/types';
import { InMemoryMemory } from '../memory/memory-store';
import { AgentMessageList } from '../model/message-list';
import { ActiveSkills } from '../skills/active-skills';

const scope = { threadId: 'thread-1', resourceId: 'user-1' };

/**
 * Mark the list as observation-masked, so recovered skills render in the
 * `<active_skills>` system block. Without a mask the block stays empty and
 * skills ride on their still-visible activating tool result.
 */
function mask(list: AgentMessageList): AgentMessageList {
	list.maskObservedMessages({
		lastObservedAt: new Date(Date.now() + 60_000),
		lastObservedMessageId: 'observation-cursor',
	});
	return list;
}
const source = createRuntimeSkillSource([
	{
		id: 'planning',
		name: 'planning',
		description: 'Plan tasks.',
		instructions: 'Create a task plan.',
	},
	{
		id: 'builder',
		name: 'builder',
		description: 'Build workflows.',
		instructions: 'Build one workflow.',
	},
]);

describe('active skills', () => {
	it('does not rewrite unchanged stored skills on later turns', async () => {
		const memory = new InMemoryMemory();
		await memory.skillState.save({ ...scope, agentName: 'assistant' }, ['builder', 'planning']);
		const save = vi.spyOn(memory.skillState, 'save');

		for (let turn = 0; turn < 2; turn++) {
			const active = new ActiveSkills(source, 'assistant', memory.skillState);
			await active.restore(new AgentMessageList(), scope);
			expect(active.instructions()).toContain('Build one workflow.');
			expect(active.instructions()).toContain('Create a task plan.');
		}

		expect(save).not.toHaveBeenCalled();
	});

	it('does not rewrite an explicitly empty stored state', async () => {
		const memory = new InMemoryMemory();
		await memory.skillState.save({ ...scope, agentName: 'assistant' }, []);
		const save = vi.spyOn(memory.skillState, 'save');
		const active = new ActiveSkills(source, 'assistant', memory.skillState);
		const list = new AgentMessageList();

		await active.restore(list, scope);

		expect(list.activeSkillIds).toEqual([]);
		expect(active.instructions()).toBeUndefined();
		expect(save).not.toHaveBeenCalled();
	});

	it('clears stored state when all restored skills are disabled', async () => {
		const memory = new InMemoryMemory();
		await memory.skillState.save({ ...scope, agentName: 'assistant' }, ['planning']);
		const active = new ActiveSkills(
			filterRuntimeSkillSource(source, ['planning']),
			'assistant',
			memory.skillState,
		);

		await active.restore(new AgentMessageList(), scope);

		expect(active.instructions()).toBeUndefined();
		await expect(memory.skillState.load({ ...scope, agentName: 'assistant' })).resolves.toEqual([]);
	});

	it('initializes stored state from historical skill loads', async () => {
		const memory = new InMemoryMemory();
		const list = new AgentMessageList();
		list.addHistory([
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'load_skill',
						toolCallId: 'old-load',
						input: { skillId: 'builder' },
						state: 'resolved',
						output: { type: 'content', value: [{ type: 'text', text: 'Build one workflow.' }] },
					},
				],
			},
		]);
		const active = new ActiveSkills(source, 'assistant', memory.skillState);

		await active.restore(list, scope);

		// The load_skill result is still visible, so the body rides on it and the
		// system block stays empty — no cached-prefix rewrite.
		expect(active.instructions()).toBeUndefined();
		expect(JSON.stringify(active.modelMessages(list.forLlm('').messages, list))).toContain(
			'Build one workflow.',
		);
		await expect(memory.skillState.load({ ...scope, agentName: 'assistant' })).resolves.toEqual([
			'builder',
		]);
	});

	it('recovers a skill into the system block once observation masks its load', async () => {
		const memory = new InMemoryMemory();
		const list = new AgentMessageList();
		list.addHistory([
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'load_skill',
						toolCallId: 'old-load',
						input: { skillId: 'builder' },
						state: 'resolved',
						output: { type: 'content', value: [{ type: 'text', text: 'Build one workflow.' }] },
					},
				],
			},
		]);
		const active = new ActiveSkills(source, 'assistant', memory.skillState);
		await active.restore(list, scope);

		// Visible load → block empty.
		expect(active.instructions()).toBeUndefined();

		// Observation hides the load result → the skill moves into the block.
		mask(list);
		expect(active.instructions()).toContain('Build one workflow.');
	});

	it('persists checkpoint skills when they differ from stored state', async () => {
		const memory = new InMemoryMemory();
		await memory.skillState.save({ ...scope, agentName: 'assistant' }, ['planning']);
		const list = new AgentMessageList();
		list.activeSkillIds = ['builder'];
		const active = new ActiveSkills(source, 'assistant', memory.skillState);

		await active.restore(list, scope);

		expect(active.instructions()).toContain('Build one workflow.');
		expect(active.instructions()).not.toContain('Create a task plan.');
		await expect(memory.skillState.load({ ...scope, agentName: 'assistant' })).resolves.toEqual([
			'builder',
		]);
	});

	it('removes disabled skills from restored state and from historical tool output', async () => {
		const memory = new InMemoryMemory();
		await memory.skillState.save({ ...scope, agentName: 'assistant' }, ['planning', 'builder']);
		const list = new AgentMessageList();
		list.addHistory([
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'load_skill',
						toolCallId: 'builder-load',
						input: { skillId: 'builder' },
						state: 'resolved',
						output: { type: 'content', value: [{ type: 'text', text: 'Build one workflow.' }] },
					},
					{
						type: 'tool-call',
						toolName: 'load_skill',
						toolCallId: 'planning-load',
						input: { skillId: 'planning' },
						state: 'resolved',
						output: { type: 'content', value: [{ type: 'text', text: 'Create a task plan.' }] },
					},
				],
			},
		]);
		const active = new ActiveSkills(
			filterRuntimeSkillSource(source, ['planning']),
			'assistant',
			memory.skillState,
		);
		await active.restore(list, scope);

		// Both loads are still visible, so the block stays empty; the enabled skill
		// rides on its result while the disabled one is collapsed out of it.
		expect(active.instructions()).toBeUndefined();
		const rendered = JSON.stringify(active.modelMessages(list.forLlm('').messages, list));
		expect(rendered).toContain('Build one workflow.');
		expect(rendered).not.toContain('Create a task plan.');
		await expect(memory.skillState.load({ ...scope, agentName: 'assistant' })).resolves.toEqual([
			'builder',
		]);
	});

	it('re-anchors a stamped tool activation on a later turn instead of the block', async () => {
		const memory = new InMemoryMemory();
		await memory.skillState.save({ ...scope, agentName: 'assistant' }, ['builder']);
		const list = new AgentMessageList();
		// Turn 1 activated the skill from a tool and stamped its result. On the
		// next turn the body must ride on that result again, not the system block.
		list.addHistory([
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'build_workflow',
						toolCallId: 'build-1',
						input: {},
						state: 'resolved',
						output: { type: 'content', value: [{ type: 'text', text: 'built' }] },
						activatedSkillIds: ['builder'],
					},
				],
			},
		]);
		const active = new ActiveSkills(source, 'assistant', memory.skillState);
		await active.restore(list, scope);

		expect(active.instructions()).toBeUndefined();
		expect(JSON.stringify(active.modelMessages(list.forLlm('').messages, list))).toContain(
			'Build one workflow.',
		);
	});

	it('persists a tool activation stamp across serialization', async () => {
		const memory = new InMemoryMemory();
		const active = new ActiveSkills(source, 'assistant', memory.skillState);
		const list = new AgentMessageList();
		list.addResponse([
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'build_workflow',
						toolCallId: 'build-1',
						input: {},
						state: 'resolved',
						output: { type: 'content', value: [{ type: 'text', text: 'built' }] },
					},
				],
			},
		]);
		await active.restore(list, scope);
		await active.load('builder', { toolCallId: 'build-1' });

		const roundTripped = AgentMessageList.deserialize(structuredClone(list.serialize()));
		const stamped = roundTripped
			.messages()
			.flatMap((message) => ('content' in message ? message.content : []))
			.find((part) => part.type === 'tool-call' && part.toolCallId === 'build-1');
		expect(stamped).toMatchObject({ activatedSkillIds: ['builder'] });
	});

	it('recovers a restored programmatic skill through the block when no stamp survives', async () => {
		const memory = new InMemoryMemory();
		await memory.skillState.save({ ...scope, agentName: 'assistant' }, ['builder']);
		const list = new AgentMessageList();
		// Legacy data: a prior programmatic activation left no stamp and no
		// `load_skill` record. The skill must still reach the model via the block.
		list.addHistory([
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'build_workflow',
						toolCallId: 'build-1',
						input: {},
						state: 'resolved',
						output: { type: 'content', value: [{ type: 'text', text: 'built' }] },
					},
				],
			},
		]);
		const active = new ActiveSkills(source, 'assistant', memory.skillState);
		await active.restore(list, scope);

		expect(active.instructions()).toContain('Build one workflow.');
	});

	it('recovers a skill through the block when its activating tool call failed', async () => {
		const memory = new InMemoryMemory();
		const active = new ActiveSkills(source, 'assistant', memory.skillState);
		const list = new AgentMessageList();
		list.addResponse([
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'build_workflow',
						toolCallId: 'build-fail',
						input: {},
						state: 'rejected',
						error: 'boom',
					},
				],
			},
		]);
		await active.restore(list, scope);
		// The tool activated the skill, then failed — its error result cannot
		// carry the body, so the skill belongs in the block, not silently dropped.
		await active.load('builder', { toolCallId: 'build-fail' });

		expect(active.instructions()).toContain('Build one workflow.');
	});

	it('keeps threads, resources, and agents isolated', async () => {
		const memory = new InMemoryMemory();
		const active = new ActiveSkills(source, 'assistant', memory.skillState);
		await active.restore(new AgentMessageList(), scope);
		await active.load('builder');
		for (const [name, persistence] of [
			['other-agent', scope],
			['assistant', { ...scope, resourceId: 'other-user' }],
			['assistant', { ...scope, threadId: 'other-thread' }],
		] as const) {
			const other = new ActiveSkills(source, name, memory.skillState);
			await other.restore(new AgentMessageList(), persistence);
			expect(other.instructions()).toBeUndefined();
		}
		await memory.deleteThread(scope.threadId);
		await expect(
			memory.skillState.load({ ...scope, agentName: 'assistant' }),
		).resolves.toBeUndefined();
	});

	it('keeps the system block empty for an anchored activation until observation masks it', async () => {
		const memory = new InMemoryMemory();
		const active = new ActiveSkills(source, 'assistant', memory.skillState);
		const list = new AgentMessageList();
		list.addResponse([
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'build_workflow',
						toolCallId: 'build-1',
						input: {},
						state: 'resolved',
						output: { type: 'content', value: [{ type: 'text', text: 'built' }] },
					},
				],
			},
		]);
		await active.restore(list, scope);

		// A programmatic activation anchored to the calling tool result stays out
		// of the system prompt — the body rides on that visible result instead.
		await active.load('builder', { toolCallId: 'build-1' });
		expect(active.instructions()).toBeUndefined();
		expect(JSON.stringify(active.modelMessages(list.forLlm('').messages, list))).toContain(
			'Build one workflow.',
		);

		// Only once observation hides the anchor does the skill move into the block.
		mask(list);
		expect(active.instructions()).toContain('Build one workflow.');
	});

	it('does not activate a missing skill or a failed load', async () => {
		const missing: RuntimeSkillSource = { ...source, loadSkill: vi.fn().mockResolvedValue(null) };
		const active = new ActiveSkills(missing, 'assistant');
		const list = new AgentMessageList();
		await active.restore(list);
		await expect(active.load('unknown')).resolves.toBeNull();
		await expect(active.load('builder')).resolves.toBeNull();
		expect(list.activeSkillIds).toEqual([]);
		expect(active.instructions()).toBeUndefined();
	});

	it('records concurrent loads without dropping either skill', async () => {
		const memory = new InMemoryMemory();
		const active = new ActiveSkills(source, 'assistant', memory.skillState);
		const list = new AgentMessageList();
		await active.restore(list, scope);
		await Promise.all([active.load('builder'), active.load('planning')]);
		await expect(memory.skillState.load({ ...scope, agentName: 'assistant' })).resolves.toEqual([
			'builder',
			'planning',
		]);
		expect(AgentMessageList.deserialize(structuredClone(list.serialize())).activeSkillIds).toEqual([
			'builder',
			'planning',
		]);
	});
});
