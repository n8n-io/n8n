import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils';
import type { IDataObject, MessageEventBusDestinationOptions } from 'n8n-workflow';

export async function saveDestinationToDb(
	context: IRestApiContext,
	destination: MessageEventBusDestinationOptions,
	subscribedEvents: string[] = [],
) {
	if (destination.id) {
		const data: IDataObject = {
			...destination,
			subscribedEvents,
		};
		return makeRestApiRequest(context, 'POST', '/eventbus/destination', data);
	}
}

export async function deleteDestinationFromDb(context: IRestApiContext, destinationId: string) {
	return makeRestApiRequest(context, 'DELETE', `/eventbus/destination?id=${destinationId}`);
}

export async function sendTestMessageToDestination(
	context: IRestApiContext,
	destination: MessageEventBusDestinationOptions,
) {
	if (destination.id) {
		const data: IDataObject = {
			...destination,
		};
		return makeRestApiRequest(context, 'GET', '/eventbus/testmessage', data);
	}
}

export async function getEventNamesFromBackend(context: IRestApiContext): Promise<string[]> {
	return makeRestApiRequest(context, 'GET', '/eventbus/eventnames');
}

export async function getDestinationsFromBackend(
	context: IRestApiContext,
): Promise<MessageEventBusDestinationOptions[]> {
	return makeRestApiRequest(context, 'GET', '/eventbus/destination');
}

export async function getExecutionEvents(context: IRestApiContext, executionId: string) {
	return makeRestApiRequest(context, 'GET', `/eventbus/execution/${executionId}`);
}

export async function recoverExecutionDataFromEvents(
	context: IRestApiContext,
	executionId: string,
) {
	return makeRestApiRequest(context, 'GET', `/eventbus/execution-recover/${executionId}`);
}
