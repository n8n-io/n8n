/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import { ResponseHelper } from '..';
import { ResponseError } from '../ResponseHelper';
import { EventMessage, EventMessageSerialized } from './EventMessageClasses/EventMessage';
import { eventBus, EventMessageSubscribeDestination } from './MessageEventBus/MessageEventBus';
import {
	isMessageEventBusDestinationSentryOptions,
	MessageEventBusDestinationSentry,
} from './MessageEventBusDestination/MessageEventBusDestinationSentry';
import {
	isMessageEventBusDestinationSyslogOptions,
	MessageEventBusDestinationSyslog,
} from './MessageEventBusDestination/MessageEventBusDestinationSyslog';
import {
	MessageEventBusDestinationWebhook,
	MessageEventBusDestinationWebhookOptions,
} from './MessageEventBusDestination/MessageEventBusDestinationWebhook';

export const eventBusRouter = express.Router();

// ----------------------------------------
// TypeGuards
// ----------------------------------------

const isEventMessageRequestBody = (candidate: unknown): candidate is EventMessageSerialized => {
	const o = candidate as EventMessageSerialized;
	if (!o) return false;
	if (o.eventName !== undefined) {
		if (o.eventName.match(/^[\w\s]+\.[\w\s]+\.[\w\s]+/)) {
			return true;
		}
	}
	return false;
};

const isBodyWithName = (candidate: unknown): candidate is { name: string } => {
	const o = candidate as { name: string };
	if (!o) return false;
	return o.name !== undefined;
};

const isEventMessageDestinationSubscription = (
	candidate: unknown,
): candidate is EventMessageSubscribeDestination => {
	const o = candidate as EventMessageSubscribeDestination;
	if (!o) return false;
	return o.subscriptionSet !== undefined && o.destinationId !== undefined;
};

// TODO: add credentials
const isMessageEventBusDestinationWebhookOptions = (
	candidate: unknown,
): candidate is MessageEventBusDestinationWebhookOptions => {
	const o = candidate as MessageEventBusDestinationWebhookOptions;
	if (!o) return false;
	return o.name !== undefined && o.url !== undefined;
};

// ----------------------------------------
// Events
// ----------------------------------------

eventBusRouter.post(
	`/event/add`,
	ResponseHelper.send(async (req: express.Request): Promise<any> => {
		if (isEventMessageRequestBody(req.body)) {
			await eventBus.send(EventMessage.deserialize(req.body));
		} else {
			throw new ResponseError(
				'Body is not a serialized EventMessage or eventName does not match format {namespace}.{domain}.{event}',
				undefined,
				400,
			);
		}
	}),
);

eventBusRouter.post(
	`/event/addmany`,
	ResponseHelper.send(async (req: express.Request): Promise<any> => {
		if (isEventMessageRequestBody(req.body)) {
			const count =
				req.body.count !== undefined && parseInt(req.body.count as string) !== NaN
					? parseInt(req.body.count as string)
					: 100;
			const msg = EventMessage.deserialize(req.body);
			for (let i = 0; i < count; i++) {
				msg.payload = i;
				await eventBus.send(msg);
			}
		} else {
			throw new ResponseError(
				'Body is not a serialized EventMessage or eventName does not match format {namespace}.{domain}.{event}',
				undefined,
				400,
			);
		}
	}),
);

// ----------------------------------------
// Destinations
// ----------------------------------------

eventBusRouter.post(
	`/destination/add/syslog`,
	ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<any> => {
		if (isMessageEventBusDestinationSyslogOptions(req.body)) {
			const result = await eventBus.addDestination(new MessageEventBusDestinationSyslog(req.body));
			return result;
		}
	}),
);

eventBusRouter.post(
	`/destination/add/sentry`,
	ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<any> => {
		if (isMessageEventBusDestinationSentryOptions(req.body)) {
			const result = await eventBus.addDestination(new MessageEventBusDestinationSentry(req.body));
			if (result) {
				await result.saveToDb();
				return result;
			}
		}
	}),
);

eventBusRouter.post(
	`/destination/add/webhook`,
	ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<any> => {
		if (isMessageEventBusDestinationWebhookOptions(req.body)) {
			const result = await eventBus.addDestination(new MessageEventBusDestinationWebhook(req.body));
			return result;
		} else {
			throw new ResponseError('Body is missing name', undefined, 400);
		}
	}),
);

eventBusRouter.post(
	`/destination/remove`,
	ResponseHelper.send(async (req: express.Request, res: express.Response): Promise<any> => {
		if (isBodyWithName(req.body)) {
			const result = await eventBus.removeDestination(req.body.name);
			return result;
		} else {
			throw new ResponseError('Body is missing name', undefined, 400);
		}
	}),
);

// ----------------------------------------
// Subscriptions
// ----------------------------------------

eventBusRouter.post(
	`/subscription/set`,
	ResponseHelper.send(async (req: express.Request): Promise<any> => {
		if (isEventMessageDestinationSubscription(req.body)) {
			eventBus.setDestinationSubscriptionSet(req.body.destinationId, req.body.subscriptionSet);
		} else {
			throw new ResponseError('Body is missing subscriptionSet or destinationId', undefined, 400);
		}
	}),
);

// ----------------------------------------
// Get EventMessages
// ----------------------------------------

eventBusRouter.get(
	`/get/all`,
	ResponseHelper.send(async (): Promise<any> => {
		return eventBus.getEvents();
	}),
);

eventBusRouter.get(
	`/get/sent`,
	ResponseHelper.send(async (): Promise<any> => {
		return eventBus.getEventsSent();
	}),
);

eventBusRouter.get(
	`/get/unsent`,
	ResponseHelper.send(async (): Promise<any> => {
		return eventBus.getEventsUnsent();
	}),
);
