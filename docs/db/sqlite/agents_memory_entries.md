# agents_memory_entries

## Description

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE "agents_memory_entries" ("id" varchar(36) PRIMARY KEY NOT NULL, "agentId" varchar(36) NOT NULL, "resourceId" varchar(255) NOT NULL, "content" text NOT NULL, "contentHash" varchar(64) NOT NULL, "status" varchar(16) NOT NULL, "supersededBy" varchar(36), "embeddingModel" varchar(128), "embedding" text, "metadata" text, "lastSeenAt" datetime(3) NOT NULL, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), CONSTRAINT "CHK_agents_memory_entries_status" CHECK ("status" IN ('active', 'superseded', 'dropped')), CONSTRAINT "FK_28e981fb675e9b44ce02f0ec1dd" FOREIGN KEY ("agentId") REFERENCES "agents" ("id") ON DELETE CASCADE, CONSTRAINT "FK_1443a75e59adbfb796071d66393" FOREIGN KEY ("resourceId") REFERENCES "agents_resources" ("id") ON DELETE CASCADE, CONSTRAINT "FK_0edf1226b77ddc525eae4938079" FOREIGN KEY ("supersededBy") REFERENCES "agents_memory_entries" ("id"))
```

</details>

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| id | varchar(36) |  | false | [agents_memory_entries](agents_memory_entries.md) [agents_memory_entry_sources](agents_memory_entry_sources.md) |  |  |
| agentId | varchar(36) |  | false |  | [agents](agents.md) |  |
| resourceId | varchar(255) |  | false |  | [agents_resources](agents_resources.md) |  |
| content | TEXT |  | false |  |  |  |
| contentHash | varchar(64) |  | false |  |  |  |
| status | varchar(16) |  | false |  |  |  |
| supersededBy | varchar(36) |  | true |  | [agents_memory_entries](agents_memory_entries.md) |  |
| embeddingModel | varchar(128) |  | true |  |  |  |
| embedding | TEXT |  | true |  |  |  |
| metadata | TEXT |  | true |  |  |  |
| lastSeenAt | datetime(3) |  | false |  |  |  |
| createdAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| updatedAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| id | PRIMARY KEY | PRIMARY KEY (id) |
| - (Foreign key ID: 0) | FOREIGN KEY | FOREIGN KEY (supersededBy) REFERENCES agents_memory_entries (id) ON UPDATE NO ACTION ON DELETE NO ACTION MATCH NONE |
| - (Foreign key ID: 1) | FOREIGN KEY | FOREIGN KEY (resourceId) REFERENCES agents_resources (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| - (Foreign key ID: 2) | FOREIGN KEY | FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| sqlite_autoindex_agents_memory_entries_1 | PRIMARY KEY | PRIMARY KEY (id) |
| - | CHECK | CHECK ("status" IN ('active', 'superseded', 'dropped')) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_0edf1226b77ddc525eae493807 | CREATE INDEX "IDX_0edf1226b77ddc525eae493807" ON "agents_memory_entries" ("supersededBy")  |
| IDX_1443a75e59adbfb796071d6639 | CREATE INDEX "IDX_1443a75e59adbfb796071d6639" ON "agents_memory_entries" ("resourceId")  |
| IDX_a03e04e94bea8439dd166d4b52 | CREATE UNIQUE INDEX "IDX_a03e04e94bea8439dd166d4b52" ON "agents_memory_entries" ("agentId", "resourceId", "contentHash")  |
| IDX_aff2807b31eccbafe59d0474f0 | CREATE INDEX "IDX_aff2807b31eccbafe59d0474f0" ON "agents_memory_entries" ("agentId", "resourceId", "status", "createdAt", "id")  |
| sqlite_autoindex_agents_memory_entries_1 | PRIMARY KEY (id) |

## Relations

```mermaid
erDiagram

"agents_memory_entries" }o--o| "agents_memory_entries" : "FOREIGN KEY (supersededBy) REFERENCES agents_memory_entries (id) ON UPDATE NO ACTION ON DELETE NO ACTION MATCH NONE"
"agents_memory_entry_sources" }o--|| "agents_memory_entries" : "FOREIGN KEY (memoryEntryId) REFERENCES agents_memory_entries (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_memory_entries" }o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_memory_entries" }o--|| "agents_resources" : "FOREIGN KEY (resourceId) REFERENCES agents_resources (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"

"agents_memory_entries" {
  varchar_36_ id PK
  varchar_36_ agentId FK
  varchar_255_ resourceId FK
  TEXT content
  varchar_64_ contentHash
  varchar_16_ status
  varchar_36_ supersededBy FK
  varchar_128_ embeddingModel
  TEXT embedding
  TEXT metadata
  datetime_3_ lastSeenAt
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"agents_memory_entry_sources" {
  varchar_36_ id PK
  varchar_36_ agentId FK
  varchar_36_ memoryEntryId FK
  varchar_36_ observationId FK
  varchar_255_ threadId FK
  varchar_64_ evidenceHash
  TEXT evidenceText
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"agents" {
  varchar_36_ id PK
  varchar_128_ name
  varchar_512_ description
  varchar_255_ projectId FK
  TEXT integrations
  TEXT schema
  TEXT tools
  TEXT skills
  varchar_36_ versionId
  datetime_3_ createdAt
  datetime_3_ updatedAt
  varchar_36_ activeVersionId FK
}
"agents_resources" {
  varchar_255_ id PK
  TEXT metadata
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
