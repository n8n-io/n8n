import { PublicCreateDestinationDto } from '@n8n/api-types';
import { OutboundHttp } from '@n8n/backend-network';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { MessageEventBusDestinationOptions } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { eventNamesAll } from '@/eventbus/event-message-classes';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { createMessageEventBusDestination } from '@/modules/log-streaming.ee/create-message-event-bus-destination';
import { LogStreamingDestinationService } from '@/modules/log-streaming.ee/log-streaming-destination.service';

import { toInternalDestinationOptions, toPublicDestination } from './log-streaming.mapper';
import type { LogStreamingRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import {
	apiKeyHasScopeWithGlobalScopeFallback,
	isLicensed,
} from '../../shared/middlewares/global.middleware';

const assertNotManagedByEnv = () => {
	if (Container.get(InstanceSettingsLoaderConfig).logStreamingManagedByEnv) {
		throw new ConflictError(
			'Log streaming destinations are managed via environment variables and cannot be modified through the API',
		);
	}
};

const findDestinationOrFail = async (id: string): Promise<MessageEventBusDestinationOptions> => {
	const [destination] = await Container.get(LogStreamingDestinationService).findDestination(id);
	if (!destination) {
		throw new NotFoundError(`Log streaming destination with id "${id}" could not be found`);
	}
	return destination;
};

type LogStreamingHandlers = {
	getEventTypes: PublicAPIEndpoint<LogStreamingRequest.GetEventTypes>;
	getDestinations: PublicAPIEndpoint<LogStreamingRequest.GetDestinations>;
	getDestination: PublicAPIEndpoint<LogStreamingRequest.GetDestination>;
	createDestination: PublicAPIEndpoint<LogStreamingRequest.CreateDestination>;
	updateDestination: PublicAPIEndpoint<LogStreamingRequest.UpdateDestination>;
	testDestination: PublicAPIEndpoint<LogStreamingRequest.TestDestination>;
	deleteDestination: PublicAPIEndpoint<LogStreamingRequest.DeleteDestination>;
};

const logStreamingHandlers: LogStreamingHandlers = {
	getEventTypes: [
		isLicensed('feat:logStreaming'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'eventBusDestination:list' }),
		async (_req, res) => {
			return res.json({ data: eventNamesAll });
		},
	],

	getDestinations: [
		isLicensed('feat:logStreaming'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'eventBusDestination:list' }),
		async (_req, res) => {
			const destinations = await Container.get(LogStreamingDestinationService).findDestination();
			return res.json({ data: destinations.map(toPublicDestination) });
		},
	],

	getDestination: [
		isLicensed('feat:logStreaming'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'eventBusDestination:read' }),
		async (req, res) => {
			const destination = await findDestinationOrFail(req.params.id);
			return res.json(toPublicDestination(destination));
		},
	],

	createDestination: [
		isLicensed('feat:logStreaming'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'eventBusDestination:create' }),
		async (req, res) => {
			assertNotManagedByEnv();

			const parseResult = PublicCreateDestinationDto.safeParse(req.body);
			if (!parseResult.success) {
				throw new BadRequestError(parseResult.error.errors[0].message);
			}

			const destination = createMessageEventBusDestination(
				Container.get(MessageEventBus),
				Container.get(OutboundHttp),
				toInternalDestinationOptions(parseResult.data),
			);
			const result = await Container.get(LogStreamingDestinationService).addDestination(
				destination,
			);

			return res.json(toPublicDestination(result.serialize()));
		},
	],

	updateDestination: [
		isLicensed('feat:logStreaming'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'eventBusDestination:update' }),
		async (req, res) => {
			assertNotManagedByEnv();
			await findDestinationOrFail(req.params.id);

			const parseResult = PublicCreateDestinationDto.safeParse(req.body);
			if (!parseResult.success) {
				throw new BadRequestError(parseResult.error.errors[0].message);
			}

			// the path id is the update target; addDestination upserts on it
			const destination = createMessageEventBusDestination(
				Container.get(MessageEventBus),
				Container.get(OutboundHttp),
				{ ...toInternalDestinationOptions(parseResult.data), id: req.params.id },
			);
			const result = await Container.get(LogStreamingDestinationService).addDestination(
				destination,
			);

			return res.json(toPublicDestination(result.serialize()));
		},
	],

	testDestination: [
		isLicensed('feat:logStreaming'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'eventBusDestination:test' }),
		async (req, res) => {
			await findDestinationOrFail(req.params.id);
			// a delivery failure is a failed test, not a server error → { success: false }
			let success: boolean;
			try {
				success = await Container.get(LogStreamingDestinationService).testDestination(
					req.params.id,
				);
			} catch {
				success = false;
			}
			return res.json({ success });
		},
	],

	deleteDestination: [
		isLicensed('feat:logStreaming'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'eventBusDestination:delete' }),
		async (req, res) => {
			assertNotManagedByEnv();
			const destination = await findDestinationOrFail(req.params.id);
			await Container.get(LogStreamingDestinationService).removeDestination(req.params.id);
			return res.json(toPublicDestination(destination));
		},
	],
};

export = logStreamingHandlers;
