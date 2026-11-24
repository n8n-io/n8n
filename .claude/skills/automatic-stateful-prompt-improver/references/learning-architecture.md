# Learning Architecture

Stateful learning through embedding-indexed history.

## Retrieval Strategy (Warm Start)

```
1. Embed the current prompt with contextual metadata:
   - Domain classification
   - Task type
   - Complexity score

2. Hybrid search (vector similarity + BM25 keyword):
   - Retrieve top-20 candidates
   - Rerank to top-5

3. Filter by performance threshold:
   - Only prompts with success_rate > 0.7
   - Weight by recency (exponential decay, half-life: 30 days)

4. Generate improvements based on:
   - What made similar prompts succeed
   - Patterns in high-performing variants
```

## Performance Metrics

| Metric | Description | Weight |
|--------|-------------|--------|
| `success_rate` | Task completion accuracy | 0.40 |
| `token_efficiency` | Output quality / tokens used | 0.20 |
| `coherence` | Logical consistency score | 0.15 |
| `user_satisfaction` | Explicit feedback | 0.15 |
| `latency_ms` | Response time | 0.10 |

## Continuous Learning Loop

```
1. OBSERVE: Track prompt → outcome pairs
   - Store prompt embedding
   - Record performance metrics
   - Capture context (domain, task type, complexity)

2. INDEX: Build retrievable knowledge base
   - Vector database for semantic similarity
   - BM25 for keyword matching
   - Metadata for filtering

3. UPDATE: Exponential moving average
   - α = 0.3 (30% new, 70% historical)
   - Recency decay: half-life 30 days
   - Distribution drift detection

4. ADAPT: Adjust strategies based on patterns
   - Which techniques work for which domains?
   - What iteration counts converge fastest?
   - Where do certain patterns fail?
```

## Drift Detection

When the distribution of prompts shifts (new domain, new patterns):

```
If embedding_drift > 0.15:
  - Increase learning rate (α → 0.5)
  - Flag for human review
  - Log potential new domain
```

## MCP Server Setup

To enable persistent learning:

```json
{
  "mcpServers": {
    "prompt-learning": {
      "command": "node",
      "args": ["path/to/prompt-learning-server/index.js"],
      "env": {
        "VECTOR_DB_URL": "your-vector-db-url",
        "REDIS_URL": "your-redis-url"
      }
    }
  }
}
```

**Required Tools** (exposed by MCP):
- `retrieve_prompts`: Get similar high-performing prompts
- `record_feedback`: Update prompt metrics
- `suggest_improvements`: RAG-based optimization
- `get_analytics`: Performance insights

## Cold Start Mode

Without MCP, operate in cold-start mode only:
- Apply research-backed strategies
- No retrieval from history
- No persistent learning
- Still effective, just not stateful
