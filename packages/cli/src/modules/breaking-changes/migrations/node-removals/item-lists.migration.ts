import type { INode, INodeParameters } from 'n8n-workflow';

import {
	assertIncludeEmptyIsInert,
	assertNoEmptyFieldToSplitOut,
	assertNoSplitBy,
} from './item-lists-checks';
import type { LegacyResult } from './item-lists-legacy';
import {
	legacyAggregate,
	legacyRemoveDuplicates,
	legacySplitOut,
	legacySummarize,
} from './item-lists-legacy';
import type { NodeMigration } from '../node-migration';
import { pickDefined, readString } from '../parameter-readers';

type Target = {
	type: string;
	// The version of the new node for Item Lists 3 and 3.1.
	typeVersion: number;
	// Parameters that the old operation owns in Item Lists 3 and 3.1.
	parameters: string[];
	// Refuses an Item Lists 3 or 3.1 node that this operation cannot carry over exactly.
	check?: (node: INode) => void;
	// Migrates an Item Lists 1 or 2 node. These versions store field lists as collections
	// and the new nodes use one string, so they need their own code.
	legacy: (node: INode) => LegacyResult;
};

const TRANSFORM_NODE = (name: string) => `n8n-nodes-base.${name}`;

// Limit and Sort have the same shape in every Item Lists version.
const copyParameters =
	(...keys: string[]) =>
	(node: INode): LegacyResult => ({ parameters: pickDefined(node.parameters, keys) });
const TARGETS = new Map<string, Target>(
	Object.entries({
		limit: {
			type: TRANSFORM_NODE('limit'),
			typeVersion: 1,
			parameters: ['maxItems', 'keep'],
			legacy: copyParameters('maxItems', 'keep'),
		},
		sort: {
			type: TRANSFORM_NODE('sort'),
			typeVersion: 1,
			parameters: ['type', 'sortFieldsUi', 'code', 'options'],
			legacy: copyParameters('type', 'sortFieldsUi', 'code', 'options'),
		},
		concatenateItems: {
			type: TRANSFORM_NODE('aggregate'),
			typeVersion: 1,
			parameters: [
				'aggregate',
				'fieldsToAggregate',
				'destinationFieldName',
				'include',
				'fieldsToExclude',
				'fieldsToInclude',
				'options',
			],
			legacy: legacyAggregate,
		},
		removeDuplicates: {
			type: TRANSFORM_NODE('removeDuplicates'),
			// Remove Duplicates 2 has two outputs. Version 1 has one, as Item Lists does.
			typeVersion: 1,
			parameters: ['compare', 'fieldsToExclude', 'fieldsToCompare', 'options'],
			legacy: legacyRemoveDuplicates,
			check: (node) => {
				// Item Lists 3.1 sorts values of mixed types. Remove Duplicates 1 throws for them.
				if (node.typeVersion >= 3.1) {
					throw new Error(
						'The old node can compare values of different types, such as numbers and text, but the new node stops with an error. Replace this node by hand.',
					);
				}
			},
		},
		splitOutItems: {
			type: TRANSFORM_NODE('splitOut'),
			// Split Out 1.1 writes destination fields as nested paths. Version 1 does not.
			typeVersion: 1,
			parameters: ['fieldToSplitOut', 'include', 'fieldsToInclude', 'options'],
			legacy: legacySplitOut,
			check: assertNoEmptyFieldToSplitOut,
		},
		summarize: {
			type: TRANSFORM_NODE('summarize'),
			// Item Lists 2.1 and later report a missing field as a hint. Summarize 1.1 does the same.
			typeVersion: 1.1,
			parameters: ['fieldsToSummarize', 'fieldsToSplitBy', 'options'],
			legacy: legacySummarize,
			check: (node) => {
				assertNoSplitBy(node);
				assertIncludeEmptyIsInert(node);
			},
		},
	}),
);

/**
 * Item Lists to the single-purpose Transform nodes.
 *
 * Does:
 * - Target: `operation` picks it (default `splitOutItems`). Limit 1, Sort 1, Aggregate 1,
 *   Remove Duplicates 1, Split Out 1 or Summarize. Each version is the one that matches
 *   the old behavior. Remove Duplicates 2 has two outputs, and Split Out 1.1 writes nested
 *   destination paths. Summarize 1.1 is the target for Item Lists 2.1 and later, and
 *   Summarize 1 for Item Lists 1 and 2, because Summarize 1 throws for a field that is
 *   missing in all items, as those versions do.
 * - Item Lists 3 and 3.1: copies the parameters of the operation with the same names and
 *   shapes. Item Lists 3 was the template for the new nodes.
 * - Item Lists 1 and 2: Limit and Sort copy in the same way. The other operations call
 *   the functions in `item-lists-legacy.ts`. They store field lists as a collection, and
 *   the new nodes use one comma-separated string. The function converts the lists.
 *
 * Refuses when:
 * - The operation is unknown or is an expression. Item Lists 1 and 2 call Concatenate
 *   `aggregateItems`, and Item Lists 3 calls it `concatenateItems`.
 * - Remove Duplicates, version 3.1: it compares values of mixed types and the new node
 *   throws.
 * - Split Out: `fieldToSplitOut` is empty or has an empty name. The old node keeps it,
 *   the new node drops it, so the result changes.
 * - Summarize: `fieldsToSplitBy` is set or is an expression. The new node keeps the type
 *   and the order of the split values, and the old node does not.
 * - Summarize: "Include Empty Values" is on for Count or Count Unique (the old node
 *   ignores it, the new node uses it). A missing `aggregation` means Count.
 * - Item Lists 1 and 2, field lists: a name is empty, has a comma, has a space at the
 *   start or end, or is an expression. The new nodes read a string and would change it.
 * - Item Lists 1 and 2, other values that behave in a different way. See each function in
 *   `item-lists-legacy.ts`. Examples: Minimum and Maximum in Summarize, `$json.` and
 *   `$binary` in Split Out, and a mode or an option that is an expression.
 *
 * Accepted changes:
 * - Split Out: an expression in `fieldToSplitOut` is not checked, because it can only be
 *   checked when it runs.
 * - Split Out: the new node refuses reserved output names, such as `__proto__`.
 * - Summarize 1.1 adds a hint for a missing field. Item Lists 2.1 and later already did
 *   not throw.
 * - Item Lists 1 and 2: a failure becomes a success when the node did not find a field
 *   (Aggregate, Split Out) or got a value that is not an array or object (Split Out).
 *   The new nodes add a hint or wrap the value. The migration reports a note where the old
 *   node can throw. The note also turns off the one-click republish.
 */
export const itemListsToTransformNodes: NodeMigration = {
	ruleId: 'item-lists-removed-v3',
	migrate: (node) => {
		const operation = readString(node.parameters, 'operation', 'splitOutItems', 'Operation');
		const isLegacy = node.typeVersion < 3;

		const target = isLegacy
			? TARGETS.get(operation === 'aggregateItems' ? 'concatenateItems' : operation)
			: TARGETS.get(operation);

		if (!target || (isLegacy && operation === 'concatenateItems')) {
			throw new Error(`Item Lists operation "${operation}" is not supported.`);
		}

		if (isLegacy) {
			const { typeVersion = target.typeVersion, parameters, notes } = target.legacy(node);
			return { node: { type: target.type, typeVersion, parameters }, notes };
		}

		target.check?.(node);

		const parameters: INodeParameters = pickDefined(node.parameters, target.parameters);
		return { node: { type: target.type, typeVersion: target.typeVersion, parameters } };
	},
};
