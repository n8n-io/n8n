import type { AiEvent, IDataObject, IExecuteFunctions, ISupplyDataFunctions } from 'n8n-workflow';
import { jsonStringify } from 'n8n-workflow';

export function logAiEvent(
	executeFunctions: IExecuteFunctions | ISupplyDataFunctions,
	event: AiEvent,
	data?: IDataObject,
) {
	try {
		executeFunctions.logAiEvent(event, data ? jsonStringify(data) : undefined);
	} catch (error) {
		executeFunctions.logger.debug(`Error logging AI event: ${event}`);
	}
}
