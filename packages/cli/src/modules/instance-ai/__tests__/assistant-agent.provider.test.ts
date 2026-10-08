import { Container } from '@n8n/di';
import type { User } from '@n8n/db';
import type { Scope } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

// The provider only delegates turn building to the service; keep its heavy
// runtime out of this test.
vi.mock('../instance-ai.service', () => ({ InstanceAiService: class {} }));
vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

import { userHasScopes } from '@/permissions.ee/check-access';

import type { AgentExecutionThread } from '../../agents/entities/agent-execution-thread.entity';
import type { N8nMemory } from '../../agents/integrations/n8n-memory';
import { AssistantAgentProvider } from '../assistant-agent.provider';
import { RunTargetService } from '../run-target/run-target.service';
import type { InstanceAiSettingsService } from '../instance-ai-settings.service';
import type { InstanceAiService } from '../instance-ai.service';

function createProvider() {
	const instanceAiService = mock<InstanceAiService>();
	const getThread = vi.fn();
	const memory = mock<N8nMemory>();
	memory.getImplementation.mockReturnValue({ getThread } as never);
	const settings = mock<InstanceAiSettingsService>();
	settings.isInstanceAiEnabled.mockReturnValue(true);
	const runTargets = mock<RunTargetService>();
	runTargets.forChatTurn.mockResolvedValue({ runTarget: { kind: 'local' } });
	Container.set(RunTargetService, runTargets);
	const provider = new AssistantAgentProvider(instanceAiService, memory, mock(), settings);
	return { provider, instanceAiService, memory, getThread, settings, runTargets };
}

function userWithScopes(scopes: Scope[]): User {
	return mock<User>({
		id: 'user-1',
		role: { slug: 'global:member', scopes: scopes.map((slug) => ({ slug })) },
	} as Partial<User>);
}

describe('AssistantAgentProvider', () => {
	beforeEach(() => {
		vi.mocked(userHasScopes).mockReset();
	});

	describe('normalizeResumeData', () => {
		it('converts a questions confirmation into the tool resume data', () => {
			const { provider } = createProvider();
			const answers = [{ questionId: 'team', selectedOptions: ['Sales'] }];

			expect(provider.normalizeResumeData({ kind: 'questions', answers })).toEqual({
				approved: true,
				answers,
			});
		});

		it('converts an approval confirmation into the tool resume data', () => {
			const { provider } = createProvider();

			expect(
				provider.normalizeResumeData({ kind: 'approval', approved: false, userInput: 'Not yet' }),
			).toEqual({ approved: false, userInput: 'Not yet' });
		});

		it.each([
			['tool resume data', { approved: true, answers: [] }],
			['an unknown kind', { kind: 'unknown', approved: true }],
			['a string', 'yes'],
			['null', null],
		])('passes %s through unchanged', (_label, value) => {
			const { provider } = createProvider();

			expect(provider.normalizeResumeData(value)).toBe(value);
		});
	});

	describe('authorize', () => {
		it('refuses every user while the Assistant is turned off', async () => {
			const { provider, settings } = createProvider();
			settings.isInstanceAiEnabled.mockReturnValue(false);
			vi.mocked(userHasScopes).mockResolvedValue(true);

			const user = userWithScopes(['instanceAi:message', 'project:read']);
			expect(await provider.authorize(user, 'project-1')).toBe(false);
			expect(userHasScopes).not.toHaveBeenCalled();

			settings.isInstanceAiEnabled.mockReturnValue(true);
			expect(await provider.authorize(user, 'project-1')).toBe(true);
		});

		it('refuses a user without the instanceAi:message scope', async () => {
			const { provider } = createProvider();

			expect(await provider.authorize(userWithScopes([]), 'project-1')).toBe(false);
			expect(userHasScopes).not.toHaveBeenCalled();
		});

		it.each([true, false])(
			'requires read access to the working project (access %s)',
			async (canRead) => {
				const { provider } = createProvider();
				vi.mocked(userHasScopes).mockResolvedValue(canRead);
				const user = userWithScopes(['instanceAi:message']);

				expect(await provider.authorize(user, 'project-1')).toBe(canRead);
				expect(userHasScopes).toHaveBeenCalledWith(user, ['project:read'], false, {
					projectId: 'project-1',
				});
			},
		);
	});

	describe('prepareTurn', () => {
		it('delegates turn building to the Assistant service', async () => {
			const { provider, instanceAiService } = createProvider();
			const handle = { agent: {} };
			instanceAiService.prepareAssistantTurn.mockResolvedValue(handle as never);
			const turn = { type: 'start', attachments: [], options: {} } as never;

			expect(await provider.prepareTurn(turn)).toBe(handle);
			expect(instanceAiService.prepareAssistantTurn).toHaveBeenCalledWith(turn);
		});

		it('posts the run target notice of the turn before the turn is built', async () => {
			const { provider, instanceAiService, runTargets } = createProvider();
			instanceAiService.prepareAssistantTurn.mockResolvedValue({ agent: {} } as never);
			const turn = {
				type: 'start',
				attachments: [],
				options: { runTargetNotice: 'This chat runs in Office.' },
			} as never;

			await provider.prepareTurn(turn);

			expect(runTargets.postTurnNotice).toHaveBeenCalledWith(turn, 'This chat runs in Office.');
			expect(runTargets.postTurnNotice.mock.invocationCallOrder[0]).toBeLessThan(
				instanceAiService.prepareAssistantTurn.mock.invocationCallOrder[0],
			);
		});

		it('posts no notice for a turn that carries none', async () => {
			const { provider, instanceAiService, runTargets } = createProvider();
			instanceAiService.prepareAssistantTurn.mockResolvedValue({ agent: {} } as never);

			await provider.prepareTurn({ type: 'start', attachments: [], options: {} } as never);

			expect(runTargets.postTurnNotice).not.toHaveBeenCalled();
		});
	});

	describe('chatTurnOptions', () => {
		it('starts a new run and message group and reuses the thread turn defaults', async () => {
			const { provider, getThread, memory } = createProvider();
			getThread.mockResolvedValue({
				id: 'thread-1',
				metadata: { assistantTurnDefaults: { timeZone: 'Europe/Helsinki', pushRef: 'push-1' } },
			});

			const options = await provider.chatTurnOptions(mock<User>(), {
				id: 'thread-1',
			} as AgentExecutionThread);

			expect(memory.getImplementation).toHaveBeenCalledWith('n8n-assistant');
			expect(getThread).toHaveBeenCalledWith('thread-1');
			expect(options).toEqual({
				timeZone: 'Europe/Helsinki',
				pushRef: 'push-1',
				runTarget: { kind: 'local' },
				runId: expect.stringMatching(/^run_/),
				messageGroupId: expect.stringMatching(/^mg_/),
			});
		});

		it('gives the run target service the stored defaults and the requested target', async () => {
			const { provider, getThread, runTargets } = createProvider();
			const stored = { runTarget: { kind: 'local' } };
			getThread.mockResolvedValue({ id: 'thread-1', metadata: { assistantTurnDefaults: stored } });
			const thread = { id: 'thread-1' } as AgentExecutionThread;
			const requested = { kind: 'linked', instanceId: '3f1c2b6e-8a4d-4e2b-9c1a-7d5e6f8a9b0c' };

			await provider.chatTurnOptions(mock<User>(), thread, {
				timeZone: 'UTC',
				runTarget: requested,
			});

			expect(runTargets.forChatTurn).toHaveBeenCalledWith(
				thread,
				stored,
				expect.objectContaining({ runTarget: requested }),
			);
		});

		it('passes no run target when the request carries an invalid one', async () => {
			const { provider, getThread, runTargets } = createProvider();
			getThread.mockResolvedValue(null);
			const thread = { id: 'thread-1' } as AgentExecutionThread;

			await provider.chatTurnOptions(mock<User>(), thread, {
				timeZone: 'UTC',
				runTarget: { kind: 'linked', instanceId: 'not-a-uuid' },
			});

			const [, , request] = runTargets.forChatTurn.mock.calls[0];
			expect(request?.runTarget).toBeUndefined();
		});

		it('carries the notice of a turn that found its link gone', async () => {
			const { provider, getThread, runTargets } = createProvider();
			getThread.mockResolvedValue(null);
			runTargets.forChatTurn.mockResolvedValue({
				runTarget: { kind: 'local' },
				notice: 'This chat runs in Office.',
			});

			const options = await provider.chatTurnOptions(mock<User>(), {
				id: 'thread-1',
			} as AgentExecutionThread);

			expect(options).toEqual(
				expect.objectContaining({
					runTarget: { kind: 'local' },
					runTargetNotice: 'This chat runs in Office.',
				}),
			);
		});

		it('returns only the ids when the thread has no stored defaults', async () => {
			const { provider, getThread } = createProvider();
			getThread.mockResolvedValue(null);

			const options = await provider.chatTurnOptions(mock<User>(), {
				id: 'thread-1',
			} as AgentExecutionThread);

			expect(Object.keys(options).sort()).toEqual(['messageGroupId', 'runId', 'runTarget']);
		});
	});
});
