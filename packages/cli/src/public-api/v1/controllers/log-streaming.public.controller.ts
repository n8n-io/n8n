import { LogStreamingEventTypesPublicDto } from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import {
	ApiDescription,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Get,
	Licensed,
	PublicApiController,
} from '@n8n/decorators';

import { eventNamesAll } from '@/eventbus/event-message-classes';

const tags = ['LogStreaming'];

@PublicApiController('/settings/log-streaming')
export class LogStreamingPublicController {
	@Get('/event-types')
	@ApiKeyScope('eventBusDestination:list')
	@Licensed(LICENSE_FEATURES.LOG_STREAMING)
	@ApiSummary('List streamable event types')
	@ApiDescription(
		'List the event types that can be streamed to a log streaming destination. Requires the `eventBusDestination:list` scope and the Log Streaming feature to be licensed.',
	)
	@ApiTags(tags)
	@ApiResponse(200, LogStreamingEventTypesPublicDto)
	async getLogStreamingEventTypes(): Promise<LogStreamingEventTypesPublicDto> {
		return { data: eventNamesAll };
	}
}
