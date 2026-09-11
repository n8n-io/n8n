import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import { assertToolsAgentMode, getInputs } from '../utils';

describe('assertToolsAgentMode', () => {
	const createContext = (parameters: INode['parameters'], typeVersion = 1.6) =>
		({
			getNode: () => ({
				id: 'test-node',
				name: 'AI Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion,
				position: [0, 0],
				parameters,
			}),
		}) as unknown as IExecuteFunctions;

	it('should not throw when the agent parameter is unset from version 1.6 onwards', () => {
		expect(() => assertToolsAgentMode(createContext({}))).not.toThrow();
	});

	it('should throw when the agent parameter is unset up to version 1.5', () => {
		expect(() => assertToolsAgentMode(createContext({}, 1.5))).toThrow(
			'The "Conversational Agent" mode is no longer available',
		);
	});

	it('should not throw for the tools agent', () => {
		expect(() => assertToolsAgentMode(createContext({ agent: 'toolsAgent' }))).not.toThrow();
	});

	it('should not throw for versions 2 and above', () => {
		expect(() => assertToolsAgentMode(createContext({}, 2.2))).not.toThrow();
	});

	it.each([
		['conversationalAgent', 'Conversational Agent'],
		['openAiFunctionsAgent', 'OpenAI Functions Agent'],
		['planAndExecuteAgent', 'Plan and Execute Agent'],
		['reActAgent', 'ReAct Agent'],
		['sqlAgent', 'SQL Agent'],
	])('should throw for the %s mode', (agent, displayName) => {
		const context = createContext({ agent });

		expect(() => assertToolsAgentMode(context)).toThrow(NodeOperationError);
		expect(() => assertToolsAgentMode(context)).toThrow(
			`The "${displayName}" mode is no longer available`,
		);
	});
});

describe('getInputs', () => {
	it('should include all inputs when no flags are set to false', () => {
		const inputs = getInputs(true, true, true);
		expect(inputs).toEqual([
			'main',
			{
				type: 'ai_languageModel',
				displayName: 'Chat Model',
				required: true,
				maxConnections: 1,
				filter: {
					excludedNodes: [
						'@n8n/n8n-nodes-langchain.lmCohere',
						'@n8n/n8n-nodes-langchain.lmOllama',
						'@n8n/n8n-nodes-langchain.lmOpenHuggingFaceInference',
					],
				},
			},
			{
				type: 'ai_languageModel',
				displayName: 'Fallback Model',
				required: true,
				maxConnections: 1,
				filter: {
					excludedNodes: [
						'@n8n/n8n-nodes-langchain.lmCohere',
						'@n8n/n8n-nodes-langchain.lmOllama',
						'@n8n/n8n-nodes-langchain.lmOpenHuggingFaceInference',
					],
				},
			},
			{
				type: 'ai_memory',
				displayName: 'Memory',
				maxConnections: 1,
			},
			{
				type: 'ai_tool',
				displayName: 'Tool',
			},
			{
				type: 'ai_outputParser',
				displayName: 'Output Parser',
				maxConnections: 1,
			},
		]);
	});

	it('should exclude Output Parser when hasOutputParser is false', () => {
		const inputs = getInputs(true, false, true);
		expect(inputs).toEqual([
			'main',
			{
				type: 'ai_languageModel',
				displayName: 'Chat Model',
				required: true,
				maxConnections: 1,
				filter: {
					excludedNodes: [
						'@n8n/n8n-nodes-langchain.lmCohere',
						'@n8n/n8n-nodes-langchain.lmOllama',
						'@n8n/n8n-nodes-langchain.lmOpenHuggingFaceInference',
					],
				},
			},
			{
				type: 'ai_languageModel',
				displayName: 'Fallback Model',
				required: true,
				maxConnections: 1,
				filter: {
					excludedNodes: [
						'@n8n/n8n-nodes-langchain.lmCohere',
						'@n8n/n8n-nodes-langchain.lmOllama',
						'@n8n/n8n-nodes-langchain.lmOpenHuggingFaceInference',
					],
				},
			},
			{
				type: 'ai_memory',
				displayName: 'Memory',
				maxConnections: 1,
			},
			{
				type: 'ai_tool',
				displayName: 'Tool',
			},
		]);
	});

	it('should exclude Fallback Model when needsFallback is false', () => {
		const inputs = getInputs(true, true, false);
		expect(inputs).toEqual([
			'main',
			{
				type: 'ai_languageModel',
				displayName: 'Chat Model',
				required: true,
				maxConnections: 1,
				filter: {
					excludedNodes: [
						'@n8n/n8n-nodes-langchain.lmCohere',
						'@n8n/n8n-nodes-langchain.lmOllama',
						'@n8n/n8n-nodes-langchain.lmOpenHuggingFaceInference',
					],
				},
			},
			{
				type: 'ai_memory',
				displayName: 'Memory',
				maxConnections: 1,
			},
			{
				type: 'ai_tool',
				displayName: 'Tool',
			},
			{
				type: 'ai_outputParser',
				displayName: 'Output Parser',
				maxConnections: 1,
			},
		]);
	});

	it('should include main input when hasMainInput is true', () => {
		const inputs = getInputs(true, true, true);
		expect(inputs[0]).toBe('main');
	});

	it('should exclude main input when hasMainInput is false', () => {
		const inputs = getInputs(false, true, true);
		expect(inputs).not.toContain('main');
	});

	it('should handle all flags set to false', () => {
		const inputs = getInputs(false, false, false);
		expect(inputs).toEqual([
			{
				type: 'ai_languageModel',
				displayName: 'Chat Model',
				required: true,
				maxConnections: 1,
				filter: {
					excludedNodes: [
						'@n8n/n8n-nodes-langchain.lmCohere',
						'@n8n/n8n-nodes-langchain.lmOllama',
						'@n8n/n8n-nodes-langchain.lmOpenHuggingFaceInference',
					],
				},
			},
			{
				type: 'ai_memory',
				displayName: 'Memory',
				maxConnections: 1,
			},
			{
				type: 'ai_tool',
				displayName: 'Tool',
			},
		]);
	});
});
