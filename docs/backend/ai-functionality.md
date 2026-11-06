---
title: AI functionality
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-06
contact: Cadiac
---

# AI functionality

n8n has these kinds of AI functionality:

- **AI agents:** Autonomous assistants that users build in n8n.
- **n8n Assistant:** An AI agent in the editor that builds workflows and AI agents for the user.
- **MCP server:** Allows an AI app to build workflows and AI agents for the user.
- **Skills:** Instructions that a user saves once, for AI agents and the n8n Assistant to follow.
- **Knowledge:** Files and vector stores that an AI agent searches.
- **MCP registry:** A catalog of external MCP servers that workflows and AI agents can use as nodes.

## AI agents

An **AI agent** answers questions and takes actions in other services, e.g. Slack or Google Sheets. A user builds an AI agent in the editor from these parts:

- **Instructions and a model:** The AI agent calls the model with a credential or with Gateway credits.
- **Tools:** An AI agent can call nodes, workflows, MCP servers, and custom tools. The [Agent turn](agent-turn.md#tools) page explains what runs each tool.
- **Sub-agents:** An AI agent can give a task to another AI agent, and wait for the result.
- **Triggers:** Chat integrations (e.g. Slack) and schedules start an AI agent. The [Agent publication](agent-publication.md#agent-triggers) page explains where each trigger runs.

Like a workflow, an AI agent has a draft and a published version. Triggers start only the published version.

An AI agent runs on the main process, outside the workflow engine. By contrast, the **AI Agent node** runs inside a workflow execution.

## n8n Assistant

The n8n Assistant (formerly called Instance AI) is an AI agent accessible via the editor. The Assistant builds, fixes, and explains workflows, and also builds AI agents. To do this, the Assistant calls tools that read and edit workflows, executions, and credentials.

Each tool runs with the permissions of the user, and some tools ask the user to approve a change first. The Assistant runs on the main process, and streams its answer to the editor as events.

## MCP server

A user connects an AI app (e.g. Claude Desktop) to the MCP server. The app can then search, run, test, publish, and build workflows and AI agents for the user. The app can access a workflow only if the user can access it and the workflow has MCP access turned on.

## Skills

A **skill** is a set of instructions that a user saves once. AI agents, the n8n Assistant, and AI apps that connect to the MCP server read a skill when they need it. A user can also sync skills from a GitHub repository. A synced skill is read-only in n8n. n8n checks the repository for changes, and the user accepts each update.

A published AI agent keeps the skill versions that it had at publication. An edit to a skill therefore changes only the draft of the AI agent, until the user publishes it again.

## Knowledge

**Knowledge** is data that an AI agent searches to answer questions. A user adds knowledge to an AI agent in two ways:

- **Files:** The user uploads files. To search them, n8n copies the files into a sandbox. The AI agent then finds files by name, and searches their text with a regular expression.
- **Vector stores:** The user connects a Pinecone, Qdrant, Supabase, or Postgres vector store. Each vector store becomes a tool of the AI agent, which searches it by meaning with an embedding model.

## MCP registry

The **MCP registry** is a catalog of external MCP servers that n8n hosts. For each server in the catalog, n8n makes a node type and an OAuth2 credential type at runtime. A user then adds the server to a workflow or an AI agent as a node, and signs in to the server with the credential. The credential sends requests only to the host of its server.

A task regularly fetches the catalog and saves it in the database. The task then tells the other mains and the open editors to load the new node types. A new server therefore reaches an instance without a release or a restart.
