import type { IRestApiContext } from '@/Interface';
import { makeRestApiRequest } from '@/utils/apiUtils';
import type { IDataObject, MessageEventBusDestinationOptions } from 'n8n-workflow';

export type ApiMessageEventBusDestinationOptions = MessageEventBusDestinationOptions & {
	id: string;
};

export function hasDestinationId(
	destination: MessageEventBusDestinationOptions,
): destination is ApiMessageEventBusDestinationOptions {
	return destination.id !== undefined;
}

export async function saveDestinationToDb(
	context: IRestApiContext,
	destination: ApiMessageEventBusDestinationOptions,
	subscribedEvents: string[] = [],
) {
	const data: IDataObject = {
		...destination,
		subscribedEvents,
	};
	return await makeRestApiRequest(context, 'POST', '/eventbus/destination', data);
}

export async function deleteDestinationFromDb(context: IRestApiContext, destinationId: string) {
	return await makeRestApiRequest(context, 'DELETE', `/eventbus/destination?id=${destinationId}`);
}

export async function sendTestMessageToDestination(
	context: IRestApiContext,
	destination: ApiMessageEventBusDestinationOptions,
) {
	const data: IDataObject = {
		...destination,
	};
	return await makeRestApiRequest(context, 'GET', '/eventbus/testmessage', data);
}

export async function getEventNamesFromBackend(context: IRestApiContext): Promise<string[]> {
	return await makeRestApiRequest(context, 'GET', '/eventbus/eventnames');
}

export async function getDestinationsFromBackend(
	context: IRestApiContext,
): Promise<MessageEventBusDestinationOptions[]> {
	return await makeRestApiRequest(context, 'GET', '/eventbus/destination');
}

export async function getExecutionEvents(context: IRestApiContext, executionId: string) {
	return await makeRestApiRequest(context, 'GET', `/eventbus/execution/${executionId}`);
}
