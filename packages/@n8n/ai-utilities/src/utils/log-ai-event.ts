import type { AiEvent, IDataObject, IExecuteFunctions, ISupplyDataFunctions } from 'n8n-workflow';
import { jsonParse, jsonStringify } from 'n8n-workflow';

import { redactSecrets } from './redact-secrets';

function sanitizeToolCalledValue(value: IDataObject[string]): IDataObject[string] {
	if (typeof value === 'string') {
		return redactSecrets(value);
	}

	if (value !== null && typeof value === 'object') {
		return jsonParse(redactSecrets(jsonStringify(value)), {
			fallbackValue: value,
		});
	}

	return value;
}

function sanitizeToolCalledPayload(data: IDataObject): IDataObject {
	const sanitized: IDataObject = {};
	for (const [key, value] of Object.entries(data)) {
		sanitized[key] = sanitizeToolCalledValue(value);
	}
	return sanitized;
}

export function logAiEvent(
	executeFunctions: IExecuteFunctions | ISupplyDataFunctions,
	event: AiEvent,
	data?: IDataObject,
) {
	try {
		const payload = event === 'ai-tool-called' && data ? sanitizeToolCalledPayload(data) : data;
		executeFunctions.logAiEvent(event, payload ? jsonStringify(payload) : undefined);
	} catch (error) {
		executeFunctions.logger.debug(`Error logging AI event: ${event}`);
	}
}
