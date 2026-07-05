# BolekFlow Wrapper — Implementation Setup

> Step-by-step implementation guide. For Codex to follow.

---

## Task 1-4: Same as BolekCzat

**Task 1:** Initialize wrapper `package.json` (same structure as BolekCzat)
**Task 2:** Create `tsconfig.json` (identical)
**Task 3:** Create `src/types.ts`

**File:** `src/types.ts` for BolekFlow:

```typescript
export interface BolekWorkflowExecution {
  workflowId: string
  inputs: Record<string, any>
}

export interface BolekExecutionResult {
  runId: string
  status: 'running' | 'completed' | 'failed'
  result?: Record<string, any>
  error?: string
  executionTime?: number
}

export interface BolekWorkflow {
  id: string
  name: string
  description?: string
  createdAt: string
}

export interface N8nExecution {
  id: string
  workflowId: string
  status: 'new' | 'running' | 'success' | 'error' | 'aborted'
  startedAt: string
  stoppedAt?: string
  executionData?: {
    resultData?: {
      runData: Record<string, any>
    }
    error?: Record<string, any>
  }
}
```

**Task 4:** Create `src/logger.ts` (identical to BolekCzat)

---

## Task 5: n8n Adapter

**File:** `src/adapter.ts`

```typescript
import { Logger } from './logger'
import type { BolekWorkflowExecution, BolekExecutionResult, BolekWorkflow, N8nExecution } from './types'

export class N8nAdapter {
  private baseUrl: string
  private logger: Logger
  private apiKey?: string

  constructor(baseUrl: string, logger: Logger, apiKey?: string) {
    this.baseUrl = baseUrl
    this.logger = logger
    this.apiKey = apiKey
  }

  async executeWorkflow(request: BolekWorkflowExecution): Promise<BolekExecutionResult> {
    try {
      const startTime = Date.now()

      const response = await fetch(`${this.baseUrl}/api/v1/workflows/${request.workflowId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'X-N8N-API-KEY': this.apiKey })
        },
        body: JSON.stringify({
          data: request.inputs
        })
      })

      if (!response.ok) {
        this.logger.error('n8n API error', { status: response.status })
        return {
          runId: '',
          status: 'failed',
          error: `n8n returned ${response.status}`
        }
      }

      const data = await response.json()
      const executionTime = Date.now() - startTime

      return {
        runId: data.execution?.id || data.id || `run_${Date.now()}`,
        status: this.mapN8nStatus(data.execution?.status || 'running'),
        result: data.data,
        executionTime
      }
    } catch (err) {
      this.logger.error('Adapter error in executeWorkflow', { error: String(err) })
      return {
        runId: '',
        status: 'failed',
        error: String(err)
      }
    }
  }

  async getExecutionStatus(workflowId: string, runId: string): Promise<BolekExecutionResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows/${workflowId}/executions/${runId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'X-N8N-API-KEY': this.apiKey })
        }
      })

      if (!response.ok) {
        this.logger.error('n8n execution status error', { status: response.status })
        return {
          runId,
          status: 'failed',
          error: `Failed to get status: ${response.status}`
        }
      }

      const data: N8nExecution = await response.json()

      return {
        runId: data.id,
        status: this.mapN8nStatus(data.status),
        result: data.executionData?.resultData?.runData,
        error: data.executionData?.error?.message,
        executionTime: data.stoppedAt ? new Date(data.stoppedAt).getTime() - new Date(data.startedAt).getTime() : undefined
      }
    } catch (err) {
      this.logger.error('Adapter error in getExecutionStatus', { runId, error: String(err) })
      return {
        runId,
        status: 'failed',
        error: String(err)
      }
    }
  }

  async listWorkflows(): Promise<BolekWorkflow[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'X-N8N-API-KEY': this.apiKey })
        }
      })

      if (!response.ok) {
        throw new Error(`n8n returned ${response.status}`)
      }

      const data = await response.json()

      return (data.data || []).map((w: any) => ({
        id: w.id,
        name: w.name,
        description: w.description,
        createdAt: w.createdAt
      }))
    } catch (err) {
      this.logger.error('Adapter error in listWorkflows', { error: String(err) })
      return []
    }
  }

  async cancelExecution(workflowId: string, runId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows/${workflowId}/executions/${runId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'X-N8N-API-KEY': this.apiKey })
        }
      })

      if (!response.ok) {
        this.logger.warn('Failed to cancel execution', { status: response.status })
        return false
      }

      this.logger.info('Execution cancelled', { workflowId, runId })
      return true
    } catch (err) {
      this.logger.error('Adapter error in cancelExecution', { error: String(err) })
      return false
    }
  }

  private mapN8nStatus(n8nStatus: string): 'running' | 'completed' | 'failed' {
    switch (n8nStatus) {
      case 'success':
        return 'completed'
      case 'error':
      case 'aborted':
        return 'failed'
      case 'running':
      case 'new':
      default:
        return 'running'
    }
  }
}
```

**Commit:**
```
feat: implement n8n adapter for workflow execution
```

---

## Task 6: Wrapper Server

**File:** `src/index.ts`

```typescript
import { Hono } from 'hono'
import { N8nAdapter } from './adapter'
import { Logger } from './logger'
import type { BolekWorkflowExecution } from './types'

const app = new Hono()
const logger = new Logger('info')

const N8N_URL = process.env.N8N_URL || 'http://n8n:5678'
const WRAPPER_PORT = parseInt(process.env.WRAPPER_PORT || '3001')
const AUTH_TOKEN = process.env.BOLEK_API_TOKEN || 'test_token'
const N8N_API_KEY = process.env.N8N_API_KEY

const adapter = new N8nAdapter(N8N_URL, logger, N8N_API_KEY)

// Auth middleware
app.use('*', async (c, next) => {
  const auth = c.req.header('Authorization')
  if (auth !== `Bearer ${AUTH_TOKEN}`) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
})

// POST /api/agent/workflows/execute
app.post('/api/agent/workflows/execute', async (c) => {
  try {
    const body = await c.req.json<BolekWorkflowExecution>()
    logger.info('Executing workflow', { workflowId: body.workflowId })

    const result = await adapter.executeWorkflow(body)
    return c.json(result)
  } catch (err) {
    logger.error('POST /api/agent/workflows/execute failed', { error: String(err) })
    return c.json({ error: 'Failed to execute workflow' }, 500)
  }
})

// GET /api/agent/workflows/:id/status/:runId
app.get('/api/agent/workflows/:id/status/:runId', async (c) => {
  try {
    const workflowId = c.req.param('id')
    const runId = c.req.param('runId')

    const result = await adapter.getExecutionStatus(workflowId, runId)
    return c.json(result)
  } catch (err) {
    logger.error('GET status failed', { error: String(err) })
    return c.json({ error: 'Failed to get status' }, 500)
  }
})

// GET /api/agent/workflows/list
app.get('/api/agent/workflows/list', async (c) => {
  try {
    const workflows = await adapter.listWorkflows()
    return c.json({ workflows })
  } catch (err) {
    logger.error('GET list workflows failed', { error: String(err) })
    return c.json({ error: 'Failed to list workflows' }, 500)
  }
})

// POST /api/agent/workflows/:id/cancel/:runId
app.post('/api/agent/workflows/:id/cancel/:runId', async (c) => {
  try {
    const workflowId = c.req.param('id')
    const runId = c.req.param('runId')

    const success = await adapter.cancelExecution(workflowId, runId)
    return c.json({ success })
  } catch (err) {
    logger.error('POST cancel failed', { error: String(err) })
    return c.json({ error: 'Failed to cancel execution' }, 500)
  }
})

// Health
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'bolek-flow-wrapper' })
})

logger.info('BolekFlow wrapper starting', { port: WRAPPER_PORT, n8nUrl: N8N_URL })

export default {
  fetch: app.fetch,
  port: WRAPPER_PORT
}
```

**Commit:**
```
feat: implement wrapper server with n8n workflow endpoints
```

---

## Task 7: Docker Compose

**File:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  wrapper:
    build:
      context: .
      dockerfile: Dockerfile.wrapper
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: development
      LOG_LEVEL: info
      BOLEK_API_TOKEN: test_token_for_dev
      N8N_URL: http://n8n:5678
      WRAPPER_PORT: 3001
    depends_on:
      - n8n
    networks:
      - bolek
    command: npm run dev

  n8n:
    build:
      context: ./fork
    ports:
      - "5678:5678"
    environment:
      N8N_HOST: 0.0.0.0
      N8N_PORT: 5678
      N8N_PROTOCOL: http
      WEBHOOK_TUNNEL_URL: http://localhost:5678
      DB_TYPE: sqlite
    networks:
      - bolek
    volumes:
      - n8n_data:/home/node/.n8n

networks:
  bolek:
    driver: bridge

volumes:
  n8n_data:
```

**File:** `Dockerfile.wrapper`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
EXPOSE 3001
CMD ["npm", "run", "dev"]
```

**Commit:**
```
feat: add Docker configuration for BolekFlow wrapper
```

---

## Task 8-10: Same as BolekCzat

- Create `.env.example`
- Create unit tests (`src/__tests__/adapter.test.ts`)
- Create `WRAPPER-README.md`

---

## Verification

```bash
docker-compose up
# Wrapper on :3001, n8n on :5678

# Test
curl http://localhost:3001/health \
  -H "Authorization: Bearer test_token_for_dev"

# List workflows
curl http://localhost:3001/api/agent/workflows/list \
  -H "Authorization: Bearer test_token_for_dev"
```

---

## Next: BolekKB

Apply same pattern to BolekKB (wrapper around AnythingLLM).
