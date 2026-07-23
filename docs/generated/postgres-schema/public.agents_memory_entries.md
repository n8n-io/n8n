# public.agents_memory_entries

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| agentId | varchar(36) |  | false |  | [public.agents](public.agents.md) | Agent that owns this episodic memory entry |
| content | text |  | false |  |  |  |
| contentHash | varchar(64) |  | false |  |  |  |
| createdAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |
| embedding | json |  | true |  |  | Embedding vector for episodic recall |
| embeddingModel | varchar(128) |  | true |  |  | Embedding model used to produce embedding |
| id | varchar(36) |  | false | [public.agents_memory_entries](public.agents_memory_entries.md) [public.agents_memory_entry_sources](public.agents_memory_entry_sources.md) |  |  |
| lastSeenAt | timestamp(3) with time zone |  | false |  |  | Last time equivalent content was observed; updatedAt tracks row mutation time |
| metadata | json |  | true |  |  | Optional system metadata for ranking and debugging |
| resourceId | varchar(255) |  | false |  | [public.agents_resources](public.agents_resources.md) | agents_resources.id partition used for episodic recall scope |
| status | varchar(16) |  | false |  |  |  |
| supersededBy | varchar(36) |  | true |  | [public.agents_memory_entries](public.agents_memory_entries.md) | Self-reference to replacement memory entry |
| updatedAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| CHK_agents_memory_entries_status | CHECK | CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'superseded'::character varying, 'dropped'::character varying])::text[]))) |
| FK_0edf1226b77ddc525eae4938079 | FOREIGN KEY | FOREIGN KEY ("supersededBy") REFERENCES agents_memory_entries(id) |
| FK_1443a75e59adbfb796071d66393 | FOREIGN KEY | FOREIGN KEY ("resourceId") REFERENCES agents_resources(id) ON DELETE CASCADE |
| FK_28e981fb675e9b44ce02f0ec1dd | FOREIGN KEY | FOREIGN KEY ("agentId") REFERENCES agents(id) ON DELETE CASCADE |
| PK_bfbc45dc88f66fae4e4b4a15fec | PRIMARY KEY | PRIMARY KEY (id) |
| agents_memory_entries_agentId_not_null | n | NOT NULL "agentId" |
| agents_memory_entries_contentHash_not_null | n | NOT NULL "contentHash" |
| agents_memory_entries_content_not_null | n | NOT NULL content |
| agents_memory_entries_createdAt_not_null | n | NOT NULL "createdAt" |
| agents_memory_entries_id_not_null | n | NOT NULL id |
| agents_memory_entries_lastSeenAt_not_null | n | NOT NULL "lastSeenAt" |
| agents_memory_entries_resourceId_not_null | n | NOT NULL "resourceId" |
| agents_memory_entries_status_not_null | n | NOT NULL status |
| agents_memory_entries_updatedAt_not_null | n | NOT NULL "updatedAt" |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_0edf1226b77ddc525eae493807 | CREATE INDEX "IDX_0edf1226b77ddc525eae493807" ON public.agents_memory_entries USING btree ("supersededBy") |
| IDX_1443a75e59adbfb796071d6639 | CREATE INDEX "IDX_1443a75e59adbfb796071d6639" ON public.agents_memory_entries USING btree ("resourceId") |
| IDX_a03e04e94bea8439dd166d4b52 | CREATE UNIQUE INDEX "IDX_a03e04e94bea8439dd166d4b52" ON public.agents_memory_entries USING btree ("agentId", "resourceId", "contentHash") |
| IDX_aff2807b31eccbafe59d0474f0 | CREATE INDEX "IDX_aff2807b31eccbafe59d0474f0" ON public.agents_memory_entries USING btree ("agentId", "resourceId", status, "createdAt", id) |
| PK_bfbc45dc88f66fae4e4b4a15fec | CREATE UNIQUE INDEX "PK_bfbc45dc88f66fae4e4b4a15fec" ON public.agents_memory_entries USING btree (id) |

## Relations

```mermaid
erDiagram

"public.agents_memory_entries" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agents_memory_entries" }o--o| "public.agents_memory_entries" : "FOREIGN KEY (#quot;supersededBy#quot;) REFERENCES agents_memory_entries(id)"
"public.agents_memory_entry_sources" }o--|| "public.agents_memory_entries" : "FOREIGN KEY (#quot;memoryEntryId#quot;) REFERENCES agents_memory_entries(id) ON DELETE CASCADE"
"public.agents_memory_entries" }o--|| "public.agents_resources" : "FOREIGN KEY (#quot;resourceId#quot;) REFERENCES agents_resources(id) ON DELETE CASCADE"

"public.agents_memory_entries" {
  varchar_36_ agentId FK
  text content
  varchar_64_ contentHash
  timestamp_3__with_time_zone createdAt
  json embedding
  varchar_128_ embeddingModel
  varchar_36_ id
  timestamp_3__with_time_zone lastSeenAt
  json metadata
  varchar_255_ resourceId FK
  varchar_16_ status
  varchar_36_ supersededBy FK
  timestamp_3__with_time_zone updatedAt
}
"public.agents" {
  varchar_36_ activeVersionId FK
  timestamp_3__with_time_zone createdAt
  varchar_36_ id
  json integrations
  varchar_128_ name
  varchar_255_ projectId FK
  json schema
  json skills
  json tools
  timestamp_3__with_time_zone updatedAt
  varchar_36_ versionId
}
"public.agents_memory_entry_sources" {
  varchar_36_ agentId FK
  timestamp_3__with_time_zone createdAt
  varchar_64_ evidenceHash
  text evidenceText
  varchar_36_ id
  varchar_36_ memoryEntryId FK
  varchar_36_ observationId FK
  varchar_255_ threadId FK
  timestamp_3__with_time_zone updatedAt
}
"public.agents_resources" {
  timestamp_3__with_time_zone createdAt
  varchar_255_ id
  text metadata
  timestamp_3__with_time_zone updatedAt
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
