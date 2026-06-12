# agents

## Description

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE "agents" ("id" varchar(36) PRIMARY KEY NOT NULL, "name" varchar(128) NOT NULL, "description" varchar(512), "projectId" varchar(255) NOT NULL, "integrations" text NOT NULL DEFAULT ('[]'), "schema" text, "tools" text NOT NULL DEFAULT ('{}'), "skills" text NOT NULL DEFAULT ('{}'), "versionId" varchar(36), "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "activeVersionId" varchar(36), CONSTRAINT "FK_a30d560207c4071d98aa03c179c" FOREIGN KEY ("projectId") REFERENCES "project" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_940597dfe9753375309ce6aeea0" FOREIGN KEY ("activeVersionId") REFERENCES "agent_history" ("versionId") ON DELETE SET NULL)
```

</details>

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| id | varchar(36) |  | false | [agent_checkpoints](agent_checkpoints.md) [agents_observations](agents_observations.md) [agents_observation_cursors](agents_observation_cursors.md) [agents_observation_locks](agents_observation_locks.md) [agents_memory_entries](agents_memory_entries.md) [agents_memory_entry_locks](agents_memory_entry_locks.md) [agents_memory_entry_sources](agents_memory_entry_sources.md) [agents_memory_entry_cursors](agents_memory_entry_cursors.md) [agent_history](agent_history.md) [agent_files](agent_files.md) [agent_task_definition](agent_task_definition.md) [agent_task_run_lock](agent_task_run_lock.md) [agent_execution_threads](agent_execution_threads.md) [agent_chat_subscriptions](agent_chat_subscriptions.md) |  |  |
| name | varchar(128) |  | false |  |  |  |
| description | varchar(512) |  | true |  |  |  |
| projectId | varchar(255) |  | false |  | [project](project.md) |  |
| integrations | TEXT | '[]' | false |  |  |  |
| schema | TEXT |  | true |  |  |  |
| tools | TEXT | '{}' | false |  |  |  |
| skills | TEXT | '{}' | false |  |  |  |
| versionId | varchar(36) |  | true |  |  |  |
| createdAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| updatedAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| activeVersionId | varchar(36) |  | true |  | [agent_history](agent_history.md) |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| id | PRIMARY KEY | PRIMARY KEY (id) |
| - (Foreign key ID: 0) | FOREIGN KEY | FOREIGN KEY (activeVersionId) REFERENCES agent_history (versionId) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| - (Foreign key ID: 1) | FOREIGN KEY | FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| sqlite_autoindex_agents_1 | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_agents_projectId | CREATE INDEX "IDX_agents_projectId" ON "agents" ("projectId")  |
| IDX_a30d560207c4071d98aa03c179 | CREATE INDEX "IDX_a30d560207c4071d98aa03c179" ON "agents" ("projectId")  |
| sqlite_autoindex_agents_1 | PRIMARY KEY (id) |

## Relations

```mermaid
erDiagram

"agent_checkpoints" }o--o| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_observations" }o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_observation_cursors" |o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_observation_locks" |o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_memory_entries" }o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_memory_entry_locks" |o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_memory_entry_sources" }o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents_memory_entry_cursors" |o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agent_history" }o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agent_files" }o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agent_task_definition" }o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agent_task_run_lock" |o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agent_execution_threads" }o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agent_chat_subscriptions" |o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents" }o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents" }o--o| "agent_history" : "FOREIGN KEY (activeVersionId) REFERENCES agent_history (versionId) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"

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
"agent_checkpoints" {
  varchar_255_ runId PK
  varchar_255_ agentId FK
  TEXT state
  boolean expired
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
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
"agents_observation_cursors" {
  varchar_36_ agentId PK
  varchar_255_ observationScopeId PK
  varchar_36_ lastObservedMessageId
  datetime_3_ lastObservedAt
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"agents_observation_locks" {
  varchar_36_ agentId PK
  varchar_255_ observationScopeId PK
  varchar_20_ taskKind PK
  varchar_64_ holderId
  datetime_3_ heldUntil
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
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
"agents_memory_entry_locks" {
  varchar_36_ agentId PK
  varchar_255_ resourceId PK
  varchar_64_ holderId
  datetime_3_ heldUntil
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
"agents_memory_entry_cursors" {
  varchar_36_ agentId PK
  varchar_255_ observationScopeId PK
  varchar_36_ lastIndexedObservationId
  datetime_3_ lastIndexedObservationCreatedAt
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"agent_history" {
  varchar_36_ versionId PK
  varchar_36_ agentId FK
  TEXT schema
  TEXT tools
  TEXT skills
  varchar publishedById FK
  varchar_255_ author
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"agent_files" {
  varchar_16_ id PK
  varchar_36_ agentId FK
  TEXT binaryDataId
  varchar_255_ fileName
  varchar_255_ mimeType
  INTEGER fileSizeBytes
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"agent_task_definition" {
  varchar_32_ id PK
  varchar_36_ agentId FK
  varchar_128_ name
  TEXT objective
  varchar_128_ cronExpression
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"agent_task_run_lock" {
  varchar_36_ agentId PK
  varchar_32_ taskId PK
  varchar holderId
  datetime_3_ heldUntil
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"agent_execution_threads" {
  varchar_128_ id PK
  varchar_36_ agentId FK
  varchar_255_ agentName
  varchar_255_ projectId FK
  INTEGER sessionNumber
  INTEGER totalPromptTokens
  INTEGER totalCompletionTokens
  REAL totalCost
  INTEGER totalDuration
  varchar_255_ title
  varchar_8_ emoji
  datetime_3_ createdAt
  datetime_3_ updatedAt
  varchar_32_ taskId
  varchar_36_ taskVersionId FK
  varchar_128_ parentThreadId
  varchar_36_ parentAgentId
}
"agent_chat_subscriptions" {
  varchar_36_ agentId PK
  varchar_64_ integrationType PK
  varchar_255_ credentialId PK
  varchar_255_ threadId PK
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"project" {
  varchar_36_ id PK
  varchar_255_ name
  varchar_36_ type
  datetime_3_ createdAt
  datetime_3_ updatedAt
  TEXT icon
  varchar_512_ description
  varchar creatorId FK
  TEXT customTelemetryTags
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
