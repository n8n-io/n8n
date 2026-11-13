import { testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { v4 as uuid } from 'uuid';

import type { AgentChatResumeRequest } from '@/modules/agents/queue/agent-turn-request.types';
import { AgentTurnRequestRepository } from '@/modules/agents/repositories/agent-turn-request.repository';

const payload: AgentChatResumeRequest = {
	kind: 'chat-resume',
	surface: 'n8n-chat',
	agentId: 'agent-1',
	projectId: 'project-1',
	userId: 'user-1',
	runId: 'run-1',
	toolCallId: 'tool-1',
	resumeData: { approved: true, note: null },
};

describe('AgentTurnRequestRepository', () => {
	let repository: AgentTurnRequestRepository;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		repository = Container.get(AgentTurnRequestRepository);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('lets exactly one process claim a request', async () => {
		const id = uuid();
		await repository.createPending(id, payload);
		expect(await repository.isPending(id)).toBe(true);

		const claims = await Promise.all([
			repository.claim(id, 'instance-a'),
			repository.claim(id, 'instance-b'),
		]);

		expect(claims.filter((claim) => claim !== null)).toEqual([payload]);
		expect(await repository.isPending(id)).toBe(false);
	});

	it('removes a request, and only old requests when cleaning up', async () => {
		const kept = uuid();
		const removed = uuid();
		await repository.createPending(kept, payload);
		await repository.createPending(removed, payload);

		await repository.remove(removed);
		expect(await repository.claim(removed, 'instance-a')).toBeNull();

		expect(await repository.removeOlderThan(new Date(Date.now() - 60_000))).toBe(0);
		expect(await repository.isPending(kept)).toBe(true);
		expect(await repository.removeOlderThan(new Date(Date.now() + 60_000))).toBeGreaterThan(0);
		expect(await repository.isPending(kept)).toBe(false);
	});
});
