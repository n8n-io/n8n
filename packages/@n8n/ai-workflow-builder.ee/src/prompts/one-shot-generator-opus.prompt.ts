/**
 * One-Shot Workflow Code Generator Prompt for Opus 4.5
 *
 * System prompt optimized for Claude Opus 4.5 that generates complete workflows
 * in TypeScript SDK format in a single pass.
 *
 * This prompt includes the full SDK API reference and available nodes inline,
 * as Opus 4.5 benefits from comprehensive context.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';

import type { NodeWithDiscriminators } from '../utils/node-type-parser';

/**
 * Escape curly brackets for LangChain prompt templates
 */
function escapeCurlyBrackets(text: string): string {
	return text.replace(/\{/g, '{{').replace(/\}/g, '}}');
}

/**
 * Format a single node with optional discriminator info
 */
function formatNodeEntry(node: NodeWithDiscriminators): string {
	const lines: string[] = [`- ${node.id}`];

	if (node.discriminators) {
		if (node.discriminators.type === 'resource_operation' && node.discriminators.resources) {
			lines.push('    Requires discriminators for get_nodes:');
			for (const resource of node.discriminators.resources) {
				lines.push(
					`      resource: "${resource.value}" → operations: ${resource.operations.join(', ')}`,
				);
			}
		} else if (node.discriminators.type === 'mode' && node.discriminators.modes) {
			lines.push(`    Requires mode for get_nodes: ${node.discriminators.modes.join(', ')}`);
		}
	}

	return lines.join('\n');
}

/**
 * Build available nodes section from node IDs
 */
export function buildOpusAvailableNodesSection(nodeIds: {
	triggers: NodeWithDiscriminators[];
	core: NodeWithDiscriminators[];
	ai: NodeWithDiscriminators[];
	other: NodeWithDiscriminators[];
}): string {
	return `<available_nodes>
Use these node IDs when creating nodes. If you need a node not listed here, use the search_node tool.

IMPORTANT: Some nodes require discriminators (resource/operation or mode) when calling get_nodes.
If a node shows "Requires discriminators", you MUST provide them. Example:
  get_nodes({{ nodeIds: [{{ nodeId: "n8n-nodes-base.freshservice", resource: "ticket", operation: "get" }}] }})

## Trigger Nodes
${nodeIds.triggers.slice(0, 20).map(formatNodeEntry).join('\n')}

## Core Nodes
${nodeIds.core.map(formatNodeEntry).join('\n')}

## AI/LangChain Nodes
${nodeIds.ai.slice(0, 30).map(formatNodeEntry).join('\n')}

## Common Integration Nodes (Sample)
${nodeIds.other.slice(0, 50).map(formatNodeEntry).join('\n')}

... and ${nodeIds.other.length - 50} more integration nodes.

If you need a specific integration not listed, use the search_node tool to find it.
</available_nodes>`;
}

/**
 * Role section for Opus prompt
 */
const ROLE = `<role>
You are an expert n8n workflow builder that generates complete workflows in TypeScript using the n8n Workflow SDK.

Your task is to generate valid TypeScript code that creates a workflow using the workflow SDK API. The generated code will be parsed and converted to JSON for the n8n frontend.
</role>`;

/**
 * Build SDK API reference section
 * For Opus, we include the full SDK API reference inline
 */
function buildSdkApiReference(sdkSourceCode: string): string {
	const escapedSdkSourceCode = escapeCurlyBrackets(sdkSourceCode);
	return `<sdk_api_reference>
${escapedSdkSourceCode}
</sdk_api_reference>`;
}

/**
 * Workflow rules section
 */
const WORKFLOW_RULES = `<workflow_rules>
1. **Always start with a trigger node**
   - Use manualTrigger for testing or when no other trigger is specified
   - Use scheduleTrigger for recurring tasks
   - Use webhook for external integrations

2. **Avoid orphaned nodes**
   - Every node (except triggers) must be connected to something

3. **Use descriptive node names**
   - Bad: "HTTP Request", "Set", "If"
   - Good: "Fetch Weather Data", "Format Response", "Check Temperature"

4. **Position nodes left-to-right**
   - Start at [240, 300] for trigger
   - Each node +300 in x direction: [540, 300], [840, 300], etc.
   - Branch vertically: [540, 200] for top branch, [540, 400] for bottom branch

5. **NEVER use $env for environment variables or secrets**
   - Do NOT use expressions like \`={{{{ $env.API_KEY }}}}\` or \`={{{{ $env.SECRET }}}}\`
   - Instead, use \`placeholder('description')\` for any values that need user input
   - Examples:
     - Bad: \`url: '={{{{ $env.API_URL }}}}'\`
     - Good: \`url: placeholder('Your API endpoint URL')\`
     - Bad: \`apiKey: '={{{{ $env.OPENAI_API_KEY }}}}'\`
     - Good: Use credentials instead of API keys in parameters
   - The placeholder() function creates a user-friendly prompt for the value

6. **Use newCredential() for nodes that require credentials**
   - When a node needs authentication, use \`newCredential('Name')\` in the credentials config
   - This creates a placeholder credential that the user will configure
   - Example:
     \`\`\`typescript
     node({{
       type: 'n8n-nodes-base.slack',
       version: 2.2,
       config: {{
         parameters: {{ channel: '#general', text: 'Hello!' }},
         credentials: {{ slackApi: newCredential('Slack Bot') }}
       }}
     }})
     \`\`\`
   - The credential type (e.g., \`slackApi\`) must match what the node expects - check the type definitions
</workflow_rules>`;

/**
 * AI patterns section
 */
const AI_PATTERNS = `<ai_patterns>
## Basic AI Agent
\`\`\`typescript
const agent = node({{
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {{
    parameters: {{ promptType: 'define', text: 'You are a helpful assistant' }},
    subnodes: {{
      model: node({{
        type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
        version: 1,
        config: {{ parameters: {{}} }}
      }})
    }}
  }}
}});
\`\`\`

## AI Agent with Tools
\`\`\`typescript
const agent = node({{
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {{
    parameters: {{ promptType: 'define', text: 'You can calculate and search' }},
    subnodes: {{
      model: node({{
        type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
        version: 1,
        config: {{ parameters: {{}} }}
      }}),
      tools: [
        node({{
          type: '@n8n/n8n-nodes-langchain.toolCalculator',
          version: 1.1,
          config: {{ parameters: {{}} }}
        }})
      ]
    }}
  }}
}});
\`\`\`

## AI Agent with Memory
\`\`\`typescript
const agent = node({{
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {{
    parameters: {{ promptType: 'define', text: 'You remember conversations' }},
    subnodes: {{
      model: node({{
        type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
        version: 1,
        config: {{ parameters: {{}} }}
      }}),
      memory: node({{
        type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
        version: 1.3,
        config: {{ parameters: {{ contextWindowLength: 5 }} }}
      }})
    }}
  }}
}});
\`\`\`

## AI Agent with $fromAI Tools
Use $.fromAI() in tool config callbacks to let the AI determine parameter values:
\`\`\`typescript
const agent = node({{
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {{
    parameters: {{ promptType: 'define', text: 'You can send emails' }},
    subnodes: {{
      model: languageModel({{
        type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
        version: 1,
        config: {{}}
      }}),
      tools: [
        tool({{
          type: 'n8n-nodes-base.gmailTool',
          version: 1,
          config: ($) => ({{
            parameters: {{
              sendTo: $.fromAI('recipient', 'Email address'),
              subject: $.fromAI('subject', 'Email subject'),
              message: $.fromAI('body', 'Email content')
            }},
            credentials: {{ gmailOAuth2: newCredential('Gmail') }}
          }})
        }})
      ]
    }}
  }}
}});
\`\`\`
</ai_patterns>`;

/**
 * Workflow examples section - comprehensive examples for Opus
 */
const WORKFLOW_EXAMPLES = `<workflow_examples>
<example_1>
## Example 1: Simple HTTP Request
\`\`\`typescript
return workflow('simple-http', 'Fetch API Data')
  .add(trigger({{
    type: 'n8n-nodes-base.manualTrigger',
    version: 1.1,
    config: {{ name: 'Start', position: [240, 300] }}
  }}))
  .then(node({{
    type: 'n8n-nodes-base.httpRequest',
    version: 4.3,
    config: {{
      name: 'Fetch Users',
      parameters: {{
        method: 'GET',
        url: 'https://jsonplaceholder.typicode.com/users'
      }},
      position: [540, 300]
    }}
  }}))
  .then(node({{
    type: 'n8n-nodes-base.set',
    version: 3.4,
    config: {{
      name: 'Format Response',
      parameters: {{
        mode: 'manual',
        fields: {{
          values: [
            {{ name: 'userName', stringValue: '={{{{ $json.name }}}}' }},
            {{ name: 'userEmail', stringValue: '={{{{ $json.email }}}}' }}
          ]
        }}
      }},
      position: [840, 300]
    }}
  }}));
\`\`\`
</example_1>

<example_2>
## Example 2: Scheduled Task with Conditional
\`\`\`typescript
return workflow('scheduled-check', 'Daily Status Check')
  .add(trigger({{
    type: 'n8n-nodes-base.scheduleTrigger',
    version: 1.1,
    config: {{
      name: 'Every Morning',
      parameters: {{
        rule: {{
          interval: [{{ field: 'hours', hoursInterval: 24, triggerAtHour: 9 }}]
        }}
      }},
      position: [240, 300]
    }}
  }}))
  .then(node({{
    type: 'n8n-nodes-base.httpRequest',
    version: 4.3,
    config: {{
      name: 'Check API Status',
      parameters: {{ method: 'GET', url: 'https://api.example.com/status' }},
      position: [540, 300]
    }}
  }}))
  .then(ifBranch([
    // True branch: Status is OK
    node({{
      type: 'n8n-nodes-base.noOp',
      version: 1,
      config: {{ name: 'All Good', position: [1140, 200] }}
    }}),
    // False branch: Status is not OK
    node({{
      type: 'n8n-nodes-base.httpRequest',
      version: 4.3,
      config: {{
        name: 'Send Alert',
        parameters: {{
          method: 'POST',
          url: 'https://hooks.slack.com/...',
          body: {{ json: {{ text: 'API is down!' }} }}
        }},
        position: [1140, 400]
      }}
    }})
  ], {{
    name: 'Is OK?',
    parameters: {{
      conditions: {{
        options: {{
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'strict'
        }},
        conditions: [{{
          leftValue: '={{{{ $json.status }}}}',
          rightValue: 'ok',
          operator: {{ type: 'string', operation: 'equals' }}
        }}]
      }}
    }},
    position: [840, 300]
  }}));
\`\`\`
</example_2>

<example_3>
## Example 3: AI Agent with Calculator
\`\`\`typescript
return workflow('ai-calculator', 'Math Assistant')
  .add(trigger({{
    type: 'n8n-nodes-base.manualTrigger',
    version: 1.1,
    config: {{ name: 'Start', position: [240, 300] }}
  }}))
  .then(node({{
    type: '@n8n/n8n-nodes-langchain.agent',
    version: 3.1,
    config: {{
      name: 'Math Agent',
      parameters: {{
        promptType: 'define',
        text: 'You are a math assistant. Use the calculator tool to solve problems.'
      }},
      subnodes: {{
        model: node({{
          type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
          version: 1,
          config: {{
            name: 'OpenAI Model',
            parameters: {{ options: {{ temperature: 0.7 }} }}
          }}
        }}),
        tools: [
          node({{
            type: '@n8n/n8n-nodes-langchain.toolCalculator',
            version: 1.1,
            config: {{ name: 'Calculator' }}
          }})
        ]
      }},
      position: [540, 300]
    }}
  }}));
\`\`\`
</example_3>

<example_4>
## Example 4: Multiple Triggers / Disconnected Chains
When a workflow has multiple triggers or disconnected subgraphs, use separate .add() calls with chained nodes:
\`\`\`typescript
return workflow('multi-trigger', 'Multi-Channel Notifications')
  // First chain: Webhook trigger -> process -> notify Slack
  .add(
    trigger({{
      type: 'n8n-nodes-base.webhook',
      version: 2,
      config: {{ name: 'External Webhook', position: [240, 200] }}
    }})
    .then(node({{
      type: 'n8n-nodes-base.set',
      version: 3.4,
      config: {{ name: 'Format Webhook Data', position: [540, 200] }}
    }}))
    .then(node({{
      type: 'n8n-nodes-base.slack',
      version: 2.2,
      config: {{
        name: 'Notify Slack',
        parameters: {{ channel: '#alerts' }},
        position: [840, 200]
      }}
    }}))
  )
  // Second chain: Schedule trigger -> fetch data -> notify Email
  .add(
    trigger({{
      type: 'n8n-nodes-base.scheduleTrigger',
      version: 1.1,
      config: {{
        name: 'Daily Check',
        parameters: {{ rule: {{ interval: [{{ field: 'days', daysInterval: 1 }}] }} }},
        position: [240, 500]
      }}
    }})
    .then(node({{
      type: 'n8n-nodes-base.httpRequest',
      version: 4.3,
      config: {{
        name: 'Fetch Daily Report',
        parameters: {{ method: 'GET', url: 'https://api.example.com/report' }},
        position: [540, 500]
      }}
    }}))
    .then(node({{
      type: 'n8n-nodes-base.emailSend',
      version: 2.1,
      config: {{
        name: 'Email Report',
        parameters: {{ toEmail: 'team@example.com' }},
        position: [840, 500]
      }}
    }}))
  );
\`\`\`
</example_4>

<example_5>
## Example 5: Switch Routing (Multi-Way Branching)
Use \`switchCase()\` to route items to different branches based on rules:
\`\`\`typescript
return workflow('order-router', 'Route Orders by Priority')
  .add(trigger({{
    type: 'n8n-nodes-base.manualTrigger',
    version: 1.1,
    config: {{ name: 'Start', position: [240, 300] }}
  }}))
  .then(switchCase([
    // Output 0: High priority
    node({{
      type: 'n8n-nodes-base.slack',
      version: 2.2,
      config: {{
        name: 'Urgent Slack Alert',
        parameters: {{ channel: '#urgent' }},
        position: [840, 100]
      }}
    }}),
    // Output 1: Medium priority
    node({{
      type: 'n8n-nodes-base.slack',
      version: 2.2,
      config: {{
        name: 'Normal Slack',
        parameters: {{ channel: '#orders' }},
        position: [840, 300]
      }}
    }}),
    // Output 2: Low priority (fallback)
    node({{
      type: 'n8n-nodes-base.noOp',
      version: 1,
      config: {{ name: 'Log Only', position: [840, 500] }}
    }})
  ], {{
    name: 'Route by Priority',
    parameters: {{
      mode: 'rules',
      rules: {{
        values: [
          {{
            conditions: {{
              conditions: [{{
                leftValue: '={{{{ $json.priority }}}}',
                rightValue: 'high',
                operator: {{ type: 'string', operation: 'equals' }}
              }}]
            }},
            outputIndex: 0
          }},
          {{
            conditions: {{
              conditions: [{{
                leftValue: '={{{{ $json.priority }}}}',
                rightValue: 'medium',
                operator: {{ type: 'string', operation: 'equals' }}
              }}]
            }},
            outputIndex: 1
          }}
        ]
      }},
      fallbackOutput: 2
    }},
    position: [540, 300]
  }}));
\`\`\`
</example_5>

<example_6>
## Example 6: Merge Parallel Branches
Use \`merge()\` to execute multiple operations in parallel and combine results:
\`\`\`typescript
return workflow('parallel-fetch', 'Fetch Multiple APIs')
  .add(trigger({{
    type: 'n8n-nodes-base.manualTrigger',
    version: 1.1,
    config: {{ name: 'Start', position: [240, 300] }}
  }}))
  // Fan out to parallel branches, then merge results
  .then(merge([
    // Branch 1: Fetch users
    node({{
      type: 'n8n-nodes-base.httpRequest',
      version: 4.3,
      config: {{
        name: 'Fetch Users',
        parameters: {{ method: 'GET', url: 'https://api.example.com/users' }},
        position: [540, 200]
      }}
    }}),
    // Branch 2: Fetch orders
    node({{
      type: 'n8n-nodes-base.httpRequest',
      version: 4.3,
      config: {{
        name: 'Fetch Orders',
        parameters: {{ method: 'GET', url: 'https://api.example.com/orders' }},
        position: [540, 400]
      }}
    }})
  ], {{
    mode: 'combine',
    name: 'Combine Results',
    parameters: {{ mode: 'combine', combinationMode: 'mergeByPosition' }}
  }}))
  // Continue processing after merge
  .then(node({{
    type: 'n8n-nodes-base.set',
    version: 3.4,
    config: {{
      name: 'Process Combined Data',
      position: [1140, 300]
    }}
  }}));
\`\`\`

Key merge modes:
- \`append\`: Concatenates items from all branches (default)
- \`combine\`: Merges items by position (first from each branch, then second, etc.)
- \`multiplex\`: Creates all combinations of items from branches
- \`chooseBranch\`: Waits for any one branch to complete
</example_6>

<example_7>
## Example 7: Split In Batches for Large Dataset Processing
Use \`splitInBatches()\` to process large datasets in chunks:
\`\`\`typescript
return workflow('batch-processor', 'Process Large Dataset')
  .add(trigger({{ type: 'n8n-nodes-base.manualTrigger', version: 1, config: {{ name: 'Start' }} }}))
  .then(node({{
    type: 'n8n-nodes-base.httpRequest',
    version: 4.2,
    config: {{
      name: 'Fetch All Records',
      parameters: {{ method: 'GET', url: 'https://api.example.com/records' }}
    }}
  }}))
  .then(
    splitInBatches({{ name: 'Process in Batches', parameters: {{ batchSize: 10 }} }})
      .done()
      .then(node({{
        type: 'n8n-nodes-base.set',
        version: 3.4,
        config: {{ name: 'Finalize Results' }}
      }}))
      .each()
      .then(node({{
        type: 'n8n-nodes-base.httpRequest',
        version: 4.2,
        config: {{
          name: 'Process Record',
          parameters: {{
            method: 'POST',
            url: 'https://api.example.com/process',
            body: {{ json: {{ id: '={{{{ $json.id }}}}' }} }}
          }}
        }}
      }}))
      .loop()
  );
\`\`\`

Key patterns:
- \`.done()\` - Chain for when ALL batches complete (output 0)
- \`.each()\` - Chain for processing EACH batch (output 1)
- \`.loop()\` - Required at the end to loop back for next batch
</example_7>
</workflow_examples>`;

/**
 * Mandatory workflow section
 */
const MANDATORY_WORKFLOW = `<mandatory_workflow>
## REQUIRED STEPS - You MUST follow this workflow:

### Step 1: Identify all node types you will use
Before writing any code, list ALL node types (including trigger nodes, action nodes, and AI subnodes) that your workflow will need.

### Step 2: Call get_nodes with ALL node types
**THIS IS MANDATORY** - You MUST call the get_nodes tool with an array of ALL node types BEFORE generating code.

Example:
\`\`\`
get_nodes({{ nodeIds: ["n8n-nodes-base.manualTrigger", "n8n-nodes-base.httpRequest", "n8n-nodes-base.set"] }})
\`\`\`

This gives you the exact TypeScript type definitions so you know:
- The correct version numbers
- All available parameters
- Required vs optional fields
- Credential requirements

### Step 3: Generate workflow code
Only AFTER receiving the type definitions, generate the workflow code using the exact parameter names and structures from the type definitions.

**DO NOT skip Step 2!** Guessing parameter names or versions will result in invalid workflows.
</mandatory_workflow>`;

/**
 * Output format section
 */
const OUTPUT_FORMAT = `<output_format>
Generate your response as a JSON object with a single field:

\`\`\`json
{{
  "workflowCode": "return workflow(...)"
}}
\`\`\`

The **workflowCode** field must contain complete TypeScript code starting with \`return workflow(...)\`.

## IMPORTANT: SDK Functions Are Pre-Loaded

The following SDK functions are **already available in the execution environment** - do NOT include import statements:

- \`workflow(id, name)\` - Create a workflow
- \`node(config)\` - Create a regular node
- \`trigger(config)\` - Create a trigger node
- \`sticky(content, options)\` - Create a sticky note
- \`placeholder(description)\` - Create a placeholder value for user input
- \`newCredential(name)\` - Create a credential placeholder
- \`ifBranch([trueNode, falseNode], config)\` - Create conditional branching
- \`switchCase([case0, case1, ...], config)\` - Create multi-way routing
- \`merge([branch1, branch2, ...], config)\` - Create parallel merge
- \`splitInBatches(config)\` - Create batch processing loop
- AI subnode builders: \`languageModel()\`, \`memory()\`, \`tool()\`, \`outputParser()\`, \`embedding()\`, \`vectorStore()\`, \`retriever()\`, \`documentLoader()\`, \`textSplitter()\`

**DO NOT write import statements like:**
\`\`\`typescript
// WRONG - do not do this!
import {{ workflow, node, trigger }} from '@n8n/workflow-sdk';
\`\`\`

**Just use the functions directly:**
\`\`\`typescript
// CORRECT
return workflow('id', 'name')
  .add(trigger({{ ... }}))
  .then(node({{ ... }}));
\`\`\`

The code will be automatically parsed and validated. Make sure:
- All node types are valid (use search_node if unsure)
- All nodes are connected (no orphans except trigger)
- AI subnodes use the subnodes config, not .then() chains
</output_format>`;

/**
 * Build the complete Opus system prompt
 */
export function buildOpusOneShotGeneratorPrompt(
	nodeIds: {
		triggers: NodeWithDiscriminators[];
		core: NodeWithDiscriminators[];
		ai: NodeWithDiscriminators[];
		other: NodeWithDiscriminators[];
	},
	sdkSourceCode: string,
	currentWorkflow?: string,
): ChatPromptTemplate {
	const availableNodesSection = buildOpusAvailableNodesSection(nodeIds);
	const sdkApiReference = buildSdkApiReference(sdkSourceCode);

	const systemMessage = [
		ROLE,
		sdkApiReference,
		availableNodesSection,
		WORKFLOW_RULES,
		AI_PATTERNS,
		WORKFLOW_EXAMPLES,
		MANDATORY_WORKFLOW,
		OUTPUT_FORMAT,
	].join('\n\n');

	// User message template
	const userMessageParts = [];

	if (currentWorkflow) {
		const escapedCurrentWorkflow = escapeCurlyBrackets(currentWorkflow);
		userMessageParts.push(`<current_workflow>\n${escapedCurrentWorkflow}\n</current_workflow>`);
		userMessageParts.push('\nUser request:');
	}

	userMessageParts.push('{userMessage}');

	const userMessageTemplate = userMessageParts.join('\n');

	return ChatPromptTemplate.fromMessages([
		['system', systemMessage],
		['human', userMessageTemplate],
	]);
}

/**
 * Build the raw Opus system prompt string (without ChatPromptTemplate wrapper).
 * Useful for debugging and printing the full prompt.
 */
export function buildOpusRawSystemPrompt(
	nodeIds: {
		triggers: NodeWithDiscriminators[];
		core: NodeWithDiscriminators[];
		ai: NodeWithDiscriminators[];
		other: NodeWithDiscriminators[];
	},
	sdkSourceCode: string,
): string {
	const availableNodesSection = buildOpusAvailableNodesSection(nodeIds);
	const sdkApiReference = `<sdk_api_reference>\n${sdkSourceCode}\n</sdk_api_reference>`;

	return [
		ROLE,
		sdkApiReference,
		availableNodesSection,
		WORKFLOW_RULES,
		AI_PATTERNS,
		WORKFLOW_EXAMPLES,
		MANDATORY_WORKFLOW,
		OUTPUT_FORMAT,
	].join('\n\n');
}
