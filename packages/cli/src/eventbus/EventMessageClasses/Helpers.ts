import { EventMessageSerialized } from './AbstractEventMessage';
import { EventMessage } from './EventMessage';
import { EventMessageWorkflow } from './EventMessageWorkflow';

export type EventMessageTypes = EventMessage | EventMessageWorkflow;

export enum EventMessageTypeNames {
	eventMessage = '$$EventMessage',
	eventMessageWorkflow = '$$EventMessageWorkflow',
}

export const getEventMessageByType = (
	message: EventMessageSerialized,
): EventMessageTypes | null => {
	switch (message.__type as EventMessageTypeNames) {
		case EventMessageTypeNames.eventMessage:
			return new EventMessage(message);
		case EventMessageTypeNames.eventMessageWorkflow:
			return new EventMessageWorkflow(message);
		default:
			return null;
	}
};

// export const messageEventSerializer: SerializerImplementation = {
// 	deserialize(message, defaultHandler) {
// 		if (isEventMessageConfirmSerialized(message)) {
// 			return EventMessageConfirm.deserialize(message);
// 		} else if (isEventMessageSerialized(message)) {
// 			const msg = getEventMessageByType(message);
// 			if (msg !== null) return msg;
// 		}
// 		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
// 		return defaultHandler(message);
// 	},
// 	serialize(thing, defaultHandler) {
// 		if (thing instanceof EventMessageConfirm) {
// 			return thing.serialize();
// 		} else if (thing instanceof EventMessage) {
// 			return thing.serialize();
// 		} else {
// 			return defaultHandler(thing);
// 		}
// 	},
// };
