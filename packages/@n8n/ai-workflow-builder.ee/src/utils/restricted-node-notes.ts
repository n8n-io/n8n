import { describeRestrictionScope, matchRestrictedByQuery } from '@n8n/ai-utilities/node-catalog';
import type { INodeTypeDescription } from 'n8n-workflow';

import type { RestrictedNodeType, RestrictedNodeTypeRef } from '@/workflow-builder-agent';

/**
 * Adds the display name from the builder's own node list. Types the builder never lists, such as
 * community nodes, drop out: it cannot use them either way.
 */
export function resolveRestrictedNodeTypes(
	nodeTypes: readonly INodeTypeDescription[],
	refs: readonly RestrictedNodeTypeRef[] | undefined,
): RestrictedNodeType[] {
	if (!refs || refs.length === 0) return [];

	const displayNames = new Map<string, string>();
	for (const { name, displayName } of nodeTypes) {
		if (!displayNames.has(name)) displayNames.set(name, displayName);
	}

	return refs.flatMap((ref) => {
		const displayName = displayNames.get(ref.name);
		return displayName === undefined ? [] : [{ ...ref, displayName }];
	});
}

/** The node types without the ones a policy restricts. */
export function withoutRestrictedNodeTypes(
	nodeTypes: INodeTypeDescription[],
	restricted: readonly RestrictedNodeTypeRef[] | undefined,
): INodeTypeDescription[] {
	if (!restricted || restricted.length === 0) return nodeTypes;

	const names = new Set(restricted.map((node) => node.name));
	return nodeTypes.filter((nodeType) => !names.has(nodeType.name));
}

/**
 * What a search result adds when a query names a restricted node type. Search leaves these
 * types out, so without this the builder would pick a replacement and the user would never
 * learn why their node is missing.
 */
export function describeRestrictedMatches(
	queries: readonly string[],
	restricted: readonly RestrictedNodeType[] | undefined,
): string {
	if (!restricted || restricted.length === 0) return '';

	const matches = new Map<string, RestrictedNodeType>();
	for (const query of queries) {
		for (const node of matchRestrictedByQuery(query, restricted, (item) => item.name)) {
			matches.set(node.name, node);
		}
	}
	if (matches.size === 0) return '';

	const lines = [...matches.values()].map((node) => {
		return `- ${node.displayName} (${node.name}): restricted by ${describeRestrictionScope(node.scope)}.`;
	});

	return [
		'Restricted node types that match your search. Do not use them:',
		...lines,
		'Name each one in your reply and say that it is restricted. Do not pick a replacement yourself. Build the parts of the request that do not need it. End your reply with a question that offers up to three allowed alternatives and asks which one to use.',
	].join('\n');
}
