# @zilliz/milvus2-sdk-node

Official Node.js SDK for [Milvus](https://github.com/milvus-io/milvus) vector database. Provides gRPC and HTTP clients for vector similarity search, metadata filtering, and full collection/index/user management.

**Package**: `@zilliz/milvus2-sdk-node` | **Node.js**: v18+ | **License**: Apache-2.0

[![npm version](https://img.shields.io/npm/v/@zilliz/milvus2-sdk-node)](https://www.npmjs.com/package/@zilliz/milvus2-sdk-node)
[![downloads](https://img.shields.io/npm/dw/@zilliz/milvus2-sdk-node)](https://www.npmjs.com/package/@zilliz/milvus2-sdk-node)
[![codecov](https://codecov.io/gh/milvus-io/milvus-sdk-node/branch/main/graph/badge.svg?token=Zu5FwWstwI)](https://codecov.io/gh/milvus-io/milvus-sdk-node)

## Installation

```bash
npm install @zilliz/milvus2-sdk-node
# or
yarn add @zilliz/milvus2-sdk-node
```

## Compatibility

| Milvus version | SDK version | Install command                             |
| :------------: | :---------: | :------------------------------------------ |
|    v2.6.0+     |  **latest** | `yarn add @zilliz/milvus2-sdk-node@latest`  |
|    v2.5.0+     |   v2.5.0    | `yarn add @zilliz/milvus2-sdk-node@2.5.12`  |
|    v2.4.0+     |   v2.4.9    | `yarn add @zilliz/milvus2-sdk-node@2.4.9`   |

## Quick Start

### Connect to Milvus

```typescript
import { MilvusClient } from '@zilliz/milvus2-sdk-node';

// Local Milvus
const client = new MilvusClient({ address: 'localhost:19530' });

// With authentication
const client = new MilvusClient({
  address: 'localhost:19530',
  username: 'root',
  password: 'milvus',
});

// Zilliz Cloud
const client = new MilvusClient({
  address: 'your-endpoint.zillizcloud.com',
  token: 'your-api-key',
});

// Wait for connection to be ready
await client.connectPromise;
```

### Create Collection, Insert, and Search

```typescript
import {
  MilvusClient,
  DataType,
  MetricType,
} from '@zilliz/milvus2-sdk-node';

const client = new MilvusClient({ address: 'localhost:19530' });

// 1. Create collection with schema
await client.createCollection({
  collection_name: 'my_collection',
  fields: [
    { name: 'id', data_type: DataType.Int64, is_primary_key: true, autoID: true },
    { name: 'text', data_type: DataType.VarChar, max_length: 512 },
    { name: 'vector', data_type: DataType.FloatVector, dim: 128 },
  ],
  index_params: [
    {
      field_name: 'vector',
      index_type: 'HNSW',
      metric_type: MetricType.COSINE,
      params: { M: 16, efConstruction: 256 },
    },
  ],
  enable_dynamic_field: true,
});

// 2. Load into memory (required before search/query)
await client.loadCollection({ collection_name: 'my_collection' });

// 3. Insert data
await client.insert({
  collection_name: 'my_collection',
  data: [
    { vector: Array(128).fill(0.1), text: 'doc1' },
    { vector: Array(128).fill(0.2), text: 'doc2' },
  ],
});

// 4. Search
const results = await client.search({
  collection_name: 'my_collection',
  data: [Array(128).fill(0.1)],
  limit: 10,
  output_fields: ['text'],
});
console.log(results.results);
```

---

## API Reference

### Imports

```typescript
// Main client
import { MilvusClient } from '@zilliz/milvus2-sdk-node';

// HTTP client (for environments without gRPC support)
import { HttpClient } from '@zilliz/milvus2-sdk-node';

// Enums and constants
import {
  DataType,
  MetricType,
  IndexType,
  ConsistencyLevelEnum,
  ErrorCode,
} from '@zilliz/milvus2-sdk-node';

// Bulk writer for large-scale imports
import { BulkWriter } from '@zilliz/milvus2-sdk-node';
```

### Client Configuration

```typescript
new MilvusClient({
  address: string;              // Required. "host:port" or "https://host:port"
  token?: string;               // Auth token (username:password or API key)
  username?: string;            // Username for auth
  password?: string;            // Password for auth
  ssl?: boolean;                // Enable SSL/TLS
  database?: string;            // Default database name
  timeout?: number | string;    // Request timeout in ms (or string like '30s')
  maxRetries?: number;          // Max retry attempts (default: 3)
  retryDelay?: number;          // Retry delay in ms (default: 10)
  logLevel?: string;            // 'debug' | 'info' | 'warn' | 'error'
  trace?: boolean;              // Enable OpenTelemetry tracing
  tls?: {                       // TLS certificate configuration
    rootCertPath?: string;
    privateKeyPath?: string;
    certChainPath?: string;
    serverName?: string;
    skipCertCheck?: boolean;
  };
  pool?: {                      // Connection pool (generic-pool options)
    max?: number;               // Max connections (default: 10)
    min?: number;               // Min connections (default: 2)
  };
});
```

---

### Data Operations

#### insert

Insert rows into a collection.

```typescript
await client.insert({
  collection_name: string;
  data: Record<string, any>[];      // Array of row objects
  partition_name?: string;
});
// Returns: { succ_index: number[], err_index: number[], IDs: string[] | number[], ... }
```

#### upsert

Insert or update rows (matched by primary key).

```typescript
await client.upsert({
  collection_name: string;
  data: Record<string, any>[];
  partition_name?: string;
});
```

#### delete

Delete rows by filter expression or primary key IDs.

```typescript
// By filter
await client.delete({
  collection_name: 'articles',
  filter: 'age > 18',
});

// By IDs
await client.delete({
  collection_name: 'articles',
  ids: [1, 2, 3],
});
```

#### search

Vector similarity search.

```typescript
const results = await client.search({
  collection_name: string;
  data: number[][] | number[];  // Query vector(s)
  limit: number;                // Top-K results (default: 100)
  output_fields?: string[];     // Fields to return
  filter?: string;              // Scalar filter expression
  metric_type?: MetricType;     // Distance metric
  params?: {                    // Index-specific search params
    ef?: number;                // HNSW ef (search width)
    nprobe?: number;            // IVF nprobe
    radius?: number;            // Range search radius
    range_filter?: number;      // Range search filter
  };
  consistency_level?: ConsistencyLevelEnum;
  partition_names?: string[];
  group_by_field?: string;      // Group results by field
});
// Returns: { results: [{ id, score, ...output_fields }], ... }
```

#### query

Query rows with scalar filter expression.

```typescript
const results = await client.query({
  collection_name: string;
  filter: string;               // Boolean expression, e.g. 'age > 18 AND status == "active"'
  output_fields?: string[];     // Fields to return (default: all)
  limit?: number;
  offset?: number;
  consistency_level?: ConsistencyLevelEnum;
  partition_names?: string[];
});
// Returns: { data: Record<string, any>[] }
```

#### get

Get rows by primary key IDs.

```typescript
const results = await client.get({
  collection_name: string;
  ids: (string | number)[];
  output_fields?: string[];
});
```

#### count

Count rows matching a filter.

```typescript
const result = await client.count({
  collection_name: string;
  filter?: string;
});
// Returns: { data: number }
```

#### searchIterator

Paginated vector search using async iterator.

```typescript
const iterator = await client.searchIterator({
  collection_name: string;
  data: number[];
  batchSize: number;
  limit: number;
  output_fields?: string[];
  filter?: string;
  expr?: string;
});

for await (const batch of iterator) {
  console.log(batch);  // Array of results per batch
}
```

#### queryIterator

Paginated query using async iterator.

```typescript
const iterator = await client.queryIterator({
  collection_name: string;
  filter?: string;
  batchSize: number;
  limit: number;
  output_fields?: string[];
  expr?: string;
});

for await (const batch of iterator) {
  console.log(batch);
}
```

#### hybridSearch

Multi-vector search combining results from multiple vector fields with reranking.

```typescript
const results = await client.hybridSearch({
  collection_name: string;
  rerank: WeightedReranker | RRFReranker;  // Reranking strategy
  requests: Array<{
    data: number[][];
    anns_field: string;
    params?: Record<string, any>;
    limit?: number;
    filter?: string;
  }>;
  limit: number;
  output_fields?: string[];
});
```

---

### Collection Management

#### createCollection

```typescript
await client.createCollection({
  collection_name: string;
  fields: FieldType[];               // Define schema fields
  index_params?: CreateIndexParam[];  // Create indexes at collection creation time
  enable_dynamic_field?: boolean;     // Allow inserting fields not in schema
  consistency_level?: ConsistencyLevelEnum;
  num_partitions?: number;
});
// Note: call loadCollection() after creation before search/query
```

#### Other collection operations

```typescript
await client.hasCollection({ collection_name });          // { value: boolean }
await client.describeCollection({ collection_name });     // Schema, fields, properties
await client.batchDescribeCollections({ collection_names: string[] });  // Describe multiple collections
await client.showCollections();                           // List all collections
await client.loadCollection({ collection_name });         // Load into memory
await client.releaseCollection({ collection_name });      // Release from memory
await client.refreshLoad({ collection_name });            // Refresh loaded collection
await client.dropCollection({ collection_name });         // Delete collection
await client.renameCollection({ collection_name, new_collection_name });
await client.truncateCollection({ collection_name });     // Clear all data
await client.getLoadState({ collection_name });           // Loading status
await client.getCollectionStatistics({ collection_name });
await client.alterCollectionProperties({ collection_name, properties });
await client.alterCollectionFieldProperties({ collection_name, field_name, properties });
await client.dropCollectionProperties({ collection_name, delete_keys: string[] });
await client.addCollectionFunction({ collection_name, functions });
await client.dropCollectionFunction({ collection_name, functions });
```

---

### Index Management

```typescript
// Create index
await client.createIndex({
  collection_name: string;
  field_name: string;
  index_type?: IndexType;       // Default: AUTOINDEX
  metric_type?: MetricType;     // Default: COSINE
  params?: Record<string, any>; // e.g. { M: 16, efConstruction: 256 }
  index_name?: string;
});

// Other index operations
await client.describeIndex({ collection_name, field_name? });
await client.listIndexes({ collection_name });
await client.getIndexStatistics({ collection_name, index_name? });
await client.dropIndex({ collection_name, field_name, index_name? });
await client.getIndexState({ collection_name, field_name? });
await client.getIndexBuildProgress({ collection_name, field_name? });
await client.alterIndexProperties({ collection_name, index_name, properties });
await client.dropIndexProperties({ collection_name, index_name, delete_keys: string[] });
```

---

### Partition Management

```typescript
await client.createPartition({ collection_name, partition_name });
await client.hasPartition({ collection_name, partition_name });
await client.listPartitions({ collection_name });
await client.loadPartitions({ collection_name, partition_names: string[] });
await client.releasePartitions({ collection_name, partition_names: string[] });
await client.dropPartition({ collection_name, partition_name });
```

---

### Database Management

```typescript
await client.createDatabase({ db_name });
await client.listDatabases();
await client.describeDatabase({ db_name });
await client.alterDatabaseProperties({ db_name, properties });
await client.dropDatabaseProperties({ db_name, delete_keys: string[] });
await client.dropDatabase({ db_name });
```

---

### User & Role Management (RBAC)

```typescript
// Users
await client.createUser({ username, password });
await client.updateUser({ username, oldPassword, newPassword });
await client.deleteUser({ username });
await client.listUsers();

// Roles
await client.createRole({ roleName });
await client.dropRole({ roleName });
await client.listRoles();
await client.addUserToRole({ username, roleName });
await client.removeUserFromRole({ username, roleName });

// Privileges
await client.grantPrivilege({ roleName, object, objectName, privilegeName });
await client.revokePrivilege({ roleName, object, objectName, privilegeName });
await client.listGrants({ roleName });

// V2 privilege API
await client.grantPrivilegeV2({ role, privilege, collection_name, db_name });
await client.revokePrivilegeV2({ role, privilege, collection_name, db_name });
```

---

### Alias Management

```typescript
await client.createAlias({ collection_name, alias });
await client.dropAlias({ alias });
await client.alterAlias({ collection_name, alias });
await client.describeAlias({ alias });
await client.listAliases({ collection_name });
```

---

### Resource Group Management

```typescript
await client.createResourceGroup({ resource_group, config });
await client.listResourceGroups();
await client.describeResourceGroup({ resource_group });
await client.dropResourceGroup({ resource_group });
await client.transferReplica({ source_resource_group, target_resource_group, collection_name, num_replica });
```

---

### Bulk Import

#### BulkWriter — Generate import files offline

```typescript
import { BulkWriter, DataType } from '@zilliz/milvus2-sdk-node';

const writer = new BulkWriter({
  schema: {
    fields: [
      { name: 'id', data_type: DataType.Int64, is_primary_key: true },
      { name: 'vector', data_type: DataType.FloatVector, dim: 128 },
      { name: 'title', data_type: DataType.VarChar, max_length: 256 },
    ],
  },
  format: 'parquet',  // 'json' or 'parquet'
  localPath: './bulk_data',
  chunkSize: 128 * 1024 * 1024,  // 128 MB per file
});

// Append rows
for (const row of rows) {
  await writer.append(row);
}

// Finalize and get file paths
const batchFiles = await writer.close();
// batchFiles: [['./bulk_data/batch_0/1.parquet'], ...]
```

#### Server-side import

```typescript
// Trigger bulk import (files must be on Milvus-accessible storage)
await client.bulkInsert({ collection_name, files: ['data.json'] });

// Check import status
await client.getImportState({ taskId });
await client.listImportTasks({ collection_name });
```

---

### Flush & Compaction

```typescript
await client.flush({ collection_names: string[] });
await client.flushSync({ collection_names: string[] });       // Wait for completion
await client.flushAll();                                       // Flush all collections
await client.flushAllSync();                                   // Flush all and wait for completion
await client.compact({ collection_name });
await client.getCompactionState({ compactionID });
```

---

### System Operations

```typescript
await client.getVersion();                        // Milvus server version
await client.checkHealth();                       // Server health status
await client.reconnectToPrimary();                // Force reconnect to primary node
await client.runAnalyzer({ text, analyzer });     // Test text analyzer tokenization
```

---

## Data Types

### Scalar Types

| DataType enum        | TypeScript value  | Notes                                 |
| -------------------- | ----------------- | ------------------------------------- |
| `DataType.Bool`      | `boolean`         |                                       |
| `DataType.Int8`      | `number`          |                                       |
| `DataType.Int16`     | `number`          |                                       |
| `DataType.Int32`     | `number`          |                                       |
| `DataType.Int64`     | `number \| string` | Use string for values > 2^53         |
| `DataType.Float`     | `number`          |                                       |
| `DataType.Double`    | `number`          |                                       |
| `DataType.VarChar`   | `string`          | Requires `max_length`                 |
| `DataType.JSON`      | `object`          |                                       |
| `DataType.Array`     | `any[]`           | Requires `element_type`, `max_capacity` |

### Vector Types

| DataType enum                | Data format                        | Field param   |
| ---------------------------- | ---------------------------------- | ------------- |
| `DataType.FloatVector`       | `number[]`                         | `dim: number` |
| `DataType.BinaryVector`      | `number[]` (uint8 bytes)           | `dim: number` |
| `DataType.Float16Vector`     | `number[]`                         | `dim: number` |
| `DataType.BFloat16Vector`    | `number[]`                         | `dim: number` |
| `DataType.Int8Vector`        | `number[]`                         | `dim: number` |
| `DataType.SparseFloatVector` | `Record<number, number>` or array  | no dim needed |

### Field Definition

```typescript
interface FieldType {
  name: string;
  data_type: DataType;
  is_primary_key?: boolean;
  autoID?: boolean;
  dim?: number;                    // Required for vector types
  max_length?: number;             // Required for VarChar
  element_type?: DataType;         // Required for Array
  max_capacity?: number;           // Required for Array
  default_value?: any;
  is_partition_key?: boolean;
  enable_analyzer?: boolean;       // For full-text search
  analyzer_params?: object;
}
```

---

## Enums & Constants

### MetricType

```typescript
MetricType.L2          // Euclidean distance (smaller = more similar)
MetricType.IP          // Inner product (larger = more similar)
MetricType.COSINE      // Cosine similarity (larger = more similar)
MetricType.HAMMING     // Hamming distance (binary vectors)
MetricType.JACCARD     // Jaccard distance (binary vectors)
MetricType.BM25        // BM25 relevance (sparse/text)
```

### IndexType

```typescript
IndexType.AUTOINDEX    // Automatic selection (recommended)
IndexType.HNSW         // High recall, in-memory
IndexType.IVF_FLAT     // Balanced speed/recall
IndexType.IVF_SQ8      // Compressed IVF
IndexType.IVF_PQ       // High compression IVF
IndexType.FLAT         // Brute-force (exact)
IndexType.DISKANN      // On-disk index
IndexType.BIN_FLAT     // Binary brute-force
IndexType.BIN_IVF_FLAT // Binary IVF
IndexType.SPARSE_INVERTED_INDEX  // Sparse vectors
IndexType.SPARSE_WAND           // Sparse vectors (WAND)
```

### ConsistencyLevelEnum

```typescript
ConsistencyLevelEnum.Strong      // Read-after-write guarantee
ConsistencyLevelEnum.Session     // Session-level consistency
ConsistencyLevelEnum.Bounded     // Bounded staleness
ConsistencyLevelEnum.Eventually  // Best performance
```

### ErrorCode

```typescript
ErrorCode.SUCCESS             // Operation succeeded
ErrorCode.UnexpectedError     // Internal error
ErrorCode.CollectionNotExists // Collection not found
ErrorCode.IllegalArgument     // Invalid argument
ErrorCode.RateLimit           // Rate limited
```

---

## Filter Expressions

Used in `search({ filter })`, `query({ filter })`, `delete({ filter })`.

```
# Comparison
age > 18
price <= 99.9
status == "active"
name != "test"

# Logical operators
age > 18 AND status == "active"
price < 10 OR price > 100
NOT (status == "deleted")

# IN operator
id IN [1, 2, 3]
category IN ["books", "music"]

# String matching
title LIKE "hello%"         # Starts with "hello"
title LIKE "%world"         # Ends with "world"

# Array operations
ARRAY_CONTAINS(tags, "ai")
ARRAY_LENGTH(tags) > 3

# JSON field access
metadata["key"] == "value"
metadata["nested"]["field"] > 10

# Template expressions (parameterized)
await client.query({
  collection_name: 'test',
  filter: 'age > {min_age}',
  filter_params: { min_age: 18 },
});
```

---

## HTTP Client

For environments where gRPC is not available (Cloudflare Workers, Vercel Edge, AWS Lambda).

```typescript
import { HttpClient } from '@zilliz/milvus2-sdk-node';

const client = new HttpClient({
  endpoint: 'localhost:19530',    // or Zilliz Cloud endpoint
  username: 'root',               // optional
  password: 'milvus',             // optional
  token: 'your-api-key',          // optional (for Zilliz Cloud)
  database: 'default',            // optional
  timeout: 60000,                 // optional, ms
});

// Same API surface as MilvusClient for data operations
await client.createCollection({ ... });
await client.insert({ ... });
await client.search({ ... });
await client.query({ ... });
```

---

## Error Handling

```typescript
import { ErrorCode } from '@zilliz/milvus2-sdk-node';

try {
  const res = await client.createCollection({ ... });
  if (res.error_code !== ErrorCode.SUCCESS) {
    console.error('Milvus error:', res.reason);
  }
} catch (err) {
  console.error('Connection/transport error:', err.message);
}
```

---

## Common Patterns

### Hybrid Search (vector + scalar filter)

```typescript
const results = await client.search({
  collection_name: 'products',
  data: [queryVector],
  limit: 20,
  filter: 'category == "electronics" AND price < 500',
  output_fields: ['name', 'price', 'category'],
});
```

### Dynamic Fields

```typescript
// Enable dynamic fields on collection
await client.createCollection({
  collection_name: 'flexible',
  fields: [
    { name: 'id', data_type: DataType.Int64, is_primary_key: true, autoID: true },
    { name: 'vector', data_type: DataType.FloatVector, dim: 128 },
  ],
  enable_dynamic_field: true,
});

await client.loadCollection({ collection_name: 'flexible' });

// Insert with arbitrary fields — extra fields stored dynamically
await client.insert({
  collection_name: 'flexible',
  data: [
    { vector: [...], color: 'red', score: 0.95 },
    { vector: [...], color: 'blue', tags: ['a', 'b'] },
  ],
});

// Query dynamic fields
await client.query({
  collection_name: 'flexible',
  filter: 'color == "red"',
  output_fields: ['color', 'score'],
});
```

### Sparse Vector Search (e.g. BM25)

```typescript
await client.createCollection({
  collection_name: 'docs',
  fields: [
    { name: 'id', data_type: DataType.Int64, is_primary_key: true, autoID: true },
    { name: 'sparse_vector', data_type: DataType.SparseFloatVector },
  ],
});

await client.insert({
  collection_name: 'docs',
  data: [
    { sparse_vector: { 0: 0.5, 10: 0.3, 200: 0.8 } },   // dict format
    { sparse_vector: { 1: 0.1, 50: 0.9 } },
  ],
});

await client.search({
  collection_name: 'docs',
  data: [{ 0: 0.5, 10: 0.3 }],
  anns_field: 'sparse_vector',
  limit: 10,
});
```

### Partition Key (auto-routing)

```typescript
await client.createCollection({
  collection_name: 'multi_tenant',
  fields: [
    { name: 'id', data_type: DataType.Int64, is_primary_key: true, autoID: true },
    { name: 'tenant', data_type: DataType.VarChar, max_length: 64, is_partition_key: true },
    { name: 'vector', data_type: DataType.FloatVector, dim: 128 },
  ],
  num_partitions: 16,
});

// Milvus automatically routes by partition key
await client.search({
  collection_name: 'multi_tenant',
  data: [queryVector],
  filter: 'tenant == "user_123"',   // Scoped to partition
  limit: 10,
});
```

---

### Advanced Features

For detailed guides on advanced features, visit the documentation:

- **[Hybrid Search](docs/content/operations/hybrid-search.mdx)** — Multi-vector search with reranking
- **[Full-Text Search](docs/content/advanced/full-text-search.mdx)** — BM25 keyword search with text analyzers
- **[Iterators](docs/content/operations/iterators.mdx)** — Paginate through large result sets
- **[Global Cluster](docs/content/advanced/global-cluster.mdx)** — Multi-region failover support

---

## Links

- [Full Documentation](https://milvus-io.github.io/milvus-sdk-node)
- [Milvus Documentation](https://milvus.io/docs)
- [GitHub Repository](https://github.com/milvus-io/milvus-sdk-node)
- [Zilliz Cloud](https://cloud.zilliz.com/)
- [Examples](https://github.com/milvus-io/milvus-sdk-node/tree/main/examples)
