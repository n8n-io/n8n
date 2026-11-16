import { isResourceLocatorValue } from 'n8n-workflow';

import type { NodeDefinition, WorkflowSet } from '../workflow-set';
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

const DATA_TABLE_NODE_TYPE = 'n8n-nodes-base.dataTable';

const VARIABLE_PATTERN = /\$vars(?:\.([A-Za-z_$][\w$]*)|\[\s*\\?["']([^"'\\]+)\\?["']\s*\])/g;

export function deriveRequirements(set: WorkflowSet): WorkflowSetRequirements {
	const uses = set.workflows.flatMap((workflow) =>
		workflow.definition.nodes.map((node) => ({ workflow: workflow.name, node })),
	);
	const collect = <T>(entriesOf: (node: NodeDefinition) => Array<Entry<T>>) => {
		const byKey = new Map<string, T & { workflows: string[] }>();
		for (const { workflow, node } of uses) {
			for (const [key, value] of entriesOf(node)) {
				const entry = byKey.get(key) ?? { ...value, workflows: [] };
				if (!entry.workflows.includes(workflow)) entry.workflows.push(workflow);
				byKey.set(key, entry);
			}
		}
		return [...byKey.values()];
	};

	return {
		credentials: collect(credentialsOf),
		variables: collect(variablesOf),
		dataTables: collect(dataTablesOf),
		workflows: collect(childWorkflowsOf),
		nodeTypes: collect(({ type, typeVersion }) => [
			[`${type}@${typeVersion}`, { type, version: typeVersion }],
		]),
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

function variablesOf(node: NodeDefinition): Array<Entry<Omit<VariableRequirement, 'workflows'>>> {
	const text = JSON.stringify(node.parameters);
	return [...text.matchAll(VARIABLE_PATTERN)].map((match) => {
		const name = match[1] ?? match[2];
		return [name, { name }];
	});
}

function dataTablesOf(node: NodeDefinition): Array<Entry<Omit<DataTableRequirement, 'workflows'>>> {
	const { dataTableId } = node.parameters;
	if (node.type !== DATA_TABLE_NODE_TYPE || !isResourceLocatorValue(dataTableId)) return [];
	const id = String(dataTableId.value);
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
