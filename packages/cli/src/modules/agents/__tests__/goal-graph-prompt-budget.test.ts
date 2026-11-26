import type { BuiltTool } from '@n8n/agents';
import { zodToJsonSchema } from '@n8n/ai-utilities/json-schema';
import { mock } from 'vitest-mock-extended';

import type { AgentPlanService } from '../agent-plan.service';
import type { AgentBackgroundJobService } from '../background/agent-background-job.service';
import { createBackgroundJobsTool } from '../background/background-job-tools';
import type { SubAgentBackgroundRunner } from '../background/sub-agent-background-runner';
import { createAgentPlanTools } from '../plans/agent-plan-tools';

function staticToolChars(tool: BuiltTool): number {
	const schema = zodToJsonSchema(tool.inputSchema);
	const schemaChars = schema ? JSON.stringify(schema).length : 0;
	return (
		tool.name.length + tool.description.length + schemaChars + (tool.systemInstruction?.length ?? 0)
	);
}

describe('Goal-graph and background job tools static prompt budget', () => {
	it('keeps eager plan and background tool schemas and instructions within budget', () => {
		const planTools = createAgentPlanTools(mock<AgentPlanService>());
		const backgroundJobsTool = createBackgroundJobsTool({
			jobService: mock<AgentBackgroundJobService>(),
			backgroundRunner: mock<SubAgentBackgroundRunner>(),
			projectId: 'project-1',
			parentAgentId: 'agent-1',
			runContext: mock(),
		});

		const planChars = planTools.reduce((sum, tool) => sum + staticToolChars(tool), 0);
		const backgroundJobsChars = staticToolChars(backgroundJobsTool);

		// Eager tools enter every top-level agent call, including simple single-turn chats.
		// Keep these bounds tight so prompt regressions surface in unit tests.
		expect(planChars).toBeLessThanOrEqual(8_600);
		expect(backgroundJobsChars).toBeLessThanOrEqual(2_200);
	});
});
