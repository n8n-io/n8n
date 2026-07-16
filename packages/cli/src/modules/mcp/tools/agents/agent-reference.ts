import { AgentJsonConfigSchema } from '@n8n/api-types';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const AGENT_BUILDER_REFERENCE_URI = 'n8n://agents/reference';

export const AGENT_CONFIG_JSON_SCHEMA = zodToJsonSchema(AgentJsonConfigSchema, {
	name: 'AgentJsonConfig',
});

export const AGENT_BUILDER_GUIDE = `# n8n Agent management

Use the Agent MCP tools to create and edit persisted n8n Agents. The MCP client is the
orchestrator: there is no nested conversational Agent Builder.

## Choose an Agent or workflow

An n8n Agent is a first-class persisted resource with its own instructions, model, tools, skills,
tasks, memory, integrations, and lifecycle. An AI Agent node is a node inside a workflow whose
trigger, surrounding graph, and lifecycle are owned by that workflow.

Treat an explicit artifact request as a routing instruction. When the user asks to build or create an
"agent" or "assistant", default to an n8n Agent. When they explicitly ask for a workflow or an AI
Agent node, use the workflow builder.

Only deviate when the requested artifact is an unmistakably poor fit. A fixed trigger or schedule
followed by enumerable, repeatable steps and fixed actions is usually a workflow. Never silently
substitute one artifact for another: explain the mismatch and ask before building the alternative.

Prefer an Agent when the model owns runtime decisions, conversations, investigation, iteration,
proactive work, cross-session memory, or learning. Prefer a workflow when control flow is fixed and
any LLM usage is a bounded step. Never substitute a Chat Trigger plus an AI Agent node for a
requested n8n Agent artifact. If the intended artifact is genuinely ambiguous, clarify it before
creating either one.

## Build sequence

1. Use search_projects to identify the project, or search_agents and get_agent for an existing Agent.
2. Use discover_agent_assets plus list_credentials, search_nodes, get_node_types, and
   explore_node_resources to ground model, tool, workflow, integration, and credential choices.
3. For a new Agent, call create_agent with the initial config after discovering its assets. The
   top-level name is injected into config; omit config only when the Agent ID is needed first.
4. Call mutate_agent once per logical sidecar or subsequent mutation, always passing the latest
   configHash. Skills, tasks, and custom tools are created after the Agent because they need
   server-generated IDs.
5. Call validate_agent and resolve every reported error. A valid Agent is a completed draft; do not
   publish it merely to finish the build.
6. Report that the draft is ready, include a clickable link using the \`url\` returned by
   validate_agent, and ask whether the user wants to publish it.
7. Call publish_agent only when the user explicitly requested publication, activation, deployment,
   or making the Agent live, or confirms publication after the build.
8. Connecting a chat integration publishes the current draft and starts the integration runtime, so
   it requires the same explicit publication confirmation.

## Publication approval

Building, editing, or validating an Agent never implies permission to publish or republish it. Leave
the Agent as a draft by default. An explicit request to publish, activate, deploy, make live, or
connect a chat integration counts as approval; otherwise ask after validation and wait for the
answer before calling publish_agent or connecting an integration.

## mutate_agent operations

- config.replace: Replace the complete Agent JSON configuration with value.config.
- config.patch: Apply value.patch as RFC 6902 operations. Supported operations are add, remove,
  replace, move, copy, and test.
- skill.upsert: Create and attach a skill when value.skillId is absent, or replace an existing skill
  body when it is present. Pass the complete skill body.
- skill.delete: Delete a skill body and remove its config reference.
- task.upsert: Create and attach a scheduled task when value.taskId is absent, or replace an existing
  task body when present. enabled controls the task config reference.
- task.delete: Delete a task body and remove its config reference.
- customTool.upsert: Compile, validate, store, and attach a custom TypeScript tool. The source must
  export default new Tool('tool_name') and may import only runtime-supported packages.
- customTool.delete: Delete a custom tool body and remove its config reference.

Every mutation requires baseConfigHash from get_agent or the previous successful mutation. Mutation
responses contain only the next configHash and the affected resource ID, not the full Agent. On a
stale_config response, call get_agent and retry against the returned snapshot.

## Agent JSON configuration

The required runnable fields are name, model, credential, and instructions. Common optional fields
include tools, skills, tasks, integrations, memory, subAgents, providerTools, mcpServers,
vectorStores, personalisation, and config.

Tool references use these forms:

- Custom tool: { "type": "custom", "id": "tool_name" }
- Workflow tool: { "type": "workflow", "workflow": "Workflow Name", "name": "tool_name" }
- Node tool: { "type": "node", "name": "tool_name", "node": { "nodeType": "...",
  "nodeTypeVersion": 1, "nodeParameters": {}, "credentials": {} } }

Do not guess node parameters or stable resource IDs. Discover the node definition and live resource
options first. Never place credential secret data in Agent configuration or MCP tool arguments; use
credential IDs returned by list_credentials.

Skills and tasks have separately persisted bodies. Always manage them through mutate_agent instead
of manually inventing their IDs. Saved sub-agents must be published Agents from the same project.
Use discover_agent_assets with kind=subagents to obtain valid IDs.

Chat integrations are conversation surfaces, not ordinary node tools. Use an integration when users
should invoke and converse with the Agent in Slack, Telegram, or Linear. Use a node/workflow tool
when the Agent only needs to call that service as an API.
`;

export const AGENT_BUILDER_REFERENCE = `${AGENT_BUILDER_GUIDE}

## Canonical Agent configuration schema

\`\`\`json
${JSON.stringify(AGENT_CONFIG_JSON_SCHEMA, null, 2)}
\`\`\`
`;
