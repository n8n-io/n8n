import { parseAgentSkillWorkflowMentions } from '@n8n/api-types';
import { WorkflowRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';

import {
	SkillAccessService,
	SkillRuntimeService,
	WorkflowsInSkillsFlagGate,
} from '@/modules/skills';

import { AgentRepository } from './repositories/agent.repository';
import { findUnarchivedWorkflowIds } from './tools/workflow-tool-workflow-resolver';
import { getAgentOrThrow } from './utils/get-agent-or-throw';

@Service()
export class AgentSkillWorkflowAccessService {
	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly skillAccess: SkillAccessService,
		private readonly skillRuntime: SkillRuntimeService,
		private readonly workflowsInSkillsFlagGate: WorkflowsInSkillsFlagGate,
	) {}

	async findOutsideProjectWorkflowIds(
		user: User,
		projectId: string,
		agentId: string,
		skillId: string,
	): Promise<string[]> {
		await getAgentOrThrow(this.agentRepository, agentId, projectId, 'Agent not found');
		await this.skillAccess.requireAccess(user, skillId, 'read');
		if (!(await this.workflowsInSkillsFlagGate.isEnabled())) return [];

		const skills = await this.skillRuntime.resolveForAgentDraft([{ id: skillId }]);
		if (!Object.hasOwn(skills, skillId)) return [];
		const workflowIds = parseAgentSkillWorkflowMentions(skills[skillId]).map(
			({ workflowId }) => workflowId,
		);
		const usable = await this.workflowRepository.findManyByAgentToolReferences(
			projectId,
			workflowIds,
			[],
		);
		const usableIds = new Set(usable.map(({ id }) => id));
		const outside = await findUnarchivedWorkflowIds(
			this.workflowRepository,
			workflowIds.filter((workflowId) => !usableIds.has(workflowId)),
		);
		return [...outside];
	}
}
