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

const turnSource = createRuntimeSkillSource([
	{
		id: 'router',
		name: 'router',
		description: 'Route requests.',
		instructions: 'Pick a route.',
		policy: { lifetime: 'turn' },
	},
	{
		id: 'builder',
		name: 'builder',
		description: 'Build workflows.',
		instructions: 'Build one workflow.',
	},
]);

const FIVE_MINUTES = 5 * 60_000;
const NOW = new Date('2026-10-23T12:00:00Z');

/** A thread whose last turn loaded the skills `idleMs` ago, plus the new user input. */
function threadWithLoads(idleMs: number, ...skillIds: string[]): AgentMessageList {
	const list = new AgentMessageList();
	list.addHistory([
		{
			id: 'turn-1',
			createdAt: new Date(NOW.getTime() - idleMs),
			role: 'assistant',
			content: skillIds.map((skillId) => ({
				type: 'tool-call' as const,
				toolName: 'load_skill',
				toolCallId: `load-${skillId}`,
				input: { skillId },
				state: 'resolved' as const,
				output: { type: 'content', value: [{ type: 'text', text: 'loaded' }] },
			})),
		},
	]);
	list.addInput([
		{ id: 'turn-2', createdAt: NOW, role: 'user', content: [{ type: 'text', text: 'Next' }] },
	]);
	return list;
}

function freshRun(): { freshRun: true; cacheTtlMs: number; now: Date } {
	return { freshRun: true, cacheTtlMs: FIVE_MINUTES, now: NOW };
}

function visibleText(active: ActiveSkills, list: AgentMessageList): string {
	return (
		JSON.stringify(active.modelMessages(list.forLlm('').messages, list)) +
		(active.instructions() ?? '')
	);
}

describe('skill lifetime', () => {
	it('expires a turn-lifetime skill when a fresh run starts on a cold cache', async () => {
		const memory = new InMemoryMemory();
		const active = new ActiveSkills(turnSource, 'assistant', memory.skillState);
		const list = threadWithLoads(FIVE_MINUTES + 1, 'router', 'builder');

		await active.restore(list, scope, freshRun());

		const text = visibleText(active, list);
		expect(text).toContain('Build one workflow.');
		expect(text).not.toContain('Pick a route.');
		expect(text).toContain('{"skillId":"router","active":false}');
		await expect(memory.skillState.load({ ...scope, agentName: 'assistant' })).resolves.toEqual({
			skillIds: ['builder'],
		});
	});

	// A null version marks a revoked skill. Expiry is not a revocation, so the model
	// can load the skill again on a later turn.
	it('does not mark an expired skill with tracked versions as revoked', async () => {
		const versionedSource: RuntimeSkillSource = {
			...turnSource,
			shouldAppendSkillUpdates: () => true,
		};
		const memory = new InMemoryMemory();
		const routerHash = turnSource.registry.skills.find(({ id }) => id === 'router')?.hash;
		await memory.skillState.save(
			{ ...scope, agentName: 'assistant' },
			{ skillIds: ['router'], versions: { router: routerHash ?? null } },
		);
		const active = new ActiveSkills(versionedSource, 'assistant', memory.skillState);
		const list = threadWithLoads(FIVE_MINUTES + 1, 'router');

		await active.restore(list, scope, freshRun());

		expect(list.activeSkillIds).not.toContain('router');
		expect(list.activeSkillVersions).toEqual({ router: routerHash });
		const stored = await memory.skillState.load({ ...scope, agentName: 'assistant' });
		expect(stored?.versions).toEqual({ router: routerHash });
	});

	// Collapsing the early load rewrites every cached message after it. While the
	// cache is warm that costs more than the skill body saves on later calls.
	it('keeps a turn-lifetime skill when a fresh run starts on a warm cache', async () => {
		const active = new ActiveSkills(turnSource, 'assistant', new InMemoryMemory().skillState);
		const list = threadWithLoads(60_000, 'router');

		await active.restore(list, scope, freshRun());

		expect(visibleText(active, list)).toContain('Pick a route.');
	});

	// A masked load would move the skill into the system block, which rewrites the
	// whole prompt and keeps the body for the rest of the thread.
	it('expires a turn-lifetime skill whose load observational memory masked', async () => {
		const active = new ActiveSkills(turnSource, 'assistant', new InMemoryMemory().skillState);
		const list = mask(threadWithLoads(60_000, 'router'));

		await active.restore(list, scope, freshRun());

		expect(list.activeSkillIds).toEqual([]);
		expect(active.instructions()).toBeUndefined();
	});

	// The skill already rides in the system block, so dropping it would rewrite the warm cache.
	it('keeps a stored turn-lifetime skill that has no load record on a warm cache', async () => {
		const memory = new InMemoryMemory();
		await memory.skillState.save({ ...scope, agentName: 'assistant' }, { skillIds: ['router'] });
		const active = new ActiveSkills(turnSource, 'assistant', memory.skillState);
		const list = threadWithLoads(60_000);

		await active.restore(list, scope, freshRun());

		expect(list.activeSkillIds).toEqual(['router']);
	});

	it('keeps a turn-lifetime skill when a run resumes', async () => {
		const active = new ActiveSkills(turnSource, 'assistant', new InMemoryMemory().skillState);
		const list = threadWithLoads(FIVE_MINUTES + 1, 'router');

		await active.restore(list, scope);

		expect(visibleText(active, list)).toContain('Pick a route.');
	});

	it('keeps a turn-lifetime skill that loads during a fresh run', async () => {
		const active = new ActiveSkills(turnSource, 'assistant', new InMemoryMemory().skillState);
		const list = new AgentMessageList();
		await active.restore(list, scope, freshRun());

		await active.load('router');

		expect(active.instructions()).toContain('Pick a route.');
	});
});

describe('active skills', () => {
	it('does not rewrite unchanged stored skills on later turns', async () => {
		const memory = new InMemoryMemory();
		await memory.skillState.save(
			{ ...scope, agentName: 'assistant' },
			{ skillIds: ['builder', 'planning'] },
		);
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
		await memory.skillState.save({ ...scope, agentName: 'assistant' }, { skillIds: [] });
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
		await memory.skillState.save({ ...scope, agentName: 'assistant' }, { skillIds: ['planning'] });
		const active = new ActiveSkills(
			filterRuntimeSkillSource(source, ['planning']),
			'assistant',
			memory.skillState,
		);

		await active.restore(new AgentMessageList(), scope);

		expect(active.instructions()).toBeUndefined();
		await expect(memory.skillState.load({ ...scope, agentName: 'assistant' })).resolves.toEqual({
			skillIds: [],
		});
	});

	it.each(['catalog', 'content'] as const)(
		'preserves active selections across a temporary %s failure',
		async (failure) => {
			const memory = new InMemoryMemory();
			await memory.skillState.save(
				{ ...scope, agentName: 'assistant' },
				{ skillIds: ['planning'] },
			);
			const unavailable: RuntimeSkillSource = {
				...(failure === 'catalog' ? filterRuntimeSkillSource(source, ['planning']) : source),
				loadSkill: async (id) => (id === 'planning' ? null : await source.loadSkill(id)),
				getLoadError: (id) =>
					id === 'planning' ? { message: 'Temporarily unavailable.', retryable: true } : undefined,
			};
			const list = new AgentMessageList();
			list.addHistory([
				{
					role: 'assistant',
					content: [
						{
							type: 'tool-call',
							toolName: 'load_skill',
							toolCallId: 'old-planning',
							input: { skillId: 'planning' },
							state: 'resolved',
							output: { success: true, skillId: 'planning', content: 'Old planning instructions.' },
						},
					],
				},
			]);
			const active = new ActiveSkills(unavailable, 'assistant', memory.skillState);
			await active.restore(list, scope);
			expect(active.instructions()).toBeUndefined();
			expect(JSON.stringify(active.modelMessages(list.forLlm('').messages, list))).not.toContain(
				'Old planning instructions.',
			);
			expect(list.activeSkillIds).toEqual(['planning']);
			await expect(memory.skillState.load({ ...scope, agentName: 'assistant' })).resolves.toEqual({
				skillIds: ['planning'],
			});

			await active.load('builder');
			expect(list.activeSkillIds).toEqual(['planning', 'builder']);
			const resumed = AgentMessageList.deserialize(list.serialize());
			const recovered = new ActiveSkills(source, 'assistant', memory.skillState);
			await recovered.restore(resumed, scope);
			expect(resumed.activeSkillIds).toEqual(['planning', 'builder']);
			expect(
				JSON.stringify(recovered.modelMessages(resumed.forLlm('').messages, resumed)),
			).toContain('Create a task plan.');
		},
	);

	it('removes a selection after a confirmed unavailable content result', async () => {
		const memory = new InMemoryMemory();
		await memory.skillState.save({ ...scope, agentName: 'assistant' }, { skillIds: ['planning'] });
		const unavailable: RuntimeSkillSource = {
			...source,
			loadSkill: async () => null,
			getLoadError: () => ({ message: 'No longer available.', retryable: false }),
		};
		const list = new AgentMessageList();
		await new ActiveSkills(unavailable, 'assistant', memory.skillState).restore(list, scope);
		expect(list.activeSkillIds).toEqual([]);
		await expect(memory.skillState.load({ ...scope, agentName: 'assistant' })).resolves.toEqual({
			skillIds: [],
		});
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
		await expect(memory.skillState.load({ ...scope, agentName: 'assistant' })).resolves.toEqual({
			skillIds: ['builder'],
		});
	});

	it('keeps the saved skill snapshot when the model receives a newer version', async () => {
		const list = new AgentMessageList();
		list.activeSkillIds = ['builder'];
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
						output: { success: true, skillId: 'builder', content: 'Build one workflow.' },
					},
				],
			},
		]);
		const saved = structuredClone(list.serialize());
		const restored = AgentMessageList.deserialize(saved);
		const updatedSource = createRuntimeSkillSource([
			{
				id: 'builder',
				name: 'builder',
				description: 'Build workflows.',
				instructions: 'Check the workflow before building.',
			},
		]);
		const nextTurn = new ActiveSkills(updatedSource, 'assistant');
		await nextTurn.restore(restored);

		const modelMessages = JSON.stringify(
			nextTurn.modelMessages(restored.forLlm('').messages, restored),
		);
		expect(modelMessages).not.toContain('Build one workflow.');
		expect(modelMessages.match(/Check the workflow before building\./g)).toHaveLength(1);
		expect(nextTurn.instructions()).toBeUndefined();
		expect(restored.serialize()).toEqual(saved);
	});

	it('restores a reference loaded by its owner file path', async () => {
		const referenceSource = createRuntimeSkillSource([
			{
				id: 'builder',
				name: 'builder',
				description: 'Build workflows.',
				instructions: 'Build one workflow.',
			},
			{
				id: 'models',
				name: 'models',
				description: 'Load before choosing a model.',
				instructions: 'Model rules.',
				parents: ['builder'],
				reference: { owner: 'builder', path: 'references/models.md' },
				dependencies: { tools: ['searchModels'] },
			},
		]);
		const memory = new InMemoryMemory();
		const list = new AgentMessageList();
		list.addHistory([
			{
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'load_skill',
						toolCallId: 'reference-load',
						input: { skillId: 'builder', filePath: 'references/models.md' },
						state: 'resolved',
						output: { type: 'content', value: [{ type: 'text', text: 'Model rules.' }] },
					},
				],
			},
		]);
		const active = new ActiveSkills(referenceSource, 'assistant', memory.skillState);

		await active.restore(list, scope);

		expect(list.activeSkillIds).toEqual(['models']);
		expect(JSON.stringify(active.modelMessages(list.forLlm('').messages, list))).toContain(
			'[Reference of: \\"builder\\"]',
		);
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
		await memory.skillState.save({ ...scope, agentName: 'assistant' }, { skillIds: ['planning'] });
		const list = new AgentMessageList();
		list.activeSkillIds = ['builder'];
		const active = new ActiveSkills(source, 'assistant', memory.skillState);

		await active.restore(list, scope);

		expect(active.instructions()).toContain('Build one workflow.');
		expect(active.instructions()).not.toContain('Create a task plan.');
		await expect(memory.skillState.load({ ...scope, agentName: 'assistant' })).resolves.toEqual({
			skillIds: ['builder'],
		});
	});

	it('removes disabled skills from restored state and from historical tool output', async () => {
		const memory = new InMemoryMemory();
		await memory.skillState.save(
			{ ...scope, agentName: 'assistant' },
			{ skillIds: ['planning', 'builder'] },
		);
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
		await expect(memory.skillState.load({ ...scope, agentName: 'assistant' })).resolves.toEqual({
			skillIds: ['builder'],
		});
	});

	it('re-anchors a stamped tool activation on a later turn instead of the block', async () => {
		const memory = new InMemoryMemory();
		await memory.skillState.save({ ...scope, agentName: 'assistant' }, { skillIds: ['builder'] });
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
		await memory.skillState.save({ ...scope, agentName: 'assistant' }, { skillIds: ['builder'] });
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
		await expect(memory.skillState.load({ ...scope, agentName: 'assistant' })).resolves.toEqual({
			skillIds: ['builder', 'planning'],
		});
		expect(AgentMessageList.deserialize(structuredClone(list.serialize())).activeSkillIds).toEqual([
			'builder',
			'planning',
		]);
	});
});
