# BolekFlow Wrapper — Structure & Architecture

> BolekFlow is a **thin wrapper** around n8n (forked, unmodified).
> The wrapper exposes Bolek-specific workflow execution API.

---

## Directory Structure

```
BolekFlow/
├── fork/                          # n8n fork (unmodified)
│   ├── packages/
│   ├── docker-compose.yml         # For n8n only
│   └── ...
│
├── src/                           # Wrapper (TypeScript/Node.js)
│   ├── index.ts                   # Entry point, Hono app
│   ├── adapter.ts                 # Translate Bolek ↔ n8n
│   ├── types.ts                   # Wrapper-specific types
│   └── logger.ts                  # Structured logging
│
├── docker-compose.yml             # Runs both: wrapper + n8n fork
├── package.json                   # Wrapper dependencies
├── WRAPPER-SETUP.md               # Implementation guide
└── fork-README.md                 # Original n8n README (reference)
```

---

## Wrapper Responsibilities

**The wrapper:**
- ✅ Listens on `:3001` (Bolek-facing)
- ✅ Calls n8n internally (on `:5678`)
- ✅ Implements Bolek workflow API (execute, status, list, cancel)
- ✅ Translates Bolek format ↔ n8n format
- ✅ Handles auth (Bearer token)
- ✅ Structured logging

**n8n (fork) does:**
- ✅ Runs on `:5678` (wrapper-facing)
- ✅ Manages workflows
- ✅ Executes nodes
- ✅ Stays completely unmodified

---

## API Endpoints

### Wrapper (Bolek-facing) — Port 3001

```
POST /api/agent/workflows/execute
  Input: { workflowId: string, inputs: {...} }
  Output: { runId: string, status: string, result: {...} }
  Auth: Bearer token

GET /api/agent/workflows/:id/status/:runId
  Input: workflowId, runId in path
  Output: { status: string, result: {...}, executionTime: number }
  Auth: Bearer token

GET /api/agent/workflows/list
  Input: (none)
  Output: { workflows: [...] }
  Auth: Bearer token

POST /api/agent/workflows/:id/cancel/:runId
  Input: workflowId, runId in path
  Output: { success: boolean }
  Auth: Bearer token
```

### n8n (fork-facing) — Port 5678

```
POST /api/v1/workflows/:id/execute
  (n8n native endpoint — wrapper calls this)

GET /api/v1/workflows/:id/executions/:executionId
  (n8n native endpoint — wrapper calls this)
```

---

## Implementation Phases

### Phase 1: Wrapper Scaffold
- Create `src/index.ts` with Hono server
- Create `docker-compose.yml` that starts both wrapper + fork
- Wrapper listens on :3001, calls fork on :5678

### Phase 2: Adapter Layer
- Create `src/adapter.ts`
- Implement workflow execution → n8n translation
- Implement status polling ← n8n translation

### Phase 3: Bolek API Endpoints
- POST /api/agent/workflows/execute (run workflow)
- GET /api/agent/workflows/:id/status/:runId (poll status)
- GET /api/agent/workflows/list (list all)
- POST /api/agent/workflows/:id/cancel/:runId (cancel run)

### Phase 4: Testing & Polish
- Unit tests for adapter
- Error handling (n8n down, timeout, invalid workflow)
- Logging

---

## Communication Flow

```
BolekAI (orchestrator)
  ↓ (HTTP POST)
  BolekFlow Wrapper (:3001)
    ├─ Receive workflow execution request
    ├─ Translate to n8n format
    ├─ Call n8n API (:5678)
    ├─ Start execution
    ├─ Return runId to BolekAI
    └─ Poll status on request
  ↓
  n8n Fork (:5678)
    ├─ Load workflow
    ├─ Execute nodes
    ├─ Store execution history
    └─ Return status/results
```

---

## Development Workflow

```bash
# 1. Start both wrapper + fork
docker-compose up

# 2. Access n8n UI (optional)
# http://localhost:5678

# 3. Test wrapper
curl -X POST http://localhost:3001/api/agent/workflows/execute \
  -H "Authorization: Bearer test_token" \
  -d '{"workflowId":"test","inputs":{}}'

# 4. List workflows
curl http://localhost:3001/api/agent/workflows/list \
  -H "Authorization: Bearer test_token"
```

---

## Environment Variables

### Wrapper (.env)
```env
NODE_ENV=development
LOG_LEVEL=info
BOLEK_API_TOKEN=test_token_for_dev
N8N_URL=http://n8n:5678     # Internal docker network
WRAPPER_PORT=3001
```

### n8n fork (fork/.env)
```env
N8N_HOST=0.0.0.0
N8N_PORT=5678
N8N_PROTOCOL=http
WEBHOOK_TUNNEL_URL=http://localhost:5678
```

---

## Testing Strategy

### Unit Tests
- Test adapter translation (Bolek ↔ n8n)
- Mock n8n responses
- Test error scenarios

### Integration Tests
- Start both wrapper + mock n8n
- Test workflow execution lifecycle

### End-to-End
- Real wrapper + real n8n
- Execute actual workflow
- Verify results

---

## Maintenance

### Upgrading n8n Fork
```bash
cd fork/
git fetch upstream
git merge upstream/main
docker-compose build n8n
```

Wrapper stays clean — no merge conflicts.

---

## Next Steps

See [WRAPPER-SETUP.md](WRAPPER-SETUP.md) for implementation.
