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

		// The recorded load is still visible, so the skill rides there, not in the block.
		expect(active.instructions()).toBeUndefined();
		expect(JSON.stringify(active.modelMessages(list.forLlm('').messages, list))).toContain(
			'Build one workflow.',
		);
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

	it('keeps the system block frozen mid-run and appends the skill to its activating tool result', async () => {
		const memory = new InMemoryMemory();
		await memory.skillState.save({ ...scope, agentName: 'assistant' }, ['planning']);
		const active = new ActiveSkills(source, 'assistant', memory.skillState);
		const list = new AgentMessageList();
		await active.restore(list, scope);
		const blockAtRunStart = active.instructions();
		expect(blockAtRunStart).toContain('Create a task plan.');
		list.addInput([{ role: 'user', content: [{ type: 'text', text: 'Build it' }] }]);
		list.addResponse([
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'inspect_node',
						toolCallId: 'inspect-1',
						input: {},
						state: 'pending',
					},
				],
			},
		]);

		await active.load('builder', { toolCallId: 'inspect-1' });
		list.setToolCallResult('inspect-1', { node: 'model' });
		// A repeat load must not move the anchor.
		await active.load('builder', { toolCallId: 'inspect-2' });

		// The block does not change within the run, but the activation is recorded.
		expect(active.instructions()).toBe(blockAtRunStart);
		expect(list.activeSkillIds).toEqual(['planning', 'builder']);

		const messages = active.modelMessages(list.forLlm('').messages, list);
		expect(messages.map((message) => message.role)).toEqual(['user', 'assistant', 'tool']);
		const tool = messages[2];
		if (tool.role !== 'tool') throw new Error('Expected a tool message');
		expect(tool.content[0]).toMatchObject({
			type: 'tool-result',
			toolCallId: 'inspect-1',
			output: {
				type: 'content',
				value: [
					{ type: 'text', text: '{"node":"model"}' },
					{ type: 'text', text: expect.stringContaining('Build one workflow.') },
				],
			},
		});
		// The persisted message is untouched; the appendix is a per-call view.
		expect(JSON.stringify(list.serialize())).not.toContain('Build one workflow.');
	});

	it('appends a mid-run load_skill activation after the collapsed result', async () => {
		const memory = new InMemoryMemory();
		const active = new ActiveSkills(source, 'assistant', memory.skillState);
		const list = new AgentMessageList();
		await active.restore(list, scope);
		list.addInput([{ role: 'user', content: [{ type: 'text', text: 'Build it' }] }]);
		list.addResponse([
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'load_skill',
						toolCallId: 'load-1',
						input: { skillId: 'builder' },
						state: 'pending',
					},
				],
			},
		]);
		await active.load('builder', { toolCallId: 'load-1' });
		list.setToolCallResult('load-1', { success: true, skillId: 'builder', content: 'active' });

		expect(active.instructions()).toBeUndefined();
		const messages = active.modelMessages(list.forLlm('').messages, list);
		const tool = messages[2];
		if (tool.role !== 'tool') throw new Error('Expected a tool message');
		expect(tool.content[0]).toMatchObject({
			output: {
				type: 'content',
				value: [
					{ type: 'text', text: '{"skillId":"builder","active":true}' },
					{ type: 'text', text: expect.stringContaining('Build one workflow.') },
				],
			},
		});
	});

	it('moves a mid-run activation into the system block on the next run', async () => {
		const memory = new InMemoryMemory();
		const list = new AgentMessageList();
		list.addInput([{ role: 'user', content: [{ type: 'text', text: 'Build it' }] }]);
		list.addResponse([
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'inspect_node',
						toolCallId: 'inspect-1',
						input: {},
						state: 'pending',
					},
				],
			},
		]);
		const first = new ActiveSkills(source, 'assistant', memory.skillState);
		await first.restore(list, scope);
		await first.load('builder', { toolCallId: 'inspect-1' });
		list.setToolCallResult('inspect-1', { node: 'model' });

		const next = new ActiveSkills(source, 'assistant', memory.skillState);
		await next.restore(list, scope);

		expect(next.instructions()).toContain('Build one workflow.');
		const messages = next.modelMessages(list.forLlm('').messages, list);
		expect(JSON.stringify(messages)).not.toContain('Build one workflow.');
		expect(messages[2]).toMatchObject({
			role: 'tool',
			content: [{ type: 'tool-result', output: { type: 'json', value: { node: 'model' } } }],
		});
	});

	it('collapses a recorded load_skill body and re-appends the current version at that result', async () => {
		const memory = new InMemoryMemory();
		const list = new AgentMessageList();
		list.addHistory([
			{ role: 'user', content: [{ type: 'text', text: 'Build it' }] },
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
			{ role: 'assistant', content: [{ type: 'text', text: 'Loaded.' }] },
		]);
		const active = new ActiveSkills(source, 'assistant', memory.skillState);
		await active.restore(list, scope);

		const messages = active.modelMessages(list.forLlm('').messages, list);

		expect(messages.map((message) => message.role)).toEqual([
			'user',
			'assistant',
			'tool',
			'assistant',
		]);
		// The persisted body is collapsed away, and the current version is
		// appended at the same result — the block stays empty while the recorded
		// load is visible, so restoring the skill never rewrites the prefix.
		const tool = messages[2];
		if (tool.role !== 'tool') throw new Error('Expected a tool message');
		expect(tool.content[0]).toMatchObject({
			output: {
				type: 'content',
				value: [
					{ type: 'text', text: '{"skillId":"builder","active":true}' },
					{ type: 'text', text: expect.stringContaining('Build one workflow.') },
				],
			},
		});
		expect(active.instructions()).toBeUndefined();
	});

	it('folds a skill into the block once observational memory masks its recorded load', async () => {
		const memory = new InMemoryMemory();
		const list = new AgentMessageList();
		list.addHistory([
			{ role: 'user', content: [{ type: 'text', text: 'Build it' }] },
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
			{ role: 'assistant', content: [{ type: 'text', text: 'Loaded.' }] },
		]);
		const active = new ActiveSkills(source, 'assistant', memory.skillState);
		await active.restore(list, scope);
		expect(active.instructions()).toBeUndefined();

		const loadMessage = list.messages()[1];
		const createdAt = loadMessage.createdAt;
		if (!(createdAt instanceof Date)) throw new Error('Expected a createdAt date');
		list.maskObservedMessages({ lastObservedAt: createdAt, lastObservedMessageId: loadMessage.id });

		// The anchor left the visible window, so the skill moves to the block —
		// at the same moment observation rewrote the prefix anyway.
		expect(active.instructions()).toContain('Build one workflow.');
		expect(JSON.stringify(active.modelMessages(list.forLlm('').messages, list))).not.toContain(
			'Build one workflow.',
		);
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
