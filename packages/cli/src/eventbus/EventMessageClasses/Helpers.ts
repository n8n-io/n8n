import type { EventMessageTypes } from '.';
import { EventMessageGeneric, EventMessageGenericOptions } from './EventMessageGeneric';
import type { AbstractEventMessageOptions } from './AbstractEventMessageOptions';
import { EventMessageWorkflow, EventMessageWorkflowOptions } from './EventMessageWorkflow';
import { EventMessageTypeNames } from 'n8n-workflow';
import { EventMessageAudit, EventMessageAuditOptions } from './EventMessageAudit';
import { EventMessageNode, EventMessageNodeOptions } from './EventMessageNode';

export const getEventMessageObjectByType = (
	message: AbstractEventMessageOptions,
): EventMessageTypes | null => {
	switch (message.__type as EventMessageTypeNames) {
		case EventMessageTypeNames.generic:
			return new EventMessageGeneric(message as EventMessageGenericOptions);
		case EventMessageTypeNames.workflow:
			return new EventMessageWorkflow(message as EventMessageWorkflowOptions);
		case EventMessageTypeNames.audit:
			return new EventMessageAudit(message as EventMessageAuditOptions);
		case EventMessageTypeNames.node:
			return new EventMessageNode(message as EventMessageNodeOptions);
		default:
			return null;
	}
};

interface StringIndexedObject {
	[key: string]: StringIndexedObject | string;
}

export function eventGroupFromEventName(eventName: string): string | undefined {
	const matches = eventName.match(/^[\w\s]+\.[\w\s]+/);
	if (matches && matches?.length > 0) {
		return matches[0];
	}
	return;
}

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
