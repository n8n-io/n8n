---
description: Plan n8n Linear ticket implementation
argument-hint: [PAY-XXXX | DEV-XXXX | ENG-XXXX]
allowed-tools: Task
---

Launch a Plan agent (built-in) to create an implementation plan for Linear issue $ARGUMENTS.

The agent should:
1. Load the n8n-conventions skill for context
2. Fetch and analyze the Linear ticket
3. Identify affected packages and files
4. Design implementation approach
5. Define testing strategy
6. Document potential risks

Return a detailed, actionable plan ready for implementation.
