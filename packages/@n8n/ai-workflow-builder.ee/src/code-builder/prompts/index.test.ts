import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { buildCodeBuilderPrompt } from '../../code-builder/prompts/index';
import type { PlanOutput } from '../../types/planning';

describe('buildCodeBuilderPrompt', () => {
	describe('extended thinking compatibility', () => {
		it('does not contain <thinking> tag instructions in system prompt', async () => {
			const prompt = buildCodeBuilderPrompt();
			const messages = await prompt.formatMessages({ userMessage: 'test' });
			const systemMessage = messages.find((m) => m._getType() === 'system');

			// With native extended thinking enabled, the prompt should NOT reference
			// <thinking> XML tags which cause the model to emit reasoning in output tokens
			const content = Array.isArray(systemMessage?.content)
				? systemMessage.content.map((b) => ('text' in b ? b.text : '')).join('')
				: String(systemMessage?.content ?? '');

			expect(content).not.toMatch(/<thinking>/);
			expect(content).not.toMatch(/`<thinking>`/);
			expect(content).not.toMatch(/Inside.*thinking.*tags/i);
		});
	});

	describe('preGeneratedCode option', () => {
		it('uses preGeneratedCode when provided instead of generating', async () => {
			const workflow: WorkflowJSON = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			};

			const customCode = `// Custom pre-generated code
const start = trigger({ type: 'n8n-nodes-base.manualTrigger' });
export default workflow('', 'Test').add(start);`;

			const prompt = buildCodeBuilderPrompt(workflow, undefined, {
				preGeneratedCode: customCode,
			});

			const messages = await prompt.formatMessages({ userMessage: 'test' });
			const humanMessage = messages.find((m) => m._getType() === 'human');
			const content = humanMessage?.content as string;

			// Should contain the custom code, not auto-generated
			expect(content).toContain('// Custom pre-generated code');
		});

		it('does not contain approved_plan section when no planOutput provided', async () => {
			const prompt = buildCodeBuilderPrompt(undefined, undefined, {});
			const messages = await prompt.formatMessages({ userMessage: 'test' });
			const humanMessage = messages.find((m) => m._getType() === 'human');
			const content = humanMessage?.content as string;

			expect(content).not.toContain('<approved_plan>');
		});

		it('falls back to generateWorkflowCode when preGeneratedCode not provided', async () => {
			const workflow: WorkflowJSON = {
				name: 'Fallback Test',
				nodes: [
					{
						id: '1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			};

			const prompt = buildCodeBuilderPrompt(workflow, undefined, {});

			const messages = await prompt.formatMessages({ userMessage: 'test' });
			const humanMessage = messages.find((m) => m._getType() === 'human');
			const content = humanMessage?.content as string;

			// Should contain auto-generated code with workflow name
			expect(content).toContain("workflow('', 'Fallback Test')");
		});
	});

	describe('workflow file section', () => {
		it('includes "No file exists yet" message when no workflow is provided', async () => {
			const prompt = buildCodeBuilderPrompt();
			const messages = await prompt.formatMessages({ userMessage: 'test' });
			const humanMessage = messages.find((m) => m._getType() === 'human');
			const content = humanMessage?.content as string;

			expect(content).toContain('<workflow_file path="/workflow.js">');
			expect(content).toContain('No file exists yet');
			expect(content).toContain('create');
			expect(content).toContain('</workflow_file>');
		});

		it('does not include "No file exists yet" when workflow is provided', async () => {
			const workflow: WorkflowJSON = {
				name: 'Test',
				nodes: [
					{
						id: '1',
						name: 'Start',
						type: 'n8n-nodes-base.manualTrigger',
						typeVersion: 1,
						position: [0, 0],
						parameters: {},
					},
				],
				connections: {},
			};

			const prompt = buildCodeBuilderPrompt(workflow);
			const messages = await prompt.formatMessages({ userMessage: 'test' });
			const humanMessage = messages.find((m) => m._getType() === 'human');
			const content = humanMessage?.content as string;

			expect(content).toContain('<workflow_file path="/workflow.js">');
			expect(content).not.toContain('No file exists yet');
		});
	});

	describe('planOutput option', () => {
		const mockPlan: PlanOutput = {
			summary: 'Fetch weather and send Slack alert',
			trigger: 'Runs every morning at 7 AM',
			steps: [
				{ description: 'Fetch weather forecast', suggestedNodes: ['n8n-nodes-base.httpRequest'] },
				{ description: 'Check if rain is predicted' },
				{ description: 'Send Slack notification', suggestedNodes: ['n8n-nodes-base.slack'] },
			],
			additionalSpecs: ['Use metric units for temperature'],
		};

		it('includes approved_plan section in user message when planOutput is provided', async () => {
			const prompt = buildCodeBuilderPrompt(undefined, undefined, {
				planOutput: mockPlan,
			});

			const messages = await prompt.formatMessages({ userMessage: 'Build weather workflow' });
			const humanMessage = messages.find((m) => m._getType() === 'human');
			const content = humanMessage?.content as string;

			expect(content).toContain('<approved_plan>');
			expect(content).toContain('</approved_plan>');
			expect(content).toContain('Fetch weather and send Slack alert');
			expect(content).toContain('Runs every morning at 7 AM');
			expect(content).toContain('Fetch weather forecast');
			expect(content).toContain('n8n-nodes-base.httpRequest');
			expect(content).toContain('Use metric units for temperature');
		});

		it('replaces step 1 with plan-specific version when planOutput is provided', async () => {
			const prompt = buildCodeBuilderPrompt(undefined, undefined, {
				planOutput: mockPlan,
			});

			const messages = await prompt.formatMessages({ userMessage: 'Build weather workflow' });
			const systemMessage = messages.find((m) => m._getType() === 'system');
			const content = Array.isArray(systemMessage?.content)
				? systemMessage.content.map((b) => ('text' in b ? b.text : '')).join('')
				: String(systemMessage?.content ?? '');

			// Should NOT contain the default step 1 (requirements analysis)
			expect(content).not.toContain('<step_1_analyze_user_request>');
			// Should contain a plan-specific step 1
			expect(content).toContain('<step_1_read_approved_plan>');
			expect(content).toContain('</step_1_read_approved_plan>');
		});

		it('renumbers step 2 sub-steps in plan mode: search=2a, review=2b', async () => {
			const prompt = buildCodeBuilderPrompt(undefined, undefined, {
				planOutput: mockPlan,
			});

			const messages = await prompt.formatMessages({ userMessage: 'Build weather workflow' });
			const systemMessage = messages.find((m) => m._getType() === 'system');
			const content = Array.isArray(systemMessage?.content)
				? systemMessage.content.map((b) => ('text' in b ? b.text : '')).join('')
				: String(systemMessage?.content ?? '');

			// Should NOT contain get_suggested_nodes (default-only step)
			expect(content).not.toContain('<step_2a_get_suggested_nodes>');
			expect(content).not.toContain('get_suggested_nodes');
			// Search is 2a in plan mode (not 2b)
			expect(content).toContain('<step_2a_search_for_nodes>');
			expect(content).toContain('search_nodes');
			// Review is 2b in plan mode (not 2c)
			expect(content).toContain('<step_2b_review_search_results>');
		});

		it('includes node_search_results in user message when preSearchResults is provided', async () => {
			const prompt = buildCodeBuilderPrompt(undefined, undefined, {
				planOutput: mockPlan,
				preSearchResults: 'httpRequest: version 4.3, slack: version 2.3',
			});

			const messages = await prompt.formatMessages({ userMessage: 'Build weather workflow' });
			const humanMessage = messages.find((m) => m._getType() === 'human');
			const content = humanMessage?.content as string;

			expect(content).toContain('<node_search_results>');
			expect(content).toContain('httpRequest: version 4.3');
			expect(content).toContain('</node_search_results>');
		});

		it('does NOT include node_search_results when preSearchResults is absent', async () => {
			const prompt = buildCodeBuilderPrompt(undefined, undefined, {
				planOutput: mockPlan,
			});

			const messages = await prompt.formatMessages({ userMessage: 'Build weather workflow' });
			const humanMessage = messages.find((m) => m._getType() === 'human');
			const content = humanMessage?.content as string;

			expect(content).not.toContain('<node_search_results>');
		});

		it('uses prefetched Step 2b variant in system prompt when preSearchResults is provided', async () => {
			const prompt = buildCodeBuilderPrompt(undefined, undefined, {
				planOutput: mockPlan,
				preSearchResults: 'some search results',
			});

			const messages = await prompt.formatMessages({ userMessage: 'Build weather workflow' });
			const systemMessage = messages.find((m) => m._getType() === 'system');
			const content = Array.isArray(systemMessage?.content)
				? systemMessage.content.map((b) => ('text' in b ? b.text : '')).join('')
				: String(systemMessage?.content ?? '');

			expect(content).toContain('pre-fetched in <node_search_results>');
			// Should NOT contain the plan search variant's specific instruction about suggestedNodes discriminators
			expect(content).not.toContain('suggestedNodes to get discriminators');
		});

		it('uses plan Step 2b variant when planOutput but no preSearchResults', async () => {
			const prompt = buildCodeBuilderPrompt(undefined, undefined, {
				planOutput: mockPlan,
			});

			const messages = await prompt.formatMessages({ userMessage: 'Build weather workflow' });
			const systemMessage = messages.find((m) => m._getType() === 'system');
			const content = Array.isArray(systemMessage?.content)
				? systemMessage.content.map((b) => ('text' in b ? b.text : '')).join('')
				: String(systemMessage?.content ?? '');

			// Should contain the plan search variant
			expect(content).toContain('suggestedNodes to get discriminators');
			// Should NOT contain the prefetched variant
			expect(content).not.toContain('pre-fetched in <node_search_results>');
		});

		it('includes default steps 1 and 2a when planOutput is not provided', async () => {
			const prompt = buildCodeBuilderPrompt();

			const messages = await prompt.formatMessages({ userMessage: 'test' });
			const humanMessage = messages.find((m) => m._getType() === 'human');
			const humanContent = humanMessage?.content as string;

			const systemMessage = messages.find((m) => m._getType() === 'system');
			const systemContent = Array.isArray(systemMessage?.content)
				? systemMessage.content.map((b) => ('text' in b ? b.text : '')).join('')
				: String(systemMessage?.content ?? '');

			expect(humanContent).not.toContain('<approved_plan>');
			// Should contain the default steps
			expect(systemContent).toContain('<step_1_analyze_user_request>');
			expect(systemContent).toContain('<step_2a_get_suggested_nodes>');
			// Should NOT contain plan-specific step
			expect(systemContent).not.toContain('<step_1_read_approved_plan>');
		});
	});
});
