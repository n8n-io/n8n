import type { EventService } from '@n8n/backend-services';
import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { mock } from 'vitest-mock-extended';

import type { McpDiscoveryActivityService } from '@/experiments/mcp-discovery/activity.service';
import type { Telemetry } from '@/telemetry';

import { AgentModificationTelemetryService } from '../agent-modification-telemetry.service';
import { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import { AgentSaveCompletionService } from '../agent-save-completion.service';
import type { AgentUpdateBroadcaster } from '../agent-update-broadcaster';
import { Agent } from '../entities/agent.entity';

describe('Agent save completion records Assistant activity', () => {
	mockInstance(AgentRuntimeCacheService);
	const activity = mock<McpDiscoveryActivityService>();
	const service = new AgentSaveCompletionService(
		mock<EventService>(),
		mock<AgentUpdateBroadcaster>(),
		new AgentModificationTelemetryService(mock<Telemetry>(), activity),
	);
	const event = {
		agent: Object.assign(new Agent(), {
			id: 'agent-1',
			schema: { name: 'Support', model: 'test-model', instructions: 'Help users' },
			integrations: [],
		}),
		user: mock<User>({ id: 'builder-user' }),
		projectId: 'project-1',
		by: 'builder',
		changedParts: ['instructions'],
		wasUnconfigured: false,
	} satisfies Parameters<AgentModificationTelemetryService['record']>[0];

	beforeEach(() => vi.clearAllMocks());

	it.each(['configurationSaved', 'bodySaved', 'taskSaved'] as const)(
		'%s waits for the activity record before completing',
		async (method) => {
			const started = createDeferredPromise();
			const persisted = createDeferredPromise();
			activity.recordAssistantMutation.mockImplementationOnce(async () => {
				started.resolve();
				await persisted.promise;
			});
			let completed = false;
			const save = (
				method === 'configurationSaved'
					? service.configurationSaved(event, undefined, null)
					: service[method](event)
			).then(() => {
				completed = true;
			});

			await started.promise;
			expect(activity.recordAssistantMutation).toHaveBeenCalledExactlyOnceWith(event.user.id);
			expect(completed).toBe(false);
			persisted.resolve();
			await save;
			expect(completed).toBe(true);
		},
	);
});
