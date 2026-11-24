import type { InstanceAiConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { SystemAgentExecutionService } from '@/modules/agents/system-agents/system-agent-execution.service';

import { AssistantRunDebugService } from '../assistant-run-debug.service';

describe('AssistantRunDebugService', () => {
	function setup(runDebugEnabled: boolean) {
		const config = mock<InstanceAiConfig>({ runDebugEnabled });
		const systemAgents = mock<SystemAgentExecutionService>();
		const user = mock<User>({ id: 'user-1' });
		const service = new AssistantRunDebugService(config, systemAgents);
		return { service, systemAgents, user };
	}

	it('returns undefined hooks and rejects debug lookups when runDebugEnabled is false', async () => {
		const { service, user } = setup(false);

		expect(service.isEnabled()).toBe(false);
		expect(
			service.stepHooksForTurn({
				runId: 'run-1',
				threadId: 'thread-1',
				message: 'Hello',
			}),
		).toBeUndefined();
		await expect(service.getRunDebug(user, 'run-1')).rejects.toThrow(NotFoundError);
		await expect(service.listThreadDebugRuns(user, 'thread-1')).rejects.toThrow(NotFoundError);
	});

	it('captures step hooks and authorizes run/thread lookups when runDebugEnabled is true', async () => {
		const { service, systemAgents, user } = setup(true);
		const hooks = service.stepHooksForTurn({
			runId: 'run-1',
			threadId: 'thread-1',
			message: 'Build a workflow',
		});

		expect(service.isEnabled()).toBe(true);
		expect(hooks?.onStepStart).toBeDefined();
		expect(hooks?.onStepEnd).toBeDefined();

		const record = await service.getRunDebug(user, 'run-1');
		expect(record).toMatchObject({
			runId: 'run-1',
			threadId: 'thread-1',
			steps: [],
		});
		expect(systemAgents.getUsableThread).toHaveBeenCalledWith('assistant', user, 'thread-1');

		const list = await service.listThreadDebugRuns(user, 'thread-1');
		expect(list).toEqual([
			expect.objectContaining({
				runId: 'run-1',
				threadId: 'thread-1',
				stepCount: 0,
				workflowCodeCount: 0,
			}),
		]);
	});
});
