import { createRuntimeSkillSource, filterRuntimeSkillSource } from '../../skills/registry';
import type { RuntimeSkillSource } from '../../skills/types';
import { InMemoryMemory } from '../memory/memory-store';
import { AgentMessageList } from '../model/message-list';
import { ActiveSkills } from '../skills/active-skills';

const scope = { threadId: 'thread-1', resourceId: 'user-1' };
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

		expect(active.instructions()).toContain('Build one workflow.');
		await expect(memory.skillState.load({ ...scope, agentName: 'assistant' })).resolves.toEqual([
			'builder',
		]);
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
						toolCallId: 'old-load',
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

		expect(active.instructions()).toContain('Build one workflow.');
		expect(active.instructions()).not.toContain('Create a task plan.');
		expect(JSON.stringify(active.modelMessages(list.forLlm('').messages, list))).not.toContain(
			'Create a task plan.',
		);
		await expect(memory.skillState.load({ ...scope, agentName: 'assistant' })).resolves.toEqual([
			'builder',
		]);
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
