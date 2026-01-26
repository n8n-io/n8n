# RFC: Built-in Vector Store

## Metadata

- **RFC ID**: [TBD]
- **Author(s)**: [Your Name]
- **Status**: Draft
- **Created**: January 23, 2026
- **Updated**: January 26, 2026

## Stakeholders

- **ChatHub**: Needs vector store for personal agent
- **Cloud**: About potential impact on operational stability, backup volume increase, and infrastructure change

## Summary

This RFC proposes adding a built-in vector store to n8n that allows users to store, retrieve, and search vector embeddings directly within n8n workflows without requiring external vector database dependencies. This feature would significantly simplify RAG (Retrieval-Augmented Generation) workflows and make AI-powered automation more accessible to n8n users.

## Motivation

Currently, n8n users who want to implement semantic search or RAG patterns must integrate with external vector databases using nodes like `PGVectorStore` or `VectorStoreSupabase`. This creates setup friction, especially in the context of ChatHub: Users must provision external infrastructure, configure credentials, and understand vector database concepts before they can start using a personal agent. A built-in vector store would eliminate this complexity, letting users go from zero to a working AI chat equipped with file knowledge in minutes while maintaining the option to migrate to external services for production-scale needs.

## Goals

- Provide zero-configuration vector storage for small to medium workloads
- Support common embedding dimensions (384, 768, 1536 etc)
- Integrate seamlessly with existing n8n AI nodes and credential system
- Maintain data persistence across n8n restarts
- Provide simple migration path to external vector stores when needed

## Non-Goals

- Competing with production-grade vector databases for large-scale deployments
- Providing a standalone vector database service outside n8n
- Replacing existing external vector store integrations

## Proposal

### Architecture

The built-in vector store will be implemented as the new `vector-store` module with the following components.

SQLite with the `sqlite-vec` extension for vector similarity search, chosen for its lightweight nature and zero-configuration deployment.

For PostgreSQL-backed n8n instances, vectors are stored as bytea (binary) with similarity calculations performed in JavaScript using worker threads if pgvector extension isn't available. The module tries to detect pgvector extension on instance restart, and if detected, upgrades to use native pgvector operators for significantly improved performance, while maintaining the same behavior with the bytea storage.

Then, it is used to implement the node:

**Execution Engine Integration**: The execution engine will expose necessary methods through `IWorkflowExecuteAdditionalData` that the vector store node can use to interact with the persistence layer. This aligns the existing approach for supporting DataTable node.

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

- **Access Control**: Vectors are scoped to projects via `projectId`; The VectorStore node reads and writes vectors within the project which the workflow belongs to. This ensures users can only access vectors from projects they have permission to view (ChatHub personal agent is going to use each user's home project)
- **Data Retention**: The `projectId` field ensures each row's lifetime is bound to the project (and it's owner), preventing data from kept in the database indefinitely.
- **Resource Limits**: The 200MB disk usage limit prevents abuse and resource exhaustion. [TBD: corresponding number of documents]
- **Expected Performance**:
  - **SQLite (with sqlite-vec)**: Sub-100ms search for up to 10k vectors [To be confirmed]
  - **PostgreSQL (bytea + JS workers)**: Sub-500ms search for up to 10k vectors, acceptable for ChatHub use cases
  - **PostgreSQL (with pgvector)**: Sub-100ms search for 100k+ vectors, production-ready performance
- **Automatic pgvector Upgrade**: On PostgreSQL instances, the system checks for pgvector availability on every startup but exits early if already upgraded. The upgrade is idempotent and safe to run multiple times. Users simply need to install the pgvector extension and restart n8n to get the performance benefits.

## Risks & Open Questions

- Appropriate default size limit for the vector table
- Should there also be size limit per memoryKey and/or project ID? For PostgreSQL without pgvector, all rows sharing the same memoryKey are fetched and calculated cosine similarity against the query text's embedding on retrieval, potentially causing high peak memory usage or long CPU time. **Mitigation**: Users experiencing this can install pgvector to eliminate the issue, as native pgvector operations handle filtering and sorting at the database level.
- Should persistence be the option of InMemoryVectorStore node, or a new node to avoid name misalignment?
- The new table and InMemoryVectorStore node with persistence are intended for general use, and as such, vector store table has no column that allows cascading deletion when ChatHub agent is deleted. This may cause orphan records in case of runtime exception or logic bugs.
    - We can add the UI to manage project's vector store later

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

## Selected Approach

The implementation uses **SQLite-vec for SQLite** and a **hybrid approach for PostgreSQL**:

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
- **No migration failures**: Initial migration never requires extensions. This reduces costly coordination before the release.
- **Automatic optimization**: Users get performance boost when pgvector is installed, without manual migration
- **Graceful degradation**: Falls back to JS workers if pgvector is unavailable
- **User control**: Users can install pgvector at any time to get performance benefits

This approach balances simplicity, performance, and maintainability while leveraging existing n8n database infrastructure without creating deployment barriers.

## Feedback Summary

[TBD]