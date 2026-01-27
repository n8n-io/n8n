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
2. **CRITICAL: Configure ALL nodes** - Every node MUST have its parameters fully configured using tools.updateNodeParameters()
3. **Use tools.updateNodeParameters() for configuration** - This is the PRIMARY method for configuring nodes
4. **Use batch methods** - \`tools.add()\`, \`tools.conn()\`, \`tools.updateAll()\` for efficiency
5. **Always use async/await** - NEVER use .then() chains
6. **CRITICAL: Multi-output/input nodes** - Switch nodes need \`so:\` (output index), Merge nodes need \`di:\` (input index)

MANDATORY: After creating nodes and connections, you MUST configure each node using tools.updateNodeParameters() or tools.updateAll().
Describe what each node should do in natural language - the system will figure out the exact parameters.

COMPLETE pattern (nodes + connections + FULL configuration via updateAll):
\`\`\`javascript
const r = await tools.add({{nodes:[
  {{t:'n8n-nodes-base.webhook',n:'Webhook',p:{{httpMethod:'POST',path:'purchase-request'}}}},
  {{t:'n8n-nodes-base.set',n:'Extract Data'}},
  {{t:'n8n-nodes-base.slack',n:'Request Approval'}},
  {{t:'n8n-nodes-base.emailSend',n:'Send Confirmation'}}
]}});
const [wh,extract,slack,email] = r.results;
await tools.conn({{connections:[{{s:wh,d:extract}},{{s:extract,d:slack}},{{s:slack,d:email}}]}});

// CRITICAL: Configure ALL nodes with updateAll - describe what each node should do
await tools.updateAll({{updates:[
  {{nodeId:extract.nodeId,changes:[
    "Add field 'requester' with value from {{$json.body.requester}}",
    "Add field 'amount' as number from {{$json.body.amount}}",
    "Add field 'description' from {{$json.body.description}}",
    "Add field 'email' from {{$json.body.email}}"
  ]}},
  {{nodeId:slack.nodeId,changes:[
    "Set operation to sendAndWait for approval",
    "Set message to show approval request with requester name {{$json.requester}}, amount \${{$json.amount}}, and description {{$json.description}}",
    "Configure approval buttons with Approve and Reject options"
  ]}},
  {{nodeId:email.nodeId,changes:[
    "Set fromEmail to approvals@company.com",
    "Set toEmail to {{$json.email}}",
    "Set subject to 'Purchase Request Decision - \${{$json.amount}}'",
    "Set HTML body with decision details including amount, description, and approval status"
  ]}}
]}});
\`\`\``;

/**
 * Configuration tools for parameter updates
 */
export const CONFIGURATOR_SCRIPT_TOOLS = `## Configuration Tools

CRITICAL: Every node MUST be configured. Use tools.updateNodeParameters() or tools.updateAll() to configure nodes.

### tools.updateNodeParameters({{ nodeId, changes }}) - PRIMARY Configuration Method
Describe what the node should do in natural language. The system figures out the exact parameters.
\`\`\`javascript
await tools.updateNodeParameters({{nodeId:slack.nodeId,changes:[
  "Set operation to sendAndWait for approval workflow",
  "Set message to show requester {{$json.requester}}, amount \${{$json.amount}}, and description",
  "Configure approval buttons with Approve and Reject options",
  "Format message with emoji and markdown for readability"
]}});
\`\`\`

### tools.updateAll({{ updates }}) - Batch Configuration (RECOMMENDED)
Configure multiple nodes at once. Use this after creating all nodes and connections.
\`\`\`javascript
await tools.updateAll({{updates:[
  {{nodeId:setNode.nodeId,changes:[
    "Add field 'requester' from {{$json.body.requester}}",
    "Add field 'amount' as number from {{$json.body.amount}}",
    "Add field 'description' from {{$json.body.description}}"
  ]}},
  {{nodeId:slack.nodeId,changes:[
    "Set operation to sendAndWait",
    "Set message showing approval request with requester, amount, description",
    "Add approval buttons for Approve and Reject"
  ]}},
  {{nodeId:email.nodeId,changes:[
    "Set fromEmail to notifications@company.com",
    "Set toEmail to {{$json.requesterEmail}}",
    "Set subject to 'Request Decision - \${{$json.amount}}'",
    "Set HTML body with formatted decision details"
  ]}}
]}});
\`\`\`

### tools.set({{ nodeId, params }}) - Direct Setting (Advanced)
Only use when you know the EXACT parameter structure. For most nodes, use updateNodeParameters instead.
\`\`\`javascript
// Only for simple, well-known structures like AI Agent
await tools.set({{nodeId:agent,params:{{
  systemMessage:'You are a helpful assistant.',
  prompt:'={{$json.input}}'
}}}});
\`\`\`

### When to use which method:

**ALWAYS use tools.updateAll() for:**
- Slack nodes (messages, channels, approval options)
- Email nodes (recipients, subjects, HTML content)
- Set/Edit Fields nodes (field assignments)
- HTTP Request nodes (URLs, methods, headers, body)
- Any node with complex configuration

**Only use tools.set() for:**
- AI Agent systemMessage and prompt (simple string params)
- Merge node mode setting
- Simple boolean or string parameters you're certain about

REMEMBER: When in doubt, use updateNodeParameters/updateAll. Unconfigured nodes are NEVER acceptable.
`;

/**
 * Common script patterns for workflow building
 * IMPORTANT: All patterns use tools.updateAll() for configuration - describe what each node should do
 */
export const SCRIPT_EXECUTION_PATTERNS = `## Common Script Patterns (with FULL Configuration via updateAll)

### Pattern 1: Simple AI Agent Setup
\`\`\`javascript
const r = await tools.add({{nodes:[
  {{t:'n8n-nodes-base.manualTrigger',n:'Trigger'}},
  {{t:'@n8n/n8n-nodes-langchain.agent',n:'Agent',p:{{hasOutputParser:false}}}},
  {{t:'@n8n/n8n-nodes-langchain.lmChatOpenAi',n:'Model'}}
]}});
const [t,a,m] = r.results;
await tools.conn({{connections:[{{s:t,d:a}},{{s:m,d:a}}]}});
// Configure AI Agent - can use set() for simple string params
await tools.set({{nodeId:a,params:{{
  systemMessage:'You are a helpful assistant that provides clear, concise answers.',
  prompt:'={{$json.chatInput}}'
}}}});
\`\`\`

### Pattern 2: Switch Node with Multiple Outputs
Switch nodes route to different paths. Use so: for output index.
\`\`\`javascript
const r = await tools.add({{nodes:[
  {{t:'n8n-nodes-base.webhook',n:'Webhook',p:{{httpMethod:'POST',path:'route-data'}}}},
  {{t:'n8n-nodes-base.switch',n:'Router'}},
  {{t:'n8n-nodes-base.set',n:'Handle Low'}},
  {{t:'n8n-nodes-base.set',n:'Handle Medium'}},
  {{t:'n8n-nodes-base.set',n:'Handle High'}}
]}});
const [wh,sw,low,med,high] = r.results;
await tools.conn({{connections:[
  {{s:wh,d:sw}},
  {{s:sw,d:low,so:0}},
  {{s:sw,d:med,so:1}},
  {{s:sw,d:high,so:2}}
]}});
// Configure ALL nodes using updateAll - describe what each should do
await tools.updateAll({{updates:[
  {{nodeId:sw.nodeId,changes:[
    "Add 3 routing rules based on {{$json.priority}} field",
    "First rule: when priority equals 'low', output to 'Low Priority'",
    "Second rule: when priority equals 'medium', output to 'Medium Priority'",
    "Third rule: when priority equals 'high', output to 'High Priority'"
  ]}},
  {{nodeId:low.nodeId,changes:["Add field 'handler' with value 'standard-queue'"]}},
  {{nodeId:med.nodeId,changes:["Add field 'handler' with value 'priority-queue'"]}},
  {{nodeId:high.nodeId,changes:["Add field 'handler' with value 'urgent-queue'", "Add boolean field 'escalate' set to true"]}}
]}});
\`\`\`

### Pattern 3: Merge Node with Multiple Inputs
Merge nodes combine data from multiple paths. Use di: for input index.
\`\`\`javascript
const r = await tools.add({{nodes:[
  {{t:'n8n-nodes-base.set',n:'Source A'}},
  {{t:'n8n-nodes-base.set',n:'Source B'}},
  {{t:'n8n-nodes-base.merge',n:'Combine',p:{{mode:'combine'}}}},
  {{t:'n8n-nodes-base.set',n:'Output'}}
]}});
const [a,b,m,out] = r.results;
await tools.conn({{connections:[
  {{s:a,d:m,di:0}},
  {{s:b,d:m,di:1}},
  {{s:m,d:out}}
]}});
// Configure ALL Set nodes
await tools.updateAll({{updates:[
  {{nodeId:a.nodeId,changes:["Add field 'sourceA_data' from {{$json.fieldA}}"]}},
  {{nodeId:b.nodeId,changes:["Add field 'sourceB_data' from {{$json.fieldB}}"]}},
  {{nodeId:out.nodeId,changes:[
    "Add field 'combined' concatenating sourceA_data and sourceB_data",
    "Add field 'processedAt' with current timestamp {{$now}}"
  ]}}
]}});
\`\`\`

### Pattern 4: Approval Workflow with Slack and Email
\`\`\`javascript
const r = await tools.add({{nodes:[
  {{t:'n8n-nodes-base.webhook',n:'Request Webhook',p:{{httpMethod:'POST',path:'approval-request'}}}},
  {{t:'n8n-nodes-base.set',n:'Extract Data'}},
  {{t:'n8n-nodes-base.slack',n:'Send Approval'}},
  {{t:'n8n-nodes-base.emailSend',n:'Send Confirmation'}}
]}});
const [wh,extract,slack,email] = r.results;
await tools.conn({{connections:[{{s:wh,d:extract}},{{s:extract,d:slack}},{{s:slack,d:email}}]}});

// CRITICAL: Configure ALL nodes with updateAll
await tools.updateAll({{updates:[
  {{nodeId:extract.nodeId,changes:[
    "Add field 'requester' from {{$json.body.requester}}",
    "Add field 'amount' as number from {{$json.body.amount}}",
    "Add field 'description' from {{$json.body.description}}",
    "Add field 'requesterEmail' from {{$json.body.email}}"
  ]}},
  {{nodeId:slack.nodeId,changes:[
    "Set operation to sendAndWait for approval workflow",
    "Set message showing: Approval Request with requester name {{$json.requester}}, amount \${{$json.amount}}, and description {{$json.description}}",
    "Configure approval buttons with Approve and Reject options",
    "Format message nicely with line breaks and emphasis"
  ]}},
  {{nodeId:email.nodeId,changes:[
    "Set fromEmail to approvals@company.com",
    "Set toEmail to {{$json.requesterEmail}}",
    "Set subject to 'Approval Decision - \${{$json.amount}}'",
    "Set HTML body with formatted decision details including amount, description, and whether approved or rejected"
  ]}}
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
1. Call execute_script tool ONCE with a script that:
   a) Creates ALL nodes needed using tools.add()
   b) Creates ALL connections using tools.conn()
   c) CONFIGURES ALL NODES using tools.updateAll() - describe what each node should do in natural language
2. Respond to user with summary (validation happens automatically)

SHORT-FORM SYNTAX:
- Node: {{t:'nodeType',n:'Name',p:{{param:value}}}}
- Connection: {{s:sourceNode,d:destNode,so:outputIndex,di:inputIndex}}

COMPLETE EXAMPLE (nodes + connections + CONFIGURATION via updateAll):
\`\`\`javascript
const r = await tools.add({{nodes:[
  {{t:'n8n-nodes-base.webhook',n:'Webhook',p:{{httpMethod:'POST',path:'request'}}}},
  {{t:'n8n-nodes-base.set',n:'Extract Data'}},
  {{t:'n8n-nodes-base.slack',n:'Send Approval'}},
  {{t:'n8n-nodes-base.emailSend',n:'Send Confirmation'}}
]}});
const [wh,extract,slack,email] = r.results;
await tools.conn({{connections:[{{s:wh,d:extract}},{{s:extract,d:slack}},{{s:slack,d:email}}]}});

// CRITICAL: Configure ALL nodes - describe what each should do
await tools.updateAll({{updates:[
  {{nodeId:extract.nodeId,changes:[
    "Add field 'requester' from {{$json.body.requester}}",
    "Add field 'amount' as number from {{$json.body.amount}}",
    "Add field 'description' from {{$json.body.description}}"
  ]}},
  {{nodeId:slack.nodeId,changes:[
    "Set operation to sendAndWait for approval",
    "Set message showing requester {{$json.requester}}, amount \${{$json.amount}}, description",
    "Configure Approve and Reject buttons"
  ]}},
  {{nodeId:email.nodeId,changes:[
    "Set fromEmail to notifications@company.com",
    "Set toEmail to {{$json.requesterEmail}}",
    "Set subject to 'Decision - \${{$json.amount}}'",
    "Set HTML body with decision details"
  ]}}
]}});
\`\`\`

Functions available INSIDE your script:
- tools.add({{nodes:[...]}}) - Add multiple nodes
- tools.conn({{connections:[...]}}) - Connect multiple pairs
- tools.updateAll({{updates:[...]}}) - REQUIRED: Configure all nodes (describe in natural language)
- tools.updateNodeParameters({{nodeId,changes}}) - Configure single node
- tools.set({{nodeId,params}}) - Only for simple params you're certain about (AI Agent systemMessage)

Short-form aliases:
- t = nodeType, v = nodeVersion, n = name, p = initialParameters
- s = sourceNodeId, d = targetNodeId, so = sourceOutputIndex, di = targetInputIndex

CRITICAL for multi-output/multi-input nodes:
- Switch nodes: use 'so' for output index: {{s:switchNode,d:target,so:1}}
- Merge nodes: use 'di' for input index: {{s:source,d:mergeNode,di:1}}

Key rules:
1. Call execute_script ONCE with complete script
2. ALWAYS use tools.updateAll() to configure nodes after creating them
3. Describe configuration in natural language - the system figures out exact params
4. NEVER leave nodes unconfigured - every node must have its behavior defined
5. Use await, NEVER .then() chains`;
