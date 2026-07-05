# BolekFlow — Project Status

> Real-time tracking of development phases for workflow automation service.

---

## Current Phase: Phase 1 — API Contract Implementation

**Goal:** n8n instance ready to serve BolekAI with standardized HTTP API.

---

## ✅ Completed (Phase 1)

- [x] n8n base setup (Docker or self-hosted)
- [x] Agent integration documentation (AGENT-INTEGRATION.md)
- [x] API contract defined
  - [x] POST /api/agent/workflows/execute
  - [x] GET /api/agent/workflows/:id/status/:runId
  - [x] GET /api/agent/workflows/list
  - [x] POST /api/agent/workflows/:id/cancel/:runId
- [x] Workflow metadata schema
- [x] Development guide (DEVELOPMENT.md)

---

## 🔄 In Progress (Phase 1B — API Implementation)

- [ ] **Implement HTTP API endpoints**
  - [ ] POST /api/agent/workflows/execute
  - [ ] GET /api/agent/workflows/:id/status/:runId
  - [ ] GET /api/agent/workflows/list
  - [ ] POST /api/agent/workflows/:id/cancel/:runId

- [ ] **Workflow testing**
  - [ ] Test execute with sample workflow
  - [ ] Test status polling
  - [ ] Test list endpoint
  - [ ] Test error handling (invalid workflow, timeout)

- [ ] **Workflow templates**
  - [ ] Create: daily_briefing (example)
  - [ ] Create: support_triage (example)
  - [ ] Create: document_sync (example)

---

## ⏳ Next (Phase 2 — Advanced Features)

### Phase 2A: Approval Integration
- [ ] Check approval token before execution
- [ ] Return approval required status
- [ ] Execute only after approval

### Phase 2B: Monitoring
- [ ] Track workflow execution metrics
- [ ] Log execution times and errors
- [ ] Export metrics to Cloudflare KV

### Phase 2C: Advanced Workflows
- [ ] Error recovery (retry failed steps)
- [ ] Conditional branching
- [ ] Webhook triggers
- [ ] Scheduled execution

---

## 📋 Next Steps for Agents

1. **Deploy n8n locally:**
   ```bash
   docker-compose up -d n8n
   ```

2. **Create sample workflow in n8n UI:**
   - http://localhost:5678
   - Add simple nodes: Parameter → Log → Return
   - Get workflow ID

3. **Implement API endpoints** in n8n:
   - Add Express/Node.js server wrapper
   - Implement `/api/agent/workflows/*` routes
   - Add authentication (Bearer token)

4. **Test with BolekAI:**
   ```bash
   # Terminal 1: BolekAI
   npm run dev
   
   # Terminal 2: BolekFlow
   docker-compose up -d
   
   # Terminal 3: Test
   curl -X POST http://localhost:8787/webhook/test \
     -d '{"message":"run the test workflow"}'
   ```

5. **Verify:**
   - [ ] Workflow executes
   - [ ] Returns structured response
   - [ ] Status polling works
   - [ ] Error handling works

6. **Commit:**
   ```bash
   git commit -m "feat: implement agent API endpoints"
   git push -u origin claude/multi-repo-agent-j3bo9v
   ```

---

## Known Issues

### None yet

---

## Architecture & Integration

BolekFlow is a **tool** for BolekAI. It does not initiate actions.

```
BolekAI (decides to run workflow)
  ├─ calls flow_execute
  ├─ polls flow_get_status
  └─ returns result to user
       ↓
BolekFlow (n8n)
  ├─ receives execution request
  ├─ loads workflow
  ├─ executes nodes
  └─ returns structured result
```

### API Contracts

See `docs/AGENT-INTEGRATION.md` for full API specs:
- Input/output schemas
- Error handling
- Risk classification
- Workflow metadata

---

## Workflow Priority

For Phase 1, create these 3 test workflows:

1. **test_workflow** — Simple echo (for development)
2. **sample_report** — Data aggregation example
3. **sample_notification** — Notification example

Later add:
- daily_briefing
- support_triage
- document_sync

---

## Performance Targets

- **Execution latency:** < 5s (90th percentile)
- **API response time:** < 500ms
- **Success rate:** > 95%
- **Max concurrent:** 5 workflows
- **Max duration:** 30s per workflow

---

## Questions

- Should workflows be versioned?
- Should we support rollback?
- How to handle long-running workflows?
- Should we charge per execution?

---

## Links

- [`DEVELOPMENT.md`](DEVELOPMENT.md) — How to develop workflows
- [`docs/AGENT-INTEGRATION.md`](docs/AGENT-INTEGRATION.md) — API contract
- [`docs/MULTI-AGENT-ARCHITECTURE.md`](../BolekAI/docs/MULTI-AGENT-ARCHITECTURE.md) — System design
- [n8n Docs](https://docs.n8n.io/)

---

## Last Updated

2026-01-15 — Initial Phase 1 setup

**Next review:** After API endpoints implemented
