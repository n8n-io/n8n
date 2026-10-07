import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import type { MessageEventBusDestinationOptions } from 'n8n-workflow';

import { ConflictError, NotFoundError } from '@n8n/errors';
import { assertUserCanUseDestinationCredentials } from '@/modules/log-streaming.ee/destinations/destination-credentials-access';
import { LogStreamingDestinationService } from '@/modules/log-streaming.ee/log-streaming-destination.service';

import { toLogStreamingDestinationPublic } from '../../controllers/log-streaming.mapper';
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

const getCredentialsFinderService = async () => {
	const { CredentialsFinderService } = await import('@n8n/backend-services');
	return Container.get(CredentialsFinderService);
};

type LogStreamingHandlers = {
	testDestination: PublicAPIEndpoint<LogStreamingRequest.TestDestination>;
	deleteDestination: PublicAPIEndpoint<LogStreamingRequest.DeleteDestination>;
};

const logStreamingHandlers: LogStreamingHandlers = {
	testDestination: [
		isLicensed('feat:logStreaming'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'eventBusDestination:test' }),
		async (req, res) => {
			const destination = await findDestinationOrFail(req.params.id);
			await assertUserCanUseDestinationCredentials(
				await getCredentialsFinderService(),
				req.user,
				destination,
			);
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
			return res.json(toLogStreamingDestinationPublic(destination));
		},
	],
};

export = logStreamingHandlers;
