import {
	CreateDestinationDto,
	DeleteDestinationQueryDto,
	GetDestinationQueryDto,
	TestDestinationQueryDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Delete, Get, GlobalScope, Licensed, Post, Query, RestController } from '@n8n/decorators';
import type {
	MessageEventBusDestinationOptions,
	MessageEventBusDestinationSentryOptions,
	MessageEventBusDestinationSyslogOptions,
	MessageEventBusDestinationWebhookOptions,
} from 'n8n-workflow';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { eventNamesAll } from '@/eventbus/event-message-classes';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';

import { MessageEventBusDestinationSentry } from './destinations/message-event-bus-destination-sentry.ee';
import { MessageEventBusDestinationSyslog } from './destinations/message-event-bus-destination-syslog.ee';
import { MessageEventBusDestinationWebhook } from './destinations/message-event-bus-destination-webhook.ee';
import type { MessageEventBusDestination } from './destinations/message-event-bus-destination.ee';
import { LogStreamingDestinationService } from './log-streaming-destination.service';

@RestController('/eventbus')
export class EventBusController {
	constructor(
		private readonly eventBus: MessageEventBus,
		private readonly destinationService: LogStreamingDestinationService,
	) {}

	@Get('/eventnames')
	async getEventNames(): Promise<string[]> {
		return eventNamesAll;
	}

	@Licensed('feat:logStreaming')
	@Get('/destination')
	@GlobalScope('eventBusDestination:list')
	async getDestination(
		_req: AuthenticatedRequest,
		_res: unknown,
		@Query query: GetDestinationQueryDto,
	): Promise<MessageEventBusDestinationOptions[]> {
		return await this.destinationService.findDestination(query.id);
	}

	@Licensed('feat:logStreaming')
	@Post('/destination')
	@GlobalScope('eventBusDestination:create')
	async postDestination(req: AuthenticatedRequest): Promise<MessageEventBusDestinationOptions> {
		// Manually validate using the discriminated union schema since TypeScript reflection doesn't work with plain Zod schemas
		// And ZodClass doesn't support discriminated unions directly
		const parseResult = CreateDestinationDto.safeParse(req.body);
		if (!parseResult.success) {
			throw new BadRequestError(parseResult.error.errors[0].message);
		}

		const body = parseResult.data;
		let result: MessageEventBusDestination;

		switch (body.__type) {
			case MessageEventBusDestinationTypeNames.webhook:
				result = await this.destinationService.addDestination(
					new MessageEventBusDestinationWebhook(
						this.eventBus,
						body as MessageEventBusDestinationWebhookOptions,
					),
				);
				break;
			case MessageEventBusDestinationTypeNames.sentry:
				result = await this.destinationService.addDestination(
					new MessageEventBusDestinationSentry(
						this.eventBus,
						body as MessageEventBusDestinationSentryOptions,
					),
				);
				break;
			case MessageEventBusDestinationTypeNames.syslog:
				result = await this.destinationService.addDestination(
					new MessageEventBusDestinationSyslog(
						this.eventBus,
						body as MessageEventBusDestinationSyslogOptions,
					),
				);
				break;
			default:
				throw new BadRequestError(`Unknown destination type: ${body.__type}`);
		}

		return result.serialize();
	}

	@Licensed('feat:logStreaming')
	@Get('/testmessage')
	@GlobalScope('eventBusDestination:test')
	async sendTestMessage(
		_req: AuthenticatedRequest,
		_res: unknown,
		@Query query: TestDestinationQueryDto,
	): Promise<boolean> {
		return await this.destinationService.testDestination(query.id);
	}

	@Licensed('feat:logStreaming')
	@Delete('/destination')
	@GlobalScope('eventBusDestination:delete')
	async deleteDestination(
		_req: AuthenticatedRequest,
		_res: unknown,
		@Query query: DeleteDestinationQueryDto,
	): Promise<void> {
		await this.destinationService.removeDestination(query.id);
	}
}
