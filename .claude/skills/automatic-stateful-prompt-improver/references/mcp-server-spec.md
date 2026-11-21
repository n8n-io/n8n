# MCP Server Specification: Prompt Learning Server

This document specifies the MCP server implementation for stateful prompt learning.

## Overview

The `prompt-learning` MCP server provides persistent storage and retrieval of prompt performance data, enabling the skill to learn and improve over time.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Claude Code                          │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │     automatic-stateful-prompt-improver        │   │
│  └────────────────────┬─────────────────────────┘   │
│                       │ MCP Protocol                 │
└───────────────────────┼─────────────────────────────┘
                        │
┌───────────────────────┼─────────────────────────────┐
│                       ▼                              │
│            prompt-learning MCP Server                │
│                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │   Tools     │  │  Resources  │  │   State     │  │
│  │             │  │             │  │             │  │
│  │ retrieve    │  │ performance │  │   Redis     │  │
│  │ record      │  │ analytics   │  │   Cache     │  │
│  │ suggest     │  │ history     │  │             │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │
│         │                │                │          │
│         └────────────────┼────────────────┘          │
│                          │                           │
└──────────────────────────┼───────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 ▼                 │
         │          Vector Database          │
         │     (Qdrant / Pinecone / Chroma)  │
         │                                   │
         │  ┌─────────────────────────────┐  │
         │  │     Prompt Embeddings       │  │
         │  │   + Performance Metrics     │  │
         │  │   + Metadata                │  │
         │  └─────────────────────────────┘  │
         │                                   │
         └───────────────────────────────────┘
```

## Tools

### 1. `retrieve_prompts`

Retrieve similar high-performing prompts from the embedding database.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "The prompt to find similar examples for"
    },
    "domain": {
      "type": "string",
      "description": "Domain classification (e.g., 'code_review', 'summarization')"
    },
    "top_k": {
      "type": "integer",
      "default": 5,
      "description": "Number of results to return"
    },
    "min_performance": {
      "type": "number",
      "default": 0.7,
      "description": "Minimum success_rate threshold"
    }
  },
  "required": ["query"]
}
```

**Output**:
```json
{
  "results": [
    {
      "prompt_id": "uuid",
      "prompt_text": "string",
      "similarity_score": 0.92,
      "metrics": {
        "success_rate": 0.85,
        "avg_latency_ms": 450,
        "token_efficiency": 0.78
      },
      "domain": "code_review",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 2. `record_feedback`

Record the outcome of a prompt execution for learning.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "prompt_id": {
      "type": "string",
      "description": "ID of the prompt (or 'new' to create)"
    },
    "prompt_text": {
      "type": "string",
      "description": "The prompt text (required if prompt_id is 'new')"
    },
    "domain": {
      "type": "string",
      "description": "Domain classification"
    },
    "outcome": {
      "type": "object",
      "properties": {
        "success": {"type": "boolean"},
        "latency_ms": {"type": "number"},
        "output_tokens": {"type": "integer"},
        "quality_score": {"type": "number", "minimum": 0, "maximum": 1}
      },
      "required": ["success"]
    },
    "user_feedback": {
      "type": "object",
      "properties": {
        "satisfaction": {"type": "number", "minimum": 0, "maximum": 1},
        "comments": {"type": "string"}
      }
    }
  },
  "required": ["prompt_id", "outcome"]
}
```

**Output**:
```json
{
  "status": "recorded",
  "prompt_id": "uuid",
  "updated_metrics": {
    "success_rate": 0.82,
    "observation_count": 15
  }
}
```

### 3. `suggest_improvements`

Generate improvement suggestions based on similar high-performers.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "prompt": {
      "type": "string",
      "description": "The prompt to improve"
    },
    "current_performance": {
      "type": "object",
      "properties": {
        "success_rate": {"type": "number"},
        "avg_latency_ms": {"type": "number"},
        "token_efficiency": {"type": "number"}
      }
    },
    "improvement_focus": {
      "type": "string",
      "enum": ["clarity", "specificity", "efficiency", "all"],
      "default": "all"
    }
  },
  "required": ["prompt"]
}
```

**Output**:
```json
{
  "suggestions": [
    {
      "type": "add_structure",
      "description": "Add numbered output format",
      "example": "Respond with:\n1. Summary\n2. Key points\n3. Recommendations",
      "expected_improvement": 0.15
    }
  ],
  "based_on": {
    "similar_prompts_analyzed": 5,
    "avg_performance_of_similar": 0.87
  }
}
```

### 4. `get_analytics`

Retrieve performance analytics and trends.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "domain": {
      "type": "string",
      "description": "Filter by domain (optional)"
    },
    "time_range": {
      "type": "string",
      "enum": ["7d", "30d", "90d", "all"],
      "default": "30d"
    },
    "metrics": {
      "type": "array",
      "items": {"type": "string"},
      "default": ["success_rate", "token_efficiency"]
    }
  }
}
```

**Output**:
```json
{
  "summary": {
    "total_prompts": 150,
    "avg_success_rate": 0.78,
    "improvement_trend": 0.05
  },
  "by_domain": {
    "code_review": {"count": 45, "avg_success": 0.82},
    "summarization": {"count": 30, "avg_success": 0.75}
  },
  "top_patterns": [
    {"pattern": "structured_output", "success_rate": 0.89},
    {"pattern": "chain_of_thought", "success_rate": 0.85}
  ]
}
```

## Implementation

### TypeScript Server

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { QdrantClient } from "@qdrant/js-client-rest";
import Redis from "ioredis";

// Configuration
const EMBEDDING_MODEL = "text-embedding-3-large";
const EMBEDDING_DIM = 3072;
const COLLECTION_NAME = "prompt_embeddings";

interface PromptMetrics {
  success_rate: number;
  avg_latency_ms: number;
  token_efficiency: number;
  observation_count: number;
}

class PromptLearningServer {
  private server: Server;
  private vectorDb: QdrantClient;
  private cache: Redis;
  private embeddingClient: any; // OpenAI or similar

  constructor() {
    this.server = new Server(
      { name: "prompt-learning", version: "1.0.0" },
      { capabilities: { tools: {}, resources: {} } }
    );

    this.vectorDb = new QdrantClient({
      url: process.env.VECTOR_DB_URL || "http://localhost:6333"
    });

    this.cache = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

    this.registerTools();
  }

  private registerTools() {
    this.server.setRequestHandler("tools/list", async () => ({
      tools: [
        {
          name: "retrieve_prompts",
          description: "Find similar high-performing prompts",
          inputSchema: { /* schema above */ }
        },
        {
          name: "record_feedback",
          description: "Record prompt execution outcome",
          inputSchema: { /* schema above */ }
        },
        {
          name: "suggest_improvements",
          description: "Generate improvement suggestions",
          inputSchema: { /* schema above */ }
        },
        {
          name: "get_analytics",
          description: "Get performance analytics",
          inputSchema: { /* schema above */ }
        }
      ]
    }));

    this.server.setRequestHandler("tools/call", async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "retrieve_prompts":
          return await this.retrievePrompts(args);
        case "record_feedback":
          return await this.recordFeedback(args);
        case "suggest_improvements":
          return await this.suggestImprovements(args);
        case "get_analytics":
          return await this.getAnalytics(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async retrievePrompts(args: any) {
    // 1. Generate embedding for query
    const queryEmbedding = await this.getEmbedding(args.query);

    // 2. Search vector DB
    const results = await this.vectorDb.search(COLLECTION_NAME, {
      vector: queryEmbedding,
      limit: args.top_k * 2, // Over-retrieve for filtering
      filter: {
        must: [
          { key: "metrics.success_rate", range: { gte: args.min_performance } }
        ],
        ...(args.domain && {
          must: [{ key: "domain", match: { value: args.domain } }]
        })
      }
    });

    // 3. Format and return
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          results: results.slice(0, args.top_k).map(r => ({
            prompt_id: r.id,
            prompt_text: r.payload?.prompt_text,
            similarity_score: r.score,
            metrics: r.payload?.metrics,
            domain: r.payload?.domain
          }))
        })
      }]
    };
  }

  private async recordFeedback(args: any) {
    const alpha = 0.3; // EMA weight for new observations

    // Get or create prompt record
    let metrics: PromptMetrics;
    if (args.prompt_id === "new") {
      // Create new prompt
      const embedding = await this.getEmbedding(args.prompt_text);
      const promptId = crypto.randomUUID();

      metrics = {
        success_rate: args.outcome.success ? 1.0 : 0.0,
        avg_latency_ms: args.outcome.latency_ms || 0,
        token_efficiency: args.outcome.quality_score || 0,
        observation_count: 1
      };

      await this.vectorDb.upsert(COLLECTION_NAME, {
        points: [{
          id: promptId,
          vector: embedding,
          payload: {
            prompt_text: args.prompt_text,
            domain: args.domain,
            metrics,
            created_at: new Date().toISOString()
          }
        }]
      });

      args.prompt_id = promptId;
    } else {
      // Update existing
      const existing = await this.vectorDb.retrieve(COLLECTION_NAME, {
        ids: [args.prompt_id],
        with_payload: true
      });

      if (existing.length === 0) {
        throw new Error("Prompt not found");
      }

      const oldMetrics = existing[0].payload?.metrics as PromptMetrics;

      // Exponential moving average update
      metrics = {
        success_rate: alpha * (args.outcome.success ? 1 : 0) + (1 - alpha) * oldMetrics.success_rate,
        avg_latency_ms: alpha * (args.outcome.latency_ms || 0) + (1 - alpha) * oldMetrics.avg_latency_ms,
        token_efficiency: alpha * (args.outcome.quality_score || oldMetrics.token_efficiency) + (1 - alpha) * oldMetrics.token_efficiency,
        observation_count: oldMetrics.observation_count + 1
      };

      await this.vectorDb.setPayload(COLLECTION_NAME, {
        points: [args.prompt_id],
        payload: { metrics }
      });
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          status: "recorded",
          prompt_id: args.prompt_id,
          updated_metrics: metrics
        })
      }]
    };
  }

  private async suggestImprovements(args: any) {
    // Retrieve similar high-performers
    const similar = await this.retrievePrompts({
      query: args.prompt,
      top_k: 5,
      min_performance: 0.8
    });

    // Analyze patterns in high performers
    // (In production, this would use an LLM to generate suggestions)

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          suggestions: [
            // Pattern-based suggestions
          ],
          based_on: {
            similar_prompts_analyzed: 5,
            avg_performance_of_similar: 0.87
          }
        })
      }]
    };
  }

  private async getAnalytics(args: any) {
    // Aggregate metrics from vector DB
    // (Implementation depends on specific vector DB capabilities)

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          summary: {
            total_prompts: 0,
            avg_success_rate: 0,
            improvement_trend: 0
          }
        })
      }]
    };
  }

  private async getEmbedding(text: string): Promise<number[]> {
    // Call embedding API (OpenAI, Cohere, etc.)
    // Implementation depends on your embedding provider
    return [];
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

const server = new PromptLearningServer();
server.start();
```

## Setup Instructions

### 1. Prerequisites

```bash
# Install dependencies
npm install @modelcontextprotocol/sdk @qdrant/js-client-rest ioredis openai

# Start Qdrant (Docker)
docker run -p 6333:6333 qdrant/qdrant

# Start Redis (Docker)
docker run -p 6379:6379 redis
```

### 2. Initialize Vector Collection

```typescript
const client = new QdrantClient({ url: "http://localhost:6333" });

await client.createCollection("prompt_embeddings", {
  vectors: {
    size: 3072, // text-embedding-3-large
    distance: "Cosine"
  }
});

// Create payload indexes for filtering
await client.createPayloadIndex("prompt_embeddings", {
  field_name: "metrics.success_rate",
  field_schema: "float"
});

await client.createPayloadIndex("prompt_embeddings", {
  field_name: "domain",
  field_schema: "keyword"
});
```

### 3. Configure Claude Code

Add to your `claude_desktop_config.json` or project config:

```json
{
  "mcpServers": {
    "prompt-learning": {
      "command": "node",
      "args": ["/path/to/prompt-learning-server/dist/index.js"],
      "env": {
        "VECTOR_DB_URL": "http://localhost:6333",
        "REDIS_URL": "redis://localhost:6379",
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

## Data Model

### Prompt Embedding Record

```typescript
interface PromptRecord {
  id: string;                    // UUID
  vector: number[];              // Embedding (3072 dim)
  payload: {
    prompt_text: string;         // Original prompt
    contextualized: string;      // With domain context
    domain: string;              // Classification
    task_type: string;           // e.g., "classification", "generation"
    metrics: {
      success_rate: number;      // 0-1, EMA
      avg_latency_ms: number;    // Response time
      token_efficiency: number;  // quality/tokens
      observation_count: number; // How many times evaluated
    };
    created_at: string;          // ISO timestamp
    updated_at: string;          // Last metric update
    tags: string[];              // User-defined tags
  };
}
```

### Session State (Redis)

```typescript
interface SessionState {
  session_id: string;
  user_id: string;
  current_prompt_id: string | null;
  iteration_count: number;
  best_score: number;
  history: Array<{
    prompt_id: string;
    score: number;
    timestamp: string;
  }>;
}
```

## Security Considerations

1. **Data Isolation**: Use Redis key prefixes for multi-tenant isolation
2. **API Keys**: Store securely, rotate regularly
3. **Rate Limiting**: Implement per-user rate limits
4. **Encryption**: TLS for all connections, encryption at rest for sensitive prompts
5. **GDPR**: Implement user data deletion workflows

## Monitoring

Track these metrics:
- Embedding latency (p50, p95, p99)
- Retrieval latency (p50, p95, p99)
- Success rate improvement over time
- Cache hit rate
- Error rates by tool

---

This MCP server enables the prompt improver skill to learn and adapt over time, making each optimization better informed by past successes.
