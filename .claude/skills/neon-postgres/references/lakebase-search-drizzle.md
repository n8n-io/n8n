# Managing Lakebase Search with Drizzle

When the user wants Lakebase Search managed through Drizzle, treat the SQL in [Vector Search](vector-search.md), [Full-Text Search](full-text-search.md), and [Hybrid Search](hybrid-search.md) as the source of truth and apply it as below. Use Drizzle for all schema and migration management unless the user says otherwise.

Requires `drizzle-orm` 0.36+ and `drizzle-kit` 0.27+: the schema below returns its indexes as an array from the `pgTable` extra-config callback. Those versions also include generated-column support for the `tsvector` column, the custom-method `.using(...).op(...)` index API for `lakebase_ann`, the `vector` column type, and the `cosineDistance` helper.

Contents:

- [Config](#config): `drizzle.config.ts` and the migration connection
- [Extensions](#extensions): custom migration required to create extensions (Drizzle can't)
- [Schema](#schema): columns, generated `tsvector`, and the ANN index
- [BM25 Index](#bm25-index): created after the corpus is seeded
- [Generate and Store Embeddings](#generate-and-store-embeddings): call the AI Gateway and insert vectors with Drizzle
- [Query](#query): vector, BM25, and hybrid reads
- [Tune Per Query](#tune-per-query): per-query GUCs

Rules:

- Express everything Drizzle can in `schema.ts`: the columns, the generated `tsvector`, and the `lakebase_ann` index. Only `CREATE EXTENSION` and the post-seed `lakebase_bm25` index need custom migrations.
- Use `drizzle-kit generate` then `migrate`. Never run `drizzle-kit push` (it reconciles the database to `schema.ts`, so it drops the post-seed `lakebase_bm25` index and any other object not declared there)
- Run every migration over the direct (unpooled) connection.
- The extension must exist before the `vector` column and the `lakebase_ann` index that depend on it.

## Config

`drizzle-kit generate` and `migrate` read `drizzle.config.ts`. If the connection string is in `.env`, install `dotenv` (`npm install dotenv`) and load it here. Point `dbCredentials.url` at the **direct (unpooled)** connection string:

```typescript
// drizzle.config.ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL_UNPOOLED;
if (!databaseUrl) throw new Error("Missing DATABASE_URL_UNPOOLED");

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Direct (unpooled) URL. Neon exposes it as DATABASE_URL_UNPOOLED.
  dbCredentials: { url: databaseUrl },
});
```

## Extensions

Drizzle cannot express `CREATE EXTENSION`, and the `vector` column and `lakebase_ann` index below depend on `lakebase_vector`, so generate a custom migration for the extensions **first** so it runs before the schema migration:

```bash
npx drizzle-kit generate --custom --name=lakebase_extensions
```

```sql
-- drizzle/0000_lakebase_extensions.sql
CREATE EXTENSION IF NOT EXISTS lakebase_vector CASCADE;
CREATE EXTENSION IF NOT EXISTS lakebase_text;
```

## Schema

The columns, the generated `tsvector`, and the `lakebase_ann` index all go in `schema.ts`. `tsvector` has no built-in Drizzle type, so define it using the `customType`:

```typescript
// src/schema.ts
import {
  pgTable,
  bigint,
  text,
  vector,
  index,
  customType,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const documents = pgTable(
  "documents",
  {
    id: bigint("id", { mode: "number" })
      .generatedByDefaultAsIdentity()
      .primaryKey(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    embedding: vector("embedding", { dimensions: 1024 }),
    bodyTsv: tsvector("body_tsv").generatedAlwaysAs(
      sql`to_tsvector('english', "body")`,
    ),
  },
  (table) => [
    index("documents_embedding_ann").using(
      "lakebase_ann",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);
```

The 1024-dimensional column is an example; set it to the output dimension of your selected embedding model. Use the same model and dimensions for stored documents and queries. Postgres maintains `body_tsv`, so never write it from the app. Generate and apply the migration after the extensions migration above:

```bash
npx drizzle-kit generate --name=lakebase_search
npx drizzle-kit migrate
```

## BM25 Index

Keep the `lakebase_bm25` index out of `schema.ts`. It must be built only after the initial corpus is loaded, so its build-time statistics are meaningful (see [Full-text search](full-text-search.md)) — a schema migration would build it against an empty table. Add it in a later custom migration that runs after seeding:

```bash
npx drizzle-kit generate --custom --name=bm25_index
```

```sql
-- drizzle/NNNN_bm25_index.sql, applied after the corpus is seeded
CREATE INDEX documents_body_bm25 ON documents USING lakebase_bm25 (body_tsv);
```

## Generate and Store Embeddings

Use the [Vercel AI SDK](https://ai-sdk.dev) (`ai`, 6+) with Neon's `@neon/ai-sdk-provider` 1.0.0+. Follow the [gateway setup](vector-search.md#prepare-embeddings), then install the packages with `npm install @neon/ai-sdk-provider ai dotenv`:

```typescript
import "dotenv/config";
import { neon } from "@neon/ai-sdk-provider";
import { embed, embedMany } from "ai";

const embeddingModel = neon.embeddingModel("qwen3-embedding-0-6b");
const providerOptions = { neon: { dimensions: 1024 } };
// Qwen3 query prompt adapted for Neon documentation search; documents stay unprefixed.
const queryPrompt =
  "Instruct: Given a question about Neon, retrieve documentation passages that answer the question\nQuery: ";
```

Generate a document vector, then insert it with Drizzle:

```typescript
const { embedding } = await embed({
  model: embeddingModel,
  value: body,
  providerOptions,
});
await db.insert(documents).values({
  title,
  body,
  embedding,
});
```

For bulk imports, skip blank rows and embed/insert one batch at a time:

```typescript
const batchSize = 64;
const nonBlankRows = rows.filter((row) => row && row.body.trim().length > 0);

for (let offset = 0; offset < nonBlankRows.length; offset += batchSize) {
  const batch = nonBlankRows.slice(offset, offset + batchSize);
  const { embeddings: vectors } = await embedMany({
    model: embeddingModel,
    values: batch.map((row) => row.body),
    providerOptions,
    maxParallelCalls: 1,
  });
  await db.insert(documents).values(
    batch.map((row, index) => {
      const embedding = vectors[index];
      if (!embedding)
        throw new Error(`Missing embedding for batch row ${index}`);
      return { ...row, embedding };
    }),
  );
}
```

`embedMany` splits embedding requests using the provider's per-request input limit. This loop also bounds database inserts and memory; tune `batchSize` for your workload. Chunk long documents before embedding. Earlier batches stay committed if a later batch fails.

Apply `queryPrompt` only to queries, keeping the original text for BM25. Use the same model and dimensions for documents and queries; re-embed documents when switching models.

## Query

Use the query builder with Drizzle's `cosineDistance` helper for vector search. It emits the `<=>` operator, so keep the index on `vector_cosine_ops`:

```typescript
import { cosineDistance } from "drizzle-orm";
import { documents } from "./schema";

const { embedding: queryEmbedding } = await embed({
  model: embeddingModel,
  value: `${queryPrompt}${queryText}`,
  providerOptions,
});
const distance = cosineDistance(documents.embedding, queryEmbedding);

const rows = await db
  .select({ id: documents.id, title: documents.title, distance })
  .from(documents)
  .orderBy(distance)
  .limit(k);
```

BM25 has no Drizzle helper: `<@>` and `to_bm25query` require raw SQL. Reference the generated column by its `body_tsv` name. Bind user input as parameters through the `sql` template:

```typescript
import { sql } from "drizzle-orm";

const rows = await db.execute(sql`
  SELECT id, title, score
  FROM (
    SELECT id, title,
      body_tsv <@> to_bm25query(
        to_tsvector('english', ${queryText}),
        'documents_body_bm25'::regclass
      ) AS score
    FROM documents
  ) AS keyword_scored
  WHERE score < 0
  ORDER BY score
  LIMIT ${k}
`);
```

Filter `score < 0` before the candidate cutoff: scalar BM25 scoring returns zero for non-matches, which must not become keyword hits. Partial query-term matches remain eligible.

Run either [hybrid search](hybrid-search.md) SQL query the same way: raw SQL through `db.execute`. For reranking with AI Gateway decision models, retrieve the deduplicated union of vector and full-text search candidates, including document bodies, and pass those rows directly to `rerankWithJev` before the final result cutoff. Use the RRF query as the alternative that needs no additional model call; RRF is optional before model-based reranking.

## Tune Per Query

Per-query GUCs (`lakebase_ann.probes`, `lakebase_ann.epsilon`, `lakebase_bm25.default_limit`, `lakebase_bm25.prefilter`) must be set with `SET LOCAL` inside a transaction so they apply to the same pooled connection as the query:

```typescript
import { cosineDistance, sql } from "drizzle-orm";
import { documents } from "./schema";

const distance = cosineDistance(documents.embedding, queryEmbedding);

const rows = await db.transaction(async (tx) => {
  // SET LOCAL scopes the GUC to this transaction's connection; do not hoist it out.
  // Keep probes at 'auto' unless an IVF `lists` layout exists: a numeric value must
  // match the `lists` shape or it errors ("need 0 probes ..."). See vector-search.md.
  await tx.execute(sql`SET LOCAL lakebase_ann.probes = 'auto'`);
  return tx
    .select({ id: documents.id, title: documents.title, distance })
    .from(documents)
    .orderBy(distance)
    .limit(k);
});
```

Sources:

- [AI Gateway embeddings](https://neon.com/docs/ai-gateway/embeddings)
- [Get started with Lakebase Search](https://neon.com/docs/ai/lakebase-search-get-started)
- [Schema migration with Lakebase Postgres and Drizzle ORM](https://neon.com/docs/guides/drizzle-migrations)
