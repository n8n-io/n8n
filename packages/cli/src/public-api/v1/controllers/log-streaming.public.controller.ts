import {
	CreateLogStreamingDestinationPublicDto,
	UpdateLogStreamingDestinationPublicDto,
	LogStreamingDestinationListPublicDto,
	LogStreamingDestinationPublicDto,
	LogStreamingEventTypesPublicDto,
	LogStreamingTestResultPublicDto,
	logStreamingDestinationIdParamSchema,
} from '@n8n/api-types';
import { OutboundHttp } from '@n8n/backend-network';
import { CredentialsFinderService } from '@n8n/backend-services';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { AuthenticatedRequest, User } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Delete,
	Get,
	Licensed,
	Param,
	Post,
	PublicApiController,
	Put,
} from '@n8n/decorators';
import type { Response } from 'express';
import type { MessageEventBusDestinationOptions } from 'n8n-workflow';

import { ConflictError, NotFoundError } from '@n8n/errors';
import { eventNamesAll } from '@/eventbus/event-message-classes';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { createMessageEventBusDestination } from '@/modules/log-streaming.ee/create-message-event-bus-destination';
import { assertUserCanUseDestinationCredentials } from '@/modules/log-streaming.ee/destinations/destination-credentials-access';
import { LogStreamingDestinationService } from '@/modules/log-streaming.ee/log-streaming-destination.service';

import {
	toInternalDestinationOptions,
	toLogStreamingDestinationPublic,
} from './log-streaming.mapper';

const tags = ['LogStreaming'];

@PublicApiController('/settings/log-streaming')
export class LogStreamingPublicController {
	constructor(
		private readonly destinationService: LogStreamingDestinationService,
		private readonly eventBus: MessageEventBus,
		private readonly instanceSettingsLoaderConfig: InstanceSettingsLoaderConfig,
		private readonly outboundHttp: OutboundHttp,
		private readonly credentialsFinderService: CredentialsFinderService,
	) {}

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

	@Get('/destinations/:destinationId')
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
		@Param('destinationId', logStreamingDestinationIdParamSchema) destinationId: string,
	): Promise<LogStreamingDestinationPublicDto> {
		const destination = await this.findDestinationOrFail(destinationId);

		return toLogStreamingDestinationPublic(destination);
	}

	@Post('/destinations')
	@ApiKeyScope('eventBusDestination:create')
	@Licensed(LICENSE_FEATURES.LOG_STREAMING)
	@ApiSummary('Create a log streaming destination')
	@ApiDescription(
		'Create a log streaming destination. The destination takes effect exactly as it would from the UI, using the same validation. Requires the `eventBusDestination:create` scope and the Log Streaming feature to be licensed. When destinations are managed via environment variables, the write is rejected with 409 and nothing is created; reads still return the current values.',
	)
	@ApiTags(tags)
	@ApiResponse(200, LogStreamingDestinationPublicDto)
	@ApiErrorResponse(409)
	async createLogStreamingDestination(
		req: AuthenticatedRequest,
		_res: Response,
		@Body body: CreateLogStreamingDestinationPublicDto,
	): Promise<LogStreamingDestinationPublicDto> {
		this.assertNotManagedByEnv();

		return await this.saveDestination(req.user, toInternalDestinationOptions(body));
	}

	@Put('/destinations/:destinationId')
	@ApiKeyScope('eventBusDestination:update')
	@Licensed(LICENSE_FEATURES.LOG_STREAMING)
	@ApiSummary('Update a log streaming destination')
	@ApiDescription(
		'Replace an existing log streaming destination. The update takes effect exactly as it would from the UI, using the same validation. Requires the `eventBusDestination:update` scope and the Log Streaming feature to be licensed. When destinations are managed via environment variables, the write is rejected with 409 and nothing is changed; reads still return the current values.',
	)
	@ApiTags(tags)
	@ApiResponse(200, LogStreamingDestinationPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	async updateLogStreamingDestination(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('destinationId', logStreamingDestinationIdParamSchema) destinationId: string,
		@Body body: UpdateLogStreamingDestinationPublicDto,
	): Promise<LogStreamingDestinationPublicDto> {
		this.assertNotManagedByEnv();
		await this.findDestinationOrFail(destinationId);

		// `addDestination` replaces the stored destination that has this id.
		return await this.saveDestination(req.user, {
			...toInternalDestinationOptions(body),
			id: destinationId,
		});
	}

	@Post('/destinations/:destinationId/test')
	@ApiKeyScope('eventBusDestination:test')
	@Licensed(LICENSE_FEATURES.LOG_STREAMING)
	@ApiSummary('Send a test message to a log streaming destination')
	@ApiDescription(
		'Send a test message to the destination to verify it is reachable and configured correctly. Requires the `eventBusDestination:test` scope and the Log Streaming feature to be licensed.',
	)
	@ApiTags(tags)
	@ApiResponse(200, LogStreamingTestResultPublicDto)
	@ApiErrorResponse(404)
	async testLogStreamingDestination(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('destinationId', logStreamingDestinationIdParamSchema) destinationId: string,
	): Promise<LogStreamingTestResultPublicDto> {
		const destination = await this.findDestinationOrFail(destinationId);
		await assertUserCanUseDestinationCredentials(
			this.credentialsFinderService,
			req.user,
			destination,
		);

		// A delivery failure is a failed test, not a server error.
		try {
			const result = await this.destinationService.testDestination(destinationId);

			return { success: result };
		} catch {
			return { success: false };
		}
	}

	@Delete('/destinations/:destinationId')
	@ApiKeyScope('eventBusDestination:delete')
	@Licensed(LICENSE_FEATURES.LOG_STREAMING)
	@ApiSummary('Delete a log streaming destination')
	@ApiDescription(
		'Remove a log streaming destination. Requires the `eventBusDestination:delete` scope and the Log Streaming feature to be licensed. When destinations are managed via environment variables, the delete is rejected with 409 and nothing is removed; reads still return the current values.',
	)
	@ApiTags(tags)
	@ApiResponse(200, LogStreamingDestinationPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	async deleteLogStreamingDestination(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('destinationId', logStreamingDestinationIdParamSchema) destinationId: string,
	): Promise<LogStreamingDestinationPublicDto> {
		this.assertNotManagedByEnv();
		const destination = await this.findDestinationOrFail(destinationId);
		await this.destinationService.removeDestination(destinationId);

		return toLogStreamingDestinationPublic(destination);
	}

	private assertNotManagedByEnv() {
		if (this.instanceSettingsLoaderConfig.logStreamingManagedByEnv) {
			throw new ConflictError(
				'Log streaming destinations are managed via environment variables and cannot be modified through the API',
			);
		}
	}

	private async saveDestination(
		user: User,
		options: MessageEventBusDestinationOptions,
	): Promise<LogStreamingDestinationPublicDto> {
		await assertUserCanUseDestinationCredentials(this.credentialsFinderService, user, options);

		const destination = createMessageEventBusDestination(this.eventBus, this.outboundHttp, options);
		const result = await this.destinationService.addDestination(destination);

		return toLogStreamingDestinationPublic(result.serialize());
	}

	private async findDestinationOrFail(id: string): Promise<MessageEventBusDestinationOptions> {
		const [destination] = await this.destinationService.findDestination(id);
		if (!destination) {
			throw new NotFoundError(`Log streaming destination with id "${id}" could not be found`);
		}
		return destination;
	}
}
