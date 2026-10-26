import { WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { sha256 } from '@n8n/utils/sha256';
import { randomUUID } from 'node:crypto';

/** The execution engine requires a saved workflow owner for durable waits. */
@Service()
export class AgentHitlWorkflowRepository {
	constructor(private readonly workflows: WorkflowRepository) {}

	async ensureExecutionOwner(projectId: string, agentId: string): Promise<string> {
		const digest = await sha256(JSON.stringify(['agent-hitl', projectId, agentId]));
		const id = `hitl${digest.slice(0, 28)}`;
		const reference = { workflowId: id, workflowName: 'Agent approvals' };
		if (await this.workflows.findOneByAgentToolReference(projectId, reference)) return id;
		const workflow = new WorkflowEntity();
		Object.assign(workflow, {
			id,
			name: reference.workflowName,
			isArchived: true,
			active: false,
			activeVersionId: null,
			versionId: randomUUID(),
			nodes: [],
			connections: {},
			settings: { callerPolicy: 'any' },
		});
		try {
			await this.workflows.createWorkflowWithOwner(workflow, projectId);
		} catch (error) {
			// Another request can create this Agent's owner at the same time.
			if (!(await this.workflows.findOneByAgentToolReference(projectId, reference))) throw error;
		}
		return id;
	}
}
