# RFC: Built-in Vector Store

## Metadata

- **RFC ID**: [TBD]
- **Author(s)**: [Your Name]
- **Status**: Draft
- **Created**: January 23, 2026
- **Updated**: January 26, 2026

## Stakeholders

- **ChatHub**: Needs vector store for personal agent
- **Cloud**: Concerned about potential impact on operational stability, backup volume increase, and infrastructure change

## Summary

This RFC proposes adding a built-in vector store to n8n that allows users to store, retrieve, and search vector embeddings directly within n8n workflows without requiring external vector database dependencies. This feature would significantly simplify RAG (Retrieval-Augmented Generation) workflows and make AI-powered automation more accessible to n8n users.

## Motivation

Currently, n8n users who want to implement semantic search or RAG patterns must integrate with external vector databases using nodes like `PGVectorStore` or `VectorStoreSupabase`. This creates setup friction: Users must provision external infrastructure (e.g., Supabase account, PostgreSQL with pgvector extension), configure credentials and connection strings, understand vector database concepts like embeddings and similarity search, and manage separate infrastructure lifecycle from their n8n instance.

This friction is particularly problematic for ChatHub, which aims to provide personal agents to both technical and non-technical users. Before users can create an agent with file knowledge, they must complete all the setup steps mentioned above. A built-in vector store would eliminate this complexity, enabling users to go from zero to a working AI chat equipped with file knowledge in minutes, while maintaining the option to migrate to external services for production-scale needs.

## Goals

- Provide zero-configuration vector storage for small to medium workloads
- Support common embedding dimensions (384, 768, 1536, etc.)
- Integrate seamlessly with existing n8n AI nodes and credential system
- Maintain data persistence across n8n restarts
- Provide simple migration path to external vector stores when needed

## Non-Goals

- Compete with production-grade vector databases for large-scale deployments
- Provide a standalone vector database service outside n8n
- Replace existing external vector store integrations

## Proposal

### Architecture

The built-in vector store will be implemented as a new `vector-store` module with the following components.

**SQLite**: Uses the `sqlite-vec` extension for vector similarity search, chosen for its lightweight nature and zero-configuration deployment.

**PostgreSQL**: Uses a hybrid approach with automatic pgvector detection and fallback to JavaScript-based similarity calculations. See [PostgreSQL Strategy](#postgresql-strategy) section for details.

**Execution Engine Integration**: The execution engine will expose necessary methods through `IWorkflowExecuteAdditionalData` that the vector store node can use to interact with the persistence layer. This aligns with the existing approach for supporting the DataTable node.

**Vector Store Node**: The existing `InMemoryVectorStore` node will be extended with an `enablePersistence` option. When enabled, vectors will be persisted to the database instead of remaining only in memory, providing the same interface users are already familiar with.


### Data Model

Vectors will be stored in a new `vector_store_data` table:

| **Column** | **Type** | **Description** |
| --- | --- | --- |
| `id` | VARCHAR(36) | Primary key |
| `memoryKey` | VARCHAR(255) | Key to group related vectors |
| `vector` | BLOB/BYTEA | Vector embeddings (BLOB for SQLite, BYTEA for PostgreSQL) |
| `vectorPgv` | VECTOR(1536) | *Optional PostgreSQL only*: pgvector column, added automatically when pgvector extension is available |
| `content` | TEXT | Original text content |
| `metadata` | JSON/JSONB | Additional metadata (JSON for SQLite, JSONB for PostgreSQL) |
| `projectId` | VARCHAR(36) | Foreign key to project table (CASCADE on delete) |
| `createdAt` | TIMESTAMP | Creation timestamp |
| `updatedAt` | TIMESTAMP | Last update timestamp |

**Note on PostgreSQL pgvector**: The `vectorPgv` column is automatically added during application startup if the pgvector extension is detected. An IVFFlat index is created on this column for efficient cosine similarity searches. When present, new vectors populate both `vector` (bytea) and `vectorPgv` columns, and similarity searches use the optimized pgvector operators.

### PostgreSQL Strategy

**Initial Setup (Zero Dependencies)**:
- Vectors stored as `bytea` (binary) column
- Similarity calculations performed in JavaScript using worker threads
- Works on all PostgreSQL versions without requiring extensions
- Safe migrations that never fail

**Automatic Upgrade Path (Optional Performance Enhancement)**:
- If pgvector extension becomes available after deployment, the system automatically detects and upgrades on next startup
- Adds `vectorPgv` column with `vector(1536)` type and IVFFlat index
- New vectors populate both columns for backward compatibility
- Similarity searches automatically use native pgvector operators (`<=>`) for 10-100x performance improvement
- Upgrade runs during application initialization after database migrations complete

**Benefits of Hybrid Approach**:
- **Zero-config deployment**: Works immediately on any PostgreSQL instance
- **No migration failures**: Initial migration never requires extensions, reducing costly coordination before release
- **Automatic optimization**: Users get a performance boost when pgvector is installed, without requiring manual migration
- **Graceful degradation**: Falls back to JS workers if pgvector is unavailable
- **User control**: Users can install pgvector at any time to gain performance benefits

This approach balances simplicity, performance, and maintainability while leveraging existing n8n database infrastructure without creating deployment barriers.



### PostgreSQL pgvector Upgrade Flow

The automatic pgvector upgrade mechanism works as follows:

1. **On Application Startup** (after database migrations complete):
   - System checks if `vectorPgv` column already exists
   - If yes: Use pgvector for similarity operations
   - If no: Attempt to detect and enable pgvector extension

2. **Extension Detection**:
   - Try to create pgvector extension if not already present
   - Verify extension works with a test query
   - If successful: Proceed with schema upgrade
   - If fails: Continue using JavaScript-based similarity search with bytea storage

3. **Schema Upgrade** (only if pgvector available):
   - Add `vectorPgv vector(1536)` column to existing table
   - Create IVFFlat index for efficient cosine similarity searches
   - Log upgrade completion

4. **Runtime Behavior**:
   - **Vector insertion**: When pgvector is available, populate both `vector` (bytea) and `vectorPgv` columns
   - **Similarity search**: Automatically route to pgvector operators or JavaScript workers based on availability
   - All operations are idempotent and safe

**Key Properties**:
- Never fails startup - catches all errors and falls back gracefully
- Idempotent - safe to run multiple times
- No data migration needed - existing bytea rows remain valid
- Zero downtime - new vectors get both formats automatically
- User-controlled timing - users install pgvector when ready

## Important Considerations

- **Access Control**: Vectors are scoped to projects via `projectId`. The VectorStore node reads and writes vectors within the project to which the workflow belongs. This ensures users can only access vectors from projects they have permission to view (ChatHub personal agents will use each user's home project).
- **Data Retention**: The `projectId` field ensures each row's lifetime is bound to the project (and its owner), preventing data from being kept in the database indefinitely.
- **Resource Limits**: A 200MB disk usage limit per project prevents abuse and resource exhaustion. <!-- COMMENT: Need to determine and document the corresponding number of documents this limit allows. Also clarify if this is per project or global. --> [TBD: corresponding number of documents]
- **Expected Performance**: <!-- COMMENT: These are preliminary estimates and should be validated through benchmarking before finalizing the RFC -->
  - **SQLite (with sqlite-vec)**: Sub-100ms search for up to 10k vectors [To be confirmed through benchmarking]
  - **PostgreSQL (bytea + JS workers)**: Sub-500ms search for up to 10k vectors, acceptable for ChatHub use cases
  - **PostgreSQL (with pgvector)**: Sub-100ms search for 100k+ vectors, production-ready performance
- **Automatic pgvector Upgrade**: On PostgreSQL instances, the system checks for pgvector availability on every startup but skips the upgrade process if pgvector is already enabled. The upgrade is idempotent and safe to run multiple times. Users simply need to install the pgvector extension and restart n8n to gain the performance benefits.

## Risks & Open Questions

- Appropriate default size limit for the vector table
- Should there also be a size limit per memoryKey and/or project ID? <!-- COMMENT: This is critical for PostgreSQL without pgvector --> For PostgreSQL without pgvector, all rows sharing the same memoryKey are fetched and cosine similarity is calculated against the query text's embedding on retrieval, potentially causing high peak memory usage or long CPU time. **Mitigation**: Users experiencing this can install pgvector to eliminate the issue, as native pgvector operations handle filtering and sorting at the database level.
- Should persistence be an option of the InMemoryVectorStore node, or should it be a new node to avoid name misalignment?
- The new table and InMemoryVectorStore node with persistence are intended for general use, and as such, the vector store table has no column that allows cascading deletion when a ChatHub agent is deleted. <!-- COMMENT: The concern here is that when a ChatHub agent is deleted, we rely on workflow logic to clean up associated vectors. If the cleanup workflow fails or has bugs, vector data may remain orphaned in the database. --> This may cause orphaned records in case of runtime exceptions or logic bugs.
    - We can add a UI to manage a project's vector store later

## Alternatives Considered

**Alternative 1: Bundle Qdrant/Milvus Lite**

- Pros: Production-grade performance, advanced features
- Cons: Larger deployment footprint, more complex maintenance, resource overhead

**Alternative 2: In-Memory Only Store**

- Pros: Fastest performance, simplest implementation
- Cons: Data loss on restart, memory constraints, not suitable for persistent workflows

**Alternative 3: File-Based Store (FAISS)**

- Pros: Good performance, proven technology
- Cons: Introduces a new pattern of filesystem usage bypassing binary data service

## Feedback Summary

[TBD]