import { EventService, type EventMap } from '@n8n/backend-services';
import { expectTypeOf } from 'vitest';

import type { AiEventMap } from '../maps/ai.event-map';
import type { ExecutionDataEventMap } from '../maps/execution-data.event-map';
import type { InstanceAiEventMap } from '../maps/instance-ai.event-map';
import type { McpPostSaveMetricsEventMap } from '../maps/mcp-post-save-metrics.event-map';
import type { PollTriggerMetricsEventMap } from '../maps/poll-trigger-metrics.event-map';
import type { QueueMetricsEventMap } from '../maps/queue-metrics.event-map';
import type { RelayEventMap } from '../maps/relay.event-map';
import type { SystemTaskMetricsEventMap } from '../maps/system-task-metrics.event-map';
import type { WorkflowPublicationMetricsEventMap } from '../maps/workflow-publication-metrics.event-map';

describe('CLI event map', () => {
	it('registers all existing event payloads on the shared service', () => {
		type CliEventMap = RelayEventMap &
			QueueMetricsEventMap &
			AiEventMap &
			ExecutionDataEventMap &
			InstanceAiEventMap &
			McpPostSaveMetricsEventMap &
			WorkflowPublicationMetricsEventMap &
			PollTriggerMetricsEventMap &
			SystemTaskMetricsEventMap;

		expectTypeOf<EventMap>().toMatchTypeOf<CliEventMap>();
		expectTypeOf<CliEventMap>().toMatchTypeOf<EventMap>();
		expectTypeOf<keyof EventMap>().toEqualTypeOf<keyof CliEventMap>();
	});

	it('delivers CLI events through the package export', () => {
		const events = new EventService();
		const listener = vi.fn();
		events.once('session-started', (payload) => {
			expectTypeOf(payload).toEqualTypeOf<{ pushRef?: string }>();
			listener(payload);
		});

		events.emit('session-started', { pushRef: 'test-push-ref' });
		events.emit('session-started', {});

		expect(listener).toHaveBeenCalledExactlyOnceWith({ pushRef: 'test-push-ref' });
		// @ts-expect-error CLI payload types must remain strict.
		events.emit('session-started', { pushRef: 123 });
		// @ts-expect-error Unknown event names must remain invalid.
		events.emit('unregistered-event', {});
	});
});
