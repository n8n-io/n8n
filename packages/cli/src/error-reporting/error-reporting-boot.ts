import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { ErrorReporter, instanceTypeFromArgv } from 'n8n-core';

import { N8N_RELEASE_DATE, N8N_VERSION } from '@/constants';
import {
	resolveBackendHealthEndpointPath,
	resolveMainHealthEndpointPath,
} from '@/utils/health-endpoint.util';

export async function initErrorReporting(): Promise<void> {
	try {
		const globalConfig = Container.get(GlobalConfig);
		const {
			backendDsn,
			environment,
			deploymentName,
			profilingEnabled,
			tracesSampleRate,
			tracesSlowSpanThresholdMs,
			webhookTracesSampleRate,
			eventLoopBlockThreshold,
			eventLoopBlockMaxEventsPerHour,
			eventLoopBlockDetectionEnabled,
		} = globalConfig.sentry;

		const serverType = instanceTypeFromArgv(process.argv);
		// Main and webhook servers mount health routes under N8N_BASE_PATH. Worker
		// and engine health routes stay bare because those processes are reached directly.
		const healthEndpoint =
			serverType === 'main' || serverType === 'webhook'
				? resolveMainHealthEndpointPath(globalConfig)
				: resolveBackendHealthEndpointPath(globalConfig);

		await Container.get(ErrorReporter).init({
			serverType,
			dsn: backendDsn,
			environment,
			release: `n8n@${N8N_VERSION}`,
			serverName: deploymentName,
			releaseDate: N8N_RELEASE_DATE,
			withEventLoopBlockDetection: eventLoopBlockDetectionEnabled,
			eventLoopBlockThreshold,
			eventLoopBlockMaxEventsPerHour,
			tracesSampleRate,
			slowSpanThresholdMs: tracesSlowSpanThresholdMs,
			webhookEndpoint: globalConfig.endpoints.webhook,
			webhookTracesSampleRate,
			profilingEnabled,
			healthEndpoint,
			eligibleIntegrations: {
				Express: true,
				Http: true,
				Postgres: globalConfig.database.type === 'postgresdb',
				Redis: globalConfig.executions.mode === 'queue' || globalConfig.cache.backend === 'redis',
			},
		});
	} catch (error) {
		Container.get(Logger).error(
			'Failed to set up error reporting at startup, so n8n sends no errors to Sentry',
			{
				error: getErrorMessage(error),
			},
		);
	}
}
