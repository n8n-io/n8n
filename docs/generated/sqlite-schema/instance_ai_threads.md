# instance_ai_threads

## Description

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE "instance_ai_threads" ("id" varchar PRIMARY KEY NOT NULL, "resourceId" varchar(255) NOT NULL, "projectId" varchar(36) NOT NULL, "title" text NOT NULL DEFAULT (''), "metadata" text, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), CONSTRAINT "FK_instance_ai_threads_projectId" FOREIGN KEY ("projectId") REFERENCES "project" ("id") ON DELETE CASCADE)
```

</details>

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| id | varchar |  | false | [instance_ai_messages](instance_ai_messages.md) [instance_ai_observational_memory](instance_ai_observational_memory.md) [instance_ai_iteration_logs](instance_ai_iteration_logs.md) [ai_builder_temporary_workflow](ai_builder_temporary_workflow.md) [instance_ai_run_snapshots](instance_ai_run_snapshots.md) [instance_ai_observations](instance_ai_observations.md) [instance_ai_observation_cursors](instance_ai_observation_cursors.md) [instance_ai_observation_locks](instance_ai_observation_locks.md) [instance_ai_checkpoints](instance_ai_checkpoints.md) [instance_ai_pending_confirmations](instance_ai_pending_confirmations.md) |  |  |
| resourceId | varchar(255) |  | false |  |  |  |
| projectId | varchar(36) |  | false |  | [project](project.md) |  |
| title | TEXT | '' | false |  |  |  |
| metadata | TEXT |  | true |  |  |  |
| createdAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| updatedAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| id | PRIMARY KEY | PRIMARY KEY (id) |
| - (Foreign key ID: 0) | FOREIGN KEY | FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| sqlite_autoindex_instance_ai_threads_1 | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_instance_ai_threads_projectId | CREATE INDEX "IDX_instance_ai_threads_projectId" ON "instance_ai_threads" ("projectId")  |
| IDX_instance_ai_threads_resourceId | CREATE INDEX "IDX_instance_ai_threads_resourceId" ON "instance_ai_threads" ("resourceId")  |
| sqlite_autoindex_instance_ai_threads_1 | PRIMARY KEY (id) |

## Relations

```mermaid
erDiagram

"instance_ai_messages" }o--|| "instance_ai_threads" : "FOREIGN KEY (threadId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_observational_memory" }o--o| "instance_ai_threads" : "FOREIGN KEY (threadId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"instance_ai_iteration_logs" }o--|| "instance_ai_threads" : "FOREIGN KEY (threadId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"ai_builder_temporary_workflow" }o--|| "instance_ai_threads" : "FOREIGN KEY (threadId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_run_snapshots" |o--|| "instance_ai_threads" : "FOREIGN KEY (threadId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_observations" }o--|| "instance_ai_threads" : "FOREIGN KEY (observationScopeId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_observation_cursors" |o--|| "instance_ai_threads" : "FOREIGN KEY (observationScopeId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_observation_locks" |o--|| "instance_ai_threads" : "FOREIGN KEY (observationScopeId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_checkpoints" }o--|| "instance_ai_threads" : "FOREIGN KEY (threadId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_pending_confirmations" }o--|| "instance_ai_threads" : "FOREIGN KEY (threadId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_threads" }o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"

"instance_ai_threads" {
  varchar id PK
  varchar_255_ resourceId
  varchar_36_ projectId FK
  TEXT title
  TEXT metadata
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"instance_ai_messages" {
  varchar_36_ id PK
  varchar threadId FK
  TEXT content
  varchar_16_ role
  varchar_32_ type
  varchar_255_ resourceId
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"instance_ai_observational_memory" {
  varchar_36_ id PK
  varchar_255_ lookupKey
  varchar_16_ scope
  varchar threadId FK
  varchar_255_ resourceId
  TEXT activeObservations
  varchar_32_ originType
  TEXT config
  INTEGER generationCount
  datetime_3_ lastObservedAt
  INTEGER pendingMessageTokens
  INTEGER totalTokensObserved
  INTEGER observationTokenCount
  boolean isObserving
  boolean isReflecting
  TEXT observedMessageIds
  varchar observedTimezone
  TEXT bufferedObservations
  INTEGER bufferedObservationTokens
  TEXT bufferedMessageIds
  TEXT bufferedReflection
  INTEGER bufferedReflectionTokens
  INTEGER bufferedReflectionInputTokens
  INTEGER reflectedObservationLineCount
  TEXT bufferedObservationChunks
  boolean isBufferingObservation
  boolean isBufferingReflection
  INTEGER lastBufferedAtTokens
  datetime_3_ lastBufferedAtTime
  TEXT metadata
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"instance_ai_iteration_logs" {
  varchar_36_ id PK
  varchar threadId FK
  varchar taskKey
  TEXT entry
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"ai_builder_temporary_workflow" {
  varchar_36_ workflowId PK
  varchar threadId FK
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"instance_ai_run_snapshots" {
  varchar threadId PK
  varchar_36_ runId PK
  varchar_36_ messageGroupId
  TEXT runIds
  TEXT tree
  datetime_3_ createdAt
  datetime_3_ updatedAt
  varchar_36_ langsmithRunId
  varchar_36_ langsmithTraceId
  varchar_64_ traceId
  varchar_64_ spanId
}
"instance_ai_observations" {
  varchar_36_ id PK
  varchar observationScopeId FK
  varchar_16_ marker
  TEXT text
  varchar_36_ parentId FK
  INTEGER tokenCount
  varchar_16_ status
  varchar_36_ supersededBy FK
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"instance_ai_observation_cursors" {
  varchar observationScopeId PK
  varchar_36_ lastObservedMessageId
  datetime_3_ lastObservedAt
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"instance_ai_observation_locks" {
  varchar observationScopeId PK
  varchar_20_ taskKind PK
  varchar_64_ holderId
  datetime_3_ heldUntil
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"instance_ai_checkpoints" {
  varchar_255_ key PK
  varchar_255_ runId
  varchar threadId FK
  varchar_255_ resourceId
  TEXT state
  datetime_3_ createdAt
  datetime_3_ updatedAt
  datetime_3_ expiredAt
}
"instance_ai_pending_confirmations" {
  varchar_36_ requestId PK
  varchar threadId FK
  varchar userId FK
  varchar_16_ kind
  varchar_36_ runId
  varchar_64_ toolCallId
  varchar_36_ messageGroupId
  varchar_255_ checkpointKey FK
  varchar_36_ checkpointTaskId
  datetime_3_ expiresAt
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
