import type { WorkflowJSON } from '@n8n/workflow-sdk';

export function agentToolNode(
	name: string,
	type: string,
	overrides: Partial<WorkflowJSON['nodes'][number]> = {},
): WorkflowJSON['nodes'][number] {
	return { id: name, name, type, typeVersion: 1, parameters: {}, position: [0, 0], ...overrides };
}

export function mcpToolWorkflow(): WorkflowJSON {
	return {
		name: 'MCP tools',
		settings: { executionOrder: 'v1' },
		nodes: [
			agentToolNode('MCP Server', '@n8n/n8n-nodes-langchain.mcpTrigger'),
			agentToolNode('Write', 'n8n-nodes-base.slackTool', { parameters: { operation: 'send' } }),
		],
		connections: {
			Write: { ai_tool: [[{ node: 'MCP Server', type: 'ai_tool', index: 0 }]] },
		},
	};
}

export function agentToolWorkflow(agentVersion = 3.1, nestedVersion?: number): WorkflowJSON {
	const caller = nestedVersion === undefined ? 'Agent' : 'Nested';
	return {
		name: 'Agent tools',
		settings: { executionOrder: 'v1' },
		nodes: [
			agentToolNode('Trigger', 'n8n-nodes-base.manualTrigger'),
			agentToolNode('Agent', '@n8n/n8n-nodes-langchain.agent', { typeVersion: agentVersion }),
			agentToolNode('Write', 'n8n-nodes-base.slackTool', { parameters: { operation: 'send' } }),
			agentToolNode('Model', '@n8n/n8n-nodes-langchain.lmChatOpenAi', {
				credentials: { openAiApi: { id: 'model-credential', name: 'Model account' } },
			}),
			...(nestedVersion === undefined
				? []
				: [
						agentToolNode('Nested', '@n8n/n8n-nodes-langchain.agentTool', {
							typeVersion: nestedVersion,
						}),
					]),
		],
		connections: {
			Trigger: { main: [[{ node: 'Agent', type: 'main', index: 0 }]] },
			Write: { ai_tool: [[{ node: caller, type: 'ai_tool', index: 0 }]] },
			Model: {
				ai_languageModel: [
					[
						{ node: 'Agent', type: 'ai_languageModel', index: 0 },
						...(nestedVersion === undefined
							? []
							: [{ node: 'Nested', type: 'ai_languageModel', index: 0 }]),
					],
				],
			},
			...(nestedVersion === undefined
				? {}
				: {
						Nested: { ai_tool: [[{ node: 'Agent', type: 'ai_tool', index: 0 }]] },
					}),
		},
	};
}
