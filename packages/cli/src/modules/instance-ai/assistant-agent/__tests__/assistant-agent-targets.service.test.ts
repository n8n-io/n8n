import type { User } from '@n8n/db';
import { ForbiddenError, NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { AgentDraftState } from '@/modules/agents/agent-draft.contracts';
import type { AgentDraftService } from '@/modules/agents/agent-draft.service';
import type { AgentsService } from '@/modules/agents/agents.service';
import type { ProjectAgent } from '@/modules/agents/entities/agent.entity';
import type { SystemAgentThreadMetadataService } from '@/modules/agents/system-agents/system-agent-thread-metadata.service';

import {
	AssistantAgentTargetsService,
	toAgentTargetsState,
} from '../assistant-agent-targets.service';
import { ASSISTANT_AGENT_ID } from '../assistant-turn-options';

const { userHasScopes } = vi.hoisted(() => ({ userHasScopes: vi.fn() }));
vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes }));

const THREAD_ID = 'thread-1';
const PROJECT_ID = 'project-1';
const AGENT_ID = 'a1b2c3d4e5f6g7h8';

type Metadata = Record<string, unknown>;
type PersistedDraft = NonNullable<Awaited<ReturnType<AgentDraftService['persistDraft']>>>;

describe('AssistantAgentTargetsService', () => {
	const user = mock<User>({ id: 'user-1' });
	const threadMetadata = mock<SystemAgentThreadMetadataService>();
	const agentDrafts = mock<AgentDraftService>();
	const agents = mock<AgentsService>();
	const service = new AssistantAgentTargetsService(threadMetadata, agentDrafts, agents);

	/** The thread row. `patch` applies the change the way the real service does. */
	let row: { projectId: string; metadata: Metadata | undefined };
	function useThread(metadata?: Metadata, projectId = PROJECT_ID) {
		row = { projectId, metadata };
		threadMetadata.readThread.mockImplementation(async () => ({ ...row }));
		threadMetadata.patch.mockImplementation(async (_agentId, _user, _threadId, change) => {
			const next = change(row.metadata ?? {});
			if (next !== undefined) row.metadata = next;
			return row.metadata;
		});
	}

	function draft(name: string): PersistedDraft {
		const state = { id: AGENT_ID, name } as AgentDraftState;
		return { id: AGENT_ID, name, getState: async () => state } as PersistedDraft;
	}

	beforeEach(() => {
		vi.clearAllMocks();
		userHasScopes.mockResolvedValue(true);
		agents.findById.mockResolvedValue(mock<ProjectAgent>({ id: AGENT_ID }));
	});

	describe('toAgentTargetsState', () => {
		it('reads the bound, pending, registered agents and the preview session', () => {
			expect(
				toAgentTargetsState({
					instanceAiAgentBuilderTarget: { agentId: 'a', projectId: 'p', name: 'A', ref: 'a' },
					instanceAiPendingAgentTarget: { agentId: 'b', projectId: 'p' },
					instanceAiAgentBuilderTargets: { a: { agentId: 'a', projectId: 'p', ref: 'a' } },
					instanceAiAgentPreviewSession: { agentId: 'a', threadId: 't', executionId: 'e' },
				}),
			).toEqual({
				bound: { agentId: 'a', projectId: 'p', name: 'A' },
				pending: { agentId: 'b', projectId: 'p' },
				targets: [{ agentId: 'a', projectId: 'p' }],
				previewSession: { agentId: 'a', threadId: 't' },
			});
		});

		it('reads missing or malformed keys as not set', () => {
			expect(toAgentTargetsState({ instanceAiAgentBuilderTarget: 'agent', other: true })).toEqual({
				bound: null,
				pending: null,
				targets: [],
				previewSession: null,
			});
			expect(toAgentTargetsState(undefined)).toEqual({
				bound: null,
				pending: null,
				targets: [],
				previewSession: null,
			});
		});
	});

	describe('getState', () => {
		it('reads the metadata of the Assistant agent thread for the user', async () => {
			useThread({ instanceAiPendingAgentTarget: { agentId: AGENT_ID, projectId: PROJECT_ID } });

			await expect(service.getState(user, THREAD_ID)).resolves.toMatchObject({
				pending: { agentId: AGENT_ID, projectId: PROJECT_ID },
			});
			expect(threadMetadata.readThread).toHaveBeenCalledWith(ASSISTANT_AGENT_ID, user, THREAD_ID);
		});
	});

	describe('bind', () => {
		it('binds the agent, drops the pending marker and keeps the other keys', async () => {
			useThread({
				instanceAiPendingAgentTarget: { agentId: AGENT_ID, projectId: PROJECT_ID },
				assistantTabs: { tabs: [] },
			});

			const state = await service.bind(user, THREAD_ID, {
				agentId: AGENT_ID,
				projectId: PROJECT_ID,
				name: 'Triage',
			});

			expect(state.bound).toEqual({ agentId: AGENT_ID, projectId: PROJECT_ID, name: 'Triage' });
			expect(state.pending).toBeNull();
			expect(row.metadata).toMatchObject({ assistantTabs: { tabs: [] } });
		});

		it('rejects an agent of another project than the thread', async () => {
			useThread({});

			await expect(
				service.bind(user, THREAD_ID, { agentId: AGENT_ID, projectId: 'other', name: 'Triage' }),
			).rejects.toThrow(ForbiddenError);
			expect(threadMetadata.patch).not.toHaveBeenCalled();
		});

		it('rejects an agent that the user cannot read', async () => {
			useThread({});
			userHasScopes.mockResolvedValue(false);

			await expect(
				service.bind(user, THREAD_ID, { agentId: AGENT_ID, projectId: PROJECT_ID, name: 'Triage' }),
			).rejects.toThrow(ForbiddenError);
			expect(userHasScopes).toHaveBeenCalledWith(user, ['agent:read'], false, {
				projectId: PROJECT_ID,
			});
			// The scope check comes first, so the response does not say whether the agent exists.
			expect(agents.findById).not.toHaveBeenCalled();
			expect(threadMetadata.patch).not.toHaveBeenCalled();
		});

		it('rejects an agent that does not exist in the project', async () => {
			useThread({});
			agents.findById.mockResolvedValue(null);

			await expect(
				service.bind(user, THREAD_ID, { agentId: AGENT_ID, projectId: PROJECT_ID, name: 'Triage' }),
			).rejects.toThrow(NotFoundError);
			expect(agents.findById).toHaveBeenCalledWith(AGENT_ID, PROJECT_ID);
			expect(threadMetadata.patch).not.toHaveBeenCalled();
		});
	});

	describe('persistPendingAgent', () => {
		const request = { projectId: PROJECT_ID, agentId: AGENT_ID, name: 'New agent' };

		it('creates the agent and binds it with its saved name', async () => {
			useThread({ instanceAiPendingAgentTarget: { agentId: AGENT_ID, projectId: PROJECT_ID } });
			agentDrafts.persistDraft.mockResolvedValue(draft('New agent'));

			const result = await service.persistPendingAgent(user, THREAD_ID, request, 'push-1');

			expect(agentDrafts.persistDraft).toHaveBeenCalledWith(user, PROJECT_ID, {
				id: AGENT_ID,
				name: 'New agent',
				adoptOnCollision: true,
				config: undefined,
				pushRef: 'push-1',
			});
			expect(result.agent).toEqual({ id: AGENT_ID, name: 'New agent' });
			expect(result.targets.bound).toEqual({
				agentId: AGENT_ID,
				projectId: PROJECT_ID,
				name: 'New agent',
			});
			expect(result.targets.pending).toBeNull();
			// The thread is read once, before the draft is saved.
			expect(threadMetadata.readThread).toHaveBeenCalledTimes(1);
		});

		it('binds the name of an agent that a turn saved first', async () => {
			useThread({
				instanceAiAgentBuilderTarget: { agentId: AGENT_ID, projectId: PROJECT_ID },
			});
			agentDrafts.persistDraft.mockResolvedValue(draft('Support triage'));

			const result = await service.persistPendingAgent(user, THREAD_ID, request);

			expect(result.targets.bound?.name).toBe('Support triage');
		});

		it('does not adopt an agent that the thread does not name', async () => {
			useThread({});
			agentDrafts.persistDraft.mockResolvedValue(null);

			await expect(service.persistPendingAgent(user, THREAD_ID, request)).rejects.toThrow(
				ForbiddenError,
			);
			expect(agentDrafts.persistDraft).toHaveBeenCalledWith(
				user,
				PROJECT_ID,
				expect.objectContaining({ adoptOnCollision: false }),
			);
			expect(threadMetadata.patch).not.toHaveBeenCalled();
		});

		it('rejects an agent of another project than the thread', async () => {
			useThread({}, 'other-project');

			await expect(service.persistPendingAgent(user, THREAD_ID, request)).rejects.toThrow(
				ForbiddenError,
			);
			expect(agentDrafts.persistDraft).not.toHaveBeenCalled();
		});
	});
});
