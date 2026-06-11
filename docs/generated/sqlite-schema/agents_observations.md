# agents_observations

## Description

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE "agents_observations" ("id" varchar(36) PRIMARY KEY NOT NULL, "agentId" varchar(36) NOT NULL, "observationScopeId" varchar(255) NOT NULL, "marker" varchar(16) NOT NULL, "text" text NOT NULL, "parentId" varchar(36), "tokenCount" integer NOT NULL DEFAULT (0), "status" varchar(16) NOT NULL, "supersededBy" varchar(36), "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), CONSTRAINT "CHK_agents_observations_marker" CHECK ("marker" IN ('critical', 'important', 'info', 'completion')), CONSTRAINT "CHK_agents_observations_status" CHECK ("status" IN ('active', 'superseded', 'dropped')), CONSTRAINT "FK_d206432be97b7ed88d187479b1b" FOREIGN KEY ("agentId") REFERENCES "agents" ("id") ON DELETE CASCADE, CONSTRAINT "FK_4cfd8a70ebb0a5b0cf047dca3cf" FOREIGN KEY ("observationScopeId") REFERENCES "agents_threads" ("id") ON DELETE CASCADE, CONSTRAINT "FK_501e2d1701a10e24fb69ab5fc5f" FOREIGN KEY ("parentId") REFERENCES "agents_observations" ("id"), CONSTRAINT "FK_127ee1078ffa952bb37b511efad" FOREIGN KEY ("supersededBy") REFERENCES "agents_observations" ("id"))
```

</details>

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| id | varchar(36) |  | false | [agents_observations](agents_observations.md) [agents_memory_entry_sources](agents_memory_entry_sources.md) |  |  |
| agentId | varchar(36) |  | false |  | [agents](agents.md) |  |
| observationScopeId | varchar(255) |  | false |  | [agents_threads](agents_threads.md) |  |
| marker | varchar(16) |  | false |  |  |  |
| text | TEXT |  | false |  |  |  |
| parentId | varchar(36) |  | true |  | [agents_observations](agents_observations.md) |  |
| tokenCount | INTEGER | 0 | false |  |  |  |
| status | varchar(16) |  | false |  |  |  |
| supersededBy | varchar(36) |  | true |  | [agents_observations](agents_observations.md) |  |
| createdAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| updatedAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| id | PRIMARY KEY | PRIMARY KEY (id) |
| - (Foreign key ID: 0) | FOREIGN KEY | FOREIGN KEY (supersededBy) REFERENCES agents_observations (id) ON UPDATE NO ACTION ON DELETE NO ACTION MATCH NONE |
| - (Foreign key ID: 1) | FOREIGN KEY | FOREIGN KEY (parentId) REFERENCES agents_observations (id) ON UPDATE NO ACTION ON DELETE NO ACTION MATCH NONE |
| - (Foreign key ID: 2) | FOREIGN KEY | FOREIGN KEY (observationScopeId) REFERENCES agents_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| - (Foreign key ID: 3) | FOREIGN KEY | FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| sqlite_autoindex_agents_observations_1 | PRIMARY KEY | PRIMARY KEY (id) |
| - | CHECK | CHECK ("marker" IN ('critical', 'important', 'info', 'completion')) |
| - | CHECK | CHECK ("status" IN ('active', 'superseded', 'dropped')) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_127ee1078ffa952bb37b511efa | CREATE INDEX "IDX_127ee1078ffa952bb37b511efa" ON "agents_observations" ("supersededBy")  |
| IDX_501e2d1701a10e24fb69ab5fc5 | CREATE INDEX "IDX_501e2d1701a10e24fb69ab5fc5" ON "agents_observations" ("parentId")  |
| IDX_4cfd8a70ebb0a5b0cf047dca3c | CREATE INDEX "IDX_4cfd8a70ebb0a5b0cf047dca3c" ON "agents_observations" ("observationScopeId")  |
| IDX_07cb1e4a302629c5fa5d74d2bb | CREATE INDEX "IDX_07cb1e4a302629c5fa5d74d2bb" ON "agents_observations" ("agentId", "observationScopeId", "status")  |
| sqlite_autoindex_agents_observations_1 | PRIMARY KEY (id) |

## Relations

```mermaid
erDiagram

"agents_observations" }o--o| "agents_observations" : "FOREIGN KEY (supersededBy) REFERENCES agents_observations (id) ON UPDATE NO ACTION ON DELETE NO ACTION MATCH NONE"
"agents_observations" }o--o| "agents_observations" : "FOREIGN KEY (parentId) REFERENCES agents_observations (id) ON UPDATE NO ACTION ON DELETE NO ACTION MATCH NONE"
"agents_memory_entry_sources" }o--|| "agents_observations" : "FOREIGN KEY (observationId) REFERENCES agents_observations (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_observations" }o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_observations" }o--|| "agents_threads" : "FOREIGN KEY (observationScopeId) REFERENCES agents_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"

"agents_observations" {
  varchar_36_ id PK
  varchar_36_ agentId FK
  varchar_255_ observationScopeId FK
  varchar_16_ marker
  TEXT text
  varchar_36_ parentId FK
  INTEGER tokenCount
  varchar_16_ status
  varchar_36_ supersededBy FK
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
"agents_threads" {
  varchar_128_ id PK
  varchar_255_ resourceId
  varchar_255_ title
  TEXT metadata
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
