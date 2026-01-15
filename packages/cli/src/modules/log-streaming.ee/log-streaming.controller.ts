import { AuthenticatedRequest } from '@n8n/db';
import { RestController, Get, Post, Delete, GlobalScope, Licensed } from '@n8n/decorators';
import express from 'express';
import type {
	MessageEventBusDestinationWebhookOptions,
	MessageEventBusDestinationOptions,
} from 'n8n-workflow';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { eventNamesAll } from '@/eventbus/event-message-classes';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';

import {
	isMessageEventBusDestinationSentryOptions,
	MessageEventBusDestinationSentry,
} from './destinations/message-event-bus-destination-sentry.ee';
import {
	isMessageEventBusDestinationSyslogOptions,
	MessageEventBusDestinationSyslog,
} from './destinations/message-event-bus-destination-syslog.ee';
import { MessageEventBusDestinationWebhook } from './destinations/message-event-bus-destination-webhook.ee';
import { MessageEventBusDestination } from './destinations/message-event-bus-destination.ee';
import { LogStreamingDestinationService } from './log-streaming-destination.service';

const isWithIdString = (candidate: unknown): candidate is { id: string } => {
	const o = candidate as { id: string };
	if (!o) return false;
	return o.id !== undefined;
};

const isMessageEventBusDestinationWebhookOptions = (
	candidate: unknown,
): candidate is MessageEventBusDestinationWebhookOptions => {
	const o = candidate as MessageEventBusDestinationWebhookOptions;
	if (!o) return false;
	return o.url !== undefined;
};

const isMessageEventBusDestinationOptions = (
	candidate: unknown,
): candidate is MessageEventBusDestinationOptions => {
	const o = candidate as MessageEventBusDestinationOptions;
	if (!o) return false;
	return o.__type !== undefined;
};

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
	async getDestination(req: express.Request): Promise<MessageEventBusDestinationOptions[]> {
		if (isWithIdString(req.query)) {
			return await this.destinationService.findDestination(req.query.id);
		} else {
			return await this.destinationService.findDestination();
		}
	}

	@Licensed('feat:logStreaming')
	@Post('/destination')
	@GlobalScope('eventBusDestination:create')
	async postDestination(req: AuthenticatedRequest): Promise<any> {
		let result: MessageEventBusDestination | undefined;
		if (isMessageEventBusDestinationOptions(req.body)) {
			switch (req.body.__type) {
				case MessageEventBusDestinationTypeNames.sentry:
					if (isMessageEventBusDestinationSentryOptions(req.body)) {
						result = await this.destinationService.addDestination(
							new MessageEventBusDestinationSentry(this.eventBus, req.body),
						);
					}
					break;
				case MessageEventBusDestinationTypeNames.webhook:
					if (isMessageEventBusDestinationWebhookOptions(req.body)) {
						result = await this.destinationService.addDestination(
							new MessageEventBusDestinationWebhook(this.eventBus, req.body),
						);
					}
					break;
				case MessageEventBusDestinationTypeNames.syslog:
					if (isMessageEventBusDestinationSyslogOptions(req.body)) {
						result = await this.destinationService.addDestination(
							new MessageEventBusDestinationSyslog(this.eventBus, req.body),
						);
					}
					break;
				default:
					throw new BadRequestError(
						`Body is missing ${req.body.__type} options or type ${req.body.__type} is unknown`,
					);
			}
			if (result) {
				return {
					...result.serialize(),
					eventBusInstance: undefined,
				};
			}
			throw new BadRequestError('There was an error adding the destination');
		}
		throw new BadRequestError('Body is not configuring MessageEventBusDestinationOptions');
	}

	@Licensed('feat:logStreaming')
	@Get('/testmessage')
	@GlobalScope('eventBusDestination:test')
	async sendTestMessage(req: express.Request): Promise<boolean> {
		if (isWithIdString(req.query)) {
			return await this.destinationService.testDestination(req.query.id);
		}
		return false;
	}

	@Licensed('feat:logStreaming')
	@Delete('/destination')
	@GlobalScope('eventBusDestination:delete')
	async deleteDestination(req: AuthenticatedRequest) {
		if (isWithIdString(req.query)) {
			await this.destinationService.removeDestination(req.query.id);
		} else {
			throw new BadRequestError('Query is missing id');
		}
	}
}
