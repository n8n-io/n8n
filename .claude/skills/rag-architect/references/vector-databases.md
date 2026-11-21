# Vector Databases

---

## Database Comparison Matrix

| Feature | Pinecone | Weaviate | Qdrant | Chroma | pgvector |
|---------|----------|----------|--------|--------|----------|
| **Hosting** | Managed only | Managed + Self-hosted | Managed + Self-hosted | Self-hosted (cloud beta) | Self-hosted |
| **Hybrid Search** | Yes (sparse-dense) | Yes (BM25 + vector) | Yes (sparse vectors) | Limited | Manual (+ pg_trgm) |
| **Filtering** | Excellent | Excellent | Excellent | Basic | SQL-native |
| **Max Dimensions** | 20,000 | Unlimited | 65,535 | Unlimited | 2,000 |
| **Pricing Model** | Per-vector/query | Per-node | Per-node | Free (OSS) | Free (extension) |
| **Multi-tenancy** | Namespaces | Multi-tenant class | Collections + payloads | Collections | Schema/RLS |
| **Best For** | Enterprise SaaS | Semantic apps | High-performance | Prototyping | Postgres shops |

## When to Use Each

### Pinecone
```
Best For:
- Enterprise RAG with strict SLAs
- Teams wanting zero infrastructure management
- Applications needing sparse-dense hybrid search
- High-volume production with predictable costs

When to Avoid:
- Cost-sensitive projects (expensive at scale)
- Need for self-hosting or data residency
- Complex filtering requirements beyond metadata
- Wanting to avoid vendor lock-in
```

### Weaviate
```
Best For:
- Semantic search with built-in vectorization
- Multi-modal (text, image) applications
- GraphQL-native teams
- Hybrid BM25 + vector search requirements

When to Avoid:
- Simple embedding storage only
- Memory-constrained environments
- Teams unfamiliar with GraphQL
```

### Qdrant
```
Best For:
- High-performance, low-latency requirements
- Complex filtering with payload indexes
- Rust/performance-focused teams
- Self-hosted with full control

When to Avoid:
- Teams wanting fully managed simplicity
- GraphQL preference (REST/gRPC only)
```

### Chroma
```
Best For:
- Local development and prototyping
- LangChain/LlamaIndex integration
- Simple RAG proof-of-concepts
- Educational projects

When to Avoid:
- Production workloads at scale
- Multi-tenant applications
- High availability requirements
```

### pgvector
```
Best For:
- Existing PostgreSQL infrastructure
- Transactional + vector in same DB
- SQL-native teams
- Cost optimization (no new infra)

When to Avoid:
- Vectors > 2000 dimensions
- Billions of vectors (scaling limits)
- Sub-millisecond latency requirements
```

---

## Pinecone Setup

```python
from pinecone import Pinecone, ServerlessSpec

# Initialize client
pc = Pinecone(api_key="<pinecone-api-key>")

# Create index with serverless
pc.create_index(
    name="rag-index",
    dimension=1536,  # OpenAI ada-002
    metric="cosine",
    spec=ServerlessSpec(
        cloud="aws",
        region="us-east-1"
    )
)

# Get index reference
index = pc.Index("rag-index")

# Upsert vectors with metadata
index.upsert(
    vectors=[
        {
            "id": "doc-1",
            "values": embedding_vector,
            "metadata": {
                "source": "manual.pdf",
                "page": 42,
                "section": "installation",
                "tenant_id": "acme-corp"
            }
        }
    ],
    namespace="production"
)

# Query with metadata filter
results = index.query(
    vector=query_embedding,
    top_k=10,
    include_metadata=True,
    namespace="production",
    filter={
        "tenant_id": {"$eq": "acme-corp"},
        "section": {"$in": ["installation", "setup"]}
    }
)

# Hybrid search (sparse-dense)
from pinecone_text.sparse import BM25Encoder

bm25 = BM25Encoder()
bm25.fit(corpus)  # Fit on your documents

results = index.query(
    vector=dense_embedding,
    sparse_vector=bm25.encode_queries(query_text),
    top_k=10,
    alpha=0.5  # Balance dense vs sparse
)
```

---

## Weaviate Setup

```python
import weaviate
from weaviate.classes.config import Configure, Property, DataType

# Connect to Weaviate Cloud
client = weaviate.connect_to_weaviate_cloud(
    cluster_url="https://your-cluster.weaviate.network",
    auth_credentials=weaviate.auth.AuthApiKey("<weaviate-api-key>")
)

# Or self-hosted
client = weaviate.connect_to_local(
    host="localhost",
    port=8080
)

# Create collection with vectorizer
client.collections.create(
    name="Document",
    vectorizer_config=Configure.Vectorizer.text2vec_openai(
        model="text-embedding-3-small"
    ),
    properties=[
        Property(name="content", data_type=DataType.TEXT),
        Property(name="source", data_type=DataType.TEXT),
        Property(name="page", data_type=DataType.INT),
        Property(name="tenant_id", data_type=DataType.TEXT, index_filterable=True)
    ]
)

# Insert with auto-vectorization
documents = client.collections.get("Document")
documents.data.insert(
    properties={
        "content": "Installation guide content...",
        "source": "manual.pdf",
        "page": 42,
        "tenant_id": "acme-corp"
    }
)

# Or with pre-computed vector
documents.data.insert(
    properties={"content": "...", "source": "..."},
    vector=precomputed_embedding
)

# Hybrid search (BM25 + vector)
from weaviate.classes.query import MetadataQuery, Filter

results = documents.query.hybrid(
    query="how to install",
    alpha=0.5,  # 0=BM25 only, 1=vector only
    limit=10,
    filters=Filter.by_property("tenant_id").equal("acme-corp"),
    return_metadata=MetadataQuery(score=True, explain_score=True)
)

for obj in results.objects:
    print(f"Score: {obj.metadata.score}, Content: {obj.properties['content'][:100]}")

client.close()
```

---

## Qdrant Setup

```python
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct,
    Filter, FieldCondition, MatchValue,
    PayloadSchemaType
)

# Connect to Qdrant Cloud
client = QdrantClient(
    url="https://your-cluster.qdrant.io",
    api_key="<qdrant-api-key>"
)

# Or local
client = QdrantClient(host="localhost", port=6333)

# Create collection
client.create_collection(
    collection_name="documents",
    vectors_config=VectorParams(
        size=1536,
        distance=Distance.COSINE
    )
)

# Create payload index for fast filtering
client.create_payload_index(
    collection_name="documents",
    field_name="tenant_id",
    field_schema=PayloadSchemaType.KEYWORD
)

# Upsert points
client.upsert(
    collection_name="documents",
    points=[
        PointStruct(
            id="doc-1",
            vector=embedding_vector,
            payload={
                "content": "Installation guide...",
                "source": "manual.pdf",
                "page": 42,
                "tenant_id": "acme-corp"
            }
        )
    ]
)

# Search with filter
results = client.search(
    collection_name="documents",
    query_vector=query_embedding,
    limit=10,
    query_filter=Filter(
        must=[
            FieldCondition(
                key="tenant_id",
                match=MatchValue(value="acme-corp")
            )
        ]
    ),
    with_payload=True
)

# Batch upsert for large datasets
from qdrant_client.models import Batch

client.upsert(
    collection_name="documents",
    points=Batch(
        ids=ids_list,
        vectors=vectors_list,
        payloads=payloads_list
    )
)
```

---

## Chroma Setup

```python
import chromadb
from chromadb.config import Settings

# Persistent local storage
client = chromadb.PersistentClient(
    path="./chroma_data",
    settings=Settings(anonymized_telemetry=False)
)

# Create collection with custom embedding function
from chromadb.utils.embedding_functions import OpenAIEmbeddingFunction

embedding_fn = OpenAIEmbeddingFunction(
    api_key="<openai-api-key>",
    model_name="text-embedding-3-small"
)

collection = client.get_or_create_collection(
    name="documents",
    embedding_function=embedding_fn,
    metadata={"hnsw:space": "cosine"}
)

# Add documents (auto-embeds)
collection.add(
    ids=["doc-1", "doc-2"],
    documents=["Installation guide...", "Configuration steps..."],
    metadatas=[
        {"source": "manual.pdf", "page": 42},
        {"source": "manual.pdf", "page": 43}
    ]
)

# Or with pre-computed embeddings
collection.add(
    ids=["doc-3"],
    embeddings=[precomputed_vector],
    metadatas=[{"source": "guide.pdf"}],
    documents=["Original text for reference"]
)

# Query
results = collection.query(
    query_texts=["how to install"],
    n_results=10,
    where={"source": "manual.pdf"},
    include=["documents", "metadatas", "distances"]
)

# Update existing document
collection.update(
    ids=["doc-1"],
    documents=["Updated installation guide..."],
    metadatas=[{"source": "manual_v2.pdf", "page": 42}]
)
```

---

## pgvector Setup

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table with vector column
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    embedding vector(1536),  -- OpenAI dimensions
    source VARCHAR(255),
    page INTEGER,
    tenant_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create HNSW index (recommended for most cases)
CREATE INDEX ON documents
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Or IVFFlat for very large datasets
CREATE INDEX ON documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index on filter columns
CREATE INDEX ON documents (tenant_id);
```

```python
import psycopg2
from pgvector.psycopg2 import register_vector

conn = psycopg2.connect("postgresql://localhost/ragdb")
register_vector(conn)

# Insert with embedding
cur = conn.cursor()
cur.execute(
    """
    INSERT INTO documents (content, embedding, source, page, tenant_id)
    VALUES (%s, %s, %s, %s, %s)
    RETURNING id
    """,
    ("Installation guide...", embedding_vector, "manual.pdf", 42, "acme-corp")
)

# Similarity search with filter
cur.execute(
    """
    SELECT id, content, source, page,
           1 - (embedding <=> %s) AS similarity
    FROM documents
    WHERE tenant_id = %s
    ORDER BY embedding <=> %s
    LIMIT 10
    """,
    (query_embedding, "acme-corp", query_embedding)
)

results = cur.fetchall()

# Hybrid search with pg_trgm
cur.execute(
    """
    SELECT id, content,
           (0.5 * (1 - (embedding <=> %s))) +
           (0.5 * similarity(content, %s)) AS hybrid_score
    FROM documents
    WHERE tenant_id = %s
      AND content %% %s  -- Trigram similarity threshold
    ORDER BY hybrid_score DESC
    LIMIT 10
    """,
    (query_embedding, query_text, "acme-corp", query_text)
)
```

---

## Index Tuning Guide

### HNSW Parameters

| Parameter | Description | Trade-off |
|-----------|-------------|-----------|
| `m` | Connections per node | Higher = better recall, more memory |
| `ef_construction` | Build-time search width | Higher = better index, slower build |
| `ef_search` | Query-time search width | Higher = better recall, slower query |

```python
# Qdrant HNSW tuning
client.update_collection(
    collection_name="documents",
    hnsw_config=HnswConfigDiff(
        m=16,                    # Default: 16, increase for better recall
        ef_construct=100,        # Default: 100, higher for better index
        full_scan_threshold=10000  # Use brute force below this size
    )
)

# Query-time ef adjustment
results = client.search(
    collection_name="documents",
    query_vector=query_embedding,
    limit=10,
    search_params=SearchParams(hnsw_ef=128)  # Higher for better recall
)
```

### Quantization for Scale

```python
# Qdrant scalar quantization (4x memory reduction)
from qdrant_client.models import ScalarQuantization, ScalarQuantizationConfig

client.update_collection(
    collection_name="documents",
    quantization_config=ScalarQuantization(
        scalar=ScalarQuantizationConfig(
            type="int8",
            quantile=0.99,
            always_ram=True
        )
    )
)
```

---

## Multi-Tenancy Patterns

### Namespace Isolation (Pinecone)
```python
# Tenant data in separate namespaces
index.upsert(vectors=[...], namespace="tenant-acme")
index.upsert(vectors=[...], namespace="tenant-globex")

# Query within tenant namespace
results = index.query(
    vector=query_embedding,
    namespace="tenant-acme",
    top_k=10
)
```

### Metadata Filtering (Qdrant/Weaviate)
```python
# Add tenant_id to all documents
point = PointStruct(
    id="doc-1",
    vector=embedding,
    payload={"tenant_id": "acme", "content": "..."}
)

# Always filter by tenant
results = client.search(
    collection_name="documents",
    query_vector=query_embedding,
    query_filter=Filter(
        must=[FieldCondition(key="tenant_id", match=MatchValue(value="acme"))]
    )
)
```

### Collection per Tenant (High Isolation)
```python
# Create tenant-specific collection
client.create_collection(
    collection_name=f"docs_{tenant_id}",
    vectors_config=VectorParams(size=1536, distance=Distance.COSINE)
)
```

---

## Decision Flowchart

```
Start
  │
  ├─ Need managed service with zero ops?
  │   └─ Yes → Pinecone
  │
  ├─ Have existing PostgreSQL?
  │   └─ Yes → pgvector (if vectors < 2000 dims)
  │
  ├─ Need built-in vectorization?
  │   └─ Yes → Weaviate
  │
  ├─ Need maximum performance + self-host?
  │   └─ Yes → Qdrant
  │
  ├─ Prototyping / local development?
  │   └─ Yes → Chroma
  │
  └─ Default recommendation → Qdrant (balance of features/performance)
```

---

## Quick Reference

| Task | Pinecone | Weaviate | Qdrant | pgvector |
|------|----------|----------|--------|----------|
| Create index/collection | `create_index()` | `collections.create()` | `create_collection()` | `CREATE TABLE` |
| Insert | `upsert()` | `data.insert()` | `upsert()` | `INSERT` |
| Search | `query()` | `query.near_vector()` | `search()` | `ORDER BY <=>` |
| Filter | `filter={}` | `Filter.by_property()` | `query_filter=Filter()` | `WHERE` |
| Delete | `delete()` | `data.delete_by_id()` | `delete()` | `DELETE` |
| Hybrid | sparse_vector param | `query.hybrid()` | sparse vectors | Manual |

## Related Skills

- **Database Optimizer** - Index tuning and query performance
- **Cloud Architect** - Infrastructure decisions for vector DB hosting
- **Python Pro** - Implementation patterns with async clients
