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
 * Use credential icon only for multi-node credential-grouping cards. The card title
 * for these cards is built from the credential label plus the node names
 * (see `buildSetupCardTitle`). By construction (see `useSetupCards`), cards with more
 * than one node always have a credentialType.
 */
export function shouldUseCredentialIcon(card: SetupCard): boolean {
	return card.nodes.length > 1;
}

// ---------------------------------------------------------------------------
// buildSetupCardTitle
// ---------------------------------------------------------------------------

const MULTI_NODE_NAME_LIMIT = 3;
const MAX_NODE_NAME_LEN = 40;

function truncateNodeName(name: string): string {
	return name.length > MAX_NODE_NAME_LEN ? name.slice(0, MAX_NODE_NAME_LEN - 1) + '…' : name;
}

function sanitizeNodeNameForList(name: string | undefined): string | undefined {
	const trimmed = name?.trim();
	if (!trimmed) return undefined;
	return truncateNodeName(trimmed);
}

function stripLeadingSetUp(label: string): string {
	// Defensive: callers might accidentally pass the full "Set up X" template result
	// (e.g. by reusing `getDisplayName`). Strip the leading "Set up " so we don't
	// produce "Set up Set up X for ...".
	return label.replace(/^Set up\s+/i, '');
}

export function buildSetupCardTitle(
	card: SetupCard,
	getCredentialAppLabel: (credentialType: string) => string,
	t: (key: string, opts?: { interpolate?: Record<string, string | number> }) => string,
): string {
	// Single-node by construction (see useSetupCards).
	if (!card.credentialType) {
		return card.nodes[0].node.name;
	}

	const credLabel = stripLeadingSetUp(getCredentialAppLabel(card.credentialType));
	const sep = t('instanceAi.workflowSetup.cardTitleNodesSeparator');

	const cleanNames = card.nodes
		.map((n) => sanitizeNodeNameForList(n.node.name))
		.filter((name): name is string => Boolean(name));

	if (cleanNames.length === 0) {
		// Single-node with a blank/whitespace name: omit the node reference rather than
		// produce the awkward "Set up X for 1 nodes". Multi-node falls through to the count form.
		if (card.nodes.length === 1) {
			return t('instanceAi.credential.setupTitle', { interpolate: { name: credLabel } });
		}
		return t('instanceAi.workflowSetup.cardTitleForNodesCount', {
			interpolate: { name: credLabel, count: card.nodes.length },
		});
	}

	if (cleanNames.length <= MULTI_NODE_NAME_LIMIT) {
		return t('instanceAi.workflowSetup.cardTitleForNodes', {
			interpolate: { name: credLabel, nodes: cleanNames.join(sep) },
		});
	}

	const head = cleanNames.slice(0, MULTI_NODE_NAME_LIMIT).join(sep);
	return t('instanceAi.workflowSetup.cardTitleForNodesPlusMore', {
		interpolate: {
			name: credLabel,
			nodes: head,
			extra: cleanNames.length - MULTI_NODE_NAME_LIMIT,
		},
	});
}
