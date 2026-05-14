import { createAiAgentBuildGuideTool } from '../ai-agent-build-guide.tool';

type ToolHandler = (input: unknown, ctx: unknown) => Promise<unknown>;

describe('get_ai_agent_build_guide tool', () => {
	it('explains AI root nodes and sub-node purposes', async () => {
		const tool = createAiAgentBuildGuideTool() as unknown as { handler: ToolHandler };

		const result = (await tool.handler({}, {})) as { guide: string };

		expect(result.guide).toContain('@n8n/n8n-nodes-langchain.agent');
		expect(result.guide).toContain('Language model sub-nodes');
		expect(result.guide).toContain('Tool sub-nodes');
		expect(result.guide).toContain('Memory sub-nodes');
		expect(result.guide).toContain('Output parser sub-nodes');
		expect(result.guide).toContain('Do not propose sub-nodes as normal main-chain ghosts');
		expect(result.guide).toContain('connectionContext');
	});
});
