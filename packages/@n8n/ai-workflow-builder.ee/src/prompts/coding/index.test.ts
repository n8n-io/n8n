import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { buildCodingAgentPrompt } from './index';

describe('Coding Agent Prompt', () => {
	const samplePlan = `## Overview
This workflow sends a notification.

## Nodes
- **Start** (nodeType: \`n8n-nodes-base.manualTrigger\`)
  - Purpose: Manual trigger for testing
- **Send Email** (nodeType: \`n8n-nodes-base.gmail\`)
  - Purpose: Send notification email

## Flow
Start → Send Email

## Key Points
- Use placeholder for email address`;

	describe('buildCodingAgentPrompt', () => {
		it('should return a ChatPromptTemplate with invoke method', () => {
			const result = buildCodingAgentPrompt(samplePlan);

			expect(result).toHaveProperty('invoke');
			expect(typeof result.invoke).toBe('function');
		});

		it('should format messages without input variables', async () => {
			const prompt = buildCodingAgentPrompt(samplePlan);

			// Coding agent prompt has no input variables
			const messages = await prompt.formatMessages({});

			expect(messages.length).toBe(2);
			expect(messages[0].constructor.name).toBe('SystemMessage');
			expect(messages[1].constructor.name).toBe('HumanMessage');
		});

		it('should include role in system message', async () => {
			const prompt = buildCodingAgentPrompt(samplePlan);

			const messages = await prompt.formatMessages({});

			const systemContent = messages[0].content as string;
			expect(systemContent).toContain('<role>');
			expect(systemContent).toContain('code generator');
		});

		it('should include SDK API reference section', async () => {
			const prompt = buildCodingAgentPrompt(samplePlan);

			const messages = await prompt.formatMessages({});

			const systemContent = messages[0].content as string;
			expect(systemContent).toContain('<sdk_api_reference>');
		});

		it('should include workflow rules section', async () => {
			const prompt = buildCodingAgentPrompt(samplePlan);

			const messages = await prompt.formatMessages({});

			const systemContent = messages[0].content as string;
			expect(systemContent).toContain('<workflow_rules>');
			expect(systemContent).toContain('Always start with a trigger node');
			expect(systemContent).toContain('No orphaned nodes');
		});

		it('should include code patterns section', async () => {
			const prompt = buildCodingAgentPrompt(samplePlan);

			const messages = await prompt.formatMessages({});

			const systemContent = messages[0].content as string;
			expect(systemContent).toContain('<code_patterns>');
			expect(systemContent).toContain('Linear Chain');
			expect(systemContent).toContain('Conditional Branching');
			expect(systemContent).toContain('AI Agent');
		});

		it('should include mandatory workflow instructions', async () => {
			const prompt = buildCodingAgentPrompt(samplePlan);

			const messages = await prompt.formatMessages({});

			const systemContent = messages[0].content as string;
			expect(systemContent).toContain('<mandatory_workflow>');
			expect(systemContent).toContain('get_node_details');
		});

		it('should include output format section', async () => {
			const prompt = buildCodingAgentPrompt(samplePlan);

			const messages = await prompt.formatMessages({});

			const systemContent = messages[0].content as string;
			expect(systemContent).toContain('<output_format>');
			expect(systemContent).toContain('```typescript');
		});

		it('should include plan in human message', async () => {
			const prompt = buildCodingAgentPrompt(samplePlan);

			const messages = await prompt.formatMessages({});

			const humanContent = messages[1].content as string;
			expect(humanContent).toContain('<workflow_plan>');
			expect(humanContent).toContain('</workflow_plan>');
			expect(humanContent).toContain('sends a notification');
			expect(humanContent).toContain('Send Email');
		});

		it('should include instruction to call get_node_details in human message', async () => {
			const prompt = buildCodingAgentPrompt(samplePlan);

			const messages = await prompt.formatMessages({});

			const humanContent = messages[1].content as string;
			expect(humanContent).toContain('get_node_details');
		});
	});

	describe('buildCodingAgentPrompt with current workflow', () => {
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
			const prompt = buildCodingAgentPrompt(samplePlan, mockCurrentWorkflow);

			const messages = await prompt.formatMessages({});

			const humanContent = messages[1].content as string;
			expect(humanContent).toContain('<current_workflow>');
			expect(humanContent).toContain('</current_workflow>');
			expect(humanContent).toContain('<workflow_plan>');
		});

		it('should not include workflow section when workflow has no nodes', async () => {
			const emptyWorkflow: WorkflowJSON = {
				id: 'empty',
				name: 'Empty Workflow',
				nodes: [],
				connections: {},
			};

			const prompt = buildCodingAgentPrompt(samplePlan, emptyWorkflow);

			const messages = await prompt.formatMessages({});

			const humanContent = messages[1].content as string;
			expect(humanContent).not.toContain('<current_workflow>');
			expect(humanContent).toContain('<workflow_plan>');
		});

		it('should not include workflow section when workflow is undefined', async () => {
			const prompt = buildCodingAgentPrompt(samplePlan, undefined);

			const messages = await prompt.formatMessages({});

			const humanContent = messages[1].content as string;
			expect(humanContent).not.toContain('<current_workflow>');
			expect(humanContent).toContain('<workflow_plan>');
		});
	});

	describe('plan with special characters', () => {
		it('should handle plan with curly braces', async () => {
			const planWithBraces = `## Overview
Use JSON data like { "key": "value" }

## Nodes
- **Process** (nodeType: \`n8n-nodes-base.set\`)

## Flow
Start → Process`;

			const prompt = buildCodingAgentPrompt(planWithBraces);

			// Should not throw due to unescaped curly braces
			const messages = await prompt.formatMessages({});
			expect(messages.length).toBe(2);
		});
	});
});
