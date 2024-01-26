import express from 'express';
import type {
	MessageEventBusDestinationWebhookOptions,
	MessageEventBusDestinationOptions,
} from 'n8n-workflow';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';

import { RestController, Get, Post, Delete, Authorized, RequireGlobalScope } from '@/decorators';
import { AuthenticatedRequest } from '@/requests';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { MessageEventBus } from './MessageEventBus/MessageEventBus';
import {
	isMessageEventBusDestinationSentryOptions,
	MessageEventBusDestinationSentry,
} from './MessageEventBusDestination/MessageEventBusDestinationSentry.ee';
import {
	isMessageEventBusDestinationSyslogOptions,
	MessageEventBusDestinationSyslog,
} from './MessageEventBusDestination/MessageEventBusDestinationSyslog.ee';
import { MessageEventBusDestinationWebhook } from './MessageEventBusDestination/MessageEventBusDestinationWebhook.ee';
import type { MessageEventBusDestination } from './MessageEventBusDestination/MessageEventBusDestination.ee';
import { logStreamingLicensedMiddleware } from './middleware/logStreamingEnabled.middleware.ee';

// ----------------------------------------
// TypeGuards
// ----------------------------------------

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

// ----------------------------------------
// Controller
// ----------------------------------------

@Authorized()
@RestController('/eventbus')
export class EventBusControllerEE {
	constructor(private readonly eventBus: MessageEventBus) {}

	// ----------------------------------------
	// Destinations
	// ----------------------------------------

	@Get('/destination', { middlewares: [logStreamingLicensedMiddleware] })
	@RequireGlobalScope('eventBusDestination:list')
	async getDestination(req: express.Request): Promise<MessageEventBusDestinationOptions[]> {
		if (isWithIdString(req.query)) {
			return await this.eventBus.findDestination(req.query.id);
		} else {
			return await this.eventBus.findDestination();
		}
	}

	@Post('/destination', { middlewares: [logStreamingLicensedMiddleware] })
	@RequireGlobalScope('eventBusDestination:create')
	async postDestination(req: AuthenticatedRequest): Promise<any> {
		let result: MessageEventBusDestination | undefined;
		if (isMessageEventBusDestinationOptions(req.body)) {
			switch (req.body.__type) {
				case MessageEventBusDestinationTypeNames.sentry:
					if (isMessageEventBusDestinationSentryOptions(req.body)) {
						result = await this.eventBus.addDestination(
							new MessageEventBusDestinationSentry(this.eventBus, req.body),
						);
					}
					break;
				case MessageEventBusDestinationTypeNames.webhook:
					if (isMessageEventBusDestinationWebhookOptions(req.body)) {
						result = await this.eventBus.addDestination(
							new MessageEventBusDestinationWebhook(this.eventBus, req.body),
						);
					}
					break;
				case MessageEventBusDestinationTypeNames.syslog:
					if (isMessageEventBusDestinationSyslogOptions(req.body)) {
						result = await this.eventBus.addDestination(
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
				await result.saveToDb();
				return {
					...result.serialize(),
					eventBusInstance: undefined,
				};
			}
			throw new BadRequestError('There was an error adding the destination');
		}
		throw new BadRequestError('Body is not configuring MessageEventBusDestinationOptions');
	}

	@Get('/testmessage', { middlewares: [logStreamingLicensedMiddleware] })
	@RequireGlobalScope('eventBusDestination:test')
	async sendTestMessage(req: express.Request): Promise<boolean> {
		if (isWithIdString(req.query)) {
			return await this.eventBus.testDestination(req.query.id);
		}
		return false;
	}

	@Delete('/destination', { middlewares: [logStreamingLicensedMiddleware] })
	@RequireGlobalScope('eventBusDestination:delete')
	async deleteDestination(req: AuthenticatedRequest) {
		if (isWithIdString(req.query)) {
			return await this.eventBus.removeDestination(req.query.id);
		} else {
			throw new BadRequestError('Query is missing id');
		}
	}
}
