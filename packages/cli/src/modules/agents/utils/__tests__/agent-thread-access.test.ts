import type { AgentExecutionThread } from '../../entities/agent-execution-thread.entity';
import { draftChatMemoryResourceId } from '../agent-memory-scope';
import {
	canContinueThreadInN8nChat,
	canContinueThreadInPreview,
	canUseTopLevelDraftThread,
	isProjectThreadCheckpoint,
	isSharedThread,
	N8N_CHAT_PRODUCTION_SOURCE,
	threadBelongsTo,
} from '../agent-thread-access';

function makeThread(overrides: Partial<AgentExecutionThread> = {}): AgentExecutionThread {
	return {
		id: 'thread-1',
		agentId: 'agent-1',
		projectId: 'project-1',
		accessScope: 'user',
		ownerId: 'owner-1',
		parentThreadId: null,
		taskId: null,
		...overrides,
	} as AgentExecutionThread;
}

const privateThread = makeThread();
const sharedThread = makeThread({ accessScope: 'project' });
const integrationThread = makeThread({ accessScope: 'project', ownerId: null });

describe('isSharedThread', () => {
	it('is true only for a project thread that keeps an owner', () => {
		expect(isSharedThread(sharedThread)).toBe(true);
		expect(isSharedThread(privateThread)).toBe(false);
		expect(isSharedThread(integrationThread)).toBe(false);
	});
});

describe('threadBelongsTo', () => {
	it('gives a private thread to its owner only', () => {
		expect(threadBelongsTo(privateThread, 'project-1', 'agent-1', 'owner-1')).toBe(true);
		expect(threadBelongsTo(privateThread, 'project-1', 'agent-1', 'teammate-1')).toBe(false);
	});

	it('gives a project thread to every reader of the project, shared or not', () => {
		expect(threadBelongsTo(sharedThread, 'project-1', 'agent-1', 'teammate-1')).toBe(true);
		expect(threadBelongsTo(integrationThread, 'project-1', 'agent-1', 'teammate-1')).toBe(true);
	});

	it('checks the project and the agent', () => {
		expect(threadBelongsTo(sharedThread, 'project-2', 'agent-1', 'owner-1')).toBe(false);
		expect(threadBelongsTo(sharedThread, 'project-1', 'agent-2', 'owner-1')).toBe(false);
	});

	it('does not give a private thread without owner to anybody', () => {
		const orphan = makeThread({ ownerId: null });
		expect(threadBelongsTo(orphan, 'project-1', 'agent-1', '')).toBe(false);
	});
});

describe('canUseTopLevelDraftThread', () => {
	it('keeps the owner of a shared thread, as before the share', () => {
		expect(canUseTopLevelDraftThread(privateThread, 'owner-1')).toBe(true);
		expect(canUseTopLevelDraftThread(sharedThread, 'owner-1')).toBe(true);
	});

	it('refuses a teammate of a shared thread', () => {
		expect(canUseTopLevelDraftThread(sharedThread, 'teammate-1')).toBe(false);
	});

	it('refuses every user for a project thread without owner', () => {
		expect(canUseTopLevelDraftThread(integrationThread, 'owner-1')).toBe(false);
		expect(canUseTopLevelDraftThread(integrationThread, '')).toBe(false);
	});

	it('refuses a child thread, also for its owner', () => {
		expect(canUseTopLevelDraftThread(makeThread({ parentThreadId: 'parent-1' }), 'owner-1')).toBe(
			false,
		);
	});
});

describe('canContinueThreadInPreview', () => {
	it('lets the owner continue a shared preview thread', () => {
		expect(canContinueThreadInPreview(sharedThread, 'owner-1', 'chat')).toBe(true);
		expect(canContinueThreadInPreview(sharedThread, 'teammate-1', 'chat')).toBe(false);
	});

	it('refuses a production chat source and a scheduled thread', () => {
		expect(canContinueThreadInPreview(privateThread, 'owner-1', N8N_CHAT_PRODUCTION_SOURCE)).toBe(
			false,
		);
		expect(canContinueThreadInPreview(makeThread({ taskId: 'task-1' }), 'owner-1', 'chat')).toBe(
			false,
		);
	});
});

describe('canContinueThreadInN8nChat', () => {
	it('needs the production chat source and the owner', () => {
		expect(canContinueThreadInN8nChat(privateThread, 'owner-1', N8N_CHAT_PRODUCTION_SOURCE)).toBe(
			true,
		);
		expect(canContinueThreadInN8nChat(privateThread, 'owner-1', 'chat')).toBe(false);
		expect(
			canContinueThreadInN8nChat(privateThread, 'teammate-1', N8N_CHAT_PRODUCTION_SOURCE),
		).toBe(false);
	});
});

describe('isProjectThreadCheckpoint', () => {
	it("shows the checkpoint of a shared thread in its owner's draft-chat memory", () => {
		expect(isProjectThreadCheckpoint(sharedThread, draftChatMemoryResourceId('owner-1'))).toBe(
			true,
		);
	});

	it('hides a checkpoint in the draft-chat memory of another user', () => {
		expect(
			isProjectThreadCheckpoint(sharedThread, draftChatMemoryResourceId('teammate-1')),
		).toBe(false);
		expect(
			isProjectThreadCheckpoint(integrationThread, draftChatMemoryResourceId('owner-1')),
		).toBe(false);
	});

	it('shows a checkpoint that is not in a draft-chat memory', () => {
		expect(isProjectThreadCheckpoint(integrationThread, 'integration:slack:U1')).toBe(true);
		expect(isProjectThreadCheckpoint(integrationThread, undefined)).toBe(true);
		// A draft-chat prefix without a user names nobody.
		expect(isProjectThreadCheckpoint(integrationThread, draftChatMemoryResourceId(''))).toBe(true);
	});
});
