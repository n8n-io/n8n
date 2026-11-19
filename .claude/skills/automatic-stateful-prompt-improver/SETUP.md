# Setup Guide: Automatic Stateful Prompt Improver

This guide walks you through setting up the full stateful learning infrastructure for the prompt improver skill.

## One-Command Install

**The fastest way to get started:**

```bash
curl -fsSL https://someclaudeskills.com/install/prompt-learning.sh | bash
```

Or clone and install manually:

```bash
git clone https://github.com/erichowens/prompt-learning-mcp.git ~/mcp-servers/prompt-learning
cd ~/mcp-servers/prompt-learning
npm install && npm run build
npm run setup
```

**Repository:** [github.com/erichowens/prompt-learning-mcp](https://github.com/erichowens/prompt-learning-mcp)

## Quick Start (Cold Start Mode)

**No setup required!** The skill works immediately in cold-start mode:
- Uses research-backed optimization strategies (APE, OPRO, DSPy patterns)
- No persistent learning, but still highly effective
- Great for testing before investing in infrastructure

Just invoke the skill:
```
"optimize this prompt: [your prompt]"
```

## Full Setup (Stateful Learning Mode)

For persistent learning across conversations, you need:
1. Vector database (prompt embeddings)
2. Redis (session cache, metrics)
3. MCP server (protocol bridge)

### Prerequisites

```bash
# Docker (recommended for quick setup)
docker --version  # Ensure Docker is installed

# Node.js 18+ (for MCP server)
node --version

# OpenAI API key (for embeddings and evaluation)
export OPENAI_API_KEY=sk-your-key-here
```

### Step 1: Start Vector Database (Qdrant)

Qdrant is recommended for its hybrid search capabilities (vector + BM25).

```bash
# Quick start with Docker
docker run -d \
  --name qdrant \
  -p 6333:6333 \
  -p 6334:6334 \
  -v qdrant_storage:/qdrant/storage \
  qdrant/qdrant

# Verify it's running
curl http://localhost:6333/collections
```

**Alternative: Chroma (simpler, smaller scale)**
```bash
docker run -d \
  --name chroma \
  -p 8000:8000 \
  -v chroma_data:/chroma/chroma \
  chromadb/chroma
```

### Step 2: Start Redis (Session Cache)

```bash
docker run -d \
  --name redis \
  -p 6379:6379 \
  -v redis_data:/data \
  redis:alpine redis-server --appendonly yes

# Verify
redis-cli ping  # Should return PONG
```

### Step 3: Initialize Vector Collection

Create the prompt embeddings collection:

```bash
# Using curl
curl -X PUT http://localhost:6333/collections/prompt_embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": {
      "size": 3072,
      "distance": "Cosine"
    }
  }'

# Create indexes for filtering
curl -X PUT http://localhost:6333/collections/prompt_embeddings/index \
  -H "Content-Type: application/json" \
  -d '{
    "field_name": "metrics.success_rate",
    "field_schema": "float"
  }'

curl -X PUT http://localhost:6333/collections/prompt_embeddings/index \
  -H "Content-Type: application/json" \
  -d '{
    "field_name": "domain",
    "field_schema": "keyword"
  }'
```

### Step 4: Setup MCP Server

Create the MCP server project:

```bash
mkdir -p ~/mcp-servers/prompt-learning
cd ~/mcp-servers/prompt-learning
npm init -y
npm install @modelcontextprotocol/sdk @qdrant/js-client-rest ioredis openai
```

Create `index.js`:
```javascript
// See /references/mcp-server-spec.md for full implementation
// This is a minimal working version

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { QdrantClient } from "@qdrant/js-client-rest";
import Redis from "ioredis";
import OpenAI from "openai";

const vectorDb = new QdrantClient({ url: process.env.VECTOR_DB_URL || "http://localhost:6333" });
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const server = new Server(
  { name: "prompt-learning", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Tool implementations...
// (See full spec in references/mcp-server-spec.md)

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Step 5: Configure Claude Code

Add to your Claude Code configuration (`~/.claude.json` or project config):

```json
{
  "mcpServers": {
    "prompt-learning": {
      "command": "node",
      "args": ["/path/to/mcp-servers/prompt-learning/index.js"],
      "env": {
        "VECTOR_DB_URL": "http://localhost:6333",
        "REDIS_URL": "redis://localhost:6379",
        "OPENAI_API_KEY": "sk-your-key-here"
      }
    }
  }
}
```

### Step 6: Verify Setup

Test the MCP server is working:
```bash
# In Claude Code, try:
"retrieve similar prompts for: summarize the document"
```

If you see results from the vector database, you're all set!

## Architecture Overview

```
┌────────────────────────────────────────────┐
│           Claude Code                       │
│                                            │
│  ┌────────────────────────────────────┐   │
│  │  automatic-stateful-prompt-improver │   │
│  │                                     │   │
│  │  Cold Start Mode:                   │   │
│  │  - APE/OPRO patterns               │   │
│  │  - DSPy-style optimization         │   │
│  │  - Pattern-based improvement       │   │
│  │                                     │   │
│  │  Warm Start Mode (with MCP):       │   │
│  │  - Retrieve similar prompts        │   │
│  │  - Learn from outcomes             │   │
│  │  - Adaptive iteration count        │   │
│  └─────────────┬──────────────────────┘   │
│                │                           │
│                │ MCP Protocol              │
└────────────────┼───────────────────────────┘
                 │
┌────────────────┼───────────────────────────┐
│                ▼                            │
│     prompt-learning MCP Server              │
│                                            │
│  Tools:                                    │
│  - retrieve_prompts                        │
│  - record_feedback                         │
│  - suggest_improvements                    │
│  - get_analytics                           │
│                                            │
└─────────┬──────────────┬───────────────────┘
          │              │
          ▼              ▼
    ┌──────────┐   ┌──────────┐
    │  Qdrant  │   │  Redis   │
    │ (Vector) │   │ (Cache)  │
    └──────────┘   └──────────┘
```

## Embedding Model Options

The system uses embeddings to find similar prompts. Choose based on your needs:

| Model | Dimensions | Quality | Cost | Latency |
|-------|-----------|---------|------|---------|
| `text-embedding-3-large` | 3072 | Best | $$$ | ~200ms |
| `text-embedding-3-small` | 1536 | Good | $$ | ~100ms |
| `text-embedding-ada-002` | 1536 | Good | $ | ~150ms |
| Cohere `embed-v3` | 1024 | Good | $$ | ~100ms |

**Recommendation**: Start with `text-embedding-3-small`, upgrade if needed.

To change models, update the collection:
```bash
# For 1536-dim model
curl -X PUT http://localhost:6333/collections/prompt_embeddings \
  -d '{"vectors": {"size": 1536, "distance": "Cosine"}}'
```

## Cost Considerations

### Monthly Estimates (assuming moderate usage)

| Component | Cost | Notes |
|-----------|------|-------|
| Qdrant (self-hosted) | ~$0-20 | Docker on existing machine |
| Qdrant (cloud) | $25-100 | Managed, higher availability |
| Redis (self-hosted) | ~$0 | Docker on existing machine |
| Redis (cloud) | $10-50 | Managed |
| OpenAI Embeddings | ~$5-20 | ~1M tokens/month |
| OpenAI API (optimization) | ~$10-50 | Depends on usage |

**Total self-hosted**: ~$15-70/month
**Total cloud-managed**: ~$50-200/month

### Cost Optimization Tips

1. **Cache embeddings**: Same prompts don't need re-embedding
2. **Batch operations**: Group embedding calls
3. **Use smaller models**: `text-embedding-3-small` is often sufficient
4. **Rate limit**: Prevent runaway API calls

## Troubleshooting

### MCP Server Not Connecting

```bash
# Check if server is running
ps aux | grep prompt-learning

# Test manually
cd ~/mcp-servers/prompt-learning
node index.js

# Check Claude Code logs
tail -f ~/.claude/logs/mcp.log
```

### Vector Database Issues

```bash
# Check Qdrant health
curl http://localhost:6333/health

# Check collection exists
curl http://localhost:6333/collections/prompt_embeddings

# Recreate if corrupted
curl -X DELETE http://localhost:6333/collections/prompt_embeddings
# Then re-run Step 3
```

### Redis Connection Issues

```bash
# Check Redis is running
docker ps | grep redis

# Test connection
redis-cli ping

# Check memory usage
redis-cli info memory
```

## Scaling Considerations

### When to Scale

- **&gt;100k prompts**: Consider Qdrant cloud or cluster
- **&gt;10 QPS**: Add Redis caching layer
- **Multi-user**: Add tenant isolation

### Production Checklist

- [ ] TLS enabled for all connections
- [ ] API keys in secrets manager
- [ ] Backup strategy for vector DB
- [ ] Monitoring and alerting
- [ ] Rate limiting
- [ ] GDPR data deletion workflows

## Next Steps

1. **Start in cold-start mode**: Test the skill without infrastructure
2. **Add basic persistence**: Set up Qdrant + Redis locally
3. **Collect data**: Use the skill, let it learn
4. **Analyze patterns**: Use `get_analytics` to see what works
5. **Scale as needed**: Move to managed services if usage grows

---

Questions? Issues? The skill's `/references` directory has detailed implementation specs.
