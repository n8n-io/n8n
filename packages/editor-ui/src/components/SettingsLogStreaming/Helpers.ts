import { INode, INodeCredentials, INodeParameters } from "n8n-workflow";
import { INodeUi } from "../../Interface";
import { AbstractMessageEventBusDestination, MessageEventBusDestinationTypeNames } from "./types";

export function destinationToFakeINodeUi(destination: AbstractMessageEventBusDestination): INodeUi {
	return {
		id: destination.id,
		name: destination.id,
		typeVersion: 1,
		type: MessageEventBusDestinationTypeNames.webhook,
		position: [0, 0],
		credentials: {
			...destination.credentials as INodeCredentials,
		},
		parameters: {
			...destination as unknown as INodeParameters,
		},
	} as INodeUi;
}
