import type { User } from '@n8n/db';
import type { Scope } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

// The provider only delegates turn building to the service; keep its heavy
// runtime out of this test.
vi.mock('../instance-ai.service', () => ({ InstanceAiService: class {} }));

import type { AgentExecutionThread } from '../../agents/entities/agent-execution-thread.entity';
import type { N8nMemory } from '../../agents/integrations/n8n-memory';
import { AssistantAgentProvider } from '../assistant-agent.provider';
import type { InstanceAiService } from '../instance-ai.service';

function createProvider() {
	const instanceAiService = mock<InstanceAiService>();
	const getThread = vi.fn();
	const memory = mock<N8nMemory>();
	memory.getImplementation.mockReturnValue({ getThread } as never);
	const provider = new AssistantAgentProvider(instanceAiService, memory, mock());
	return { provider, instanceAiService, memory, getThread };
}

function userWithScopes(scopes: Scope[]): User {
	return mock<User>({
		id: 'user-1',
		role: { slug: 'global:member', scopes: scopes.map((slug) => ({ slug })) },
	} as Partial<User>);
}

describe('AssistantAgentProvider', () => {
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
		it('refuses a user without the instanceAi:message scope', async () => {
			const { provider } = createProvider();

			expect(await provider.authorize(userWithScopes([]), 'project-1')).toBe(false);
		});

		it('allows a user with the instanceAi:message scope', async () => {
			const { provider } = createProvider();

			expect(await provider.authorize(userWithScopes(['instanceAi:message']), 'project-1')).toBe(
				true,
			);
		});
	});

	describe('prepareTurn', () => {
		it('delegates turn building to the Assistant service', async () => {
			const { provider, instanceAiService } = createProvider();
			const handle = { agent: {} };
			instanceAiService.prepareAssistantTurn.mockResolvedValue(handle as never);
			const turn = { type: 'start', attachments: [] } as never;

			expect(await provider.prepareTurn(turn)).toBe(handle);
			expect(instanceAiService.prepareAssistantTurn).toHaveBeenCalledWith(turn);
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
				runId: expect.stringMatching(/^run_/),
				messageGroupId: expect.stringMatching(/^mg_/),
			});
		});

		it('returns only the ids when the thread has no stored defaults', async () => {
			const { provider, getThread } = createProvider();
			getThread.mockResolvedValue(null);

			const options = await provider.chatTurnOptions(mock<User>(), {
				id: 'thread-1',
			} as AgentExecutionThread);

			expect(Object.keys(options).sort()).toEqual(['messageGroupId', 'runId']);
		});
	});
});
