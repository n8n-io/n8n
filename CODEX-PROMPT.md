# CODEX-PROMPT — Start Here

> Copy the text below and send it to Codex to start implementing the wrapper.

---

## Prompt for Codex

```
You are working in repository /home/user/BolekFlow on branch claude/multi-repo-agent-j3bo9v.

Read the file WRAPPER-SETUP.md in this repo.

Implement BolekFlow wrapper according to those instructions, in order.

BolekFlow is a thin TypeScript wrapper around n8n (forked, unmodified).

Tasks 1-10:

1. Initialize wrapper package.json with Hono dependencies
2. Create TypeScript config (tsconfig.json)
3. Define wrapper types (src/types.ts) for Bolek/n8n workflow formats
4. Implement logger (src/logger.ts)
5. Implement n8n adapter (src/adapter.ts) for workflow execution translation
   - executeWorkflow(request) → start n8n execution
   - getExecutionStatus(workflowId, runId) → poll status
   - listWorkflows() → list available
   - cancelExecution(workflowId, runId) → cancel run
6. Create Hono server (src/index.ts) with workflow endpoints
7. Add Docker compose (docker-compose.yml) for wrapper + n8n
8. Create environment config (.env.example, .env)
9. Write unit tests (src/__tests__/adapter.test.ts)
10. Create README (WRAPPER-README.md)

Each task in WRAPPER-SETUP.md includes:
- Exact file path
- Complete code snippets to copy
- Commit message

After each task:
1. Commit: git commit -m "..."
2. Continue to next task
3. After all tasks: git push -u origin claude/multi-repo-agent-j3bo9v

If stuck:
- Read WRAPPER-STRUCTURE.md for architecture
- Check n8n API endpoints
- Verify Docker network setup

Start with Task 1 (package.json).
```

---

## How to Use

1. Copy the prompt above
2. Send to Codex
3. Codex follows WRAPPER-SETUP.md
4. Should complete in 3-5 turns

---

## What Gets Built

Workflow wrapper (~500 lines):
- `package.json` — Hono + deps
- `tsconfig.json`
- `src/types.ts` — Workflow format types
- `src/logger.ts`
- `src/adapter.ts` — n8n API translation
- `src/index.ts` — Hono server (4 endpoints)
- `docker-compose.yml`
- `src/__tests__/adapter.test.ts`
- `.env` config

Result: Bolek-compatible workflow API at http://localhost:3001

---

## Expected Endpoints

After Codex finishes:
- `POST /api/agent/workflows/execute` — Start workflow
- `GET /api/agent/workflows/:id/status/:runId` — Poll status
- `GET /api/agent/workflows/list` — List workflows
- `POST /api/agent/workflows/:id/cancel/:runId` — Cancel execution

All with Bearer token auth.

---

## Timeline

3-5 turns total.
