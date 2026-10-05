import type {} from '@n8n/backend-services';

import type { AiEventMap } from './maps/ai.event-map';
import type { CredentialConnectionStatusEventMap } from '@/credentials/credential-connection-status-provider.interface';
import type { ExecutionDataEventMap } from './maps/execution-data.event-map';
import type { InstanceAiEventMap } from './maps/instance-ai.event-map';
import type { McpPostSaveMetricsEventMap } from './maps/mcp-post-save-metrics.event-map';
import type { PollTriggerMetricsEventMap } from './maps/poll-trigger-metrics.event-map';
import type { QueueMetricsEventMap } from './maps/queue-metrics.event-map';
import type { RelayEventMap } from './maps/relay.event-map';
import type { SystemTaskMetricsEventMap } from './maps/system-task-metrics.event-map';
import type { WorkflowPublicationMetricsEventMap } from './maps/workflow-publication-metrics.event-map';

// Keep CLI payload types here so the shared service does not depend on CLI modules.
declare module '@n8n/backend-services' {
	interface EventMap
		extends RelayEventMap,
			CredentialConnectionStatusEventMap,
			QueueMetricsEventMap,
			AiEventMap,
			ExecutionDataEventMap,
			InstanceAiEventMap,
			McpPostSaveMetricsEventMap,
			WorkflowPublicationMetricsEventMap,
			PollTriggerMetricsEventMap,
			SystemTaskMetricsEventMap {}
}
