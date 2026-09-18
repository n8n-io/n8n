# agents_memory_entry_candidates

## Description

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE "agents_memory_entry_candidates" ("id" varchar(36) PRIMARY KEY NOT NULL, "agentId" varchar(36) NOT NULL, "resourceId" varchar(255) NOT NULL, "threadId" varchar(255) NOT NULL, "sourceMessageId" varchar(36), "runId" varchar(255) NOT NULL, "toolCallId" varchar(255) NOT NULL, "content" text NOT NULL, "evidenceText" text NOT NULL, "kind" varchar(32) NOT NULL, "status" varchar(16) NOT NULL DEFAULT ('pending'), "attemptCount" smallint NOT NULL DEFAULT (0), "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), CONSTRAINT "CHK_agents_memory_entry_candidates_status" CHECK ("status" IN ('pending', 'completed', 'failed')), CONSTRAINT "FK_b3d0f5fe54565580bc1f5febb6e" FOREIGN KEY ("agentId") REFERENCES "agents" ("id") ON DELETE CASCADE, CONSTRAINT "FK_5123f71435736664d2676084a85" FOREIGN KEY ("resourceId") REFERENCES "agents_resources" ("id") ON DELETE CASCADE, CONSTRAINT "FK_ac7ada75df7cc8ced228921d5a9" FOREIGN KEY ("threadId") REFERENCES "agents_threads" ("id") ON DELETE CASCADE, CONSTRAINT "FK_f1857f6716aa258393dd6f33243" FOREIGN KEY ("sourceMessageId") REFERENCES "agents_messages" ("id") ON DELETE SET NULL)
```

</details>

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| agentId | varchar(36) |  | false |  | [agents](agents.md) |  |
| attemptCount | smallint | 0 | false |  |  |  |
| content | TEXT |  | false |  |  |  |
| createdAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| evidenceText | TEXT |  | false |  |  |  |
| id | varchar(36) |  | false | [agents_memory_entry_sources](agents_memory_entry_sources.md) |  |  |
| kind | varchar(32) |  | false |  |  |  |
| resourceId | varchar(255) |  | false |  | [agents_resources](agents_resources.md) |  |
| runId | varchar(255) |  | false |  |  |  |
| sourceMessageId | varchar(36) |  | true |  | [agents_messages](agents_messages.md) |  |
| status | varchar(16) | 'pending' | false |  |  |  |
| threadId | varchar(255) |  | false |  | [agents_threads](agents_threads.md) |  |
| toolCallId | varchar(255) |  | false |  |  |  |
| updatedAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| - | CHECK | CHECK ("status" IN ('pending', 'completed', 'failed')) |
| - (Foreign key ID: 0) | FOREIGN KEY | FOREIGN KEY (sourceMessageId) REFERENCES agents_messages (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| - (Foreign key ID: 1) | FOREIGN KEY | FOREIGN KEY (threadId) REFERENCES agents_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| - (Foreign key ID: 2) | FOREIGN KEY | FOREIGN KEY (resourceId) REFERENCES agents_resources (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| - (Foreign key ID: 3) | FOREIGN KEY | FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| id | PRIMARY KEY | PRIMARY KEY (id) |
| sqlite_autoindex_agents_memory_entry_candidates_1 | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_5123f71435736664d2676084a8 | CREATE INDEX "IDX_5123f71435736664d2676084a8" ON "agents_memory_entry_candidates" ("resourceId")  |
| IDX_6dc22e132cf1a34e5bca672b99 | CREATE INDEX "IDX_6dc22e132cf1a34e5bca672b99" ON "agents_memory_entry_candidates" ("agentId", "resourceId", "status", "createdAt", "id")  |
| IDX_ac7ada75df7cc8ced228921d5a | CREATE INDEX "IDX_ac7ada75df7cc8ced228921d5a" ON "agents_memory_entry_candidates" ("threadId")  |
| IDX_e3e49861a5452db63b036a2561 | CREATE UNIQUE INDEX "IDX_e3e49861a5452db63b036a2561" ON "agents_memory_entry_candidates" ("agentId", "runId", "toolCallId")  |
| IDX_f1857f6716aa258393dd6f3324 | CREATE INDEX "IDX_f1857f6716aa258393dd6f3324" ON "agents_memory_entry_candidates" ("sourceMessageId")  |
| sqlite_autoindex_agents_memory_entry_candidates_1 | PRIMARY KEY (id) |

## Relations

```mermaid
erDiagram

"agents_memory_entry_candidates" }o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_memory_entry_sources" }o--o| "agents_memory_entry_candidates" : "FOREIGN KEY (candidateId) REFERENCES agents_memory_entry_candidates (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_memory_entry_candidates" }o--|| "agents_resources" : "FOREIGN KEY (resourceId) REFERENCES agents_resources (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_memory_entry_candidates" }o--o| "agents_messages" : "FOREIGN KEY (sourceMessageId) REFERENCES agents_messages (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"agents_memory_entry_candidates" }o--|| "agents_threads" : "FOREIGN KEY (threadId) REFERENCES agents_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"

"agents_memory_entry_candidates" {
  varchar_36_ agentId FK
  smallint attemptCount
  TEXT content
  datetime_3_ createdAt
  TEXT evidenceText
  varchar_36_ id PK
  varchar_32_ kind
  varchar_255_ resourceId FK
  varchar_255_ runId
  varchar_36_ sourceMessageId FK
  varchar_16_ status
  varchar_255_ threadId FK
  varchar_255_ toolCallId
  datetime_3_ updatedAt
}
"agents" {
  varchar_36_ activeVersionId FK
  boolean availableInMCP
  datetime_3_ createdAt
  varchar_36_ id PK
  TEXT integrations
  varchar_128_ name
  varchar_255_ projectId FK
  INTEGER revision
  TEXT schema
  datetime_3_ setupCompletedAt
  TEXT skills
  TEXT tools
  datetime_3_ updatedAt
  varchar_36_ versionId
}
"agents_memory_entry_sources" {
  varchar_36_ agentId FK
  varchar_36_ candidateId FK
  datetime_3_ createdAt
  varchar_64_ evidenceHash
  TEXT evidenceText
  varchar_36_ id PK
  varchar_36_ memoryEntryId FK
  varchar_36_ observationId FK
  varchar_255_ threadId FK
  datetime_3_ updatedAt
}
"agents_resources" {
  datetime_3_ createdAt
  varchar_255_ id PK
  TEXT metadata
  datetime_3_ updatedAt
}
"agents_messages" {
  TEXT content
  datetime_3_ createdAt
  varchar_36_ id PK
  varchar_255_ resourceId
  varchar_36_ role
  varchar_255_ threadId FK
  varchar_36_ type
  datetime_3_ updatedAt
}
"agents_threads" {
  datetime_3_ createdAt
  varchar_128_ id PK
  TEXT metadata
  varchar_255_ resourceId
  varchar_255_ title
  datetime_3_ updatedAt
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
