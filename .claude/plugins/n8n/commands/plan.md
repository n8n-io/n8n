---
description: Plan n8n Linear ticket implementation
argument-hint: [PAY-XXXX | DEV-XXXX | ENG-XXXX]
allowed-tools: Task, Agent, Read, Glob, Grep, Write, Bash
---

Launch a Plan agent (built-in) to research and design an implementation plan for Linear issue $ARGUMENTS.

The agent should:
1. Fetch and analyze the Linear ticket using Linear MCP
2. Identify affected packages and files
3. Design implementation approach following n8n conventions
4. Define testing strategy
5. Document potential risks

Apply n8n architectural patterns (monorepo structure, TypeScript standards, Vue 3 Composition API, Controller-Service-Repository, etc.).

The agent should return the full plan as text (it cannot write files). After receiving the result, save it to `.claude/plans/<TICKET-ID>.md` (e.g. `.claude/plans/PAY-1234.md`). Create the directory if needed. This directory is gitignored.

The plan file should contain:
- The ticket title and link
- A summary of the ticket
- The full implementation plan
- Testing strategy
- Risks and open questions
