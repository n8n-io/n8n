# n8n Agent Skills & Plugins

This directory contains Claude Code agent skills and plugins tailored for n8n development workflows. They extend the Claude Code assistant with n8n-specific knowledge and automation capabilities.

---

## 📋 Available Agents

| Agent | Description | When to Use |
|---|---|---|
| [workflow-automation](./workflow-automation/) | Design, debug, and optimise n8n workflows | Building or troubleshooting workflows |
| [node-development](./node-development/) | Scaffold and implement custom n8n nodes | Creating new integrations |
| [integration-helper](./integration-helper/) | Map external APIs to n8n node operations | Connecting third-party services |
| [linkedin-post-generator](./linkedin-post-generator/) | Research trending topics and generate LinkedIn posts | Social media content creation |
| [it-ops](./it-ops/) | Monitor infrastructure and manage incidents | IT operations and incident response |
| [servicenow-ticket](./servicenow-ticket/) | End-to-end ServiceNow ticket lifecycle management | ITSM ticket operations |

---

## 🚀 Quick Start

### Using Agents with Claude Code

1. Ensure Claude Code is installed and configured:
   ```bash
   claude --version
   ```

2. Start Claude Code in the repository root:
   ```bash
   # Claude Code CLI (install from https://claude.ai/download)
   claude
   ```

3. Invoke a skill using slash commands:
   ```
   > /workflow-automation Design a webhook-triggered workflow that sends Slack alerts
   > /node-development Scaffold a custom node for the Stripe API
   > /integration-helper Map the GitHub REST API to n8n node operations
   ```

---

## 🗂️ Agent Structure

Each agent follows this layout:

```
agents/<agent-name>/
├── SKILL.md         # Claude Code skill definition (loaded automatically)
├── README.md        # Human-readable documentation and examples
└── examples/        # Example prompts and expected outputs
    └── *.md
```

---

## 🔧 How Agents Work

These agents are **Claude Code skills** — Markdown files loaded by the `.claude/` configuration. When you invoke a skill, Claude Code gains access to its specialised instructions, constraints, and examples.

The agents in this directory complement the core development agents in [`.claude/agents/`](../.claude/agents/):

- **`.claude/agents/n8n-developer`** — Full-stack n8n implementation agent
- **`agents/workflow-automation`** — Workflow design and debugging specialist
- **`agents/node-development`** — Custom node scaffolding specialist
- **`agents/integration-helper`** — Third-party API integration assistant

---

## 🏗️ Creating a New Agent

1. Create a new directory under `agents/`:
   ```bash
   mkdir -p agents/my-new-agent/examples
   ```

2. Add a `SKILL.md` with the agent definition (see any existing agent for format).

3. Add a `README.md` with usage documentation.

4. Register the skill in `.claude/skills/` if it should be available as a slash command.

---

## 📖 Related Documentation

- [Docs: Use Cases](../docs/USECASES.md) — Automation patterns these agents help build
- [Docs: Prompts](../docs/PROMPTS.md) — Prompt templates to use with these agents
- [AGENTS.md](../AGENTS.md) — Repository-wide coding conventions
- [CONTRIBUTING.md](../CONTRIBUTING.md) — How to contribute to this repository
