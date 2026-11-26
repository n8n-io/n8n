import { parseAgentSkillWorkflowMentions } from '@n8n/api-types';
import { WorkflowRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';

import { SkillAccessService, WorkflowsInSkillsFlagGate } from '@/modules/skills';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { AgentSkillRefsService } from './agent-skill-refs.service';
import { AgentRepository } from './repositories/agent.repository';
import { findReadableUnarchivedWorkflowIds } from './tools/workflow-tool-workflow-resolver';
import { getAgentOrThrow } from './utils/get-agent-or-throw';

@Service()
export class AgentSkillWorkflowAccessService {
	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly skillAccess: SkillAccessService,
		private readonly workflowsInSkillsFlagGate: WorkflowsInSkillsFlagGate,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly agentSkillRefs: AgentSkillRefsService,
	) {}

	async findOutsideProjectWorkflowIds(
		user: User,
		projectId: string,
		agentId: string,
		skillId: string,
	): Promise<string[]> {
		const agent = await getAgentOrThrow(
			this.agentRepository,
			agentId,
			projectId,
			'Agent not found',
		);
		await this.skillAccess.requireAccess(user, skillId, 'read');
		if (!(await this.workflowsInSkillsFlagGate.isEnabled())) return [];

		const draftRef = (await this.agentSkillRefs.refsForDraft(agent, {})).find(
			({ id }) => id === skillId,
		);
		const skills = await this.agentSkillRefs.skillsForRefs(
			[draftRef ?? { type: 'skill', id: skillId }],
			{},
		);
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
		const outside = await findReadableUnarchivedWorkflowIds(
			this.workflowFinderService,
			this.workflowRepository,
			workflowIds.filter((workflowId) => !usableIds.has(workflowId)),
			user,
		);
		return [...outside];
	}
}
