import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { AgentV1 } from './V1/AgentV1.node';
import { AgentV2 } from './V2/AgentV2.node';
import { AgentV3 } from './V3/AgentV3.node';

export class Agent extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'AI Agent',
			name: 'agent',
			icon: 'node:ai-agent',
			iconColor: 'black',
			group: ['transform'],
			description: 'Generates an action plan and executes it. Can use external tools.',
			codex: {
				alias: ['LangChain', 'Chat', 'Conversational', 'Plan and Execute', 'ReAct', 'Tools'],
				categories: ['AI'],
				subcategories: {
					AI: ['Agents', 'Root Nodes'],
				},
				resources: {
					primaryDocumentation: [
						{
							url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/',
						},
					],
				},
			},
			defaultVersion: 3.1,
			builderHint: {
				searchHint:
					"Wire model/memory/tools/outputParser via the SDK `subnodes` config object using factory functions (`languageModel()`, `memory()`, `tool()`, `outputParser()`). Inside subnodes, reference upstream data with `nodeJson(triggerNode, 'path')`, not `$json` — subnodes do not share the main predecessor's item context.",
				relatedNodes: [
					{
						nodeType: 'n8n-nodes-base.aggregate',
						relationHint: 'Use to combine multiple items together before the agent',
					},
					{
						nodeType: '@n8n/n8n-nodes-langchain.outputParserStructured',
						relationHint:
							'Attach for structured output; reference fields as $json.output.fieldName for use in subsequent nodes (conditions, storing data)',
					},
					{
						nodeType: '@n8n/n8n-nodes-langchain.agentTool',
						relationHint: 'For multi-agent systems using orchestrator pattern',
					},
					{
						nodeType: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
						relationHint:
							'Required for conversational workflows - connect memory to every agent that needs to recall previous messages in the conversation',
					},
				],
				extraTypeDefContent: [
					{
						content: `<patterns>
<pattern title="Agent with model, memory, structured output parser">
const chatTrigger = trigger({
  type: '@n8n/n8n-nodes-langchain.chatTrigger',
  version: 1.3,
  config: {
    name: 'Chat Trigger',
    parameters: { public: false },
    output: [{ sessionId: 'chat-session-id', chatInput: 'Hello' }]
  }
});

const model = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1.3,
  config: {
    name: 'OpenAI Chat Model',
    parameters: { model: { __rl: true, mode: 'list', value: 'gpt-5.4' } },
    credentials: { openAiApi: { id: 'credId', name: 'OpenAI account' } }
  }
});

const parser = outputParser({
  type: '@n8n/n8n-nodes-langchain.outputParserStructured',
  version: 1.3,
  config: {
    name: 'Output Parser',
    parameters: {
      schemaType: 'fromJson',
      jsonSchemaExample: '{ "score": 75, "tier": "hot" }'
    }
  }
});

const memoryNode = memory({
  type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
  version: 1.3,
  config: {
    name: 'Conversation Memory',
    parameters: {
      sessionIdType: 'customKey',
      sessionKey: nodeJson(chatTrigger, 'sessionId'),
      contextWindowLength: 10
    }
  }
});

const agent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'AI Agent',
    parameters: {
      promptType: 'define',
      text: expr('{{ $json.prompt }}'),
      hasOutputParser: true,
      options: { systemMessage: 'You are an expert...' }
    },
    subnodes: { model, memory: memoryNode, outputParser: parser }
  }
});
</pattern>
</patterns>`,
					},
				],
			},
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new AgentV1(baseDescription),
			1.1: new AgentV1(baseDescription),
			1.2: new AgentV1(baseDescription),
			1.3: new AgentV1(baseDescription),
			1.4: new AgentV1(baseDescription),
			1.5: new AgentV1(baseDescription),
			1.6: new AgentV1(baseDescription),
			1.7: new AgentV1(baseDescription),
			1.8: new AgentV1(baseDescription),
			1.9: new AgentV1(baseDescription),
			2: new AgentV2(baseDescription),
			2.1: new AgentV2(baseDescription),
			2.2: new AgentV2(baseDescription),
			2.3: new AgentV2(baseDescription),
			3: new AgentV3(baseDescription),
			3.1: new AgentV3(baseDescription),
			// IMPORTANT Reminder to update AgentTool
		};

		super(nodeVersions, baseDescription);
	}
}
