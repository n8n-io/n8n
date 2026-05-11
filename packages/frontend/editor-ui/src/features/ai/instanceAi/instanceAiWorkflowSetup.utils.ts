import type { InstanceAiWorkflowSetupNode } from '@n8n/api-types';
import { isPlaceholderString } from '@n8n/utils';
import type { INodeProperties } from 'n8n-workflow';
import { isResourceLocatorValue } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SetupCard {
	id: string;
	credentialType?: string;
	nodes: InstanceAiWorkflowSetupNode[];
	isTrigger: boolean;
	isFirstTrigger: boolean;
	isTestable: boolean;
	credentialTestResult?: { success: boolean; message?: string };
	isAutoApplied: boolean;
	hasParamIssues: boolean;
}

export interface SetupCardGroup {
	parentNode: InstanceAiWorkflowSetupNode['node'];
	parentCard?: SetupCard;
	subnodeCards: SetupCard[];
}

export type DisplayCard =
	| { type: 'single'; card: SetupCard }
	| { type: 'group'; group: SetupCardGroup };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const HTTP_REQUEST_NODE_TYPE = 'n8n-nodes-base.httpRequest';
export const HTTP_REQUEST_TOOL_NODE_TYPE = 'n8n-nodes-base.httpRequestTool';

export const NESTED_PARAM_TYPES = new Set([
	'collection',
	'fixedCollection',
	'resourceMapper',
	'filter',
	'assignmentCollection',
]);

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

export function credGroupKey(req: InstanceAiWorkflowSetupNode): string {
	if (!req.credentialType) {
		return req.node.name;
	}
	const credType = req.credentialType;
	const isHttpRequest =
		req.node.type === HTTP_REQUEST_NODE_TYPE || req.node.type === HTTP_REQUEST_TOOL_NODE_TYPE;
	if (isHttpRequest) {
		const url = String(req.node.parameters.url ?? '');
		if (url.startsWith('=')) {
			return `${credType}:http:expr:${req.node.name}`;
		}
		return `${credType}:http:${url}`;
	}
	return credType;
}

/** Check if a parameter value is meaningfully set (not empty, null, placeholder, or an empty resource locator). */
export function isParamValueSet(val: unknown): boolean {
	if (val === undefined || val === null || val === '') return false;
	if (isPlaceholderString(val)) return false;
	if (isResourceLocatorValue(val)) {
		return (
			val.value !== '' &&
			val.value !== null &&
			val.value !== undefined &&
			!isPlaceholderString(val.value)
		);
	}
	return true;
}

export function isNestedParam(p: INodeProperties): boolean {
	return NESTED_PARAM_TYPES.has(p.type) || p.typeOptions?.multipleValues === true;
}

export function toNodeUi(setupNode: InstanceAiWorkflowSetupNode): INodeUi {
	return {
		id: setupNode.node.id,
		name: setupNode.node.name,
		type: setupNode.node.type,
		typeVersion: setupNode.node.typeVersion,
		position: setupNode.node.position,
		parameters: setupNode.node.parameters as INodeUi['parameters'],
		...(setupNode.node.credentials !== undefined
			? { credentials: setupNode.node.credentials }
			: {}),
	} satisfies INodeUi;
}

/** True when this card only has a trigger (no credentials and no param work) */
export function isTriggerOnly(
	card: SetupCard,
	cardHasParamWork: (c: SetupCard) => boolean,
): boolean {
	return card.isTrigger && !card.credentialType && !cardHasParamWork(card);
}

/**
 * Use credential icon only for multi-node credential-grouping cards, where the card
 * title is the credential display name. By construction (see `useSetupCards`), cards
 * with more than one node always have a credentialType.
 */
export function shouldUseCredentialIcon(card: SetupCard): boolean {
	return card.nodes.length > 1;
}
