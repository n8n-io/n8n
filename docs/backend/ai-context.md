---
title: Context for AI
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-06
contact: RicardoE105
---

# Context for AI

[Agent turn](agent-turn.md) and [AI for building](ai-for-building.md) showed AI features that call a model. A model knows only what is in its prompt. This page explains how n8n gives AI more context: skills, knowledge, and external tools.

| Feature | What it gives a model | Code |
|---|---|---|
| Skills | Reusable instructions | `skills` module |
| Knowledge | Files and vector stores to search | `knowledge` module, and parts of the `agents` module |
| MCP registry | Tools of external MCP servers, as nodes | `mcp-registry` module |

> [!WARNING]
> **The knowledge module never checks project membership.** The caller, such as the `agents` module, checks who owns the agent before it asks for knowledge.

## Skills

A **skill** is a set of instructions that a user saves once and AI features read when they need it. The `skills` module owns the tables `skill`, `skill_version`, and `skill_file`, the rules of skills, and the routes under `/skills`.

Three features read skills:

- **Agents** refer to skills, and a published version of an agent pins the skill versions that it uses. The `agents` module owns these references.
- **The n8n Assistant** reads skills through an adapter in the `instance-ai` module.
- **MCP clients** read skills through tools of the MCP server.

Skill Sync copies skills from a source, such as a GitHub repository, and a task checks the source at an interval.

The `agents` module needs `skills`. n8n therefore keeps `skills` on while `agents` is on, also when `N8N_DISABLED_MODULES` names `skills`.

## Knowledge

**Knowledge** is the data that an agent searches: files that a user uploads, and external vector stores that a user connects.

The code moves from the `agents` module to the `knowledge` module in steps. The `knowledge` module now builds the vector-store connections, resolves their embedding credentials, and tests the connections. The upload, the storage, and the search of files are still in the `agents` module. To search files, n8n copies them into a sandbox and runs search commands there.

## MCP registry

The MCP registry is a catalog of external MCP servers. n8n makes a node and a credential type for each server in the catalog. A workflow or an agent then uses the external server as a node.

n8n reads the catalog from a remote registry. A system task refreshes it every 8 hours, so a new server reaches the instance without a restart. Gateway credits adds its own MCP servers to the catalog, with a reserved prefix.

## Quiz

1. `N8N_DISABLED_MODULES` names `skills`, and the `agents` module is on. Does `skills` run?
   - A. No. `N8N_DISABLED_MODULES` always wins.
   - B. Yes. n8n keeps `skills` on while `agents` is on.
   - C. Only on the leader.
   - D. Only with a license.
2. A new function in the `knowledge` module returns the files of an agent. Where does the permission check go?
   - A. In the `knowledge` module.
   - B. In the caller.
   - C. In the database, with a row filter.
   - D. Nowhere. Files of an agent are public.

<details>
<summary>Answers</summary>

1. B. The `agents` module needs `skills`, so n8n keeps it on.
2. B. The `knowledge` module never checks project membership. Ownership is the job of the caller.

</details>
