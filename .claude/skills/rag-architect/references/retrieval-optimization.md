# Retrieval Optimization

---

## Optimization Techniques Overview

| Technique | Impact | Complexity | When to Use |
|-----------|--------|------------|-------------|
| **Hybrid Search** | High | Medium | Always for production |
| **Reranking** | High | Low | Top-k refinement |
| **Query Expansion** | Medium | Medium | Ambiguous queries |
| **HyDE** | Medium-High | Medium | Concept-heavy retrieval |
| **Metadata Filtering** | High | Low | Multi-tenant, categorical |
| **Query Decomposition** | Medium | High | Complex questions |
| **Contextual Compression** | Medium | Medium | Long retrieved chunks |

---

## Hybrid Search (Vector + Keyword)

### Reciprocal Rank Fusion (RRF)

```python
from dataclasses import dataclass
from typing import Callable

@dataclass
class SearchResult:
    id: str
    text: str
    score: float
    source: str  # "vector" or "keyword"

def reciprocal_rank_fusion(
    vector_results: list[SearchResult],
    keyword_results: list[SearchResult],
    k: int = 60,
    vector_weight: float = 0.5
) -> list[SearchResult]:
    """
    Combine vector and keyword results using RRF.
    k is a constant that reduces the impact of high rankings (typically 60).
    """
    scores: dict[str, float] = {}
    docs: dict[str, SearchResult] = {}

    # Score vector results
    for rank, result in enumerate(vector_results, 1):
        rrf_score = vector_weight * (1 / (k + rank))
        scores[result.id] = scores.get(result.id, 0) + rrf_score
        docs[result.id] = result

    # Score keyword results
    keyword_weight = 1 - vector_weight
    for rank, result in enumerate(keyword_results, 1):
        rrf_score = keyword_weight * (1 / (k + rank))
        scores[result.id] = scores.get(result.id, 0) + rrf_score
        if result.id not in docs:
            docs[result.id] = result

    # Sort by combined score
    sorted_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)

    return [
        SearchResult(
            id=doc_id,
            text=docs[doc_id].text,
            score=scores[doc_id],
            source="hybrid"
        )
        for doc_id in sorted_ids
    ]

# Usage
hybrid_results = reciprocal_rank_fusion(
    vector_results=vector_search(query_embedding, top_k=20),
    keyword_results=bm25_search(query_text, top_k=20),
    vector_weight=0.6  # Favor semantic similarity
)
```

### BM25 + Vector with Weaviate

```python
from weaviate.classes.query import HybridFusion

collection = client.collections.get("Documents")

# Hybrid search with configurable fusion
results = collection.query.hybrid(
    query="how to configure authentication",
    alpha=0.5,  # 0 = pure BM25, 1 = pure vector
    fusion_type=HybridFusion.RELATIVE_SCORE,  # or RANKED
    limit=10,
    return_metadata=["score", "explain_score"]
)

# Iterate results
for obj in results.objects:
    print(f"Score: {obj.metadata.score}")
    print(f"Explanation: {obj.metadata.explain_score}")
    print(f"Text: {obj.properties['content'][:200]}")
```

### Pinecone Sparse-Dense

```python
from pinecone_text.sparse import BM25Encoder

# Train BM25 encoder on your corpus
bm25 = BM25Encoder()
bm25.fit(corpus_documents)

# Encode query for hybrid search
sparse_vector = bm25.encode_queries(query_text)
dense_vector = get_embedding(query_text)

# Search with both vectors
results = index.query(
    vector=dense_vector,
    sparse_vector=sparse_vector,
    top_k=10,
    include_metadata=True
)
```

---

## Reranking

### Cohere Rerank

```python
import cohere

co = cohere.Client(api_key="<cohere-api-key>")

def rerank_results(
    query: str,
    documents: list[str],
    top_n: int = 5,
    model: str = "rerank-english-v3.0"
) -> list[dict]:
    """Rerank documents using Cohere."""
    response = co.rerank(
        query=query,
        documents=documents,
        top_n=top_n,
        model=model,
        return_documents=True
    )

    return [
        {
            "text": result.document.text,
            "relevance_score": result.relevance_score,
            "original_index": result.index
        }
        for result in response.results
    ]

# Pipeline: retrieve more, rerank fewer
initial_results = vector_search(query_embedding, top_k=50)
documents = [r.text for r in initial_results]

reranked = rerank_results(
    query="how to configure OAuth2 authentication",
    documents=documents,
    top_n=5
)

# Use top 5 reranked docs for LLM context
context = "\n\n".join([r["text"] for r in reranked])
```

### Cross-Encoder Reranking (Open Source)

```python
from sentence_transformers import CrossEncoder

class Reranker:
    """Rerank using cross-encoder model."""

    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
        self.model = CrossEncoder(model_name)

    def rerank(
        self,
        query: str,
        documents: list[str],
        top_k: int = 5
    ) -> list[tuple[str, float]]:
        """Rerank documents by relevance to query."""
        # Create query-document pairs
        pairs = [[query, doc] for doc in documents]

        # Get relevance scores
        scores = self.model.predict(pairs)

        # Sort by score
        doc_scores = list(zip(documents, scores))
        doc_scores.sort(key=lambda x: x[1], reverse=True)

        return doc_scores[:top_k]

# Usage
reranker = Reranker()
top_docs = reranker.rerank(
    query="OAuth2 setup guide",
    documents=retrieved_documents,
    top_k=5
)
```

### ColBERT-Style Late Interaction

```python
from colbert import Searcher
from colbert.infra import Run, RunConfig

# Setup ColBERT index (one-time)
with Run().context(RunConfig(nranks=1)):
    searcher = Searcher(index="path/to/colbert_index")

# Search with late interaction scoring
results = searcher.search(
    query="how to configure authentication",
    k=10
)

# Results include token-level matching scores
for passage_id, rank, score in zip(*results):
    print(f"Rank {rank}: Doc {passage_id}, Score: {score}")
```

---

## Query Expansion

### LLM-Based Query Expansion

```python
from openai import OpenAI

client = OpenAI()

def expand_query(query: str, num_expansions: int = 3) -> list[str]:
    """Generate query variations using LLM."""
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": f"""Generate {num_expansions} alternative search queries
                that would help find relevant documents for the user's question.
                Include:
                - Synonym variations
                - More specific versions
                - More general versions
                Return as JSON array of strings."""
            },
            {
                "role": "user",
                "content": query
            }
        ],
        response_format={"type": "json_object"}
    )

    import json
    result = json.loads(response.choices[0].message.content)
    return [query] + result.get("queries", [])

# Usage
original_query = "how to fix memory leak"
expanded_queries = expand_query(original_query)
# ["how to fix memory leak", "debug memory issues", "memory leak detection",
#  "troubleshoot high memory usage"]

# Search with all queries and merge results
all_results = []
for q in expanded_queries:
    results = vector_search(get_embedding(q), top_k=10)
    all_results.extend(results)

# Deduplicate and rank by frequency
deduped = deduplicate_by_id(all_results)
```

### Query Rewriting

```python
def rewrite_query_for_retrieval(
    conversational_query: str,
    chat_history: list[dict]
) -> str:
    """Rewrite conversational query to standalone search query."""
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": """Rewrite the user's question as a standalone search query.
                Include relevant context from chat history.
                Output only the rewritten query, nothing else."""
            },
            {
                "role": "user",
                "content": f"""Chat history:
{format_chat_history(chat_history)}

User's question: {conversational_query}

Rewritten search query:"""
            }
        ],
        max_tokens=100
    )

    return response.choices[0].message.content.strip()

# Example
history = [
    {"role": "user", "content": "Tell me about Python web frameworks"},
    {"role": "assistant", "content": "Popular Python web frameworks include Django, Flask, and FastAPI..."}
]
query = "Which one is best for APIs?"

rewritten = rewrite_query_for_retrieval(query, history)
# Output: "Best Python web framework for building REST APIs: Django vs Flask vs FastAPI"
```

---

## HyDE (Hypothetical Document Embeddings)

```python
def hyde_search(
    query: str,
    vector_store,
    embedding_model,
    top_k: int = 10
) -> list[SearchResult]:
    """
    Generate hypothetical answer, embed it, and search.
    Aligns query embedding space with document embedding space.
    """
    # Generate hypothetical document
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": """Write a passage that would answer the user's question.
                Write as if you're an expert documentation author.
                Be specific and technical. About 100-200 words."""
            },
            {
                "role": "user",
                "content": query
            }
        ],
        max_tokens=300
    )

    hypothetical_doc = response.choices[0].message.content

    # Embed hypothetical document
    hyde_embedding = embedding_model.encode(hypothetical_doc)

    # Search with hypothetical doc embedding
    results = vector_store.search(
        vector=hyde_embedding,
        top_k=top_k
    )

    return results

# Usage
results = hyde_search(
    query="How do I handle rate limiting in my API?",
    vector_store=qdrant_client,
    embedding_model=sentence_transformer
)
```

### Multi-HyDE (Multiple Perspectives)

```python
def multi_hyde_search(
    query: str,
    vector_store,
    embedding_model,
    num_hypotheticals: int = 3,
    top_k: int = 10
) -> list[SearchResult]:
    """Generate multiple hypothetical docs for diverse retrieval."""
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": f"""Generate {num_hypotheticals} different passages
                that could answer the question from different angles:
                1. Technical deep-dive
                2. Beginner-friendly explanation
                3. Best practices summary

                Return as JSON with "passages" array."""
            },
            {
                "role": "user",
                "content": query
            }
        ],
        response_format={"type": "json_object"}
    )

    import json
    passages = json.loads(response.choices[0].message.content)["passages"]

    # Embed all hypotheticals
    all_results = []
    for passage in passages:
        embedding = embedding_model.encode(passage)
        results = vector_store.search(vector=embedding, top_k=top_k)
        all_results.extend(results)

    # Deduplicate and combine scores
    return deduplicate_and_merge(all_results)
```

---

## Metadata Filtering

### Multi-Tenant Filtering

```python
class MultiTenantRetriever:
    """Retriever with mandatory tenant isolation."""

    def __init__(self, vector_store):
        self.vector_store = vector_store

    def search(
        self,
        query_embedding: list[float],
        tenant_id: str,
        top_k: int = 10,
        additional_filters: dict | None = None
    ) -> list[SearchResult]:
        """Search with mandatory tenant filter."""
        # Build filter - tenant is always required
        filters = {"tenant_id": {"$eq": tenant_id}}

        if additional_filters:
            filters = {"$and": [filters, additional_filters]}

        return self.vector_store.search(
            vector=query_embedding,
            filter=filters,
            top_k=top_k
        )

# Usage
retriever = MultiTenantRetriever(pinecone_index)
results = retriever.search(
    query_embedding=embedding,
    tenant_id="acme-corp",
    additional_filters={
        "doc_type": {"$in": ["manual", "faq"]},
        "published": {"$eq": True}
    }
)
```

### Temporal Filtering

```python
from datetime import datetime, timedelta

def search_recent_documents(
    query_embedding: list[float],
    vector_store,
    days_back: int = 30,
    top_k: int = 10
) -> list[SearchResult]:
    """Search documents updated within time window."""
    cutoff_date = datetime.utcnow() - timedelta(days=days_back)

    return vector_store.search(
        vector=query_embedding,
        filter={
            "updated_at": {"$gte": cutoff_date.isoformat()}
        },
        top_k=top_k
    )

def search_with_recency_boost(
    query_embedding: list[float],
    vector_store,
    recency_weight: float = 0.2,
    top_k: int = 10
) -> list[SearchResult]:
    """Boost recent documents in ranking."""
    # Get more results to apply post-filtering
    results = vector_store.search(
        vector=query_embedding,
        top_k=top_k * 3
    )

    now = datetime.utcnow()

    def compute_boosted_score(result):
        doc_date = datetime.fromisoformat(result.metadata["updated_at"])
        days_old = (now - doc_date).days
        recency_score = max(0, 1 - (days_old / 365))  # Decay over 1 year
        return result.score * (1 - recency_weight) + recency_score * recency_weight

    # Rerank with recency boost
    for result in results:
        result.boosted_score = compute_boosted_score(result)

    results.sort(key=lambda x: x.boosted_score, reverse=True)
    return results[:top_k]
```

---

## Query Decomposition

```python
def decompose_complex_query(query: str) -> list[str]:
    """Break complex query into sub-questions."""
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": """Break this complex question into simpler sub-questions
                that can be answered independently. Each sub-question should be
                searchable. Return as JSON with "questions" array."""
            },
            {
                "role": "user",
                "content": query
            }
        ],
        response_format={"type": "json_object"}
    )

    import json
    result = json.loads(response.choices[0].message.content)
    return result.get("questions", [query])

def search_with_decomposition(
    complex_query: str,
    vector_store,
    embedding_model,
    top_k_per_subquery: int = 5
) -> dict:
    """Search for each sub-question and aggregate results."""
    sub_questions = decompose_complex_query(complex_query)

    aggregated_results = {
        "sub_questions": [],
        "all_documents": []
    }

    seen_doc_ids = set()

    for sub_q in sub_questions:
        embedding = embedding_model.encode(sub_q)
        results = vector_store.search(vector=embedding, top_k=top_k_per_subquery)

        sub_q_results = []
        for r in results:
            if r.id not in seen_doc_ids:
                seen_doc_ids.add(r.id)
                sub_q_results.append(r)
                aggregated_results["all_documents"].append(r)

        aggregated_results["sub_questions"].append({
            "question": sub_q,
            "results": sub_q_results
        })

    return aggregated_results

# Usage
complex_q = "Compare the security features of OAuth2 and API keys, and explain when to use each"
results = search_with_decomposition(complex_q, vector_store, embedding_model)
```

---

## Contextual Compression

```python
def compress_retrieved_context(
    query: str,
    documents: list[str],
    max_tokens: int = 2000
) -> str:
    """Extract only query-relevant parts from documents."""
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": f"""Extract only the parts of these documents that are
                relevant to answering the user's question.
                Remove irrelevant information.
                Keep extracted content under {max_tokens} tokens.
                Maintain source attribution."""
            },
            {
                "role": "user",
                "content": f"""Question: {query}

Documents:
{chr(10).join([f'[Doc {i+1}]: {doc}' for i, doc in enumerate(documents)])}

Extracted relevant content:"""
            }
        ],
        max_tokens=max_tokens
    )

    return response.choices[0].message.content
```

### Extractive Compression with Cross-Encoder

```python
from sentence_transformers import CrossEncoder

def extractive_compress(
    query: str,
    document: str,
    cross_encoder: CrossEncoder,
    top_k_sentences: int = 5
) -> str:
    """Extract most relevant sentences from document."""
    import re
    sentences = re.split(r'(?<=[.!?])\s+', document)

    if len(sentences) <= top_k_sentences:
        return document

    # Score each sentence
    pairs = [[query, sent] for sent in sentences]
    scores = cross_encoder.predict(pairs)

    # Get top sentences in original order
    scored_sentences = list(zip(range(len(sentences)), sentences, scores))
    top_sentences = sorted(scored_sentences, key=lambda x: x[2], reverse=True)[:top_k_sentences]
    top_sentences = sorted(top_sentences, key=lambda x: x[0])  # Restore order

    return " ".join([s[1] for s in top_sentences])
```

---

## Complete Optimized Pipeline

```python
class OptimizedRetriever:
    """Production retrieval pipeline with all optimizations."""

    def __init__(
        self,
        vector_store,
        embedding_model,
        reranker,
        bm25_index
    ):
        self.vector_store = vector_store
        self.embedding_model = embedding_model
        self.reranker = reranker
        self.bm25_index = bm25_index

    async def retrieve(
        self,
        query: str,
        tenant_id: str,
        top_k: int = 5,
        use_hyde: bool = False,
        use_query_expansion: bool = True
    ) -> list[dict]:
        """Full optimized retrieval pipeline."""
        # Step 1: Query preprocessing
        processed_query = self._preprocess_query(query)

        # Step 2: Optional HyDE
        if use_hyde:
            query_embedding = await self._hyde_embed(processed_query)
        else:
            query_embedding = self.embedding_model.encode(processed_query)

        # Step 3: Hybrid search (vector + BM25)
        vector_results = self.vector_store.search(
            vector=query_embedding,
            filter={"tenant_id": tenant_id},
            top_k=50
        )
        bm25_results = self.bm25_index.search(processed_query, top_k=50)

        # Step 4: Merge with RRF
        merged = reciprocal_rank_fusion(
            vector_results,
            bm25_results,
            vector_weight=0.6
        )[:30]

        # Step 5: Optional query expansion
        if use_query_expansion:
            expanded_queries = await self._expand_query(processed_query)
            for exp_query in expanded_queries[1:]:  # Skip original
                exp_embedding = self.embedding_model.encode(exp_query)
                exp_results = self.vector_store.search(
                    vector=exp_embedding,
                    filter={"tenant_id": tenant_id},
                    top_k=10
                )
                merged.extend(exp_results)
            merged = deduplicate_by_id(merged)[:30]

        # Step 6: Rerank
        documents = [r.text for r in merged]
        reranked = self.reranker.rerank(
            query=processed_query,
            documents=documents,
            top_k=top_k
        )

        return [
            {
                "text": doc,
                "score": score,
                "metadata": merged[i].metadata
            }
            for i, (doc, score) in enumerate(reranked)
        ]

    def _preprocess_query(self, query: str) -> str:
        """Clean and normalize query."""
        import re
        query = re.sub(r'\s+', ' ', query).strip()
        return query

    async def _hyde_embed(self, query: str) -> list[float]:
        """Generate hypothetical document and embed."""
        # Implementation from HyDE section
        pass

    async def _expand_query(self, query: str) -> list[str]:
        """Expand query with variations."""
        # Implementation from Query Expansion section
        pass
```

---

## Performance Benchmarks

| Technique | Latency Impact | Quality Impact | Cost Impact |
|-----------|----------------|----------------|-------------|
| Vector only | Baseline | Baseline | Baseline |
| + BM25 hybrid | +10-20ms | +5-15% precision | Minimal |
| + Reranking | +50-100ms | +10-20% precision | +$0.001/query |
| + Query expansion | +100-200ms | +5-10% recall | +$0.002/query |
| + HyDE | +200-500ms | +10-25% precision | +$0.003/query |

---

## Quick Reference

| Goal | Technique | Implementation |
|------|-----------|----------------|
| Improve precision | Reranking | Cross-encoder or Cohere |
| Improve recall | Query expansion | LLM-generated variations |
| Handle synonyms | Hybrid search | BM25 + vector with RRF |
| Concept search | HyDE | Hypothetical doc embedding |
| Multi-tenant | Metadata filter | Mandatory tenant_id |
| Fresh content | Temporal filter | Date range queries |
| Complex questions | Decomposition | Sub-question retrieval |

## Related Skills

- **RAG Architect** - System design and architecture
- **NLP Engineer** - Query understanding
- **Python Pro** - Async implementation
- **ML Pipeline** - Model serving for rerankers
