import type { INodeCredentials } from 'n8n-workflow';

import type { TriggerStepConfig, V1NodeStepConfig } from './types';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

export function isTriggerStepConfig(config: unknown): config is TriggerStepConfig {
	if (!isRecord(config)) return false;
	return (
		typeof config.nodeType === 'string' &&
		config.nodeType.length > 0 &&
		typeof config.typeVersion === 'number' &&
		isRecord(config.parameters)
	);
}

export function isV1NodeStepConfig(config: unknown): config is V1NodeStepConfig {
	if (!isRecord(config)) return false;
	return (
		typeof config.nodeType === 'string' &&
		config.nodeType.length > 0 &&
		typeof config.typeVersion === 'number' &&
		isRecord(config.parameters) &&
		typeof config.continueOnFail === 'boolean' &&
		(config.credentials === undefined || isNodeCredentials(config.credentials))
	);
}

/** Every entry must have the shape of `INodeCredentialsDetails`, not only the outer map. */
function isNodeCredentials(value: unknown): value is INodeCredentials {
	if (!isRecord(value)) return false;
	return Object.values(value).every(
		(details) =>
			isRecord(details) &&
			(typeof details.id === 'string' || details.id === null) &&
			typeof details.name === 'string' &&
			(details.__aiGatewayManaged === undefined ||
				typeof details.__aiGatewayManaged === 'boolean'),
	);
}
