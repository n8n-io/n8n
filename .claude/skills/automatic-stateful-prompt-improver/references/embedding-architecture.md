# Embedding Architecture for Prompt Learning

This document details the embedding and retrieval architecture for stateful prompt learning.

## Design Principles

1. **Contextual Embeddings**: Add domain context before embedding (49% error reduction)
2. **Hybrid Search**: Vector + BM25 for best recall
3. **Recency Weighting**: Balance historical stability with recent relevance
4. **Drift Detection**: Detect and adapt to distribution shifts

## Embedding Strategy

### Contextual Embedding Pipeline

Following Anthropic's contextual retrieval methodology:

```python
class ContextualPromptEmbedder:
    """
    Create embeddings that include domain context for better retrieval.

    Standard embedding: embed(prompt_text)
    Contextual embedding: embed(context + prompt_text)

    This reduces retrieval errors by 49% (with BM25) to 67% (with reranking).
    """

    def __init__(self, embedding_model: str = "text-embedding-3-large"):
        self.model = embedding_model
        self.context_cache = {}  # Cache context generation

    async def create_embedding(
        self,
        prompt: str,
        domain: str,
        task_type: str
    ) -> dict:
        """
        Create contextual embedding for a prompt.

        Args:
            prompt: The prompt text to embed
            domain: Domain classification (e.g., 'code_review', 'summarization')
            task_type: Task type (e.g., 'generation', 'classification')

        Returns:
            {
                'embedding': [...],
                'contextualized_text': str,
                'metadata': dict
            }
        """
        # Generate contextualizing information
        context = await self._generate_context(prompt, domain, task_type)

        # Combine context with prompt
        contextualized = f"{context}\n\n{prompt}"

        # Generate embedding
        embedding = await self._embed(contextualized)

        return {
            'embedding': embedding,
            'contextualized_text': contextualized,
            'metadata': {
                'domain': domain,
                'task_type': task_type,
                'original_length': len(prompt),
                'context_length': len(context)
            }
        }

    async def _generate_context(
        self,
        prompt: str,
        domain: str,
        task_type: str
    ) -> str:
        """
        Generate 50-100 token context for a prompt.

        Uses LLM to create contextualizing information that improves retrieval.
        Results are cached to reduce API calls.
        """
        cache_key = f"{domain}:{task_type}:{hash(prompt[:100])}"

        if cache_key in self.context_cache:
            return self.context_cache[cache_key]

        context_prompt = f"""
        Generate a brief context (50-100 tokens) for this prompt to improve retrieval.

        Domain: {domain}
        Task Type: {task_type}
        Prompt: {prompt[:500]}

        Include:
        - Key domain terminology
        - Task intent
        - Important entities/concepts

        Context only, no explanation:
        """

        context = await self._call_llm(context_prompt)
        self.context_cache[cache_key] = context
        return context
```

### Embedding Model Selection

| Model | Dimensions | Strengths | Cost |
|-------|-----------|-----------|------|
| `text-embedding-3-large` | 3072 | Best quality, multi-lingual | $$$ |
| `text-embedding-3-small` | 1536 | Good balance | $$ |
| `text-embedding-ada-002` | 1536 | Legacy, good compatibility | $ |
| Cohere `embed-v3` | 1024 | Good for retrieval | $$ |

**Recommendation**: Start with `text-embedding-3-small`, upgrade to `large` for production.

## Retrieval Architecture

### Hybrid Search Pipeline

```python
class HybridPromptRetrieval:
    """
    Combine vector similarity with BM25 for optimal retrieval.

    Research shows hybrid search outperforms either alone:
    - Vector only: Good semantic matching
    - BM25 only: Good keyword matching
    - Hybrid: Best of both (5-10% improvement)
    """

    def __init__(
        self,
        vector_db: VectorDatabase,
        bm25_index: BM25Index,
        reranker: Optional[Reranker] = None
    ):
        self.vector_db = vector_db
        self.bm25 = bm25_index
        self.reranker = reranker

    async def search(
        self,
        query: str,
        query_embedding: list,
        top_k: int = 10,
        filters: dict = None
    ) -> list:
        """
        Hybrid retrieval with optional reranking.

        Pipeline:
        1. Vector search (retrieve 3x candidates)
        2. BM25 search (retrieve 3x candidates)
        3. Reciprocal Rank Fusion (combine results)
        4. Optional reranking (refine top candidates)
        """
        # Over-retrieve for fusion
        fetch_k = top_k * 3

        # Parallel retrieval
        vector_results, bm25_results = await asyncio.gather(
            self._vector_search(query_embedding, fetch_k, filters),
            self._bm25_search(query, fetch_k, filters)
        )

        # Reciprocal Rank Fusion
        fused = self._rrf_fusion(vector_results, bm25_results)

        # Optional reranking
        if self.reranker and len(fused) > 0:
            reranked = await self.reranker.rerank(
                query=query,
                documents=fused[:top_k * 2],
                top_k=top_k
            )
            return reranked

        return fused[:top_k]

    def _rrf_fusion(
        self,
        vector_results: list,
        bm25_results: list,
        k: int = 60
    ) -> list:
        """
        Reciprocal Rank Fusion: 1/(k + rank) scoring.

        Combines rankings from multiple retrieval methods.
        k=60 is standard from RRF paper.
        """
        scores = {}
        doc_map = {}

        for rank, doc in enumerate(vector_results):
            doc_id = doc['id']
            scores[doc_id] = scores.get(doc_id, 0) + 1 / (k + rank + 1)
            doc_map[doc_id] = doc

        for rank, doc in enumerate(bm25_results):
            doc_id = doc['id']
            scores[doc_id] = scores.get(doc_id, 0) + 1 / (k + rank + 1)
            doc_map[doc_id] = doc

        # Sort by fused score
        sorted_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)

        return [
            {**doc_map[doc_id], 'rrf_score': scores[doc_id]}
            for doc_id in sorted_ids
            if doc_id in doc_map
        ]
```

### Reranking (Optional but Recommended)

```python
class CohereReranker:
    """
    Use Cohere's reranker for final result refinement.

    Adds ~100ms latency but improves relevance significantly.
    """

    def __init__(self, api_key: str):
        self.client = cohere.Client(api_key)

    async def rerank(
        self,
        query: str,
        documents: list,
        top_k: int = 5
    ) -> list:
        """
        Rerank documents using Cohere's reranker model.
        """
        response = self.client.rerank(
            model="rerank-english-v2.0",
            query=query,
            documents=[d['prompt_text'] for d in documents],
            top_n=top_k
        )

        return [
            {
                **documents[r.index],
                'rerank_score': r.relevance_score
            }
            for r in response.results
        ]
```

## Performance Tracking

### Metric Structure

```python
@dataclass
class PromptMetrics:
    """
    Performance metrics for a prompt.

    Updated using exponential moving average for recency weighting.
    """
    success_rate: float       # 0-1, task completion rate
    avg_latency_ms: float     # Response time
    token_efficiency: float   # quality_score / tokens_used
    coherence_score: float    # Logical consistency
    observation_count: int    # How many times evaluated
    last_updated: datetime    # For recency calculations

    def update(self, outcome: dict, alpha: float = 0.3):
        """
        Exponential moving average update.

        alpha = 0.3 means:
        - 30% weight to new observation
        - 70% weight to historical average
        """
        self.success_rate = alpha * float(outcome['success']) + (1 - alpha) * self.success_rate
        self.avg_latency_ms = alpha * outcome.get('latency_ms', self.avg_latency_ms) + (1 - alpha) * self.avg_latency_ms
        self.observation_count += 1
        self.last_updated = datetime.utcnow()
```

### Temporal Weighting

```python
class TemporalWeighting:
    """
    Apply time-decay to balance recency vs. historical performance.

    half_life: Time for weight to decay to 50%
    - 30 days: Standard for most use cases
    - 7 days: Fast-changing domains
    - 90 days: Stable domains
    """

    def __init__(self, half_life_days: int = 30):
        self.half_life = timedelta(days=half_life_days)

    def calculate_weight(self, observation_time: datetime) -> float:
        """
        Calculate time-decay weight.

        weight = 0.5^(time_diff / half_life)
        """
        time_diff = datetime.utcnow() - observation_time
        half_lives_elapsed = time_diff / self.half_life
        return math.pow(0.5, half_lives_elapsed)

    def weighted_score(
        self,
        observations: list[tuple[float, datetime]]
    ) -> float:
        """
        Calculate weighted average with time decay.
        """
        total_weight = 0
        weighted_sum = 0

        for value, timestamp in observations:
            weight = self.calculate_weight(timestamp)
            weighted_sum += value * weight
            total_weight += weight

        return weighted_sum / total_weight if total_weight > 0 else 0
```

## Drift Detection

### Distribution Shift Detection

```python
class DriftDetector:
    """
    Detect when prompt distribution shifts (new domains, patterns).

    Triggers adaptive learning rate adjustment.
    """

    def __init__(
        self,
        window_size: int = 100,
        drift_threshold: float = 0.15
    ):
        self.window_size = window_size
        self.threshold = drift_threshold
        self.embedding_history = deque(maxlen=window_size)

    def check_drift(self, new_embedding: np.ndarray) -> bool:
        """
        Check if new embedding indicates distribution shift.

        Uses Maximum Mean Discrepancy (simplified).
        """
        if len(self.embedding_history) < 50:
            self.embedding_history.append(new_embedding)
            return False

        # Calculate centroid of historical embeddings
        historical = np.array(list(self.embedding_history))
        centroid = np.mean(historical, axis=0)

        # Measure distance from centroid
        distance = np.linalg.norm(new_embedding - centroid)

        # Normalize by average distance in history
        avg_distance = np.mean([
            np.linalg.norm(e - centroid)
            for e in historical
        ])

        normalized_distance = distance / avg_distance if avg_distance > 0 else 0

        self.embedding_history.append(new_embedding)

        return normalized_distance > (1 + self.threshold)

    def get_drift_metrics(self) -> dict:
        """
        Get drift detection metrics for monitoring.
        """
        if len(self.embedding_history) < 10:
            return {'status': 'insufficient_data'}

        historical = np.array(list(self.embedding_history))
        centroid = np.mean(historical, axis=0)

        distances = [np.linalg.norm(e - centroid) for e in historical]

        return {
            'avg_distance': np.mean(distances),
            'std_distance': np.std(distances),
            'max_distance': np.max(distances),
            'sample_size': len(self.embedding_history)
        }
```

## Vector Database Selection

### Comparison Matrix

| Feature | Qdrant | Pinecone | Chroma | pgvector |
|---------|--------|----------|--------|----------|
| **Self-hosted** | Yes | No | Yes | Yes |
| **Managed** | Yes | Yes | Yes | Depends |
| **Latency (p50)** | ~30ms | ~25ms | ~50ms | ~31ms |
| **Scale** | Billions | Billions | Millions | Millions |
| **Filtering** | Rich | Rich | Basic | SQL |
| **BM25 Support** | Yes | No | No | No (use pg_trgm) |
| **Cost** | $ | $$$ | Free | $ |

### Qdrant Setup (Recommended)

```python
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PayloadSchemaType

async def setup_qdrant():
    client = QdrantClient(url="http://localhost:6333")

    # Create collection
    await client.create_collection(
        collection_name="prompt_embeddings",
        vectors_config=VectorParams(
            size=3072,  # text-embedding-3-large
            distance=Distance.COSINE
        )
    )

    # Create indexes for filtering
    await client.create_payload_index(
        collection_name="prompt_embeddings",
        field_name="metrics.success_rate",
        field_schema=PayloadSchemaType.FLOAT
    )

    await client.create_payload_index(
        collection_name="prompt_embeddings",
        field_name="domain",
        field_schema=PayloadSchemaType.KEYWORD
    )

    await client.create_payload_index(
        collection_name="prompt_embeddings",
        field_name="created_at",
        field_schema=PayloadSchemaType.DATETIME
    )

    return client
```

### Chroma Setup (Quick Start)

```python
import chromadb
from chromadb.config import Settings

def setup_chroma():
    # Persistent storage
    client = chromadb.PersistentClient(
        path="./chroma_data",
        settings=Settings(anonymized_telemetry=False)
    )

    collection = client.get_or_create_collection(
        name="prompt_embeddings",
        metadata={"hnsw:space": "cosine"}
    )

    return collection
```

## Caching Strategy

### Embedding Cache

```python
class EmbeddingCache:
    """
    Cache embeddings to reduce API calls.

    Cache hit rate typically 60-80% for repeated prompts.
    """

    def __init__(self, redis_client: Redis, ttl_hours: int = 24):
        self.redis = redis_client
        self.ttl = ttl_hours * 3600

    async def get_or_create(
        self,
        text: str,
        embed_fn: Callable
    ) -> list:
        """
        Get embedding from cache or create new.
        """
        cache_key = f"emb:{hashlib.sha256(text.encode()).hexdigest()}"

        # Try cache
        cached = await self.redis.get(cache_key)
        if cached:
            return json.loads(cached)

        # Generate new
        embedding = await embed_fn(text)

        # Cache with TTL
        await self.redis.setex(
            cache_key,
            self.ttl,
            json.dumps(embedding)
        )

        return embedding
```

### Query Result Cache

```python
class QueryCache:
    """
    Cache frequent queries for faster retrieval.

    Short TTL (5-15 min) since results may change.
    """

    def __init__(self, redis_client: Redis, ttl_minutes: int = 10):
        self.redis = redis_client
        self.ttl = ttl_minutes * 60

    async def get_or_query(
        self,
        query: str,
        filters: dict,
        query_fn: Callable
    ) -> list:
        """
        Get results from cache or execute query.
        """
        cache_key = f"query:{hashlib.sha256(f'{query}:{json.dumps(filters)}'.encode()).hexdigest()}"

        cached = await self.redis.get(cache_key)
        if cached:
            return json.loads(cached)

        results = await query_fn(query, filters)

        await self.redis.setex(
            cache_key,
            self.ttl,
            json.dumps(results)
        )

        return results
```

## Performance Targets

| Operation | Target Latency | Notes |
|-----------|---------------|-------|
| Embedding generation | &lt;100ms (p99) | Use caching |
| Vector search | &lt;50ms (p99) | HNSW index |
| Hybrid search | &lt;100ms (p99) | Parallel retrieval |
| With reranking | &lt;200ms (p99) | Only for top-k |
| Metric update | &lt;10ms (p99) | Async |
| Full pipeline | &lt;300ms (p99) | Cold |
| Full pipeline | &lt;100ms (p99) | Cached |

---

This architecture provides a scalable foundation for stateful prompt learning that can grow from prototype to production.
