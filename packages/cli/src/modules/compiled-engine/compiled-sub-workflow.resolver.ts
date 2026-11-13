import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { INode } from 'n8n-workflow';

const EXECUTE_WORKFLOW = 'n8n-nodes-base.executeWorkflow';

/** Sub-workflows can call sub-workflows; the resolver stops at this depth. */
const MAX_DEPTH = 5;

/** The workflow JSON that the converter reads for a sub-workflow. */
export interface SubWorkflowJson {
	id: string;
	name: string;
	nodes: INode[];
	connections: unknown;
	settings: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The id of the workflow that an Execute Workflow node calls from the database, if it is fixed. */
export function calledWorkflowId(node: INode): string | undefined {
	if (node.type !== EXECUTE_WORKFLOW || node.disabled) return undefined;
	const source = node.parameters?.source ?? 'database';
	if (source !== 'database') return undefined;
	const ref: unknown = node.parameters?.workflowId;
	const value = isRecord(ref) ? ref.value : ref;
	if (typeof value !== 'string' || value === '' || value.startsWith('=')) return undefined;
	return value;
}

/**
 * Loads the workflows that Execute Workflow nodes call, so that the converter
 * can resolve them without I/O. A called workflow uses its published version
 * when it has one, else its saved version.
 */
@Service()
export class CompiledSubWorkflowResolver {
	constructor(private readonly workflowRepository: WorkflowRepository) {}

	async preload(nodes: INode[]): Promise<Map<string, SubWorkflowJson>> {
		const found = new Map<string, SubWorkflowJson>();
		let pending = nodes;
		for (let depth = 0; depth < MAX_DEPTH && pending.length > 0; depth++) {
			const ids = [...new Set(pending.map(calledWorkflowId))].filter(
				(id): id is string => id !== undefined && !found.has(id),
			);
			pending = [];
			for (const id of ids) {
				const workflow = await this.workflowRepository.findOne({
					where: { id },
					relations: { activeVersion: true },
				});
				if (!workflow) continue;
				const version = workflow.activeVersion;
				const json: SubWorkflowJson = {
					id: workflow.id,
					name: workflow.name,
					nodes: version?.nodes ?? workflow.nodes,
					connections: version?.connections ?? workflow.connections,
					settings: workflow.settings ?? {},
				};
				found.set(id, json);
				pending.push(...json.nodes);
			}
		}
		return found;
	}
}
