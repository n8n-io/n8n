import { EventMessageTypeNames, EventMessageTypes } from '.';
import { EventMessageSerialized } from './AbstractEventMessage';
import { EventMessageGeneric } from './EventMessageGeneric';
import { EventMessageWorkflow } from './EventMessageWorkflow';

export const getEventMessageByType = (
	message: EventMessageSerialized,
): EventMessageTypes | null => {
	switch (message.__type as EventMessageTypeNames) {
		case EventMessageTypeNames.eventMessage:
			return new EventMessageGeneric(message);
		case EventMessageTypeNames.eventMessageWorkflow:
			return new EventMessageWorkflow(message);
		default:
			return null;
	}
};

interface StringIndexedObject {
	[key: string]: StringIndexedObject | string;
}

// function dotsToObject(dottedString: string, o?: StringIndexedObject): StringIndexedObject {
// 	const rootObject: StringIndexedObject = o ?? {};
// 	if (!dottedString) return rootObject;

// 	const parts = dottedString.split('.'); /*?*/

// 	let part: string | undefined;
// 	let obj: StringIndexedObject = rootObject;
// 	while ((part = parts.shift())) {
// 		if (typeof obj[part] !== 'object') obj[part] = {};
// 		obj = obj[part];
// 	}
// 	return rootObject;
// }

function dotsToObject2(dottedString: string, o?: StringIndexedObject): StringIndexedObject {
	const rootObject: StringIndexedObject = o ?? {};
	if (!dottedString) return rootObject;

	const parts = dottedString.split('.'); /*?*/

	let part: string | undefined;
	let obj: StringIndexedObject = rootObject;
	while ((part = parts.shift())) {
		if (typeof obj[part] !== 'object') {
			obj[part] = {
				__name: part,
			};
		}
		obj = obj[part] as StringIndexedObject;
	}
	return rootObject;
}

export function eventListToObject(dottedList: string[]): object {
	const result = {};
	dottedList.forEach((e) => {
		dotsToObject2(e, result);
	});
	return result;
}

interface StringIndexedChild {
	name: string;
	children: StringIndexedChild[];
}

export function eventListToObjectTree(dottedList: string[]): StringIndexedChild {
	const x: StringIndexedChild = {
		name: 'eventTree',
		children: [] as unknown as StringIndexedChild[],
	};
	dottedList.forEach((dottedString: string) => {
		const parts = dottedString.split('.');

		let part: string | undefined;
		let children = x.children;
		while ((part = parts.shift())) {
			if (part) {
				// eslint-disable-next-line @typescript-eslint/no-loop-func
				const foundChild = children.find((e) => e.name === part);
				if (foundChild) {
					children = foundChild.children;
				} else {
					const newChild: StringIndexedChild = {
						name: part,
						children: [],
					};
					children.push(newChild);
					children = newChild.children;
				}
			}
		}
	});
	return x;
}

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
