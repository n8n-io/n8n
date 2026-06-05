# n8n Agents & A2A Guide

## Overview

n8n agents are **first-class users** in the system, not nodes or workflow components. Each agent is a `User` entity with `type: 'agent'`, which means it inherits the full RBAC, project scoping, and credential access system for free. An agent owns a personal project, gets workflows and credentials shared to it, and uses an LLM to autonomously decide which workflows to execute and which other agents to delegate to.

Agent-to-Agent (A2A) communication happens via recursive task execution with a shared iteration budget. When Agent A delegates to Agent B, it's the same `executeAgentTask` call with the same SSE streaming — the budget is shared across the entire call chain to prevent runaway execution.

```
User/External Client
    |
    v
POST /agents/{id}/task  (prompt)
    |
    v
LLM decides action ──> execute_workflow ──> runs n8n workflow
    |                                            |
    |                                            v
    |                                      Observation (result)
    |                                            |
    v                                            v
LLM decides next ────> send_message ──────> Agent B (recursive)
    |                                            |
    v                                            v
LLM decides next ────> complete ──────────> Summary returned
```

## Core Concepts

### Agents as Users

| Concept | Implementation |
|---------|---------------|
| Identity | `User` entity with `type: 'agent'` |
| Email | Auto-generated: `agent-{uuid}@internal.n8n.local` |
| Projects | Gets its own personal project on creation |
| Workflows | Shared via project membership (standard n8n sharing) |
| Credentials | Shared via project membership (needs Anthropic credential for LLM) |
| RBAC | `global:member` role — same permission model as human users |

### Access Levels

Control who can dispatch tasks to an agent:

| Level | Who can call | Use case |
|-------|-------------|----------|
| `external` (default) | Any authenticated user or API key holder | Public-facing agents |
| `internal` | Only users/agents sharing a project with this agent | Team-scoped agents |
| `closed` | Only admins with `chatHubAgent:execute` scope | Restricted/sensitive agents |

### LLM Configuration

Agents use the Anthropic API for reasoning. Configuration:

| Setting | Env var | Default |
|---------|---------|---------|
| Model | `N8N_AGENT_LLM_MODEL` | `claude-sonnet-4-5-20250929` |
| Base URL | `N8N_AGENT_LLM_BASE_URL` | `https://api.anthropic.com` |
| API Key | Per-agent Anthropic credential | (none — must be shared) |

Each agent needs an `anthropicApi` credential shared to its project. Without it, task dispatch returns `"No LLM API key available"`.

### Execution Constraints

| Constraint | Value |
|-----------|-------|
| Max reasoning iterations | 15 per call chain |
| Workflow execution timeout | 120 seconds |
| External agent call timeout | 30 seconds |
| Prompt max length | 10,000 characters |
| External agents per task | 10 max |
| Rate limit (IP) | 20 requests/min |
| Rate limit (per user) | 10 requests/min |

## Internal Usage (n8n UI)

### 1. Create an Agent

Navigate to the **Agents** page (`/agents`) and click **+ Add Agent**.

- **Name**: Display name (max 32 chars)
- **Description**: What this agent does (max 500 chars)
- **Access Level**: `external`, `internal`, or `closed`

### 2. Give the Agent Tools

Agents can only use workflows and credentials shared to their project:

1. Go to the agent's project (created automatically)
2. Share workflows the agent should be able to execute
3. Share an **Anthropic credential** so the agent can reason

Supported workflow triggers: Manual, Webhook, Chat, Form, Schedule.

### 3. Run a Task

Click an agent card on the Agents page to open the **Action Panel**:

- Enter a prompt in the text area
- Click **Run Task**
- Watch **Live Progress** as the agent streams SSE events:
  - Step cards appear in real-time as the agent decides actions
  - Thinking dots animate between steps
  - Connected agents glow when delegated to
  - Summary card appears on completion

### 4. Agent Delegation

If multiple agents exist and aren't `closed`, they can delegate to each other:

- The LLM sees other agents in its system prompt with their names and descriptions
- It can send `send_message` to delegate a sub-task
- The delegated agent runs its own reasoning loop (sharing the iteration budget)
- Results flow back to the delegating agent as an observation

## External Usage (Public API)

### Prerequisites

1. Create an API key at **Settings > API Keys**
2. Enable scopes: `agent:read` (for discovery) and `agent:execute` (for task dispatch)
3. Set the target agent's access level to `external`

### Discover an Agent

```bash
curl -s http://localhost:5678/api/v1/agents/{agentId}/card \
  -H "x-n8n-api-key: YOUR_API_KEY" | jq
```

Returns an A2A-compliant agent card:

```json
{
  "id": "ecfaf28d-...",
  "name": "QA",
  "provider": { "name": "n8n", "description": "" },
  "capabilities": {
    "streaming": true,
    "pushNotifications": false,
    "multiTurn": true
  },
  "interfaces": [{
    "type": "http+json",
    "url": "http://localhost:5678/api/v1/agents/{id}/task"
  }],
  "securitySchemes": {
    "apiKey": { "type": "apiKey", "name": "x-n8n-api-key", "in": "header" }
  }
}
```

### Dispatch a Task (JSON mode)

```bash
curl -s http://localhost:5678/api/v1/agents/{agentId}/task \
  -X POST \
  -H "x-n8n-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Run the health check workflow"}' | jq
```

Returns when complete:

```json
{
  "status": "completed",
  "summary": "Health check passed. All systems operational.",
  "steps": [
    { "action": "execute_workflow", "workflowName": "Health Check", "result": "success" }
  ]
}
```

### Dispatch a Task (SSE streaming)

Add `Accept: text/event-stream` to get real-time events:

```bash
curl -N http://localhost:5678/api/v1/agents/{agentId}/task \
  -X POST \
  -H "x-n8n-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"prompt": "Run all workflows and report results"}'
```

Events arrive as they happen:

```
data: {"type":"step","action":"execute_workflow","workflowName":"Health Check"}

data: {"type":"observation","action":"execute_workflow","result":"success","workflowName":"Health Check"}

data: {"type":"step","action":"execute_workflow","workflowName":"Test Summary"}

data: {"type":"observation","action":"execute_workflow","result":"success","workflowName":"Test Summary"}

data: {"type":"step","action":"send_message","toAgent":"Comms Agent"}

data: {"type":"observation","action":"send_message","result":"success","toAgent":"Comms Agent"}

data: {"type":"done","status":"completed","summary":"All workflows executed successfully."}
```

### Cross-Instance Delegation

Send external agents in the request body to let your agent delegate across n8n instances:

```bash
curl -N http://localhost:5678/api/v1/agents/{agentId}/task \
  -X POST \
  -H "x-n8n-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "prompt": "Generate a report and ask the remote agent to publish it",
    "externalAgents": [{
      "name": "Publisher",
      "description": "Publishes reports to the company wiki",
      "url": "https://other-instance.example.com/api/v1/agents/{id}/task",
      "apiKey": "REMOTE_API_KEY"
    }]
  }'
```

## SSE Event Reference

### `step` — Agent decided to take an action

```json
{
  "type": "step",
  "action": "execute_workflow",
  "workflowName": "Quality Report",
  "reasoning": "Running the report to gather metrics"
}
```

Or for delegation:

```json
{
  "type": "step",
  "action": "send_message",
  "toAgent": "Comms Agent",
  "external": false
}
```

### `observation` — Action completed

```json
{
  "type": "observation",
  "action": "execute_workflow",
  "result": "success",
  "workflowName": "Quality Report"
}
```

Or for delegation:

```json
{
  "type": "observation",
  "action": "send_message",
  "result": "success",
  "toAgent": "Comms Agent",
  "summary": "Message sent to #quality channel"
}
```

### `done` — Task finished

```json
{
  "type": "done",
  "status": "completed",
  "summary": "All workflows executed. Results: ..."
}
```

Error case:

```json
{
  "type": "done",
  "status": "error",
  "summary": "No LLM API key available."
}
```

## Consuming SSE from Code

### JavaScript/TypeScript

```typescript
const response = await fetch(`${baseUrl}/api/v1/agents/${agentId}/task`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
    'x-n8n-api-key': apiKey,
  },
  body: JSON.stringify({ prompt }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const parts = buffer.split('\n\n');
  buffer = parts.pop() ?? '';

  for (const part of parts) {
    for (const line of part.split('\n')) {
      if (line.startsWith('data: ')) {
        const event = JSON.parse(line.slice(6));

        switch (event.type) {
          case 'step':
            console.log(`Action: ${event.action} ${event.workflowName ?? event.toAgent ?? ''}`);
            break;
          case 'observation':
            console.log(`Result: ${event.result}`);
            break;
          case 'done':
            console.log(`Done: ${event.summary}`);
            break;
        }
      }
    }
  }
}
```

### Python

```python
import requests
import json

response = requests.post(
    f"{base_url}/api/v1/agents/{agent_id}/task",
    headers={
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
        "x-n8n-api-key": api_key,
    },
    json={"prompt": prompt},
    stream=True,
)

for line in response.iter_lines():
    if line and line.startswith(b"data: "):
        event = json.loads(line[6:])
        print(f"[{event['type']}] {event}")
```

## Demo Page

A standalone demo page is available at `scripts/a2a-demo.html`. To use it:

```bash
# Start the proxy (serves demo + proxies API calls to n8n)
node scripts/a2a-proxy.mjs

# Open http://localhost:8889 in your browser
```

The proxy eliminates CORS issues by making the demo page same-origin with the n8n API. Fill in the Agent ID and API key, then click **Run Task** to see SSE streaming in action.

## Internal REST API Reference

These endpoints use session/cookie authentication (internal UI):

| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| `POST` | `/rest/agents/` | `chatHubAgent:create` | Create agent |
| `PATCH` | `/rest/agents/:id` | `chatHubAgent:update` | Update agent |
| `DELETE` | `/rest/agents/:id` | `chatHubAgent:delete` | Delete agent |
| `GET` | `/rest/agents/` | `chatHubAgent:list` | List all agents |
| `GET` | `/rest/agents/:id/capabilities` | `chatHubAgent:read` | Get capabilities |
| `POST` | `/rest/agents/:id/task` | `chatHubAgent:execute` | Dispatch task |

## Public API Reference

These endpoints use API key authentication (`x-n8n-api-key` header):

| Method | Path | Scope | Description |
|--------|------|-------|-------------|
| `GET` | `/api/v1/agents/:id/card` | `agent:read` | Get A2A agent card |
| `POST` | `/api/v1/agents/:id/task` | `agent:execute` | Dispatch task |

## Architecture

```
packages/
  @n8n/api-types/src/dto/agents/     # Request/response DTOs
  @n8n/permissions/src/               # API key scopes (agent:read, agent:execute)
  cli/src/
    controllers/agents.controller.ts  # Internal REST endpoints
    services/agents.service.ts        # Core agent logic, LLM loop, SSE
    public-api/v1/handlers/agents/    # Public API endpoints + OpenAPI spec
  frontend/editor-ui/src/features/agents/
    agents.store.ts                   # Agent list, connections, status
    agentPanel.store.ts               # Task dispatch, SSE consumption
    components/AgentActionPanel.vue   # Side panel UI
    agents.types.ts                   # Frontend type definitions
  scripts/
    a2a-demo.html                     # Standalone SSE demo page
    a2a-proxy.mjs                     # Dev proxy for demo page
```
