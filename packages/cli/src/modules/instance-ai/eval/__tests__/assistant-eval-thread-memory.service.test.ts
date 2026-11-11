import type { User } from '@n8n/db';
import { BadRequestError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { SystemAgentEvalService } from '@/modules/agents/system-agents/system-agent-eval.service';

import { AssistantEvalThreadMemoryService } from '../assistant-eval-thread-memory.service';

describe('AssistantEvalThreadMemoryService', () => {
	function setup() {
		const systemAgentEval = mock<SystemAgentEvalService>();
		return { systemAgentEval, service: new AssistantEvalThreadMemoryService(systemAgentEval) };
	}

	describe('seeding', () => {
		const user = mock<User>({ id: 'user-1' });

		it('creates the memory row of the Assistant agent thread', async () => {
			const { systemAgentEval, service } = setup();

			await service.ensureThread(user, 'thread-1');

			expect(systemAgentEval.ensureMemoryThread).toHaveBeenCalledWith(
				'assistant',
				user,
				'thread-1',
			);
		});

		it('writes the seed messages with their ids and dates', async () => {
			const { systemAgentEval, service } = setup();

			const result = await service.restoreThreadMessages(user, 'thread-1', [
				{
					id: 'msg-1',
					createdAt: '2026-01-01T00:00:00.000Z',
					role: 'user',
					content: [{ type: 'text', text: 'Hi' }],
				},
				{ id: 'msg-2', createdAt: '2026-01-01T00:00:01.000Z', type: 'custom', data: {} },
			]);

			expect(result).toEqual({ restored: 2 });
			expect(systemAgentEval.saveMessages).toHaveBeenCalledWith('assistant', user, 'thread-1', [
				{
					id: 'msg-1',
					createdAt: new Date('2026-01-01T00:00:00.000Z'),
					role: 'user',
					content: [{ type: 'text', text: 'Hi' }],
				},
				{
					id: 'msg-2',
					createdAt: new Date('2026-01-01T00:00:01.000Z'),
					type: 'custom',
					data: {},
				},
			]);
		});

		it.each([
			[{ createdAt: '2026-01-01T00:00:00.000Z', role: 'user', content: [] }],
			[{ id: 'msg-1', createdAt: 'not-a-date', role: 'user', content: [] }],
			[{ id: 'msg-1', createdAt: '2026-01-01T00:00:00.000Z', role: 'user' }],
		])('rejects a seed message that is not valid and writes nothing: %j', async (bad) => {
			const { systemAgentEval, service } = setup();

			await expect(service.restoreThreadMessages(user, 'thread-1', [bad])).rejects.toThrow(
				BadRequestError,
			);
			expect(systemAgentEval.saveMessages).not.toHaveBeenCalled();
		});
	});
});
