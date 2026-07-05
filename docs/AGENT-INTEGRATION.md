# BolekFlow — Agent Integration Architecture

> **Role in Bolek Network:** Workflow Automation Service
>
> BolekFlow executes workflows on behalf of Agent Bolek. It is a **tool provider** — not a decision-maker. The agent decides when and how to run workflows.

---

## 1. Role Definition

**What BolekFlow Is:**
- Workflow execution engine (n8n-based)
- Automation orchestration
- Multi-step process automation
- Event triggers and webhooks
- Workflow templates and versioning

**What BolekFlow Is NOT:**
- Not the decision-maker (BolekAI decides)
- Not autonomous (waits for agent command)
- Not a secret keeper (scoped credentials only)
- Not the approval authority (agent enforces policy)

---

## 2. Communication Flow

### BolekFlow → BolekAI (Tool Provider)

BolekFlow provides a **tool interface** that BolekAI calls.

```
Agent: "Run the daily briefing workflow"
  ↓
BolekAI.orchestrator decides to call flow_execute
  ↓
BolekAI calls flow_execute_workflow tool
  ├─ workflowId: "daily_briefing"
  ├─ inputs: { date: "2026-01-15" }
  └─ approval?: { id: "apr_123", token: "..." }
  ↓
BolekFlow receives request via HTTP
  ├─ validates auth
  ├─ loads workflow definition
  ├─ executes workflow
  └─ returns execution result
  ↓
BolekAI receives result
  ├─ logs execution
  ├─ updates memory
  └─ sends response to user
```

---

## 3. API Contract: BolekFlow ↔ BolekAI

### Endpoint: POST /api/agent/workflows/execute

Execute a workflow.

**Request:**

```typescript
{
  workflowId: string              // Workflow identifier
  inputs?: Record<string, unknown> // Input parameters
  approval?: {
    id: string                    // Approval ID (if required)
    token: string                 // Approval execution token
  }
  timeout?: number                // Max execution time (ms)
  idempotencyKey?: string         // For retries
}
```

**Response:**

```typescript
{
  success: boolean
  runId: string                   // Execution run ID
  status: 'running' | 'completed' | 'failed'
  output?: Record<string, unknown> // Workflow output
  executionTime: number           // ms
  logsUrl?: string                // Link to execution logs
  errors?: string[]
  nextStepInformation?: {
    requiresApproval?: boolean
    approvalId?: string
    estimatedTime?: number
  }
}
```

**Example:**

```bash
curl -X POST http://localhost:5678/api/agent/workflows/execute \
  -H "Authorization: Bearer BOLEK_FLOW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": "daily_briefing",
    "inputs": {
      "date": "2026-01-15",
      "includeStats": true
    }
  }'

Response:
{
  "success": true,
  "runId": "run_xyz_123",
  "status": "running",
  "logsUrl": "http://bolekflow:5678/runs/run_xyz_123"
}
```

### Endpoint: GET /api/agent/workflows/:workflowId/status/:runId

Check execution status.

```typescript
Response:
{
  runId: string
  status: 'running' | 'completed' | 'failed'
  progress?: number               // 0-100
  output?: Record<string, unknown>
  startedAt: string
  completedAt?: string
  duration?: number               // ms
  lastUpdate: string
}
```

### Endpoint: GET /api/agent/workflows/list

List all workflows.

```typescript
Response:
{
  workflows: Array<{
    id: string
    name: string
    description: string
    version: string
    triggers: string[]            // 'manual' | 'webhook' | 'cron' | 'event'
    inputs: Array<{
      name: string
      type: 'string' | 'number' | 'boolean' | 'object'
      required: boolean
      description: string
    }>
    outputs: Array<{
      name: string
      type: string
      description: string
    }>
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
    requiredApproval: boolean
    lastRun?: {
      runId: string
      status: string
      time: string
    }
  }>
}
```

**Example:**

```bash
curl http://localhost:5678/api/agent/workflows/list \
  -H "Authorization: Bearer BOLEK_FLOW_TOKEN"

Response:
{
  "workflows": [
    {
      "id": "daily_briefing",
      "name": "Daily Briefing",
      "description": "Compile daily stats and send briefing",
      "riskLevel": "low",
      "requiredApproval": false,
      "triggers": ["cron", "manual"]
    },
    {
      "id": "support_triage",
      "name": "Support Email Triage",
      "description": "Categorize and tag support emails",
      "riskLevel": "medium",
      "requiredApproval": false,
      "triggers": ["webhook"]
    }
  ]
}
```

### Endpoint: POST /api/agent/workflows/:workflowId/cancel/:runId

Cancel a running workflow.

```typescript
Request: {} (empty body)

Response:
{
  success: boolean
  runId: string
  status: 'cancelled'
  message: string
}
```

### Endpoint: GET /api/agent/workflows/:workflowId/runs

List execution history.

```typescript
Response:
{
  runs: Array<{
    runId: string
    status: 'running' | 'completed' | 'failed'
    startedAt: string
    completedAt?: string
    duration?: number
    inputSnapshot: Record<string, unknown>
  }>
  totalCount: number
  pageSize: number
}
```

---

## 4. Workflow Design Guidelines

### For Agent Use

Workflows that BolekAI will trigger should:

**✅ DO:**
- Have clear, documented inputs
- Return structured output (not just logs)
- Handle errors gracefully
- Be idempotent (same input = same output)
- Have timeout < 30 seconds (agent should be responsive)
- Log progress to stdout (for monitoring)

**❌ DON'T:**
- Require manual approval within the workflow (agent handles approvals)
- Store secrets (agent provides scoped credentials via inputs)
- Have side effects outside their scope
- Use hardcoded values (accept as parameters)

### Example: Safe Workflow

```
Workflow: "send_email_approval"

Inputs:
  - to: string (recipient email)
  - subject: string
  - body: string
  - approval_token?: string (if high-risk)

Process:
  1. Validate inputs (email format, etc.)
  2. Check approval_token if provided
  3. Call email service
  4. Log result

Outputs:
  - success: boolean
  - messageId: string
  - timestamp: string

Error handling:
  - Invalid email → return { success: false, error: "invalid_email" }
  - Service down → return { success: false, error: "service_unavailable" }
  - Invalid token → return { success: false, error: "approval_denied" }
```

---

## 5. Workflow Metadata

Each workflow should have a **manifest** describing it for the agent:

```json
{
  "id": "send_email",
  "name": "Send Email",
  "description": "Send an email to recipient",
  "version": "1.0.0",
  "triggers": ["manual"],
  "inputs": [
    {
      "name": "to",
      "type": "string",
      "description": "Recipient email address",
      "required": true
    },
    {
      "name": "subject",
      "type": "string",
      "required": true
    },
    {
      "name": "body",
      "type": "string",
      "required": true
    }
  ],
  "outputs": [
    {
      "name": "success",
      "type": "boolean"
    },
    {
      "name": "messageId",
      "type": "string"
    }
  ],
  "riskLevel": "medium",
  "requiredApproval": true,
  "expectedDuration": 3000,
  "retryPolicy": "exponential",
  "idempotency": "required"
}
```

Agent uses this metadata to:
- Understand what workflow does
- Know which inputs to provide
- Know if approval is needed
- Handle timeouts appropriately

---

## 6. Risk Classification

Workflows should declare their risk level:

### Low Risk
- Read-only operations
- Data aggregation
- Analysis and reports
- **Example:** "daily_stats"

### Medium Risk
- Internal writes (notes, tasks)
- Non-financial updates
- **Example:** "create_support_ticket"

### High Risk
- External writes (emails, GitHub)
- Financial operations
- Data deletion
- **Example:** "send_email_to_customer"

### Critical Risk
- Refunds
- Mass operations
- Production changes
- **Example:** "refund_payment" (not in BolekFlow, in BolekAI core)

---

## 7. Authentication & Secrets

### BolekFlow → BolekAI Auth

BolekFlow has `BOLEK_API_TOKEN` that it uses to:
- Report workflow completion back to BolekAI (if needed)
- Query agent state

```env
BOLEK_API_URL=https://kulfon.pawel-perfect.workers.dev
BOLEK_API_TOKEN=... (shared secret)
```

### Workflow Credentials

Workflows **never store secrets directly**. Instead:

```typescript
// WRONG:
workflow.nodes.email.credentials = {
  api_key: "sk_live_..." // ❌ Don't do this
}

// RIGHT:
// Agent passes credentials at runtime via inputs
// or workflow queries secure credential store
workflow.inputs = {
  email_api_key: "sk_live_..." // From agent, through secure channel
}

// Or use n8n credential system with scoped keys
```

---

## 8. Development Setup

### Local Testing

```bash
# Terminal 1: n8n (BolekFlow)
docker-compose up -d n8n     # runs on localhost:5678

# Terminal 2: BolekAI
cd /home/user/BolekAI
npm run dev                    # http://localhost:8787

# .env for BolekAI
FLOW_SERVICE_URL=http://localhost:5678
FLOW_SERVICE_TOKEN=test_token_dev
```

### Create Test Workflow

```
In n8n UI:
1. Create workflow "Test Echo"
2. Input: add Parameter node with { message: string }
3. Output: return { echo: message }
4. Deploy
5. Get workflow ID from n8n
```

### Test via curl

```bash
curl -X POST http://localhost:5678/api/agent/workflows/execute \
  -H "Authorization: Bearer test_token_dev" \
  -d '{
    "workflowId": "test_echo",
    "inputs": { "message": "Hello" }
  }'
```

---

## 9. Monitoring & Observability

### What to Track

- **Execution time:** How long does each workflow take?
- **Success rate:** Do workflows complete successfully?
- **Error patterns:** Which steps fail most often?
- **Resource usage:** CPU, memory, API calls

### Logging Standards

Each workflow execution should log:

```
[WORKFLOW] daily_briefing
  runId: run_xyz_123
  startedAt: 2026-01-15T09:00:00Z
  step: 1 - fetch_stats (200ms)
  step: 2 - compile_briefing (500ms)
  step: 3 - send_report (300ms)
  completedAt: 2026-01-15T09:01:00Z
  duration: 1000ms
  success: true
```

### Dashboards

- Total workflows run per day
- Average execution time per workflow
- Error rate by workflow
- Most-used workflows
- Resource consumption

---

## 10. Deployment

### BolekFlow Deployment

**Development:**
```bash
docker-compose up n8n      # runs with SQLite
```

**Production:**
```bash
# Use managed n8n or self-hosted with PostgreSQL
docker-compose -f docker-compose.prod.yml up n8n
```

### API Availability

BolekFlow should expose `/api/agent/*` endpoints:

```bash
# Health check
GET /api/agent/health
Response: { status: "ok", version: "..." }
```

---

## 11. Security

### Never In BolekFlow

- ❌ Stripe keys (if not needed for workflow)
- ❌ Email credentials (receive from agent at runtime)
- ❌ GitHub tokens (receive from agent)
- ❌ Approval logic (agent enforces)

### Example: Safe Workflow Execution

```
Agent: "Send email and log it"
  ├─ Policy check: MEDIUM risk
  ├─ User approved in Telegram
  ├─ Creates approval_token
  └─ Calls flow_execute with token

BolekFlow: Receives request
  ├─ Validates approval_token
  ├─ Loads workflow "send_email"
  ├─ Executes with approval context
  └─ Returns result

Agent: Receives result
  ├─ Logs to audit trail
  ├─ Updates memory
  └─ Responds to user
```

---

## 12. Workflow Templates

Common workflows to implement:

- **daily_briefing** — Compile stats, send summary
- **support_triage** — Email categorization, tagging
- **document_sync** — Pull updates from external source
- **report_generation** — Monthly/weekly reports
- **data_validation** — Check data integrity
- **notification_dispatch** — Send notifications
- **cleanup_tasks** — Archive old data

Each should have:
- Clear inputs/outputs
- Error handling
- Logging
- Timeout handling
- Idempotency

---

## 13. Metrics Example

```typescript
// In workflow completion handler
const metric = {
  workflowId: 'daily_briefing',
  runId: 'run_xyz',
  status: 'completed',
  duration: 1250,
  stepCount: 5,
  successRate: 1.0,
  apiCallsCount: 3,
  errorCount: 0,
  timestamp: new Date().toISOString()
}

// Send to monitoring
await sendMetric(metric)
```

---

## 14. Architecture Summary

```
BolekAI (Cloudflare)
├── Orchestrator sees flow_execute tool
├── LLM chooses which workflow to run
├── Policy engine checks if approval needed
└── Calls /api/agent/workflows/execute
        ↓
BolekFlow (n8n or Docker)
├── Receives request
├── Loads workflow definition
├── Executes nodes sequentially
└── Returns structured result
        ↓
BolekAI
├── Receives result
├── Logs to audit
├── Updates memory
└── Sends response to user
```

---

## 15. Related Docs

- [`docs/BOLEK-NETWORK.md`](../BolekAI/docs/BOLEK-NETWORK.md) — High-level ecosystem
- [`docs/MULTI-AGENT-ARCHITECTURE.md`](../BolekAI/docs/MULTI-AGENT-ARCHITECTURE.md) — Detailed tri-tier design
- [n8n Docs](https://docs.n8n.io/) — Workflow engine documentation

---

## Key Principle

> **BolekFlow is a tool, not the orchestrator.**
>
> It executes workflows. It does not decide which to run.
> It handles automation. It does not enforce policy.
> It provides capabilities. It does not make approvals.
>
> BolekAI is the **decision-maker**. BolekFlow is the **executor**.
