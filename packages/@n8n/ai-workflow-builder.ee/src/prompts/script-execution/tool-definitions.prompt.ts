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

1. **Use SHORT-FORM syntax** - Use \`t:\` instead of \`nodeType:\`, \`s:\` instead of \`sourceNodeId:\`
2. **Use tools.set() for params** - Direct parameter setting is 10x faster than updateNodeParameters
3. **Omit optional fields** - \`v:\` (version), \`n:\` (name), \`p:\` (params) all have defaults
4. **Use batch methods** - \`tools.add()\` and \`tools.conn()\` for efficiency
5. **Always use async/await** - NEVER use .then() chains

FASTEST pattern (use short-form, tools.set for params):
\`\`\`javascript
const r = await tools.add({{nodes:[
  {{t:'n8n-nodes-base.manualTrigger',n:'Trigger'}},
  {{t:'@n8n/n8n-nodes-langchain.agent',n:'Agent',p:{{hasOutputParser:false}}}},
  {{t:'@n8n/n8n-nodes-langchain.lmChatOpenAi',n:'Model'}}
]}});
const [t,a,m] = r.results;
await tools.conn({{connections:[{{s:t,d:a}},{{s:m,d:a}}]}});
await tools.set({{nodeId:a,params:{{systemMessage:'You are helpful',prompt:'={{$json.input}}'}}}});
\`\`\`

Use Promise.all + setAll for multiple parameter updates:
\`\`\`javascript
await tools.setAll({{updates:[
  {{nodeId:a,params:{{systemMessage:'You are helpful'}}}},
  {{nodeId:h,params:{{url:'https://api.example.com',method:'POST'}}}}
]}});
\`\`\``;

/**
 * Configuration tools for parameter updates
 */
export const CONFIGURATOR_SCRIPT_TOOLS = `## Configuration Tools

### tools.set({{ nodeId, params }}) - FASTEST (no LLM call)
Direct parameter setting - use when you know the exact parameter structure.
\`\`\`javascript
await tools.set({{nodeId:a,params:{{systemMessage:'You are helpful',prompt:'={{$json.input}}'}}}});
\`\`\`

### tools.setAll({{ updates }}) - Batch direct setting
Set parameters on multiple nodes at once (no LLM calls).
\`\`\`javascript
await tools.setAll({{updates:[
  {{nodeId:a,params:{{systemMessage:'You are helpful'}}}},
  {{nodeId:h,params:{{url:'https://api.example.com',method:'POST'}}}}
]}});
\`\`\`

### tools.updateNodeParameters({{ nodeId, changes }}) - SLOW (LLM call)
Use ONLY when you don't know the exact parameter structure.
\`\`\`javascript
await tools.updateNodeParameters({{nodeId:a.nodeId,changes:["Set system message to 'You are helpful'"]}});
\`\`\`

### tools.updateAll({{ updates }}) - Batch LLM updates
Multiple LLM-based updates in parallel.
\`\`\`javascript
await tools.updateAll({{updates:[
  {{nodeId:a.nodeId,changes:['Set prompt']}},
  {{nodeId:h.nodeId,changes:['Set URL']}}
]}});
\`\`\`

### When to use which method
- **p:** in add() - Parameters known at node creation (best)
- **tools.set()** - Direct params after creation (fast, no LLM)
- **tools.setAll()** - Multiple direct params (fast, no LLM)
- **tools.updateNodeParameters()** - Only when you need LLM translation
`;

/**
 * Common script patterns for workflow building
 */
export const SCRIPT_EXECUTION_PATTERNS = `## Common Script Patterns (Short-Form)

### Pattern 1: Simple AI Agent Setup
\`\`\`javascript
const r = await tools.add({{nodes:[
  {{t:'n8n-nodes-base.manualTrigger',n:'Trigger'}},
  {{t:'@n8n/n8n-nodes-langchain.agent',n:'Agent',p:{{hasOutputParser:false}}}},
  {{t:'@n8n/n8n-nodes-langchain.lmChatOpenAi',n:'Model'}}
]}});
const [t,a,m] = r.results;
await tools.conn({{connections:[{{s:t,d:a}},{{s:m,d:a}}]}});
await tools.set({{nodeId:a,params:{{systemMessage:'You are helpful',prompt:'={{$json.input}}'}}}});
\`\`\`

### Pattern 2: RAG Vector Store Setup
\`\`\`javascript
const r = await tools.add({{nodes:[
  {{t:'@n8n/n8n-nodes-langchain.vectorStoreInMemory',n:'VectorStore',p:{{mode:'insert'}}}},
  {{t:'@n8n/n8n-nodes-langchain.embeddingsOpenAi',n:'Embeddings'}},
  {{t:'@n8n/n8n-nodes-langchain.documentDefaultDataLoader',n:'DocLoader',p:{{textSplittingMode:'custom'}}}}
]}});
const [v,e,d] = r.results;
await tools.conn({{connections:[{{s:e,d:v}},{{s:d,d:v}}]}});
\`\`\`

### Pattern 3: AI Agent with Tools + Config
\`\`\`javascript
const r = await tools.add({{nodes:[
  {{t:'@n8n/n8n-nodes-langchain.agent',n:'Agent',p:{{hasOutputParser:false}}}},
  {{t:'@n8n/n8n-nodes-langchain.lmChatOpenAi',n:'Model'}},
  {{t:'@n8n/n8n-nodes-langchain.toolCalculator',n:'Calculator'}}
]}});
const [a,m,c] = r.results;
await tools.conn({{connections:[{{s:m,d:a}},{{s:c,d:a}}]}});
await tools.setAll({{updates:[
  {{nodeId:a,params:{{systemMessage:'You are a math assistant'}}}},
  {{nodeId:m,params:{{model:'gpt-4'}}}}
]}});
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

You MUST call the execute_script tool to build workflows. This is the ONLY tool available for building.

MANDATORY EXECUTION SEQUENCE:
1. Call execute_script tool ONCE with a script parameter containing ALL nodes, connections, AND parameters
2. Respond to user with summary (validation happens automatically)

SHORT-FORM SYNTAX (REQUIRED for token efficiency):
- Node: {{t:'nodeType',n:'Name',p:{{param:value}}}} - v, n, p are optional
- Connection: {{s:sourceNode,d:destNode}} - much shorter than sourceNodeId/targetNodeId

EXAMPLE TOOL CALL:
execute_script({{
  script: "const r=await tools.add({{nodes:[{{t:'n8n-nodes-base.manualTrigger',n:'Trigger'}},{{t:'@n8n/n8n-nodes-langchain.agent',n:'Agent',p:{{hasOutputParser:false}}}}]}});const [t,a]=r.results;await tools.conn({{connections:[{{s:t,d:a}}]}});await tools.set({{nodeId:a,params:{{systemMessage:'You are helpful'}}}});"
}})

Functions available INSIDE your script:
- tools.add({{nodes:[...]}}) - Add multiple nodes (short form: t,v,n,p)
- tools.conn({{connections:[...]}}) - Connect multiple pairs (short form: s,d)
- tools.set({{nodeId,params}}) - FAST: Direct parameter setting (no LLM)
- tools.setAll({{updates:[...]}}) - FAST: Batch direct params (no LLM)
- tools.updateNodeParameters({{nodeId,changes}}) - SLOW: LLM-based (use sparingly)
- tools.updateAll({{updates:[...]}}) - Batch LLM updates

Short-form property aliases:
- t = nodeType, v = nodeVersion (optional), n = name (optional), p = initialParameters (optional)
- s = sourceNodeId, d = targetNodeId (destination)

Key rules:
1. Call execute_script ONCE with your complete script
2. Use SHORT-FORM syntax (t,n,p,s,d) to reduce tokens
3. Use tools.set() instead of updateNodeParameters (10x faster)
4. Use await, NEVER .then() chains (Promise.all IS allowed)
5. Destructure results: const [a,b,c] = r.results`;
