/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import { isEventMessageOptions } from './EventMessageClasses/AbstractEventMessage';
import { EventMessageGeneric } from './EventMessageClasses/EventMessageGeneric';
import {
	EventMessageWorkflow,
	EventMessageWorkflowOptions,
} from './EventMessageClasses/EventMessageWorkflow';
import { eventBus, EventMessageReturnMode } from './MessageEventBus/MessageEventBus';
import {
	isMessageEventBusDestinationSentryOptions,
	MessageEventBusDestinationSentry,
} from './MessageEventBusDestination/MessageEventBusDestinationSentry.ee';
import {
	isMessageEventBusDestinationSyslogOptions,
	MessageEventBusDestinationSyslog,
} from './MessageEventBusDestination/MessageEventBusDestinationSyslog.ee';
import { MessageEventBusDestinationWebhook } from './MessageEventBusDestination/MessageEventBusDestinationWebhook.ee';
import { eventNamesAll } from './EventMessageClasses';
import {
	EventMessageAudit,
	EventMessageAuditOptions,
} from './EventMessageClasses/EventMessageAudit';
import { BadRequestError } from '../ResponseHelper';
import {
	MessageEventBusDestinationTypeNames,
	MessageEventBusDestinationWebhookOptions,
	EventMessageTypeNames,
	MessageEventBusDestinationOptions,
} from 'n8n-workflow';
import { User } from '../databases/entities/User';
import * as ResponseHelper from '@/ResponseHelper';

export const eventBusRouter = express.Router();

// ----------------------------------------
// TypeGuards
// ----------------------------------------

const isWithIdString = (candidate: unknown): candidate is { id: string } => {
	const o = candidate as { id: string };
	if (!o) return false;
	return o.id !== undefined;
};

const isWithQueryString = (candidate: unknown): candidate is { query: string } => {
	const o = candidate as { query: string };
	if (!o) return false;
	return o.query !== undefined;
};

// TODO: add credentials
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
// Events
// ----------------------------------------
eventBusRouter.get(
	'/event',
	ResponseHelper.send(async (req: express.Request): Promise<any> => {
		if (isWithQueryString(req.query)) {
			switch (req.query.query as EventMessageReturnMode) {
				case 'sent':
					return eventBus.getEventsSent();
				case 'unsent':
					return eventBus.getEventsUnsent();
				case 'unfinished':
					return eventBus.getUnfinishedExecutions();
				case 'all':
				default:
					return eventBus.getEventsAll();
			}
		}
		return eventBus.getEventsAll();
	}),
);

eventBusRouter.get(
	'/execution/:id',
	ResponseHelper.send(async (req: express.Request): Promise<any> => {
		if (req.params?.id) {
			let logHistory;
			if (req.query?.logHistory) {
				logHistory = parseInt(req.query.logHistory as string, 10);
			}
			return eventBus.getEventsByExecutionId(req.params.id, logHistory);
		}
	}),
);

eventBusRouter.post(
	'/event',
	ResponseHelper.send(async (req: express.Request): Promise<any> => {
		if (isEventMessageOptions(req.body)) {
			let msg;
			switch (req.body.__type) {
				case EventMessageTypeNames.workflow:
					msg = new EventMessageWorkflow(req.body as EventMessageWorkflowOptions);
					break;
				case EventMessageTypeNames.audit:
					msg = new EventMessageAudit(req.body as EventMessageAuditOptions);
					break;
				case EventMessageTypeNames.generic:
				default:
					msg = new EventMessageGeneric(req.body);
			}
			await eventBus.send(msg);
		} else {
			throw new BadRequestError(
				'Body is not a serialized EventMessage or eventName does not match format {namespace}.{domain}.{event}',
			);
		}
	}),
);

// ----------------------------------------
// Destinations
// ----------------------------------------

eventBusRouter.get(
	'/destination',
	ResponseHelper.send(async (req: express.Request): Promise<any> => {
		let result = [];
		if (isWithIdString(req.query)) {
			result = await eventBus.findDestination(req.query.id);
		} else {
			result = await eventBus.findDestination();
		}
		return result;
	}),
);

eventBusRouter.post(
	'/destination',
	ResponseHelper.send(async (req: express.Request): Promise<any> => {
		if (!req.user || (req.user as User).globalRole.name !== 'owner') {
			throw new ResponseHelper.UnauthorizedError('Invalid request');
		}

		if (isMessageEventBusDestinationOptions(req.body)) {
			let result;
			switch (req.body.__type) {
				case MessageEventBusDestinationTypeNames.sentry:
					if (isMessageEventBusDestinationSentryOptions(req.body)) {
						result = await eventBus.addDestination(new MessageEventBusDestinationSentry(req.body));
					}
					break;
				case MessageEventBusDestinationTypeNames.webhook:
					if (isMessageEventBusDestinationWebhookOptions(req.body)) {
						result = await eventBus.addDestination(new MessageEventBusDestinationWebhook(req.body));
					}
					break;
				case MessageEventBusDestinationTypeNames.syslog:
					if (isMessageEventBusDestinationSyslogOptions(req.body)) {
						result = await eventBus.addDestination(new MessageEventBusDestinationSyslog(req.body));
					}
					break;
				default:
					throw new BadRequestError(
						// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
						`Body is missing ${req.body.__type} options or type ${req.body.__type} is unknown`,
					);
			}
			if (result) {
				await result.saveToDb();
				return result;
			}
			throw new BadRequestError('There was an error adding the destination');
		}
		throw new BadRequestError('Body is not configuring MessageEventBusDestinationOptions');
	}),
);

eventBusRouter.get(
	'/testmessage',
	ResponseHelper.send(async (req: express.Request): Promise<any> => {
		let result = false;
		if (isWithIdString(req.query)) {
			result = await eventBus.testDestination(req.query.id);
		}
		return result;
	}),
);

eventBusRouter.delete(
	'/destination',
	ResponseHelper.send(async (req: express.Request): Promise<any> => {
		if (!req.user || (req.user as User).globalRole.name !== 'owner') {
			throw new ResponseHelper.UnauthorizedError('Invalid request');
		}
		if (isWithIdString(req.query)) {
			const result = await eventBus.removeDestination(req.query.id);
			if (result) {
				return result;
			}
		} else {
			throw new BadRequestError('Query is missing id');
		}
	}),
);

// ----------------------------------------
// Utilities
// ----------------------------------------

eventBusRouter.get(
	'/eventnames',
	ResponseHelper.send(async (): Promise<any> => {
		return eventNamesAll;
	}),
);
