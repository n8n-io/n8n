# n8n Documentation

> **n8n** – Secure Workflow Automation for Technical Teams

This `/docs` directory contains comprehensive documentation for running n8n locally, understanding its architecture, and building automations with it.

---

## 📖 Table of Contents

| Document | Description |
|---|---|
| [Getting Started](./GETTING_STARTED.md) | Quick-start guide to run n8n locally in minutes |
| [Local Setup](./LOCAL_SETUP.md) | Full developer setup with source code, pnpm, and VS Code |
| [Use Cases](./USECASES.md) | 20+ real-world automation use cases with workflow examples |
| [Prompts](./PROMPTS.md) | Reusable AI prompts for building n8n workflows faster |
| [Architecture](./ARCHITECTURE.md) | Monorepo structure, package relationships, and key patterns |
| [Troubleshooting](./TROUBLESHOOTING.md) | Common errors, fixes, and diagnostic commands |

---

## ⚡ 60-Second Quick Start

**Using Docker (recommended):**
```bash
docker volume create n8n_data
docker run -it --rm --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n
```
Then open **http://localhost:5678**.

**Using npx (no install required):**
```bash
npx n8n
```

---

## 🗺️ Navigation

- **New to n8n?** → Start with [Getting Started](./GETTING_STARTED.md)
- **Setting up for development?** → Go to [Local Setup](./LOCAL_SETUP.md)
- **Looking for workflow ideas?** → Browse [Use Cases](./USECASES.md)
- **Building AI-assisted workflows?** → See [Prompts](./PROMPTS.md)
- **Debugging an issue?** → Check [Troubleshooting](./TROUBLESHOOTING.md)
- **Contributing to the repo?** → Read [Architecture](./ARCHITECTURE.md) then [CONTRIBUTING.md](../CONTRIBUTING.md)

---

## 🤖 AI Agents

The [`/agents`](../agents/) folder contains pre-built Claude Code agent skills for common n8n development tasks. See the [agents README](../agents/README.md) for details.

---

## 🔗 Official Resources

- **Documentation:** https://docs.n8n.io
- **Community Forum:** https://community.n8n.io
- **Integrations:** https://n8n.io/integrations
- **Workflow Templates:** https://n8n.io/workflows
- **AI Nodes Guide:** https://docs.n8n.io/advanced-ai/
