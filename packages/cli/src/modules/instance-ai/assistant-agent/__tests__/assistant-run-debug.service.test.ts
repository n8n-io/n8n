import type { InstanceAiConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { SystemAgentThreadMetadataService } from '@/modules/agents/system-agents/system-agent-thread-metadata.service';

import { AssistantRunDebugService } from '../assistant-run-debug.service';

describe('AssistantRunDebugService', () => {
	function setup(runDebugEnabled: boolean) {
		const config = mock<InstanceAiConfig>({ runDebugEnabled });
		const threadMetadata = mock<SystemAgentThreadMetadataService>();
		const user = mock<User>({ id: 'user-1' });
		const service = new AssistantRunDebugService(config, threadMetadata);
		return { service, threadMetadata, user };
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
		const { service, threadMetadata, user } = setup(true);
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
		expect(threadMetadata.readThread).toHaveBeenCalledTimes(1);
		expect(threadMetadata.readThread).toHaveBeenCalledWith('assistant', user, 'thread-1');

		const list = await service.listThreadDebugRuns(user, 'thread-1');
		expect(threadMetadata.readThread).toHaveBeenCalledTimes(2);
		expect(threadMetadata.readThread).toHaveBeenLastCalledWith('assistant', user, 'thread-1');
		expect(list).toEqual([
			expect.objectContaining({
				runId: 'run-1',
				threadId: 'thread-1',
				stepCount: 0,
				workflowCodeCount: 0,
			}),
		]);
	});

	it('records workflow-code snapshots when runDebugEnabled is true and returns undefined when false', async () => {
		const disabled = setup(false);
		expect(
			disabled.service.workflowCodeRecorderForTurn({ runId: 'run-1', threadId: 'thread-1' }),
		).toBeUndefined();

		const { service, user } = setup(true);
		const recordSnapshot = service.workflowCodeRecorderForTurn({
			runId: 'run-2',
			threadId: 'thread-2',
		});
		expect(recordSnapshot).toBeDefined();

		recordSnapshot?.({
			code: 'export default {}',
			source: 'full-code',
			success: true,
			capturedAt: 1_700_000_000_000,
		});

		const record = await service.getRunDebug(user, 'run-2');
		expect(record.workflowCode).toHaveLength(1);
		expect(record.workflowCode[0]).toMatchObject({
			code: 'export default {}',
			source: 'full-code',
			success: true,
		});

		const list = await service.listThreadDebugRuns(user, 'thread-2');
		expect(list).toEqual([
			expect.objectContaining({
				runId: 'run-2',
				threadId: 'thread-2',
				workflowCodeCount: 1,
			}),
		]);
	});
});
