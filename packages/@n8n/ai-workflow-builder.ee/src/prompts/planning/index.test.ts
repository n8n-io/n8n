import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { buildPlanningAgentPrompt, WorkflowTechnique, TechniqueDescription } from './index';

describe('Planning Agent Prompt', () => {
	describe('buildPlanningAgentPrompt', () => {
		it('should return a ChatPromptTemplate with invoke method', () => {
			const result = buildPlanningAgentPrompt();

			expect(result).toHaveProperty('invoke');
			expect(typeof result.invoke).toBe('function');
		});

		it('should format messages with userMessage variable', async () => {
			const prompt = buildPlanningAgentPrompt();

			const messages = await prompt.formatMessages({
				userMessage: 'Create a chatbot workflow',
			});

			expect(messages.length).toBe(2);
			expect(messages[0].constructor.name).toBe('SystemMessage');
			expect(messages[1].constructor.name).toBe('HumanMessage');
		});

		it('should include role in system message', async () => {
			const prompt = buildPlanningAgentPrompt();

			const messages = await prompt.formatMessages({
				userMessage: 'test',
			});

			const systemContent = messages[0].content as string;
			expect(systemContent).toContain('<role>');
			expect(systemContent).toContain('workflow architect');
		});

		it('should include workflow techniques section', async () => {
			const prompt = buildPlanningAgentPrompt();

			const messages = await prompt.formatMessages({
				userMessage: 'test',
			});

			const systemContent = messages[0].content as string;
			expect(systemContent).toContain('<workflow_techniques>');
			expect(systemContent).toContain('chatbot');
			expect(systemContent).toContain('data_extraction');
		});

		it('should include planning process instructions', async () => {
			const prompt = buildPlanningAgentPrompt();

			const messages = await prompt.formatMessages({
				userMessage: 'test',
			});

			const systemContent = messages[0].content as string;
			expect(systemContent).toContain('<planning_process>');
			expect(systemContent).toContain('Understand Requirements');
			expect(systemContent).toContain('search_nodes');
			expect(systemContent).toContain('get_best_practices');
		});

		it('should instruct to use <planning> tags for interleaved thinking', async () => {
			const prompt = buildPlanningAgentPrompt();

			const messages = await prompt.formatMessages({
				userMessage: 'test',
			});

			const systemContent = messages[0].content as string;
			expect(systemContent).toContain('You MUST use <planning> tags for your thinking');
			expect(systemContent).toContain('Interleave planning with tool calls');
			expect(systemContent).toContain('Start your <planning> section by analyzing');
			expect(systemContent).toContain('Continue your <planning>');
		});

		it('should include plan format section', async () => {
			const prompt = buildPlanningAgentPrompt();

			const messages = await prompt.formatMessages({
				userMessage: 'test',
			});

			const systemContent = messages[0].content as string;
			expect(systemContent).toContain('<plan_format>');
			expect(systemContent).toContain('## Overview');
			expect(systemContent).toContain('## Nodes');
			expect(systemContent).toContain('## Flow');
			expect(systemContent).toContain('## Key Points');
		});

		it('should include output format with JSON structure', async () => {
			const prompt = buildPlanningAgentPrompt();

			const messages = await prompt.formatMessages({
				userMessage: 'test',
			});

			const systemContent = messages[0].content as string;
			expect(systemContent).toContain('<output_format>');
			expect(systemContent).toContain('"type": "plan"');
			expect(systemContent).toContain('"type": "answer"');
		});

		it('should include user message in human message', async () => {
			const prompt = buildPlanningAgentPrompt();

			const messages = await prompt.formatMessages({
				userMessage: 'Build a Slack notification workflow',
			});

			const humanContent = messages[1].content as string;
			expect(humanContent).toContain('Build a Slack notification workflow');
		});
	});

	describe('buildPlanningAgentPrompt with current workflow', () => {
		const mockCurrentWorkflow: WorkflowJSON = {
			id: 'test-workflow',
			name: 'Test Workflow',
			nodes: [
				{
					id: 'trigger-1',
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1.1,
					position: [240, 300],
					parameters: {},
				},
			],
			connections: {},
		};

		it('should include current workflow in user message when provided', async () => {
			const prompt = buildPlanningAgentPrompt(mockCurrentWorkflow);

			const messages = await prompt.formatMessages({
				userMessage: 'Add a Slack node',
			});

			const humanContent = messages[1].content as string;
			expect(humanContent).toContain('<current_workflow>');
			expect(humanContent).toContain('</current_workflow>');
			expect(humanContent).toContain('Add a Slack node');
		});

		it('should not include workflow section when workflow has no nodes', async () => {
			const emptyWorkflow: WorkflowJSON = {
				id: 'empty',
				name: 'Empty Workflow',
				nodes: [],
				connections: {},
			};

			const prompt = buildPlanningAgentPrompt(emptyWorkflow);

			const messages = await prompt.formatMessages({
				userMessage: 'Create a workflow',
			});

			const humanContent = messages[1].content as string;
			expect(humanContent).not.toContain('<current_workflow>');
		});

		it('should not include workflow section when workflow is undefined', async () => {
			const prompt = buildPlanningAgentPrompt(undefined);

			const messages = await prompt.formatMessages({
				userMessage: 'Create a workflow',
			});

			const humanContent = messages[1].content as string;
			expect(humanContent).not.toContain('<current_workflow>');
		});
	});

	describe('WorkflowTechnique export', () => {
		it('should export WorkflowTechnique constant', () => {
			expect(WorkflowTechnique).toBeDefined();
			expect(WorkflowTechnique.CHATBOT).toBe('chatbot');
			expect(WorkflowTechnique.DATA_EXTRACTION).toBe('data_extraction');
			expect(WorkflowTechnique.NOTIFICATION).toBe('notification');
		});
	});

	describe('TechniqueDescription export', () => {
		it('should export TechniqueDescription constant', () => {
			expect(TechniqueDescription).toBeDefined();
			expect(TechniqueDescription[WorkflowTechnique.CHATBOT]).toContain('chat');
			expect(TechniqueDescription[WorkflowTechnique.DATA_EXTRACTION]).toContain('Pulling');
		});
	});
});
