// Experiment cleanup (123_surface_mcp_to_claude_trial_users)
import type { AgentJsonConfig } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@n8n/backend-services';
import type { Telemetry } from '@/telemetry';

import { AgentModificationTelemetryService } from '@/modules/agents/agent-modification-telemetry.service';
import { Agent } from '@/modules/agents/entities/agent.entity';

describe('AgentModificationTelemetryService Assistant activity', () => {
	const user = mock<User>({ id: 'builder-user' });
	const config = {
		name: 'Support',
		model: 'test-model',
		instructions: 'Help users',
	} satisfies AgentJsonConfig;
	const agent = Object.assign(new Agent(), {
		id: 'agent-1',
		schema: config,
		integrations: [],
		activeVersionId: null,
	});
	const event = {
		agent,
		config,
		user,
		projectId: 'project-1',
		by: 'builder',
		changedParts: ['instructions'],
	} satisfies Parameters<AgentModificationTelemetryService['record']>[0];
	const telemetry = mock<Telemetry>();
	const activity = mock<EventService>();
	const service = new AgentModificationTelemetryService(
		telemetry,
		mock<InstanceSettings>(),
		activity,
	);

	beforeEach(() => vi.clearAllMocks());

	it('counts committed Builder creation with a configured agent', () => {
		service.recordCreation(event);

		expect(activity.emit).toHaveBeenCalledExactlyOnceWith('experiment-assistant-change-saved', {
			userId: user.id,
			at: expect.any(Number),
		});
		expect(telemetry.track).toHaveBeenCalledExactlyOnceWith(
			TELEMETRY_EVENT.AGENTS.BUILDER_CREATED_AGENT,
			expect.objectContaining({ user_id: user.id, event_version: '3' }),
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
				expect.objectContaining({ changed_parts: [part], event_version: '2' }),
			);
		},
	);

	it.each(['name', 'description'] as const)(
		'does not count a %s change to an empty agent shell',
		(part) => {
			const emptyConfig = {
				name: 'New name',
				description: 'Answers billing questions',
				model: '',
				instructions: '',
			} satisfies AgentJsonConfig;
			service.record({
				...event,
				agent: Object.assign(new Agent(), { schema: emptyConfig, integrations: [] }),
				config: emptyConfig,
				changedParts: [part],
			});

			expect(activity.emit).not.toHaveBeenCalled();
			expect(telemetry.track).toHaveBeenCalledOnce();
		},
	);

	it('does not count creating an empty agent shell', () => {
		const emptyConfig = {
			name: 'New agent',
			model: '',
			instructions: '',
		} satisfies AgentJsonConfig;
		service.recordCreation({ ...event, config: emptyConfig });

		expect(activity.emit).not.toHaveBeenCalled();
		expect(telemetry.track).toHaveBeenCalledOnce();
	});

	it('counts removing the last configured content as a modification', () => {
		const emptyConfig = { name: 'Support', model: '', instructions: '' } satisfies AgentJsonConfig;
		service.record({ ...event, config: emptyConfig, changedParts: ['model', 'instructions'] });

		expect(activity.emit).toHaveBeenCalledExactlyOnceWith('experiment-assistant-change-saved', {
			userId: user.id,
			at: expect.any(Number),
		});
	});

	it('does not count a save with no changes', () => {
		service.record({ ...event, changedParts: [] });

		expect(activity.emit).not.toHaveBeenCalled();
		expect(telemetry.track).not.toHaveBeenCalled();
	});

	it.each(['user', 'mcp'] as const)(
		'does not count %s writes as Assistant activity',
		async (by) => {
			service.recordCreation({ ...event, by });
			service.record({ ...event, by });

			expect(activity.emit).not.toHaveBeenCalled();
			expect(telemetry.track).toHaveBeenCalledTimes(2);
		},
	);

	it.each(['record', 'recordCreation'] as const)(
		'records activity when %s telemetry fails',
		(method) => {
			telemetry.track.mockImplementationOnce(() => {
				throw new Error('Telemetry unavailable');
			});

			expect(() => service[method](event)).not.toThrow();
			expect(activity.emit).toHaveBeenCalledExactlyOnceWith('experiment-assistant-change-saved', {
				userId: user.id,
				at: expect.any(Number),
			});
		},
	);
});
// EOF Experiment cleanup
