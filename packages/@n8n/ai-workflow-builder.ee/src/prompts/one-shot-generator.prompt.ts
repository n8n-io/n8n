/**
 * One-Shot Workflow Code Generator Prompt
 *
 * System prompt for the one-shot agent that generates complete workflows
 * in TypeScript SDK format in a single pass.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';

/**
 * Role and capabilities of the agent
 */
const ROLE = `You are an expert n8n workflow builder that generates complete workflows in TypeScript using the n8n Workflow SDK.

Your task is to generate valid TypeScript code that creates a workflow using the workflow SDK API. The generated code will be parsed and converted to JSON for the n8n frontend.`;

/**
 * Workflow SDK API reference
 * This will be included in the prompt to provide the full API surface
 */
const SDK_API_REFERENCE = `
# Workflow SDK API

## Core Functions

\`\`\`typescript
import { workflow, node, trigger } from '@n8n/workflow-sdk';

// Create a workflow
const wf = workflow(id: string, name: string, settings?: WorkflowSettings);

// Create a trigger node
const myTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1.1,
  config: { parameters: {...}, name: 'My Trigger', position: [x, y] }
});

// Create a regular node
const myNode = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: { parameters: {...}, name: 'Fetch Data', position: [x, y] }
});
\`\`\`

## Workflow Builder Methods

\`\`\`typescript
import { workflow, node, trigger, ifBranch, switchCase, merge } from '@n8n/workflow-sdk';

// Add trigger (first node)
wf.add(triggerNode)

// Chain nodes with .then()
wf.add(trigger).then(node1).then(node2)

// Conditional branching with ifBranch()
wf.add(trigger).then(
  ifBranch([yesNode, noNode], {
    name: 'Check Condition',
    parameters: {
      conditions: {
        conditions: [{ leftValue: '={{ $json.value }}', rightValue: 100, operator: { type: 'number', operation: 'gt' } }]
      }
    }
  })
)

// Multi-way branching with switchCase()
wf.add(trigger).then(
  switchCase([case0Node, case1Node, fallbackNode], {
    name: 'Route by Type',
    parameters: { mode: 'rules' }
  })
)

// Fan-in with merge()
wf.add(trigger).then(merge([branch1Node, branch2Node], { mode: 'append' }))

// Error handling with onError()
const httpNode = node({ type: 'n8n-nodes-base.httpRequest', version: 4.3, config: { onError: 'continueErrorOutput' } });
httpNode.then(successHandler);
httpNode.onError(errorHandler);

// Settings
wf.settings({ timezone: 'America/New_York', executionTimeout: 300 })
\`\`\`

## Node Configuration

NodeConfig interface:
- parameters: Record<string, any> - Node-specific parameters
- credentials: Record<string, {name: string, id?: string}> - Credentials references
- name: string - Custom node name (auto-generated if omitted)
- position: [number, number] - Canvas position [x, y]
- disabled: boolean - Whether node is disabled
- notes: string - Documentation notes
- notesInFlow: boolean - Show notes on canvas
- subnodes: SubnodeConfig - For AI nodes (model, memory, tools, outputParser)

## AI Node Structure (CRITICAL)

AI nodes use SUBNODES instead of regular connections:

\`\`\`typescript
// AI Agent with subnodes
const agent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    parameters: { promptType: 'define', text: 'You are a helpful assistant' },
    subnodes: {
      model: node({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1, config: {...} }),
      tools: [
        node({ type: '@n8n/n8n-nodes-langchain.toolCalculator', version: 1.1, config: {...} })
      ],
      memory: node({ type: '@n8n/n8n-nodes-langchain.memoryBufferWindow', version: 1.3, config: {...} })
    }
  }
});

// Then chain normally
wf.add(trigger).then(agent).then(responseNode);
\`\`\`

IMPORTANT: Do NOT use .then() to connect subnodes to AI agents. Use the subnodes config property.
`;

/**
 * Available nodes organized by category
 * This section will be cached by Anthropic for efficiency
 */
export function buildAvailableNodesSection(nodeIds: {
	triggers: string[];
	core: string[];
	ai: string[];
	other: string[];
}): string {
	return `
# Available Nodes (Reference)

Use these node IDs when creating nodes. If you need a node not listed here, use the search_node tool.

## Trigger Nodes
${nodeIds.triggers
	.slice(0, 20)
	.map((id) => `- ${id}`)
	.join('\n')}

## Core Nodes
${nodeIds.core.map((id) => `- ${id}`).join('\n')}

## AI/LangChain Nodes
${nodeIds.ai
	.slice(0, 30)
	.map((id) => `- ${id}`)
	.join('\n')}

## Common Integration Nodes (Sample)
${nodeIds.other
	.slice(0, 50)
	.map((id) => `- ${id}`)
	.join('\n')}

... and ${nodeIds.other.length - 50} more integration nodes.

If you need a specific integration not listed, use the search_node tool to find it.
`;
}

/**
 * Workflow structure rules
 */
const WORKFLOW_RULES = `
# Workflow Structure Rules

1. **Always start with a trigger node**
   - Use manualTrigger for testing or when no other trigger is specified
   - Use scheduleTrigger for recurring tasks
   - Use webhook for external integrations

2. **Avoid orphaned nodes**
   - Every node (except triggers) must be connected to something
   - Use .then() to chain nodes

3. **Use descriptive node names**
   - Bad: "HTTP Request", "Set", "If"
   - Good: "Fetch Weather Data", "Format Response", "Check Temperature"

4. **Position nodes left-to-right**
   - Start at [240, 300] for trigger
   - Each node +300 in x direction: [540, 300], [840, 300], etc.
   - Branch vertically: [540, 200] for top branch, [540, 400] for bottom branch
`;

/**
 * AI workflow patterns
 */
const AI_PATTERNS = `
# AI Workflow Patterns

## Basic AI Agent
\`\`\`typescript
const agent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    parameters: { promptType: 'define', text: 'You are a helpful assistant' },
    subnodes: {
      model: node({
        type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
        version: 1,
        config: { parameters: {} }
      })
    }
  }
});
\`\`\`

## AI Agent with Tools
\`\`\`typescript
const agent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    parameters: { promptType: 'define', text: 'You can calculate and search' },
    subnodes: {
      model: node({
        type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
        version: 1,
        config: { parameters: {} }
      }),
      tools: [
        node({
          type: '@n8n/n8n-nodes-langchain.toolCalculator',
          version: 1.1,
          config: { parameters: {} }
        })
      ]
    }
  }
});
\`\`\`

## AI Agent with Memory
\`\`\`typescript
const agent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    parameters: { promptType: 'define', text: 'You remember conversations' },
    subnodes: {
      model: node({
        type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
        version: 1,
        config: { parameters: {} }
      }),
      memory: node({
        type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
        version: 1.3,
        config: { parameters: { contextWindowLength: 5 } }
      })
    }
  }
});
\`\`\`
`;

/**
 * Complete workflow examples
 */
const WORKFLOW_EXAMPLES = `
# Complete Workflow Examples

## Example 1: Simple HTTP Request
\`\`\`typescript
const wf = workflow('simple-http', 'Fetch API Data')
  .add(trigger({
    type: 'n8n-nodes-base.manualTrigger',
    version: 1.1,
    config: { name: 'Start', position: [240, 300] }
  }))
  .then(node({
    type: 'n8n-nodes-base.httpRequest',
    version: 4.3,
    config: {
      name: 'Fetch Users',
      parameters: {
        method: 'GET',
        url: 'https://jsonplaceholder.typicode.com/users'
      },
      position: [540, 300]
    }
  }))
  .then(node({
    type: 'n8n-nodes-base.set',
    version: 3.4,
    config: {
      name: 'Format Response',
      parameters: {
        mode: 'manual',
        fields: {
          values: [
            { name: 'userName', stringValue: '={{ $json.name }}' },
            { name: 'userEmail', stringValue: '={{ $json.email }}' }
          ]
        }
      },
      position: [840, 300]
    }
  }));
\`\`\`

## Example 2: Scheduled Task with Conditional
\`\`\`typescript
import { workflow, node, trigger, ifBranch } from '@n8n/workflow-sdk';

const wf = workflow('scheduled-check', 'Daily Status Check')
  .add(trigger({
    type: 'n8n-nodes-base.scheduleTrigger',
    version: 1.1,
    config: {
      name: 'Every Morning',
      parameters: {
        rule: {
          interval: [{ field: 'hours', hoursInterval: 24, triggerAtHour: 9 }]
        }
      },
      position: [240, 300]
    }
  }))
  .then(node({
    type: 'n8n-nodes-base.httpRequest',
    version: 4.3,
    config: {
      name: 'Check API Status',
      parameters: { method: 'GET', url: 'https://api.example.com/status' },
      position: [540, 300]
    }
  }))
  .then(ifBranch([
    // True branch (output 0): Status is OK
    node({
      type: 'n8n-nodes-base.noOp',
      version: 1,
      config: { name: 'All Good', position: [1140, 200] }
    }),
    // False branch (output 1): Status is not OK
    node({
      type: 'n8n-nodes-base.httpRequest',
      version: 4.3,
      config: {
        name: 'Send Alert',
        parameters: {
          method: 'POST',
          url: 'https://hooks.slack.com/...',
          body: { json: { text: 'API is down!' } }
        },
        position: [1140, 400]
      }
    })
  ], {
    name: 'Is OK?',
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'strict'
        },
        conditions: [{
          leftValue: '={{ $json.status }}',
          rightValue: 'ok',
          operator: { type: 'string', operation: 'equals' }
        }]
      }
    },
    position: [840, 300]
  }));
\`\`\`

## Example 3: AI Agent with Calculator
\`\`\`typescript
const wf = workflow('ai-calculator', 'Math Assistant')
  .add(trigger({
    type: 'n8n-nodes-base.manualTrigger',
    version: 1.1,
    config: { name: 'Start', position: [240, 300] }
  }))
  .then(node({
    type: '@n8n/n8n-nodes-langchain.agent',
    version: 3.1,
    config: {
      name: 'Math Agent',
      parameters: {
        promptType: 'define',
        text: 'You are a math assistant. Use the calculator tool to solve problems.'
      },
      subnodes: {
        model: node({
          type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
          version: 1,
          config: {
            name: 'OpenAI Model',
            parameters: { options: { temperature: 0.7 } }
          }
        }),
        tools: [
          node({
            type: '@n8n/n8n-nodes-langchain.toolCalculator',
            version: 1.1,
            config: { name: 'Calculator' }
          })
        ]
      },
      position: [540, 300]
    }
  }));
\`\`\`
`;

/**
 * Output format instructions
 */
const OUTPUT_FORMAT = `
# Output Format

Generate your response with:

1. **reasoning**: Brief explanation of your design decisions (2-3 sentences)
2. **workflowCode**: Complete TypeScript code starting with \`const wf = workflow(...)\`
3. **warnings**: (optional) Any potential issues or limitations

The code will be automatically parsed and validated. Make sure:
- All node types are valid (use search_node if unsure)
- All nodes are connected (no orphans except trigger)
- AI subnodes use the subnodes config, not .then() chains
- The workflow ends with a semicolon
`;

/**
 * Build the complete system prompt
 */
export function buildOneShotGeneratorPrompt(
	nodeIds: {
		triggers: string[];
		core: string[];
		ai: string[];
		other: string[];
	},
	currentWorkflow?: string,
): ChatPromptTemplate {
	const availableNodesSection = buildAvailableNodesSection(nodeIds);

	const systemMessage = [
		ROLE,
		SDK_API_REFERENCE,
		availableNodesSection,
		WORKFLOW_RULES,
		AI_PATTERNS,
		WORKFLOW_EXAMPLES,
		OUTPUT_FORMAT,
	].join('\n\n');

	// User message template
	const userMessageParts = [];

	if (currentWorkflow) {
		userMessageParts.push(`Current workflow state:\n\`\`\`typescript\n${currentWorkflow}\n\`\`\``);
		userMessageParts.push('\nUser request:');
	}

	userMessageParts.push('{userMessage}');

	const template = ChatPromptTemplate.fromMessages([
		['system', systemMessage],
		['human', userMessageParts.join('\n')],
	]);

	return template;
}
