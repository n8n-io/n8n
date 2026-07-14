import { User } from '@n8n/db';
import {
	bestPracticesRegistry,
	TechniqueDescription,
	WorkflowTechnique,
} from '@n8n/workflow-sdk/prompts/best-practices';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { createGetWorkflowBestPracticesTool } from '../tools/workflow-builder/get-workflow-best-practices.tool';

vi.mock('@n8n/ai-workflow-builder', () => ({
	MCP_GET_WORKFLOW_BEST_PRACTICES_TOOL: {
		toolName: 'get_workflow_best_practices',
		displayTitle: 'Getting workflow best practices',
	},
}));

describe('get-workflow-best-practices MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	let telemetry: Mocked<Telemetry>;

	beforeEach(() => {
		vi.clearAllMocks();
		telemetry = mock<Telemetry>();
	});

	const createTool = () => createGetWorkflowBestPracticesTool(user, telemetry);

	test('exposes the expected tool name and read-only annotations', () => {
		const tool = createTool();

		expect(tool.name).toBe('get_workflow_best_practices');
		expect(tool.config.annotations?.readOnlyHint).toBe(true);
		expect(tool.config.annotations?.destructiveHint).toBe(false);
		expect(tool.config.annotations?.idempotentHint).toBe(true);
		expect(tool.config.inputSchema?.technique).toBeDefined();
	});

	test('returns the full technique catalog when technique="list"', async () => {
		const tool = createTool();
		const result = await tool.handler({ technique: 'list' }, {} as never);

		expect(result.structuredContent?.technique).toBe('list');
		const available = result.structuredContent?.availableTechniques as Array<{
			technique: string;
			description: string;
			hasDocumentation: boolean;
		}>;

		expect(available).toBeDefined();
		expect(available).toHaveLength(Object.keys(TechniqueDescription).length);

		const chatbotEntry = available.find((t) => t.technique === WorkflowTechnique.CHATBOT);
		expect(chatbotEntry?.hasDocumentation).toBe(true);

		const monitoringEntry = available.find((t) => t.technique === WorkflowTechnique.MONITORING);
		expect(monitoringEntry?.hasDocumentation).toBe(false);

		expect(telemetry.track).toHaveBeenCalledWith(
			USER_CALLED_MCP_TOOL_EVENT,
			expect.objectContaining({
				user_id: 'user-1',
				tool_name: 'get_workflow_best_practices',
				parameters: { technique: 'list' },
				results: expect.objectContaining({ success: true }),
			}),
		);
	});

	test('returns documentation for a technique that has a guide', async () => {
		const tool = createTool();
		const result = await tool.handler({ technique: WorkflowTechnique.CHATBOT }, {} as never);

		const expectedDoc = bestPracticesRegistry[WorkflowTechnique.CHATBOT]!.getDocumentation();

		expect(result.structuredContent?.technique).toBe(WorkflowTechnique.CHATBOT);
		expect(result.structuredContent?.documentation).toBe(expectedDoc);
		expect(result.content).toEqual([{ type: 'text', text: expectedDoc }]);
		expect(telemetry.track).toHaveBeenCalledWith(
			USER_CALLED_MCP_TOOL_EVENT,
			expect.objectContaining({
				results: expect.objectContaining({
					success: true,
					data: { technique: WorkflowTechnique.CHATBOT, hasDocumentation: true },
				}),
			}),
		);
	});

	test('returns a friendly message for a known technique without documentation', async () => {
		const tool = createTool();
		const result = await tool.handler({ technique: WorkflowTechnique.MONITORING }, {} as never);

		expect(result.structuredContent?.technique).toBe(WorkflowTechnique.MONITORING);
		expect(result.structuredContent?.documentation).toBeUndefined();
		expect(result.structuredContent?.message).toContain('does not have detailed best-practices');
	});
});
