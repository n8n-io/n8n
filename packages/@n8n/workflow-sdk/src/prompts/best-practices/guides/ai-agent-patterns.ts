import type { BestPracticesDocument } from '../types';
import { WorkflowTechnique } from '../types';

export class AiAgentPatternsBestPractices implements BestPracticesDocument {
	readonly technique = WorkflowTechnique.AI_AGENT_PATTERNS;
	readonly version = '1.0.0';

	private readonly documentation = `# Best Practices: AI Agent Workflow Patterns

## Basic Agent (model only)

\`\`\`javascript
const model = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.3,
  config: { name: 'OpenAI Model', parameters: {}, credentials: { openAiApi: newCredential('OpenAI') } }
});

const agent = node({
  type: '@n8n/n8n-nodes-langchain.agent', version: 3.1,
  config: {
    name: 'AI Assistant',
    parameters: { promptType: 'define', text: 'You are a helpful assistant' },
    subnodes: { model }
  }
});
\`\`\`

## Agent with Tools

Add tool subnodes in the \`subnodes.tools\` array:

\`\`\`javascript
const calculatorTool = tool({
  type: '@n8n/n8n-nodes-langchain.toolCalculator', version: 1,
  config: { name: 'Calculator', parameters: {} }
});

const agent = node({
  type: '@n8n/n8n-nodes-langchain.agent', version: 3.1,
  config: {
    name: 'Math Agent',
    parameters: { promptType: 'define', text: 'You can use tools' },
    subnodes: { model, tools: [calculatorTool] }
  }
});
\`\`\`

WRONG: \`.to(agent, { connectionType: 'ai_languageModel' })\` — subnodes MUST be in the config object, not connected via \`.to()\`.

## Agent with fromAi() (AI-driven parameters)

Use \`fromAi(key, description)\` to let the AI agent determine parameter values at runtime:

\`\`\`javascript
const gmailTool = tool({
  type: 'n8n-nodes-base.gmailTool', version: 1,
  config: {
    name: 'Gmail Tool',
    parameters: {
      sendTo: fromAi('recipient', 'Email address'),
      subject: fromAi('subject', 'Email subject'),
      message: fromAi('body', 'Email content')
    },
    credentials: { gmailOAuth2: newCredential('Gmail') }
  }
});
\`\`\`

## Agent with Structured Output

Use \`outputParser()\` subnode and set \`hasOutputParser: true\` on the agent:

\`\`\`javascript
const parser = outputParser({
  type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.3,
  config: {
    name: 'Output Parser',
    parameters: { schemaType: 'fromJson', jsonSchemaExample: '{ "score": 75, "tier": "hot" }' }
  }
});

const agent = node({
  type: '@n8n/n8n-nodes-langchain.agent', version: 3.1,
  config: {
    name: 'Analyzer',
    parameters: { promptType: 'define', text: 'Analyze the input', hasOutputParser: true },
    subnodes: { model, outputParser: parser }
  }
});
\`\`\`

## Subnode Factory Functions

All subnodes use factory functions: \`languageModel()\`, \`memory()\`, \`tool()\`, \`outputParser()\`, \`embeddings()\`, \`vectorStore()\`, \`retriever()\`, \`documentLoader()\`, \`textSplitter()\`.

All follow the same pattern — pass them in the \`subnodes\` config of the parent node. Never connect them via \`.to()\`.
`;

	getDocumentation(): string {
		return this.documentation;
	}
}
