import type { PromotionBindingConsumer, PromotionBindingProject } from '@n8n/api-types';

import { visitWorkflowCredentials } from '@/modules/n8n-packages/entities/credential/workflow-credential-references';
import type { VariableRequirementsExtractor } from '@/modules/n8n-packages/entities/variable/variable-requirements.extractor';
import type {
	InventoryCredential,
	InventoryVariable,
	InventoryWorkflow,
	PackageDirectoryInventory,
} from '@/modules/n8n-packages/io/directory/package-directory-inventory-reader';

/**
 * A credential that workflow nodes reference. A scan of the nodes finds references that the
 * import cannot see, such as a reference without an id.
 */
export interface CredentialReference {
	sourceId: string | null;
	name: string;
	expectedTypes: string[];
	file: InventoryCredential | undefined;
	workflows: InventoryWorkflow[];
}

export interface VariableReference {
	name: string;
	file: InventoryVariable | undefined;
	workflows: InventoryWorkflow[];
}

export type ProjectLookup = (id: string) => PromotionBindingProject;

/** Inspect references before target lookups. File paths define ownership. */
export function collectCredentialReferences(
	inventory: PackageDirectoryInventory,
): CredentialReference[] {
	const groups = new Map<string, CredentialReference>();
	const files = new Map(inventory.credentials.map((file) => [file.credential.id, file]));
	for (const workflow of inventory.workflows) {
		visitWorkflowCredentials(workflow.content.nodes, (type, details) => {
			if (!details.id && details.__aiGatewayManaged === true) return false;

			const sourceId = details.id || null;
			const key = JSON.stringify(sourceId ?? [type, details.name]);
			const file = sourceId === null ? undefined : files.get(sourceId);
			const group = groups.get(key) ?? {
				sourceId,
				name: file?.credential.name ?? details.name,
				expectedTypes: file ? [file.credential.type] : [],
				file,
				workflows: [],
			};
			group.expectedTypes.push(type);
			group.workflows.push(workflow);
			groups.set(key, group);
			return false;
		});
	}
	for (const group of groups.values()) {
		group.expectedTypes = unique(group.expectedTypes).sort(compare);
	}
	return [...groups.values()].sort(
		(a, b) =>
			compare(a.sourceId ?? '', b.sourceId ?? '') ||
			compare(a.expectedTypes[0], b.expectedTypes[0]) ||
			compare(a.name, b.name),
	);
}

/** Resolve source project scope first, then source global scope. Other projects do not supply a fallback. */
export function collectVariableReferences(
	inventory: PackageDirectoryInventory,
	extractor: VariableRequirementsExtractor,
): VariableReference[] {
	const files = new Map(
		inventory.variables.map((file) => [variableKey(file.variable.name, file.projectId), file]),
	);
	const groups = new Map<string, VariableReference>();
	for (const workflow of inventory.workflows) {
		const requirements = extractor.extract({
			id: workflow.id,
			nodes: workflow.content.nodes,
			settings: workflow.content.settings,
		});
		for (const { variableName: name } of requirements) {
			const file =
				files.get(variableKey(name, workflow.projectId)) ?? files.get(variableKey(name, null));
			const key = JSON.stringify([file ? 'defined' : 'missing', file?.projectId, name]);
			const group = groups.get(key) ?? { name, file, workflows: [] };
			group.workflows.push(workflow);
			groups.set(key, group);
		}
	}
	return [...groups.values()].sort(
		(a, b) => compare(a.file?.projectId ?? '', b.file?.projectId ?? '') || compare(a.name, b.name),
	);
}

export function consumersOf(
	workflows: InventoryWorkflow[],
	projectOf: ProjectLookup,
): PromotionBindingConsumer[] {
	const byProject = new Map<string, InventoryWorkflow[]>();
	for (const workflow of workflows) {
		const group = byProject.get(workflow.projectId) ?? [];
		group.push(workflow);
		byProject.set(workflow.projectId, group);
	}
	return [...byProject.entries()]
		.sort(([a], [b]) => compare(a, b))
		.map(([projectId, uses]) => ({ project: projectOf(projectId), workflows: workflowRefs(uses) }));
}

export function workflowRefs(workflows: InventoryWorkflow[]): Array<{ id: string; name: string }> {
	return [...new Map(workflows.map((workflow) => [workflow.id, workflow])).values()]
		.sort((a, b) => compare(a.id, b.id))
		.map(({ id, name }) => ({ id, name }));
}

export function referenceFiles(workflows: InventoryWorkflow[]): string[] {
	return unique(workflows.map(({ path }) => path)).sort(compare);
}

function variableKey(name: string, projectId: string | null): string {
	return JSON.stringify([projectId, name]);
}

function unique<T>(values: T[]): T[] {
	return [...new Set(values)];
}

export function compare(a: string, b: string): number {
	return a < b ? -1 : a > b ? 1 : 0;
}
