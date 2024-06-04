import type {
	INodeParameterResourceLocator,
	INodeTypeDescription,
	NodeConnectionType,
	TriggerPanelDefinition,
} from 'n8n-workflow';
import { nodeConnectionTypes } from 'n8n-workflow';
import type { ICredentialsResponse, NewCredentialsModal } from '@/Interface';
import type { jsPlumbDOMElement } from '@jsplumb/browser-ui';
import type { Connection } from '@jsplumb/core';

/*
	Type guards used in editor-ui project
*/

export const checkExhaustive = (value: never): never => {
	throw new Error(`Unhandled value: ${value}`);
};

export function isResourceLocatorValue(value: unknown): value is INodeParameterResourceLocator {
	return Boolean(typeof value === 'object' && value && 'mode' in value && 'value' in value);
}

export function isNotNull<T>(value: T | null): value is T {
	return value !== null;
}

export function isValidCredentialResponse(value: unknown): value is ICredentialsResponse {
	return typeof value === 'object' && value !== null && 'id' in value;
}

export const isObj = (obj: unknown): obj is object =>
	!!obj && Object.getPrototypeOf(obj) === Object.prototype;

export function isString(value: unknown): value is string {
	return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
	return typeof value === 'number';
}

export const isCredentialModalState = (value: unknown): value is NewCredentialsModal => {
	return typeof value === 'object' && value !== null && 'showAuthSelector' in value;
};

export const isResourceMapperValue = (value: unknown): value is string | number | boolean => {
	return ['string', 'number', 'boolean'].includes(typeof value);
};

export const isJSPlumbEndpointElement = (element: Node): element is jsPlumbDOMElement => {
	return 'jtk' in element && 'endpoint' in (element.jtk as object);
};

export const isJSPlumbConnection = (connection: unknown): connection is Connection => {
	return connection !== null && typeof connection === 'object' && 'connector' in connection;
};

export function isDateObject(date: unknown): date is Date {
	return (
		!!date && Object.prototype.toString.call(date) === '[object Date]' && !isNaN(date as number)
	);
}

export function isValidNodeConnectionType(
	connectionType: string,
): connectionType is NodeConnectionType {
	return nodeConnectionTypes.includes(connectionType as NodeConnectionType);
}

export function isTriggerPanelObject(
	triggerPanel: INodeTypeDescription['triggerPanel'],
): triggerPanel is TriggerPanelDefinition {
	return triggerPanel !== undefined && typeof triggerPanel === 'object' && triggerPanel !== null;
}
