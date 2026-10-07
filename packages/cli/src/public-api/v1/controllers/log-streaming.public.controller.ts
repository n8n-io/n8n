import {
	LogStreamingDestinationListPublicDto,
	LogStreamingDestinationPublicDto,
	LogStreamingEventTypesPublicDto,
	logStreamingDestinationIdParamSchema,
} from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Get,
	Licensed,
	Param,
	PublicApiController,
} from '@n8n/decorators';
import type { Response } from 'express';
import type { MessageEventBusDestinationOptions } from 'n8n-workflow';

import { NotFoundError } from '@n8n/errors';
import { eventNamesAll } from '@/eventbus/event-message-classes';
import { LogStreamingDestinationService } from '@/modules/log-streaming.ee/log-streaming-destination.service';

import { toLogStreamingDestinationPublic } from './log-streaming.mapper';

const tags = ['LogStreaming'];

@PublicApiController('/settings/log-streaming')
export class LogStreamingPublicController {
	constructor(private readonly destinationService: LogStreamingDestinationService) {}

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

	@Get('/destinations')
	@ApiKeyScope('eventBusDestination:list')
	@Licensed(LICENSE_FEATURES.LOG_STREAMING)
	@ApiSummary('List log streaming destinations')
	@ApiDescription(
		'List the configured log streaming destinations. Requires the `eventBusDestination:list` scope and the Log Streaming feature to be licensed.',
	)
	@ApiTags(tags)
	@ApiResponse(200, LogStreamingDestinationListPublicDto)
	async getLogStreamingDestinations(): Promise<LogStreamingDestinationListPublicDto> {
		const destinations = await this.destinationService.findDestination();

		return { data: destinations.map(toLogStreamingDestinationPublic) };
	}

	@Get('/destinations/:id')
	@ApiKeyScope('eventBusDestination:read')
	@Licensed(LICENSE_FEATURES.LOG_STREAMING)
	@ApiSummary('Retrieve a log streaming destination')
	@ApiDescription(
		'Retrieve a single log streaming destination by id. Requires the `eventBusDestination:read` scope and the Log Streaming feature to be licensed.',
	)
	@ApiTags(tags)
	@ApiResponse(200, LogStreamingDestinationPublicDto)
	@ApiErrorResponse(404)
	async getLogStreamingDestination(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id', logStreamingDestinationIdParamSchema) id: string,
	): Promise<LogStreamingDestinationPublicDto> {
		const destination = await this.findDestinationOrFail(id);

		return toLogStreamingDestinationPublic(destination);
	}

	private async findDestinationOrFail(id: string): Promise<MessageEventBusDestinationOptions> {
		const [destination] = await this.destinationService.findDestination(id);
		if (!destination) {
			throw new NotFoundError(`Log streaming destination with id "${id}" could not be found`);
		}
		return destination;
	}
}
