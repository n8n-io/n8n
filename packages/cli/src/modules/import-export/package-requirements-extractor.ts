import { Service } from '@n8n/di';
import type { INode } from 'n8n-workflow';

import type {
	PackageCredentialRequirement,
	PackageNodeTypeRequirement,
	PackageRequirements,
	PackageSubWorkflowRequirement,
	PackageVariableRequirement,
} from './import-export.types';
import { getSubWorkflowId } from './workflow/workflow.utils';

export interface PackageContents {
	credentialIds: Set<string>;
	workflowIds: Set<string>;
}

@Service()
export class PackageRequirementsExtractor {
	extract(
		nodesByWorkflow: Array<{ workflowId: string; nodes: INode[] }>,
		packageContents: PackageContents,
	): PackageRequirements {
		const credentialMap = new Map<string, PackageCredentialRequirement>();
		const subWorkflowMap = new Map<string, PackageSubWorkflowRequirement>();
		const nodeTypeMap = new Map<string, PackageNodeTypeRequirement>();
		const variableMap = new Map<string, PackageVariableRequirement>();

		for (const { workflowId, nodes } of nodesByWorkflow) {
			for (const node of nodes) {
				this.collectCredentials(node, workflowId, packageContents, credentialMap);
				this.collectSubWorkflowCalls(node, workflowId, packageContents, subWorkflowMap);
				this.collectNodeTypes(node, workflowId, nodeTypeMap);
				this.collectVariables(node, workflowId, variableMap);
			}
		}

		return {
			credentials: [...credentialMap.values()],
			subWorkflows: [...subWorkflowMap.values()],
			nodeTypes: [...nodeTypeMap.values()],
			variables: [...variableMap.values()],
		};
	}

	static merge(a: PackageRequirements, b: PackageRequirements): PackageRequirements {
		return {
			credentials: mergeRequirementList([...a.credentials, ...b.credentials], (r) => r.id),
			subWorkflows: mergeRequirementList([...a.subWorkflows, ...b.subWorkflows], (r) => r.id),
			nodeTypes: mergeRequirementList(
				[...a.nodeTypes, ...b.nodeTypes],
				(r) => `${r.type}:${r.typeVersion}`,
			),
			variables: mergeRequirementList([...a.variables, ...b.variables], (r) => r.name),
		};
	}

	private collectCredentials(
		node: INode,
		workflowId: string,
		packageContents: PackageContents,
		map: Map<string, PackageCredentialRequirement>,
	): void {
		if (!node.credentials) return;

		for (const [type, details] of Object.entries(node.credentials)) {
			const { id, name } = details;
			if (!id) continue;
			if (packageContents.credentialIds.has(id)) continue;

			const existing = map.get(id);
			if (existing) {
				if (!existing.usedByWorkflows.includes(workflowId)) {
					existing.usedByWorkflows.push(workflowId);
				}
			} else {
				map.set(id, { id, name, type, usedByWorkflows: [workflowId] });
			}
		}
	}

	private collectSubWorkflowCalls(
		node: INode,
		workflowId: string,
		packageContents: PackageContents,
		map: Map<string, PackageSubWorkflowRequirement>,
	): void {
		const calledWorkflowId = getSubWorkflowId(node);
		if (!calledWorkflowId) return;
		if (packageContents.workflowIds.has(calledWorkflowId)) return;

		const existing = map.get(calledWorkflowId);
		if (existing) {
			if (!existing.usedByWorkflows.includes(workflowId)) {
				existing.usedByWorkflows.push(workflowId);
			}
		} else {
			map.set(calledWorkflowId, { id: calledWorkflowId, usedByWorkflows: [workflowId] });
		}
	}

	private collectNodeTypes(
		node: INode,
		workflowId: string,
		map: Map<string, PackageNodeTypeRequirement>,
	): void {
		if (!node.type) return;

		const key = `${node.type}:${node.typeVersion}`;
		const existing = map.get(key);
		if (existing) {
			if (!existing.usedByWorkflows.includes(workflowId)) {
				existing.usedByWorkflows.push(workflowId);
			}
		} else {
			map.set(key, {
				type: node.type,
				typeVersion: node.typeVersion,
				usedByWorkflows: [workflowId],
			});
		}
	}

	private collectVariables(
		node: INode,
		workflowId: string,
		map: Map<string, PackageVariableRequirement>,
	): void {
		const variableNames = this.extractVariableNames(node.parameters);
		for (const name of variableNames) {
			const existing = map.get(name);
			if (existing) {
				if (!existing.usedByWorkflows.includes(workflowId)) {
					existing.usedByWorkflows.push(workflowId);
				}
			} else {
				map.set(name, { name, usedByWorkflows: [workflowId] });
			}
		}
	}

	private static readonly VARS_PATTERN = /\$vars\.(\w+)/g;

	/**
	 * Recursively walk node parameters and extract variable names
	 * referenced via `$vars.variableName` expressions.
	 */
	private extractVariableNames(value: unknown): Set<string> {
		const names = new Set<string>();

		if (typeof value === 'string') {
			let match;
			PackageRequirementsExtractor.VARS_PATTERN.lastIndex = 0;
			while ((match = PackageRequirementsExtractor.VARS_PATTERN.exec(value)) !== null) {
				names.add(match[1]);
			}
		} else if (Array.isArray(value)) {
			for (const item of value) {
				for (const name of this.extractVariableNames(item)) {
					names.add(name);
				}
			}
		} else if (value !== null && typeof value === 'object') {
			for (const val of Object.values(value)) {
				for (const name of this.extractVariableNames(val)) {
					names.add(name);
				}
			}
		}

		return names;
	}
}

/**
 * Deduplicate requirements by key, merging their `usedByWorkflows` arrays.
 */
function mergeRequirementList<T extends { usedByWorkflows: string[] }>(
	items: T[],
	getKey: (item: T) => string,
): T[] {
	const map = new Map<string, T>();

	for (const item of items) {
		const key = getKey(item);
		const existing = map.get(key);
		if (existing) {
			const merged = new Set([...existing.usedByWorkflows, ...item.usedByWorkflows]);
			existing.usedByWorkflows = [...merged];
		} else {
			map.set(key, { ...item, usedByWorkflows: [...item.usedByWorkflows] });
		}
	}

	return [...map.values()];
}
