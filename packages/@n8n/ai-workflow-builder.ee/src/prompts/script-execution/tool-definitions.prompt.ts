/**
 * Prompt definitions for script execution tool.
 *
 * These prompts are injected into the builder agent's system prompt when
 * script execution is enabled, providing guidance on when and how to use
 * the execute_script tool effectively.
 */

import { TOOL_INTERFACE_DEFINITIONS } from '../../tools/script-execution/tool-interfaces';

/**
 * When to use execute_script vs individual tools
 */
export const SCRIPT_EXECUTION_WHEN_TO_USE = `## When to Use execute_script

Use execute_script when:
- Creating 3+ nodes AND their connections in one operation
- Building common patterns (AI Agent + Chat Model, Vector Store + Embeddings)
- Performing operations that depend on results of previous operations
- You need conditional logic (create node B only if node A succeeded)

Use individual tools when:
- Adding or removing a single node
- Making one connection
- Simple operations that don't benefit from scripting`;

/**
 * Script execution best practices
 */
export const SCRIPT_EXECUTION_BEST_PRACTICES = `## Script Best Practices

1. **Always use async/await** - All tools are async, use \`await\` for every call
2. **NEVER use .then() chains** - The sandbox won't wait for .then() chains to complete
3. **Check success before continuing** - Tools return an object with success boolean
4. **Use nodeId from results** - Don't guess IDs, use the returned nodeId
5. **Log important info** - Use console.log for debugging
6. **Validation is automatic** - Workflow structure is validated after script completes

Example pattern:
\`\`\`javascript
const nodeA = await tools.addNode({ ... });
if (!nodeA.success) {
  console.error('Failed to add node:', nodeA.error);
  return; // Stop execution
}

const nodeB = await tools.addNode({ ... });
if (!nodeB.success) {
  console.error('Failed to add node:', nodeB.error);
  return;
}

// Connect nodes - pass result objects directly (no need for .nodeId)
await tools.connectNodes({
  sourceNodeId: nodeA,
  targetNodeId: nodeB
});
\`\`\``;

/**
 * Configuration tools for parameter updates
 */
export const CONFIGURATOR_SCRIPT_TOOLS = `## Configuration Tools

### tools.updateNodeParameters({{ nodeId, changes }})
Update node parameters with natural language instructions.
Example:
\`\`\`javascript
await tools.updateNodeParameters({{
  nodeId: agent.nodeId,
  changes: ["Enable hasOutputParser", "Set system message to 'You are a helpful assistant'"]
}});
\`\`\`

### tools.getNodeParameter({{ nodeId, path }})
Get a specific parameter value from a node.
Example:
\`\`\`javascript
const url = await tools.getNodeParameter({{ nodeId: http.nodeId, path: "url" }});
if (url.success) {{
  console.log('URL:', url.value);
}}
\`\`\`

### tools.validateConfiguration()
Validate node configurations (agent prompts, tool params, $fromAI usage).
Called automatically after script execution.
Example:
\`\`\`javascript
const result = await tools.validateConfiguration();
if (!result.isValid) {{
  console.log('Issues:', result.issues);
}}
\`\`\`

### When to use updateNodeParameters vs initialParameters
- Use **initialParameters** in addNode() for parameters you know at creation time (hasOutputParser, mode, etc.)
- Use **updateNodeParameters** when you need to modify parameters based on dynamic context or after seeing connections

Example - Setting hasOutputParser before connecting output parser:
\`\`\`javascript
// Option 1: Set in initialParameters (preferred when you know upfront)
const agent = await tools.addNode({{
  nodeType: '@n8n/n8n-nodes-langchain.agent',
  nodeVersion: 1.7,
  name: 'AI Agent',
  initialParametersReasoning: 'Need structured output',
  initialParameters: {{ hasOutputParser: true }}
}});

// Option 2: Update after creation (when needed dynamically)
await tools.updateNodeParameters({{
  nodeId: agent.nodeId,
  changes: ['Enable hasOutputParser for structured output']
}});
\`\`\`
`;

/**
 * Common script patterns for workflow building
 */
export const SCRIPT_EXECUTION_PATTERNS = `## Common Script Patterns

### Pattern 1: Simple AI Agent Setup
\`\`\`javascript
// Create trigger, agent, and chat model
const trigger = await tools.addNode({
  nodeType: 'n8n-nodes-base.manualTrigger',
  nodeVersion: 1,
  name: 'Manual Trigger',
  initialParametersReasoning: 'Trigger has no initial params',
  initialParameters: {}
});

const agent = await tools.addNode({
  nodeType: '@n8n/n8n-nodes-langchain.agent',
  nodeVersion: 1.7,
  name: 'AI Agent',
  initialParametersReasoning: 'Basic agent without output parser',
  initialParameters: { hasOutputParser: false }
});

const chatModel = await tools.addNode({
  nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  nodeVersion: 1,
  name: 'OpenAI Chat Model',
  initialParametersReasoning: 'Chat model has standard config',
  initialParameters: {}
});

// Connect: Trigger -> Agent, ChatModel -> Agent (ai_languageModel)
// Pass result objects directly - no need for .nodeId!
await tools.connectNodes({ sourceNodeId: trigger, targetNodeId: agent });
await tools.connectNodes({ sourceNodeId: chatModel, targetNodeId: agent });
\`\`\`

### Pattern 2: RAG Vector Store Setup
\`\`\`javascript
// Vector store with embeddings and document loader
const vectorStore = await tools.addNode({
  nodeType: '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
  nodeVersion: 1,
  name: 'In-Memory Vector Store',
  initialParametersReasoning: 'Insert mode for loading documents',
  initialParameters: { mode: 'insert' }
});

const embeddings = await tools.addNode({
  nodeType: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
  nodeVersion: 1,
  name: 'OpenAI Embeddings',
  initialParametersReasoning: 'Standard embeddings config',
  initialParameters: {}
});

const docLoader = await tools.addNode({
  nodeType: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader',
  nodeVersion: 1,
  name: 'Document Loader',
  initialParametersReasoning: 'Custom mode for text splitter input',
  initialParameters: { textSplittingMode: 'custom' }
});

// Connect: Embeddings -> VectorStore, DocLoader -> VectorStore
await tools.connectNodes({ sourceNodeId: embeddings, targetNodeId: vectorStore });
await tools.connectNodes({ sourceNodeId: docLoader, targetNodeId: vectorStore });
\`\`\`

### Pattern 3: AI Agent with Tools
\`\`\`javascript
const agent = await tools.addNode({
  nodeType: '@n8n/n8n-nodes-langchain.agent',
  nodeVersion: 1.7,
  name: 'AI Agent',
  initialParametersReasoning: 'Agent needs tools for this use case',
  initialParameters: { hasOutputParser: false }
});

const chatModel = await tools.addNode({
  nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  nodeVersion: 1,
  name: 'Chat Model',
  initialParametersReasoning: 'Standard config',
  initialParameters: {}
});

const calcTool = await tools.addNode({
  nodeType: '@n8n/n8n-nodes-langchain.toolCalculator',
  nodeVersion: 1,
  name: 'Calculator Tool',
  initialParametersReasoning: 'Tool has no initial params',
  initialParameters: {}
});

// Connect all sub-nodes to agent
await tools.connectNodes({ sourceNodeId: chatModel, targetNodeId: agent });
await tools.connectNodes({ sourceNodeId: calcTool, targetNodeId: agent });
\`\`\``;

/**
 * TypeScript interface definitions for the script context
 */
export const SCRIPT_TYPE_DEFINITIONS = `## Script Type Definitions

${TOOL_INTERFACE_DEFINITIONS}`;

/**
 * Full script execution guidance block for builder prompt
 */
export function buildScriptExecutionGuidance(): string {
	return [
		SCRIPT_EXECUTION_WHEN_TO_USE,
		SCRIPT_EXECUTION_BEST_PRACTICES,
		SCRIPT_EXECUTION_PATTERNS,
		CONFIGURATOR_SCRIPT_TOOLS,
	].join('\n\n');
}

/**
 * Condensed guidance for space-constrained prompts
 */
export const SCRIPT_EXECUTION_CONDENSED = `## CRITICAL: Script-Based Workflow Building (OVERRIDES PREVIOUS INSTRUCTIONS)

IGNORE the "mandatory_execution_sequence" section above. Use THIS sequence instead:

You MUST use the execute_script tool to build workflows. Call it ONCE with a complete script that creates ALL nodes and ALL connections.

MANDATORY EXECUTION SEQUENCE:
1. Call execute_script ONCE with a script containing ALL nodes and ALL connections
2. Respond to user with summary (validation happens automatically)

IMPORTANT:
- DO NOT call execute_script multiple times
- DO NOT call add_nodes or connect_nodes (they don't exist)
- DO NOT wrap your script in an IIFE or async function - the sandbox already handles this
- DO NOT use .then() chains - they won't work correctly. Use async/await ONLY.
- ONE script creates the ENTIRE workflow in a single tool call

SCRIPT FORMAT - Write code directly, NO wrapper function:
\`\`\`javascript
// Step 1: Create ALL nodes
const trigger = await tools.addNode({{
  nodeType: 'n8n-nodes-base.manualTrigger',
  nodeVersion: 1,
  name: 'Manual Trigger',
  initialParametersReasoning: 'Trigger node',
  initialParameters: {{}}
}});

const node2 = await tools.addNode({{
  nodeType: '...',
  nodeVersion: 1,
  name: '...',
  initialParametersReasoning: '...',
  initialParameters: {{}}
}});

// Add more nodes as needed...

// Step 2: Create ALL connections (pass result objects directly!)
await tools.connectNodes({{
  sourceNodeId: trigger,
  targetNodeId: node2
}});

// Add more connections as needed...

console.log('Workflow created successfully');
\`\`\`

Available functions in script:
- tools.addNode(input) - Add a node, returns object with success, nodeId, nodeName
- tools.connectNodes(input) - Connect nodes, returns object with success
- tools.removeNode(input) - Remove a node
- tools.removeConnection(input) - Remove a connection
- tools.renameNode(input) - Rename a node
- tools.updateNodeParameters(input) - Update parameters with natural language changes
- tools.getNodeParameter(input) - Get a specific parameter value

Key rules:
1. All tools are async - use await (NEVER use .then() chains)
2. Pass result objects directly to connectNodes (e.g., sourceNodeId: trigger)
3. Create ALL nodes first, then ALL connections
4. ONE script call creates the complete workflow
5. Use initialParameters in addNode() when you know the values upfront
6. Use updateNodeParameters() for dynamic updates after creation`;
