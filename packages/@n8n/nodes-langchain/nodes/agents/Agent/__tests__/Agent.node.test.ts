import { mock } from 'jest-mock-extended';
import type { INode } from 'n8n-workflow';
import { Workflow, getConnectionTypes, getNodeInputs } from 'n8n-workflow';
import { Agent } from '../Agent.node';

describe('Agent node', () => {
	const nodeType = new Agent();

	describe('inputs', () => {
		test.each([
			[
				'conversationalAgent',
				['main', 'ai_languageModel', 'ai_memory', 'ai_tool', 'ai_outputParser'],
			],
			['toolsAgent', ['main', 'ai_languageModel', 'ai_memory', 'ai_tool', 'ai_outputParser']],
			[
				'openAiFunctionsAgent',
				['main', 'ai_languageModel', 'ai_memory', 'ai_tool', 'ai_outputParser'],
			],
			['reActAgent', ['main', 'ai_languageModel', 'ai_tool', 'ai_outputParser']],
			['sqlAgent', ['main', 'ai_languageModel', 'ai_memory']],
			['planAndExecuteAgent', ['main', 'ai_languageModel', 'ai_tool', 'ai_outputParser']],
		])('should return valid inputs for %s', (agentType, expectedInputs) => {
			const node = mock<INode>({
				parameters: {
					agent: agentType,
					hasOutputParser: undefined,
				},
			});
			const workflow = new Workflow({
				nodes: [node],
				connections: {},
				active: false,
				nodeTypes: mock(),
			});
			const inputs = getConnectionTypes(getNodeInputs(workflow, node, nodeType.description));
			expect(inputs).toEqual(expectedInputs);
		});

		it('should return valid inputs for agent without output parser', () => {
			const node = mock<INode>({
				parameters: {
					agent: 'planAndExecuteAgent',
					hasOutputParser: false,
				},
			});
			const workflow = new Workflow({
				nodes: [node],
				connections: {},
				active: false,
				nodeTypes: mock(),
			});
			const inputs = getConnectionTypes(getNodeInputs(workflow, node, nodeType.description));
			expect(inputs).toEqual(['main', 'ai_languageModel', 'ai_tool']);
		});
	});
});
