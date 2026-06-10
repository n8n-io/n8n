import { Service } from '@n8n/di';
import type { IDataObject, INode } from 'n8n-workflow';
import { DATA_TABLE_NODE_TYPES } from 'n8n-workflow';

import type { IWorkflowToImport } from '@/interfaces';

import type { ImportWarning, WorkflowDependencyEdge } from './import-planner.types';
import { resourceRef } from './import-planner.types';

type ExtractionResult = {
	edges: WorkflowDependencyEdge[];
	warnings: ImportWarning[];
};

@Service()
export class WorkflowDependencyExtractor {
	extract(workflow: IWorkflowToImport): ExtractionResult {
		const edges: WorkflowDependencyEdge[] = [];
		const warnings: ImportWarning[] = [];

		for (const node of workflow.nodes ?? []) {
			edges.push(...this.extractCredentialEdges(workflow.id, node));
			this.extractDataTableEdge(workflow.id, node, edges, warnings);
			this.extractWorkflowCallEdge(workflow.id, node, edges, warnings);
		}

		const errorWorkflowId = workflow.settings?.errorWorkflow;
		if (errorWorkflowId && errorWorkflowId !== 'DEFAULT') {
			if (this.isDynamicReference(errorWorkflowId)) {
				warnings.push({
					type: 'dynamic-dependency-unchecked',
					source: resourceRef('workflow', workflow.id),
					dependencyKind: 'errorWorkflow',
				});
			} else {
				edges.push({
					from: resourceRef('workflow', workflow.id),
					to: resourceRef('workflow', errorWorkflowId),
					kind: 'errorWorkflow',
				});
			}
		}

		return { edges, warnings };
	}

	private extractCredentialEdges(workflowId: string, node: INode): WorkflowDependencyEdge[] {
		if (!node.credentials) return [];

		const edges: WorkflowDependencyEdge[] = [];

		for (const credentialDetails of Object.values(node.credentials)) {
			if (!credentialDetails?.id) continue;

			edges.push({
				from: resourceRef('workflow', workflowId),
				to: resourceRef('credential', credentialDetails.id),
				kind: 'credentialId',
			});
		}

		return edges;
	}

	private extractDataTableEdge(
		workflowId: string,
		node: INode,
		edges: WorkflowDependencyEdge[],
		warnings: ImportWarning[],
	): void {
		if (!DATA_TABLE_NODE_TYPES.includes(node.type)) return;

		const dataTableId = node.parameters?.dataTableId;
		const value = this.getResourceLocatorValue(dataTableId);
		if (!value) return;

		if (this.isDynamicReference(value)) {
			warnings.push({
				type: 'dynamic-dependency-unchecked',
				source: resourceRef('workflow', workflowId),
				dependencyKind: 'dataTableId',
			});
			return;
		}

		edges.push({
			from: resourceRef('workflow', workflowId),
			to: resourceRef('datatable', value),
			kind: 'dataTableId',
		});
	}

	private extractWorkflowCallEdge(
		workflowId: string,
		node: INode,
		edges: WorkflowDependencyEdge[],
		warnings: ImportWarning[],
	): void {
		if (node.type !== 'n8n-nodes-base.executeWorkflow') return;

		const source = node.parameters?.source;
		if (source === 'parameter' || source === 'localFile' || source === 'url') return;

		const calledWorkflowId = this.getResourceLocatorValue(node.parameters?.workflowId);
		if (!calledWorkflowId || calledWorkflowId === workflowId) return;

		if (this.isDynamicReference(calledWorkflowId)) {
			warnings.push({
				type: 'dynamic-dependency-unchecked',
				source: resourceRef('workflow', workflowId),
				dependencyKind: 'workflowCall',
			});
			return;
		}

		edges.push({
			from: resourceRef('workflow', workflowId),
			to: resourceRef('workflow', calledWorkflowId),
			kind: 'workflowCall',
		});
	}

	private getResourceLocatorValue(value: unknown): string | undefined {
		if (typeof value === 'string') return value;
		if (!this.isDataObject(value)) return undefined;

		const resourceValue = value.value;
		return typeof resourceValue === 'string' ? resourceValue : undefined;
	}

	private isDataObject(value: unknown): value is IDataObject {
		return typeof value === 'object' && value !== null;
	}

	private isDynamicReference(value: string): boolean {
		return value.startsWith('=') || value.includes('{');
	}
}
