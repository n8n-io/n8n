/**
 * Compact representation of `INodeTypeDescription` carrying only the fields
 * the node-catalog search/parser code actually reads.
 *
 * Built once at index construction. The full `INodeTypeDescription` (with
 * `properties`, `credentials`, `webhooks`, etc.) is **not** retained — at ~9 MB
 * across all built-in nodes, keeping it resident was the dominant idle-memory
 * cost when the agents module enabled. Callers that need the full type can
 * read it from disk via `getNodeTypes()` (which already does that).
 *
 * Discriminator info that previously required scanning `properties` per query
 * is pre-computed during the lean conversion (see `toLeanNodeType`) and
 * stored here so search-result formatting stays a pure read.
 */

import type { INodeTypeDescription, IRelatedNode } from 'n8n-workflow';

import {
	extractModeDiscriminator,
	extractOperationOnlyDiscriminator,
	type ModeDiscriminatorInfo,
	type OperationOnlyDiscriminatorInfo,
} from './discriminator-utils';
import {
	extractResourceOperations,
	type ResourceOperationInfo,
} from './resource-operation-extractor';

/**
 * Pre-computed discriminator metadata for one node version. Built by
 * `buildVersionDiscriminators` and keyed by version inside the lean node-type.
 */
export interface VersionDiscriminators {
	resourceOperations: ResourceOperationInfo | null;
	modeDiscriminator: ModeDiscriminatorInfo | null;
	operationDiscriminator: OperationOnlyDiscriminatorInfo | null;
}

export interface LeanNodeTypeDescription {
	name: string;
	displayName: string;
	description: string;
	version: number | number[];
	group: INodeTypeDescription['group'];
	inputs: INodeTypeDescription['inputs'];
	outputs: INodeTypeDescription['outputs'];
	/** Only the `alias` array is consumed by sublimeSearch; everything else dropped. */
	codex?: { alias?: string[] };
	builderHint?: {
		searchHint?: string;
		relatedNodes?: IRelatedNode[];
		inputs?: NonNullable<INodeTypeDescription['builderHint']>['inputs'];
	};
	/**
	 * Pre-computed discriminator info per version. Keyed by version number so
	 * version-specific properties (added/removed across versions) resolve to
	 * the right extracted shape without re-scanning `properties` at query time.
	 */
	discriminatorsByVersion: Map<number, VersionDiscriminators>;
}

function getVersions(node: INodeTypeDescription): number[] {
	return Array.isArray(node.version) ? node.version : [node.version];
}

function buildVersionDiscriminators(
	node: INodeTypeDescription,
): Map<number, VersionDiscriminators> {
	const out = new Map<number, VersionDiscriminators>();
	for (const version of getVersions(node)) {
		out.set(version, {
			resourceOperations: extractResourceOperations(node, version, undefined, {
				fields: { description: true, builderHint: true },
			}),
			modeDiscriminator: extractModeDiscriminator(node, version),
			operationDiscriminator: extractOperationOnlyDiscriminator(node, version),
		});
	}
	return out;
}

/**
 * Strip a full `INodeTypeDescription` down to the searchable fields plus the
 * pre-computed per-version discriminator metadata. The returned object holds
 * no references back into the original `properties`/`credentials`/`webhooks`
 * arrays, so the caller can drop the full type once converted.
 */
export function toLeanNodeType(node: INodeTypeDescription): LeanNodeTypeDescription {
	const lean: LeanNodeTypeDescription = {
		name: node.name,
		displayName: node.displayName,
		description: node.description,
		version: node.version,
		group: node.group,
		inputs: node.inputs,
		outputs: node.outputs,
		discriminatorsByVersion: buildVersionDiscriminators(node),
	};

	if (node.codex?.alias) {
		lean.codex = { alias: node.codex.alias };
	}

	if (node.builderHint) {
		const { searchHint, relatedNodes, inputs } = node.builderHint;
		const hint: LeanNodeTypeDescription['builderHint'] = {};
		if (searchHint !== undefined) hint.searchHint = searchHint;
		if (relatedNodes !== undefined) hint.relatedNodes = relatedNodes;
		if (inputs !== undefined) hint.inputs = inputs;
		if (Object.keys(hint).length > 0) lean.builderHint = hint;
	}

	return lean;
}
