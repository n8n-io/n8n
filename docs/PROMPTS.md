# n8n Prompts Library

Reusable AI prompts for designing, building, and debugging n8n workflows. Use these with Claude, ChatGPT, or any LLM assistant.

---

## 🗂️ Prompt Categories

1. [Workflow Design](#-workflow-design)
2. [Node Selection & Configuration](#-node-selection--configuration)
3. [Error Handling](#-error-handling)
4. [Code Node (JavaScript/Python)](#-code-node-javascriptpython)
5. [AI & LangChain Nodes](#-ai--langchain-nodes)
6. [Testing & Debugging](#-testing--debugging)
7. [Custom Node Development](#-custom-node-development)
8. [Documentation Generation](#-documentation-generation)

---

## 🏗️ Workflow Design

### Design a workflow from a description

```
I want to build an n8n workflow that does the following:
[describe your automation in plain English]

Please:
1. List the trigger node and why it fits.
2. List each processing node in order with a brief description.
3. Identify any edge cases or error paths to handle.
4. Suggest any n8n-native features (e.g., sub-workflows, wait nodes) that would help.
```

---

### Convert a manual process to an n8n workflow

```
I currently do the following process manually every [frequency]:
[describe the manual process step by step]

Design an n8n workflow that automates this. Include:
- The best trigger type
- Each node in sequence
- Any conditional branches
- What credentials/API keys are needed
```

---

### Evaluate multiple design options

```
I need to automate [task] in n8n. I'm considering these approaches:
Option A: [describe]
Option B: [describe]

Compare them on:
- Complexity (number of nodes / maintenance burden)
- Reliability (error handling, retry logic)
- Performance (execution time, API rate limits)
- Cost (API calls, n8n cloud executions)
Recommend the best option with reasons.
```

---

## 🔌 Node Selection & Configuration

### Find the right node for a service

```
I want to connect n8n to [service/tool name]. Tell me:
1. Does n8n have a native node for this? If yes, what operations does it support?
2. If no native node, should I use HTTP Request, Webhook, or a community node?
3. What authentication method does the API use (OAuth2, API key, basic auth)?
4. Are there rate limits I should know about?
5. Give me the node configuration JSON for [specific operation].
```

---

### Configure an HTTP Request node

```
I need to call this API endpoint in an n8n HTTP Request node:
- URL: [endpoint URL]
- Method: [GET/POST/PUT/DELETE]
- Auth: [bearer token / API key / OAuth2]
- Required headers: [list headers]
- Request body: [JSON body or describe it]

Give me the complete HTTP Request node configuration.
```

---

### Work with n8n expressions

```
In n8n, I need to write an expression that:
[describe what the expression should compute]

The input data structure is:
[paste the JSON structure from the previous node]

Write the n8n expression (using {{ }} syntax and $json, $node, $workflow as needed).
Explain what each part does.
```

---

## 🛡️ Error Handling

### Add robust error handling to a workflow

```
Here is my n8n workflow (describe nodes and connections):
[workflow description or JSON]

Add proper error handling:
1. Wrap risky nodes with try/catch using an Error Trigger.
2. Add retry logic for HTTP nodes.
3. Send alerts to Slack or email on failure.
4. Log error details for debugging.
Show the updated workflow structure.
```

---

### Diagnose a workflow error

```
My n8n workflow is failing with this error:
[paste the error message from the Executions panel]

The failing node is: [node name and type]
The input data to the node is: [paste JSON from node input panel]

Diagnose what is causing the error and provide the fix.
```

---

## 💻 Code Node (JavaScript/Python)

### Write a JavaScript Code node

```
Write n8n JavaScript Code node code that:
[describe what transformation/logic is needed]

Input items have this structure:
[paste example $input.all() JSON]

Requirements:
- Return an array of items with the structure: [describe output structure]
- Handle nulls and missing fields gracefully
- Add a comment for each logical block
```

---

### Transform data between nodes

```
I need to transform data between two n8n nodes:

Input (from previous node):
[paste JSON]

Required output (for next node):
[paste expected JSON structure]

Write a Code node that performs this transformation, handling edge cases.
```

---

### Aggregate items in a loop

```
I have a Split In Batches loop in n8n. Each iteration produces items with this structure:
[paste JSON]

Write a Code node that runs after the loop to aggregate all items into a single summary object with:
- [field 1]: [aggregation logic]
- [field 2]: [aggregation logic]
```

---

## 🤖 AI & LangChain Nodes

### Design a LangChain agent workflow

```
I want to build an AI agent in n8n using LangChain that:
[describe what the agent should do]

Available tools/data sources: [list APIs, databases, files]

Design the workflow with:
1. The agent node configuration (model, system prompt, tools)
2. Each tool node and its purpose
3. How to pass context between runs (memory node?)
4. How to handle tool errors
```

---

### Write a system prompt for an AI node

```
Write a system prompt for an n8n AI Agent node that:
- Acts as: [persona/role]
- Primary task: [main function]
- Tone: [professional / friendly / technical]
- Must always: [constraints]
- Must never: [restrictions]
- Output format: [JSON / plain text / markdown]
- Context it will receive: [describe input data]
```

---

### Build a RAG workflow

```
I want to build a Retrieval-Augmented Generation (RAG) workflow in n8n that answers questions using:
- Knowledge base: [describe documents/data]
- Vector store: [Pinecone / Qdrant / in-memory]
- LLM: [OpenAI GPT / Claude / other]

Design the workflow for:
1. Ingestion pipeline (load → chunk → embed → store)
2. Query pipeline (embed query → retrieve chunks → generate answer)
Include the n8n node sequence for each pipeline.
```

---

## 🧪 Testing & Debugging

### Generate test data for a node

```
I have an n8n node that expects input items with this structure:
[paste JSON schema or example]

Generate 5 diverse test cases including:
- A typical happy-path example
- An example with null/missing optional fields
- An example with edge-case values (empty string, 0, very long string)
- An example that should trigger the error branch
Format as an n8n "pin data" JSON array.
```

---

### Review a workflow for issues

```
Review this n8n workflow for potential issues:
[describe or paste workflow JSON]

Check for:
1. Missing error handling
2. API rate limit risks
3. Data type mismatches
4. Credentials that might expire
5. Performance bottlenecks (large loops, no batching)
6. Security issues (logging sensitive data, insecure webhooks)
Provide specific recommendations for each issue found.
```

---

## 🔧 Custom Node Development

### Scaffold a custom node

```
I want to create a custom n8n node for [service name].

Service details:
- API base URL: [url]
- Authentication: [type]
- Operations I need: [list operations]

Generate:
1. The node's `description` property (name, group, version, credentials, properties)
2. The `execute()` method skeleton
3. The credentials definition file
Follow n8n's node development conventions.
```

---

### Add a new operation to an existing node

```
I want to add a "[operation name]" operation to the [NodeName] n8n node.

Current node code: [paste relevant excerpt]
New API endpoint: [method] [url]
Request parameters: [list params]
Response structure: [describe or paste]

Write the updated node code section including:
- New entry in the `operations` resource property
- The parameters definition
- The execute() case block
```

---

## 📝 Documentation Generation

### Document a workflow

```
Generate documentation for this n8n workflow:
[describe or paste workflow JSON / node list]

Include:
- **Purpose**: What problem this workflow solves
- **Trigger**: What starts it and how often
- **Node Summary**: Table with Node | Type | Description columns
- **Prerequisites**: Credentials and services needed
- **Configuration Variables**: Any environment-specific values
- **Error Handling**: How failures are managed
- **Maintenance Notes**: Anything an on-call engineer should know
Format as Markdown.
```

---

### Create a runbook for a workflow

```
Write an operational runbook for this n8n workflow:
[workflow name and description]

The workflow runs [frequency] and [describe what it does].

The runbook should cover:
1. Overview and business impact
2. How to manually trigger it (if applicable)
3. How to check execution history
4. Common failure modes and how to fix each
5. Escalation contacts
6. How to disable in an emergency
Format as a concise Markdown document.
```

---

## 📌 Tips for Using These Prompts

- **Paste real data**: Replace placeholder descriptions with actual JSON structures or API docs for much better results.
- **Iterate**: Start with a high-level prompt, then drill into specific nodes with follow-up prompts.
- **Specify versions**: Mention n8n version if you're on an older release to avoid suggestions for features not yet available.
- **Use the Code node freely**: The Code node (JavaScript or Python) can do almost anything. When stuck on a node's limitations, ask for a Code node alternative.
