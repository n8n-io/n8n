// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
import type { User } from '@n8n/db';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@n8n/backend-services';
import type { Telemetry } from '@/telemetry';

import { AgentModificationTelemetryService } from '@/modules/agents/agent-modification-telemetry.service';
import { Agent } from '@/modules/agents/entities/agent.entity';

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
	const activity = mock<EventService>();
	const service = new AgentModificationTelemetryService(telemetry, activity);

	beforeEach(() => vi.clearAllMocks());

	it('counts the first write that configures an agent as creation', () => {
		service.record({ ...event, wasUnconfigured: true });

		expect(activity.emit).toHaveBeenCalledExactlyOnceWith('experiment-assistant-change-saved', {
			userId: user.id,
			at: expect.any(Number),
		});
		expect(telemetry.track).toHaveBeenCalledExactlyOnceWith(
			TELEMETRY_EVENT.AGENTS.BUILDER_CREATED_AGENT,
			expect.objectContaining({ user_id: user.id, event_version: '2' }),
		);
	});

	it.each(['instructions', 'tasks', 'skills', 'tools', 'triggers'] as const)(
		'counts Builder changes to %s',
		async (part) => {
			service.record({ ...event, changedParts: [part] });

			expect(activity.emit).toHaveBeenCalledExactlyOnceWith('experiment-assistant-change-saved', {
				userId: user.id,
				at: expect.any(Number),
			});
			expect(telemetry.track).toHaveBeenCalledExactlyOnceWith(
				TELEMETRY_EVENT.AGENTS.BUILDER_MODIFIED_AGENT,
				expect.objectContaining({ changed_parts: [part], event_version: '1' }),
			);
		},
	);

	it('does not count renaming an empty agent shell', () => {
		service.record({
			...event,
			agent: Object.assign(new Agent(), { schema: { name: 'New name' }, integrations: [] }),
			wasUnconfigured: true,
			changedParts: ['name'],
		});

		expect(activity.emit).not.toHaveBeenCalled();
		expect(telemetry.track).not.toHaveBeenCalled();
	});

	it('does not count a save with no changes', () => {
		service.record({ ...event, changedParts: [] });

		expect(activity.emit).not.toHaveBeenCalled();
		expect(telemetry.track).not.toHaveBeenCalled();
	});

	it.each(['user', 'mcp'] as const)(
		'does not count %s writes as Assistant activity',
		async (by) => {
			service.record({ ...event, by, wasUnconfigured: true });
			service.record({ ...event, by, wasUnconfigured: false });

			expect(activity.emit).not.toHaveBeenCalled();
			expect(telemetry.track).toHaveBeenCalledTimes(2);
		},
	);

	it('records activity even when telemetry fails', () => {
		telemetry.track.mockImplementationOnce(() => {
			throw new Error('Telemetry unavailable');
		});

		expect(() => service.record(event)).not.toThrow();
		expect(activity.emit).toHaveBeenCalledExactlyOnceWith('experiment-assistant-change-saved', {
			userId: user.id,
			at: expect.any(Number),
		});
	});
});
// EOF Experiment cleanup
