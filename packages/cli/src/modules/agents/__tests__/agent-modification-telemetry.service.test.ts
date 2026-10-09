import type { User } from '@n8n/db';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { mock } from 'vitest-mock-extended';

import type { McpDiscoveryActivityService } from '@/experiments/mcp-discovery/activity.service';
import type { Telemetry } from '@/telemetry';

import { AgentModificationTelemetryService } from '../agent-modification-telemetry.service';
import { Agent } from '../entities/agent.entity';

describe('AgentModificationTelemetryService Assistant activity', () => {
	const user = mock<User>({ id: 'builder-user' });
	const agent = Object.assign(new Agent(), {
		id: 'agent-1',
		schema: { name: 'Support', model: 'test-model', instructions: 'Help users' },
		integrations: [],
		activeVersionId: null,
	});
	const event = {
		agent,
		user,
		projectId: 'project-1',
		by: 'builder',
		changedParts: ['instructions'],
		wasUnconfigured: false,
	} satisfies Parameters<AgentModificationTelemetryService['record']>[0];
	const telemetry = mock<Telemetry>();
	const activity = mock<McpDiscoveryActivityService>();
	const service = new AgentModificationTelemetryService(telemetry, activity);

	beforeEach(() => vi.clearAllMocks());

	it('counts the first write that configures an agent as creation', async () => {
		await service.record({ ...event, wasUnconfigured: true });

		expect(activity.recordAssistantMutation).toHaveBeenCalledExactlyOnceWith(user.id);
		expect(telemetry.track).toHaveBeenCalledExactlyOnceWith(
			TELEMETRY_EVENT.AGENTS.BUILDER_CREATED_AGENT,
			expect.objectContaining({ user_id: user.id, event_version: '2' }),
		);
	});

	it.each(['instructions', 'tasks', 'skills', 'tools', 'triggers'] as const)(
		'counts Builder changes to %s',
		async (part) => {
			await service.record({ ...event, changedParts: [part] });

			expect(activity.recordAssistantMutation).toHaveBeenCalledExactlyOnceWith(user.id);
			expect(telemetry.track).toHaveBeenCalledExactlyOnceWith(
				TELEMETRY_EVENT.AGENTS.BUILDER_MODIFIED_AGENT,
				expect.objectContaining({ changed_parts: [part], event_version: '1' }),
			);
		},
	);

	it('does not count renaming an empty agent shell', async () => {
		await service.record({
			...event,
			agent: Object.assign(new Agent(), { schema: { name: 'New name' }, integrations: [] }),
			wasUnconfigured: true,
			changedParts: ['name'],
		});

		expect(activity.recordAssistantMutation).not.toHaveBeenCalled();
		expect(telemetry.track).not.toHaveBeenCalled();
	});

	it('does not count a save with no changes', async () => {
		await service.record({ ...event, changedParts: [] });

		expect(activity.recordAssistantMutation).not.toHaveBeenCalled();
		expect(telemetry.track).not.toHaveBeenCalled();
	});

	it.each(['user', 'mcp'] as const)(
		'does not count %s writes as Assistant activity',
		async (by) => {
			await service.record({ ...event, by, wasUnconfigured: true });
			await service.record({ ...event, by, wasUnconfigured: false });

			expect(activity.recordAssistantMutation).not.toHaveBeenCalled();
			expect(telemetry.track).toHaveBeenCalledTimes(2);
		},
	);

	it('records activity even when telemetry fails', async () => {
		telemetry.track.mockImplementationOnce(() => {
			throw new Error('Telemetry unavailable');
		});

		await expect(service.record(event)).resolves.toBeUndefined();
		expect(activity.recordAssistantMutation).toHaveBeenCalledExactlyOnceWith(user.id);
	});
});
