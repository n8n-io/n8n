import type { CredentialProvider } from '@n8n/agents';
import type { WorkflowRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { AgentsToolsService } from '../agents-tools.service';
import type { AgentsService } from '../agents.service';
import { AgentsBuilderToolsService } from '../builder/agents-builder-tools.service';
import { BUILDER_TOOLS } from '../builder/builder-tool-names';
import type { AgentSecureRuntime } from '../runtime/agent-secure-runtime';

const ctx = {
	resumeData: undefined,
	suspend: jest.fn().mockResolvedValue(undefined as never),
	parentTelemetry: undefined,
};

function makeService() {
	const agentsService = mock<AgentsService>();
	const secureRuntime = mock<AgentSecureRuntime>();
	const workflowRepository = mock<WorkflowRepository>();
	const agentsToolsService = mock<AgentsToolsService>();
	agentsToolsService.getSharedTools.mockReturnValue([]);

	const service = new AgentsBuilderToolsService(
		agentsService,
		secureRuntime,
		workflowRepository,
		agentsToolsService,
	);

	return { service, agentsService };
}

describe('AgentsBuilderToolsService', () => {
	const agentId = 'agent-1';
	const projectId = 'project-1';
	const credentialProvider = mock<CredentialProvider>();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('create_skill tool', () => {
		function getCreateSkillTool(service: AgentsBuilderToolsService) {
			return service
				.getTools(agentId, projectId, credentialProvider)
				.shared.find((tool) => tool.name === BUILDER_TOOLS.CREATE_SKILL)!;
		}

		it('is available to the builder with patch_config guidance', () => {
			const { service } = makeService();

			const tool = getCreateSkillTool(service);

			expect(tool).toBeDefined();
			expect(tool.description).toContain('patch_config');
			expect(tool.description).toContain('{ type: "skill", id }');
		});

		it('creates a skill and returns the generated skill id', async () => {
			const { service, agentsService } = makeService();
			agentsService.createSkill.mockResolvedValue({
				name: 'Summarize Meetings',
				description: 'Summarizes meetings',
				instructions: 'Extract decisions and action items.',
			});

			const result = await getCreateSkillTool(service).handler!(
				{
					name: 'Summarize Meetings',
					description: 'Summarizes meetings',
					body: 'Extract decisions and action items.',
				},
				ctx,
			);

			expect(agentsService.createSkill).toHaveBeenCalledWith(
				agentId,
				projectId,
				'summarize_meetings',
				{
					name: 'Summarize Meetings',
					description: 'Summarizes meetings',
					instructions: 'Extract decisions and action items.',
				},
			);
			expect(result).toEqual({
				ok: true,
				id: 'summarize_meetings',
				skill: {
					name: 'Summarize Meetings',
					description: 'Summarizes meetings',
					instructions: 'Extract decisions and action items.',
				},
			});
		});
	});
});
