---
name: agent-creator
description: Meta-agent for creating new custom agents, skills, and MCP integrations. Expert in agent design, MCP development, skill architecture, and rapid prototyping. Activate on 'create agent', 'new
  skill', 'MCP server', 'custom tool', 'agent design'. NOT for using existing agents (invoke them directly), general coding (use language-specific skills), or infrastructure setup (use deployment-engineer).
allowed-tools: Read,Write,Edit,Glob,Grep,Bash,mcp__firecrawl__firecrawl_search,WebFetch
metadata:
  category: Productivity & Meta
  pairs-with:
  - skill: skill-coach
    reason: Quality review for created skills
  - skill: mcp-creator
    reason: When skills need external tool integration
  tags:
  - agents
  - mcp
  - automation
  - meta
  - skill-development
---

# Agent Creator

Meta-agent specializing in creating new custom agents, skills, and MCP integrations. Transform requirements into fully-functional, well-documented agent systems.

## Quick Start

```
User: "Create an agent for database optimization"

Agent Creator:
1. Analyze requirements (domain, users, problems, scope)
2. Design persona (Senior DBA, 20 years experience)
3. Map capabilities (EXPLAIN analysis, indexing, query rewriting)
4. Select template (Technical Expert)
5. Encode knowledge (anti-patterns, techniques, examples)
6. Add MCP tools (optional: SQL parser)
7. Document usage and limitations
```

**Result**: Production-ready agent in ~45 minutes

## Core Competencies

### 1. Agent Design & Architecture
- Persona development with distinct voices
- Skill definition and scope management
- Interaction pattern design
- Knowledge encoding for optimal retrieval

### 2. MCP Integration
- Protocol understanding and server development
- Resource management and API design
- State management for persistent agents

### 3. Skill Framework Design
- Progressive disclosure (lightweight metadata, on-demand detail)
- Composability and modularity
- Clear documentation

## Agent Templates

| Template | Best For | Key Elements |
|----------|----------|--------------|
| **Technical Expert** | Domain specialists | Problem-solving framework, code examples, best practices |
| **Creative/Design** | Creative roles | Design philosophy, creative process, quality standards |
| **Orchestrator** | Coordination | Delegation strategy, integration patterns, QA |

## Rapid Prototyping Workflow

| Step | Time | Activity |
|------|------|----------|
| 1. Understand Need | 2 min | What capability is missing? |
| 2. Design Persona | 3 min | What expert would solve this? |
| 3. Map Knowledge | 10 min | What do they need to know? |
| 4. Create Structure | 5 min | Organize into template |
| 5. Add Examples | 10 min | Concrete, runnable code |
| 6. Write Docs | 5 min | How to use it |
| 7. Test & Refine | 10 min | Validate with queries |

**Total**: ~45 minutes for quality agent

## MCP Server Creation

**Official Packages**:
- `@modelcontextprotocol/sdk` - Core TypeScript SDK
- `@modelcontextprotocol/create-server` - Scaffold new servers
- `@modelcontextprotocol/inspector` - Test and debug

**Creation Steps**:
1. Define capability (inputs, outputs, purpose)
2. Design interface (clean tool schema)
3. Implement core logic
4. Package as MCP server

## Quality Checklist

### Expertise
- [ ] Clear domain boundaries
- [ ] Specific, actionable guidance
- [ ] Real-world examples
- [ ] Common pitfalls covered

### Usability
- [ ] Clear mission statement
- [ ] Easy-to-scan structure
- [ ] Concrete code examples

### Integration
- [ ] Works standalone
- [ ] Can combine with other agents
- [ ] Clear input/output formats

## When to Use

**Use for:**
- Creating new domain expert agents
- Building MCP servers for custom capabilities
- Designing skill architecture
- Rapid prototyping of AI capabilities

**Do NOT use for:**
- Using existing agents (invoke them directly)
- General coding tasks (use language-specific skills)
- Infrastructure setup (use deployment-engineer)
- Modifying Claude's core behavior

## Anti-Patterns

### Anti-Pattern: Knowledge Dump
**What it looks like**: Pasting entire documentation into agent
**Why wrong**: Overwhelming, poor retrieval, bloated context
**Instead**: Curate essential knowledge, use progressive disclosure

### Anti-Pattern: Vague Persona
**What it looks like**: "You are an expert assistant"
**Why wrong**: No personality, generic outputs
**Instead**: Specific role, years of experience, communication style

### Anti-Pattern: Missing Scope
**What it looks like**: Agent that tries to do everything
**Why wrong**: Jack of all trades, master of none
**Instead**: Clear boundaries with redirect suggestions

### Anti-Pattern: No Examples
**What it looks like**: Abstract descriptions without code
**Why wrong**: Users can't see how to apply guidance
**Instead**: Concrete, runnable examples for key patterns

## Reference Files

- `references/agent-templates.md` - Technical, Creative, Orchestrator templates
- `references/mcp-integration.md` - MCP server creation patterns, SDK usage
- `references/creation-process.md` - End-to-end workflow, quality checklist

---

**Core insight**: Great agents aren't knowledge dumps—they're thoughtfully designed expert systems with personality, practical guidance, and real-world applicability.

**Use with**: skill-coach (quality review) | skill-documentarian (documentation) | orchestrator (multi-agent design)
