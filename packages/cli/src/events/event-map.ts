import type { AiEventMap } from './maps/ai.event-map';
import type { ExecutionDataEventMap } from './maps/execution-data.event-map';
import type { InstanceAiEventMap } from './maps/instance-ai.event-map';
import type { PollTriggerMetricsEventMap } from './maps/poll-trigger-metrics.event-map';
import type { QueueMetricsEventMap } from './maps/queue-metrics.event-map';
import type { RelayEventMap } from './maps/relay.event-map';
import type { WorkflowPublicationMetricsEventMap } from './maps/workflow-publication-metrics.event-map';

// Adds the cli event maps to the `EventService` map that `@n8n/services-common` owns.
declare module '@n8n/services-common' {
	interface EventMap
		extends RelayEventMap,
			QueueMetricsEventMap,
			AiEventMap,
			ExecutionDataEventMap,
			InstanceAiEventMap,
			WorkflowPublicationMetricsEventMap,
			PollTriggerMetricsEventMap {}
}
