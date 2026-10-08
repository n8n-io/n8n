import { isRecord } from '@n8n/utils/is-record';
import isEqual from 'lodash/isEqual';
import { DATA_TABLE_NODE_TYPES, type INode, type NodeParameterValueType } from 'n8n-workflow';

import type {
	PackageCredentialRequirement,
	PackageDataTableRequirement,
} from '../spec/requirements.schema';

/*
 * A copy that an earlier import made is set up on this instance: the user selects its
 * credentials and data tables here. A re-import of the package keeps these choices, so that it
 * does not put back the references of the source instance. Nodes match by id, which an import
 * keeps.
 */

export type CredentialChoices = {
	/** Source credential id → the credential of this instance that the copy uses in its place. */
	bindings: Map<string, string>;
	/** Source credential ids in whose place the copy uses more than one credential. Sorted. */
	conflicting: string[];
};

function nodesById(nodes: readonly INode[]): Map<string, INode> {
	return new Map(nodes.map((node) => [node.id, node]));
}

function addChoice(choices: Map<string, Set<string>>, sourceId: string, chosenId: string) {
	const chosen = choices.get(sourceId) ?? new Set<string>();
	chosen.add(chosenId);
	choices.set(sourceId, chosen);
}

/**
 * The credentials that the copy uses in place of the credentials of the package: the credential
 * of the same type in the node with the same id.
 */
export function credentialChoicesOfCopy(
	packageNodes: readonly INode[],
	copyNodes: readonly INode[],
): CredentialChoices {
	const copyById = nodesById(copyNodes);
	const choices = new Map<string, Set<string>>();
	for (const node of packageNodes) {
		const copyNode = copyById.get(node.id);
		for (const [type, details] of Object.entries(node.credentials ?? {})) {
			const chosenId = copyNode?.credentials?.[type]?.id;
			if (details.id && chosenId) addChoice(choices, details.id, chosenId);
		}
	}
	const bindings = new Map<string, string>();
	const conflicting: string[] = [];
	for (const [sourceId, chosen] of choices) {
		if (chosen.size === 1) bindings.set(sourceId, [...chosen][0]);
		else conflicting.push(sourceId);
	}
	return { bindings, conflicting: conflicting.sort() };
}

/** A credential that the importing user can use in the target project. */
export type UsableCredential = { id: string; type: string };

/**
 * The choices that the import can take as bindings: a usable credential of the type that the
 * package requires. The import fails for a binding to a credential that is not usable, so a
 * credential that is gone or that the user cannot use falls back to the usual matching.
 */
export function acceptedCredentialChoices(
	bindings: ReadonlyMap<string, string>,
	requirements: readonly Pick<PackageCredentialRequirement, 'id' | 'type'>[],
	usable: readonly UsableCredential[],
): Map<string, string> {
	const requiredType = new Map(requirements.map(({ id, type }) => [id, type]));
	const usableType = new Map(usable.map(({ id, type }) => [id, type]));
	return new Map(
		[...bindings].filter(([sourceId, chosenId]) => {
			const type = requiredType.get(sourceId);
			return type !== undefined && usableType.get(chosenId) === type;
		}),
	);
}

/**
 * The id of the data table that a data table node uses. Undefined for another node, and for a
 * table given by name or by an expression, which the import does not resolve.
 */
export function dataTableIdOf(node: INode): string | undefined {
	if (!DATA_TABLE_NODE_TYPES.includes(node.type)) return undefined;
	const locator = node.parameters?.dataTableId;
	if (!isRecord(locator) || locator.mode === 'name') return undefined;
	const { value } = locator;
	if (typeof value !== 'string' || value.length === 0 || value.includes('{')) return undefined;
	return value;
}

/** The ids of the data tables that the nodes use, once each. */
export function dataTableIdsOf(nodes: readonly INode[]): string[] {
	return [...new Set(nodes.flatMap((node) => dataTableIdOf(node) ?? []))];
}

export type DataTableChoices = {
	/** Node id → the `dataTableId` parameter that the copy has in that node. */
	selections: Map<string, NodeParameterValueType>;
	/** The data tables of the package that the copy replaces, once each. */
	replacedTables: Pick<PackageDataTableRequirement, 'id' | 'name'>[];
};

/**
 * The data tables that the copy selected in place of tables of the package that the target
 * project does not have. A table of the package that the target project has stays, because the
 * import resolves it.
 */
export function dataTableChoicesOfCopy(
	packageNodes: readonly INode[],
	copyNodes: readonly INode[],
	missingTables: readonly Pick<PackageDataTableRequirement, 'id' | 'name'>[],
): DataTableChoices {
	const missingById = new Map(missingTables.map((table) => [table.id, table]));
	const copyById = nodesById(copyNodes);
	const selections = new Map<string, NodeParameterValueType>();
	const replaced = new Map<string, Pick<PackageDataTableRequirement, 'id' | 'name'>>();
	for (const node of packageNodes) {
		const tableId = dataTableIdOf(node);
		const table = tableId === undefined ? undefined : missingById.get(tableId);
		const copyNode = copyById.get(node.id);
		if (table === undefined || copyNode?.type !== node.type) continue;
		const selection = copyNode.parameters?.dataTableId;
		if (selection === undefined || isEqual(selection, node.parameters.dataTableId)) continue;
		selections.set(node.id, selection);
		replaced.set(table.id, table);
	}
	return { selections, replacedTables: [...replaced.values()] };
}

/** The nodes with the data table selections of the copy. Undefined when nothing changes. */
export function withDataTableSelections(
	nodes: readonly INode[],
	selections: ReadonlyMap<string, NodeParameterValueType>,
): INode[] | undefined {
	let changed = false;
	const result = nodes.map((node) => {
		const selection = selections.get(node.id);
		if (selection === undefined || isEqual(selection, node.parameters.dataTableId)) return node;
		changed = true;
		return { ...node, parameters: { ...node.parameters, dataTableId: selection } };
	});
	return changed ? result : undefined;
}

/**
 * Whether decrypted credential data holds no value. A credential that an import creates for a
 * missing credential holds none until the user sets it up.
 */
export function hasNoCredentialValue(data: Record<string, unknown>): boolean {
	return Object.values(data).every((value) => value === undefined || value === null || value === '');
}
