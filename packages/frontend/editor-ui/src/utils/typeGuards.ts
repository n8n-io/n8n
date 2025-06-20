import type {
	INodeTypeDescription,
	NodeConnectionType,
	TriggerPanelDefinition,
} from 'n8n-workflow';
import { nodeConnectionTypes } from 'n8n-workflow';
import type {
	IExecutionResponse,
	ICredentialsResponse,
	NewCredentialsModal,
	CredentialsResource,
	FolderResource,
	Resource,
	VariableResource,
	WorkflowResource,
} from '@/Interface';
import type { Connection as VueFlowConnection } from '@vue-flow/core';
import type { RouteLocationRaw } from 'vue-router';
import type { CanvasConnectionMode } from '@/types';
import { canvasConnectionModes } from '@/types';
import type { ComponentPublicInstance } from 'vue';

/*
	Type guards used in editor-ui project
*/

export const checkExhaustive = (value: never): never => {
	throw new Error(`Unhandled value: ${value}`);
};

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

export function isDateObject(date: unknown): date is Date {
	return (
		!!date && Object.prototype.toString.call(date) === '[object Date]' && !isNaN(date as number)
	);
}

export function isValidNodeConnectionType(
	connectionType: string | undefined,
): connectionType is NodeConnectionType {
	return nodeConnectionTypes.includes(connectionType as NodeConnectionType);
}

export function isValidCanvasConnectionMode(mode: string): mode is CanvasConnectionMode {
	return canvasConnectionModes.includes(mode as CanvasConnectionMode);
}

export function isVueFlowConnection(connection: object): connection is VueFlowConnection {
	return (
		'source' in connection &&
		'target' in connection &&
		'sourceHandle' in connection &&
		'targetHandle' in connection
	);
}

export function isTriggerPanelObject(
	triggerPanel: INodeTypeDescription['triggerPanel'],
): triggerPanel is TriggerPanelDefinition {
	return triggerPanel !== undefined && typeof triggerPanel === 'object' && triggerPanel !== null;
}

export function isFullExecutionResponse(
	execution: IExecutionResponse | null,
): execution is IExecutionResponse {
	return !!execution && 'status' in execution;
}

export function isRouteLocationRaw(value: unknown): value is RouteLocationRaw {
	return (
		typeof value === 'string' ||
		(typeof value === 'object' && value !== null && ('name' in value || 'path' in value))
	);
}

export function isComponentPublicInstance(value: unknown): value is ComponentPublicInstance {
	return value !== null && typeof value === 'object' && '$props' in value;
}

export function isWorkflowResource(value: Resource): value is WorkflowResource {
	return value.resourceType === 'workflow';
}

export function isFolderResource(value: Resource): value is FolderResource {
	return value.resourceType === 'folder';
}

export function isVariableResource(value: Resource): value is VariableResource {
	return value.resourceType === 'variable';
}

export function isCredentialsResource(value: Resource): value is CredentialsResource {
	return value.resourceType === 'credential';
}

export function isSharedResource(
	value: Resource,
): value is WorkflowResource | FolderResource | CredentialsResource {
	return isWorkflowResource(value) || isFolderResource(value) || isCredentialsResource(value);
}

export function isResourceSortableByDate(
	value: Resource,
): value is WorkflowResource | FolderResource | CredentialsResource {
	return isWorkflowResource(value) || isFolderResource(value) || isCredentialsResource(value);
}
