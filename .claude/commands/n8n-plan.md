---
description: Plan n8n Linear ticket implementation
argument-hint: [PAY-XXXX | DEV-XXXX | ENG-XXXX]
allowed-tools: Task
---

Launch a Plan agent (built-in) to create an implementation plan for Linear issue $ARGUMENTS.

The agent should:
1. Fetch and analyze the Linear ticket using Linear MCP
2. Identify affected packages and files
3. Design implementation approach following n8n conventions
4. Define testing strategy
5. Document potential risks

Apply n8n architectural patterns (monorepo structure, TypeScript standards, Vue 3 Composition API, Controller-Service-Repository, etc.).

Return a detailed, actionable plan ready for implementation.
