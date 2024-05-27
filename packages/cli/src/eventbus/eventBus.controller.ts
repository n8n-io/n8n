import express from 'express';
import { EventMessageTypeNames } from 'n8n-workflow';

import { RestController, Get, Post, GlobalScope } from '@/decorators';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { isEventMessageOptions } from './EventMessageClasses/AbstractEventMessage';
import { EventMessageGeneric } from './EventMessageClasses/EventMessageGeneric';
import type { EventMessageWorkflowOptions } from './EventMessageClasses/EventMessageWorkflow';
import { EventMessageWorkflow } from './EventMessageClasses/EventMessageWorkflow';
import type { EventMessageReturnMode } from './MessageEventBus/MessageEventBus';
import { MessageEventBus } from './MessageEventBus/MessageEventBus';
import type { EventMessageTypes } from './EventMessageClasses';
import { eventNamesAll } from './EventMessageClasses';
import type { EventMessageAuditOptions } from './EventMessageClasses/EventMessageAudit';
import { EventMessageAudit } from './EventMessageClasses/EventMessageAudit';
import type { EventMessageNodeOptions } from './EventMessageClasses/EventMessageNode';
import { EventMessageNode } from './EventMessageClasses/EventMessageNode';

// ----------------------------------------
// TypeGuards
// ----------------------------------------

const isWithQueryString = (candidate: unknown): candidate is { query: string } => {
	const o = candidate as { query: string };
	if (!o) return false;
	return o.query !== undefined;
};

// ----------------------------------------
// Controller
// ----------------------------------------

@RestController('/eventbus')
export class EventBusController {
	constructor(private readonly eventBus: MessageEventBus) {}

	// ----------------------------------------
	// Events
	// ----------------------------------------
	@Get('/event')
	@GlobalScope('eventBusEvent:query')
	async getEvents(
		req: express.Request,
	): Promise<EventMessageTypes[] | Record<string, EventMessageTypes[]>> {
		if (isWithQueryString(req.query)) {
			switch (req.query.query as EventMessageReturnMode) {
				case 'sent':
					return await this.eventBus.getEventsSent();
				case 'unsent':
					return await this.eventBus.getEventsUnsent();
				case 'unfinished':
					return await this.eventBus.getUnfinishedExecutions();
				case 'all':
				default:
					return await this.eventBus.getEventsAll();
			}
		} else {
			return await this.eventBus.getEventsAll();
		}
	}

	@Get('/execution/:id')
	@GlobalScope('eventBusEvent:read')
	async getEventForExecutionId(req: express.Request): Promise<EventMessageTypes[] | undefined> {
		if (req.params?.id) {
			let logHistory;
			if (req.query?.logHistory) {
				logHistory = parseInt(req.query.logHistory as string, 10);
			}
			return await this.eventBus.getEventsByExecutionId(req.params.id, logHistory);
		}
		return;
	}

	@Post('/event')
	@GlobalScope('eventBusEvent:create')
	async postEvent(req: express.Request): Promise<EventMessageTypes | undefined> {
		let msg: EventMessageTypes | undefined;
		if (isEventMessageOptions(req.body)) {
			switch (req.body.__type) {
				case EventMessageTypeNames.workflow:
					msg = new EventMessageWorkflow(req.body as EventMessageWorkflowOptions);
					break;
				case EventMessageTypeNames.audit:
					msg = new EventMessageAudit(req.body as EventMessageAuditOptions);
					break;
				case EventMessageTypeNames.node:
					msg = new EventMessageNode(req.body as EventMessageNodeOptions);
					break;
				case EventMessageTypeNames.generic:
				default:
					msg = new EventMessageGeneric(req.body);
			}
			await this.eventBus.send(msg);
		} else {
			throw new BadRequestError(
				'Body is not a serialized EventMessage or eventName does not match format {namespace}.{domain}.{event}',
			);
		}
		return msg;
	}

	// ----------------------------------------
	// Utilities
	// ----------------------------------------

	@Get('/eventnames')
	async getEventNames(): Promise<string[]> {
		return eventNamesAll;
	}
}
