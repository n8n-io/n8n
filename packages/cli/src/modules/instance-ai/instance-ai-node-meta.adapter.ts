import { Service } from '@n8n/di';
import type { ResultNodeMetaProvider } from '@n8n/instance-ai';
import type { INodeProperties, INodePropertyCollection, INodePropertyOptions } from 'n8n-workflow';

import { NodeTypes } from '@/node-types';

/**
 * Option entries carry the per-operation `action` phrase; the other union
 * members (nested properties / collections) carry `displayName` instead.
 */
function isPropertyOption(
	option: INodePropertyOptions | INodeProperties | INodePropertyCollection,
): option is INodePropertyOptions {
	return 'value' in option && !('displayName' in option);
}

function defaultOf(property: INodeProperties | undefined): string | undefined {
	return property && typeof property.default === 'string' ? property.default : undefined;
}

/**
 * NodeTypes-registry-backed implementation of the workflow-overview metadata
 * provider: authoritative trigger detection (description `group` contains
 * 'trigger'), curated display names for clause labels, and per-operation
 * `action` phrases for result classification. Partial by contract — unknown
 * or not-installed node types return undefined and the extractors fall back
 * to their heuristics for those nodes.
 */
@Service()
export class InstanceAiNodeMetaAdapter implements ResultNodeMetaProvider {
	constructor(private readonly nodeTypes: NodeTypes) {}

	getNodeMeta(
		type: string,
		typeVersion?: number,
	): { isTrigger: boolean; displayName: string } | undefined {
		try {
			const { description } = this.nodeTypes.getByNameAndVersion(type, typeVersion);
			return {
				isTrigger: description.group.includes('trigger'),
				displayName: description.displayName,
			};
		} catch {
			// Unknown / uninstalled node type — the caller falls back to heuristics.
			return undefined;
		}
	}

	/**
	 * The author-written action phrase ("Send a message") of the operation the
	 * node is configured for — the strings the nodes panel shows. Undefined
	 * `resource`/`operation` mean the description's defaults, mirroring how
	 * saved parameters omit values equal to the default.
	 */
	getActionPhrase(
		type: string,
		typeVersion?: number,
		resource?: string,
		operation?: string,
	): string | undefined {
		try {
			const { description } = this.nodeTypes.getByNameAndVersion(type, typeVersion);
			const properties = description.properties;

			// Single-resource nodes (e.g. Postgres) declare `resource` as a hidden
			// property whose default still scopes the operation display conditions.
			const resourceProperty = properties.find(
				(p) => p.name === 'resource' && (p.type === 'options' || p.type === 'hidden'),
			);
			const activeResource = resource ?? defaultOf(resourceProperty);

			// First operation property whose display condition covers the active
			// resource (or that has no resource condition at all). Version-scoped
			// displayOptions (`@version`) are ignored for now — first match wins.
			const operationProperty = properties.find((p) => {
				if (p.name !== 'operation' || p.type !== 'options') return false;
				const shownFor = p.displayOptions?.show?.resource;
				if (!shownFor) return true; // no display condition → applies to every resource
				return activeResource !== undefined && shownFor.some((v) => v === activeResource);
			});
			if (!operationProperty?.options) return undefined;

			const activeOperation = operation ?? defaultOf(operationProperty);
			if (activeOperation === undefined) return undefined;

			const option = operationProperty.options
				.filter(isPropertyOption)
				.find((o) => o.value === activeOperation);
			return option?.action ?? undefined;
		} catch {
			return undefined;
		}
	}
}
