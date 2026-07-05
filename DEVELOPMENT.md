# BolekFlow — Development Guide

> How to develop and extend the workflow automation service.

---

## Quick Start

```bash
# Setup (n8n-based)
docker-compose up -d n8n      # Starts on :5678

# Create workflows via UI
# http://localhost:5678

# Test API
curl -X POST http://localhost:5678/api/agent/workflows/execute \
  -H "Authorization: Bearer token" \
  -d '{"workflowId":"test"}'

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

---

## Architecture

BolekFlow is a **tool provider** that executes workflows on demand.

```
BolekAI (agent)
  ├─ decides to run workflow
  ├─ POSTs to /api/agent/workflows/execute
  └─ polls status with /api/agent/workflows/:id/status/:runId
       ↓
BolekFlow (n8n)
  ├─ loads workflow definition
  ├─ executes nodes sequentially
  └─ returns structured result
```

---

## Creating a Workflow for Agent Use

### Example: Daily Briefing Workflow

1. **Create in n8n UI:**
   - Add nodes: Fetch stats → Compile → Send report
   - Set inputs: `{ date, includeStats }`
   - Set outputs: `{ success, summary, stats }`

2. **Configure metadata:**

```json
{
  "name": "daily_briefing",
  "description": "Compile daily stats and send briefing",
  "inputs": [
    { "name": "date", "type": "string", "required": true },
    { "name": "includeStats", "type": "boolean", "required": false }
  ],
  "outputs": [
    { "name": "success", "type": "boolean" },
    { "name": "summary", "type": "string" }
  ],
  "riskLevel": "low",
  "requiredApproval": false,
  "expectedDuration": 5000
}
```

3. **Deploy workflow:**
   - Publish in n8n
   - Get workflow ID
   - Add to allowlist in BolekAI

4. **Test with API:**

```bash
curl -X POST http://localhost:5678/api/agent/workflows/execute \
  -H "Authorization: Bearer BOLEK_FLOW_TOKEN" \
  -d '{
    "workflowId": "daily_briefing",
    "inputs": {
      "date": "2026-01-15",
      "includeStats": true
    }
  }'
```

---

## Workflow Best Practices

### ✅ DO:

- **Return structured output:**
  ```json
  {
    "success": true,
    "data": { "summary": "..." },
    "executionTime": 1234
  }
  ```

- **Handle errors gracefully:**
  ```json
  {
    "success": false,
    "error": "invalid_input",
    "message": "Date format must be YYYY-MM-DD"
  }
  ```

- **Log progress:**
  ```
  [WORKFLOW] step 1/5: fetching stats...
  [WORKFLOW] step 2/5: compiling data...
  ```

- **Use timeouts:**
  - Each step should have a timeout (5s default)
  - Workflow max 30s (agent limit)

- **Be idempotent:**
  - Same input = same output (safe to retry)
  - Use unique transaction IDs

### ❌ DON'T:

- Return raw logs (return structured data)
- Require approval within workflow (agent handles it)
- Store secrets in workflow (receive as inputs)
- Make synchronous calls > 10s (use async or webhook)
- Assume node order won't change (be explicit)

---

## API Implementation

### Endpoint: POST /api/agent/workflows/execute

```typescript
// Express handler
app.post('/api/agent/workflows/execute', async (req, res) => {
  const { workflowId, inputs, approval } = req.body
  
  // Validate auth
  if (!req.headers.authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  // Load workflow
  const workflow = await loadWorkflow(workflowId)
  if (!workflow) {
    return res.status(404).json({ error: 'Workflow not found' })
  }
  
  // Check approval if required
  if (workflow.requiresApproval && !approval?.token) {
    return res.status(403).json({
      requiresApproval: true,
      approvalId: generateId()
    })
  }
  
  // Execute
  const startTime = Date.now()
  const result = await executeWorkflow(workflow, inputs)
  const duration = Date.now() - startTime
  
  res.json({
    success: result.ok,
    runId: result.id,
    status: result.ok ? 'completed' : 'failed',
    output: result.data,
    executionTime: duration,
    errors: result.errors
  })
})
```

---

## Testing Workflows

```bash
# Local test
docker-compose up -d n8n

# Via UI: http://localhost:5678/editor (create and test)

# Via API
curl -X POST http://localhost:5678/api/agent/workflows/execute \
  -H "Authorization: Bearer token" \
  -d '{"workflowId":"test_workflow","inputs":{"param":"value"}}'

# Monitor
docker-compose logs -f n8n
```

---

## Common Workflow Patterns

### Pattern 1: Fetch & Report

```
HTTP Request (fetch data)
  ↓
Transform (process)
  ↓
HTTP Request (send report)
  ↓
Return { success: true, report: {...} }
```

### Pattern 2: External Integration

```
Parameter: API key (from input)
  ↓
HTTP Request (call external API)
  ↓
Parse response
  ↓
Return { success: true, data: {...} }
```

### Pattern 3: Conditional Branch

```
Check condition
  ├─ True → Execute branch A
  └─ False → Execute branch B
  ↓
Merge results
  ↓
Return { success: true }
```

---

## Monitoring & Logs

```bash
# See all workflow runs
GET /api/agent/workflows/:id/runs

# Get execution logs
GET /api/agent/workflows/:id/runs/:runId/logs

# Monitor real-time
docker-compose logs -f
```

---

## Environment Setup

```env
# Agent connection (optional)
BOLEK_API_URL=https://kulfon.pawel-perfect.workers.dev
BOLEK_API_TOKEN=... (for reporting back)

# n8n database
DATABASE_TYPE=postgresql
DATABASE_URL=postgres://...

# Workflow execution limits
WORKFLOW_TIMEOUT=30000  # 30 seconds max
MAX_CONCURRENT=5        # Max parallel workflows
```

---

## Deployment

```bash
# Local development
docker-compose up -d

# Production (with PostgreSQL)
docker-compose -f docker-compose.prod.yml up -d

# Verify
curl http://localhost:5678/api/agent/workflows/list \
  -H "Authorization: Bearer BOLEK_FLOW_TOKEN"
```

---

## Current Phase

See [`PROJECT_STATUS.md`](PROJECT_STATUS.md) for what's next.
