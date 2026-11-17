import { extractVariableNames } from 'n8n/dist/testing.js';
import { DATA_TABLE_NODE_TYPES, isResourceLocatorValue } from 'n8n-workflow';

import type { NodeDefinition, WorkflowDefinition, WorkflowSet } from '../workflow-set';
import { subWorkflowCall } from './contract';

export interface CredentialRequirement {
	name: string;
	id?: string;
	type: string;
	workflows: string[];
}

export interface VariableRequirement {
	name: string;
	workflows: string[];
}

export interface DataTableRequirement {
	id: string;
	name?: string;
	workflows: string[];
}

export interface ChildWorkflowRequirement {
	id: string;
	name?: string;
	workflows: string[];
}

export interface NodeTypeRequirement {
	type: string;
	version: number;
	workflows: string[];
}

export interface WorkflowSetRequirements {
	credentials: CredentialRequirement[];
	variables: VariableRequirement[];
	dataTables: DataTableRequirement[];
	workflows: ChildWorkflowRequirement[];
	nodeTypes: NodeTypeRequirement[];
}

type Entry<T> = [key: string, value: T];

export function deriveRequirements(set: WorkflowSet): WorkflowSetRequirements {
	const collect = <T>(entriesOf: (definition: WorkflowDefinition) => Array<Entry<T>>) => {
		const byKey = new Map<string, T & { workflows: string[] }>();
		for (const { name: workflow, definition } of set.workflows) {
			for (const [key, value] of entriesOf(definition)) {
				const entry = byKey.get(key) ?? { ...value, workflows: [] };
				if (!entry.workflows.includes(workflow)) entry.workflows.push(workflow);
				byKey.set(key, entry);
			}
		}
		return [...byKey.values()];
	};

	return {
		credentials: collect(({ nodes }) => nodes.flatMap(credentialsOf)),
		variables: collect((definition) =>
			extractVariableNames(definition).map((name) => [name, { name }]),
		),
		dataTables: collect(({ nodes }) => nodes.flatMap(dataTablesOf)),
		workflows: collect(({ nodes }) => nodes.flatMap(childWorkflowsOf)),
		nodeTypes: collect(({ nodes }) =>
			nodes.map(({ type, typeVersion }) => [
				`${type}@${typeVersion}`,
				{ type, version: typeVersion },
			]),
		),
	};
}

function credentialsOf(
	node: NodeDefinition,
): Array<Entry<Omit<CredentialRequirement, 'workflows'>>> {
	return Object.entries(node.credentials ?? {}).flatMap(([type, details]) =>
		details
			? [
					[
						`${type}:${details.id ?? details.name}`,
						{ name: details.name, id: details.id ?? undefined, type },
					],
				]
			: [],
	);
}

function dataTablesOf(node: NodeDefinition): Array<Entry<Omit<DataTableRequirement, 'workflows'>>> {
	const { dataTableId } = node.parameters;
	if (!DATA_TABLE_NODE_TYPES.includes(node.type) || !isResourceLocatorValue(dataTableId)) return [];
	const { mode, value: id } = dataTableId;
	if (mode === 'name' || typeof id !== 'string' || !id || id.includes('{')) return [];
	const name =
		typeof dataTableId.cachedResultName === 'string' ? dataTableId.cachedResultName : undefined;
	return [[id, { id, name }]];
}

function childWorkflowsOf(
	node: NodeDefinition,
): Array<Entry<Omit<ChildWorkflowRequirement, 'workflows'>>> {
	const call = subWorkflowCall(node);
	if (call?.childId === undefined) return [];
	return [[call.childId, { id: call.childId, name: call.storedName }]];
}
