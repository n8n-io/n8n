# execution_entity

## Description

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE "execution_entity" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "workflowId" varchar(36) NOT NULL, "finished" boolean NOT NULL, "mode" varchar NOT NULL, "retryOf" varchar, "retrySuccessId" varchar, "startedAt" datetime, "stoppedAt" datetime, "waitTill" datetime, "status" varchar NOT NULL, "deletedAt" datetime(3), "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "storedAt" varchar(2) NOT NULL DEFAULT ('db'), "tracingContext" text, "deduplicationKey" varchar(255), "jsonSizeBytes" bigint NOT NULL DEFAULT (0), "workflowVersionId" varchar(36) DEFAULT (NULL), "binaryDataSizeBytes" bigint NOT NULL DEFAULT (0), "usedPrivateCredentials" BOOLEAN NOT NULL DEFAULT FALSE, CONSTRAINT "CHK_execution_entity_storedAt" CHECK ("storedAt" IN ('db', 'fs', 's3', 'az')), CONSTRAINT "FK_c4d999a5e90784e8caccf5589de" FOREIGN KEY ("workflowId") REFERENCES "workflow_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)
```

</details>

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| binaryDataSizeBytes | bigint | 0 | false |  |  |  |
| createdAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| deduplicationKey | varchar(255) |  | true |  |  |  |
| deletedAt | datetime(3) |  | true |  |  |  |
| finished | boolean |  | false |  |  |  |
| id | INTEGER |  | false | [chat_hub_messages](chat_hub_messages.md) [execution_annotations](execution_annotations.md) [execution_data](execution_data.md) [execution_metadata](execution_metadata.md) [test_case_execution](test_case_execution.md) |  |  |
| jsonSizeBytes | bigint | 0 | false |  |  |  |
| mode | varchar |  | false |  |  |  |
| retryOf | varchar |  | true |  |  |  |
| retrySuccessId | varchar |  | true |  |  |  |
| startedAt | datetime |  | true |  |  |  |
| status | varchar |  | false |  |  |  |
| stoppedAt | datetime |  | true |  |  |  |
| storedAt | varchar(2) | 'db' | false |  |  |  |
| tracingContext | TEXT |  | true |  |  |  |
| usedPrivateCredentials | BOOLEAN | FALSE | false |  |  |  |
| waitTill | datetime |  | true |  |  |  |
| workflowId | varchar(36) |  | false |  | [workflow_entity](workflow_entity.md) |  |
| workflowVersionId | varchar(36) | NULL | true |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| - | CHECK | CHECK ("storedAt" IN ('db', 'fs', 's3', 'az')) |
| - (Foreign key ID: 0) | FOREIGN KEY | FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| id | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_execution_entity_deduplicationKey | CREATE UNIQUE INDEX "IDX_execution_entity_deduplicationKey" ON "execution_entity" ("deduplicationKey") WHERE "deduplicationKey" IS NOT NULL |
| IDX_execution_entity_deletedAt | CREATE INDEX "IDX_execution_entity_deletedAt" ON "execution_entity" ("deletedAt")  |
| IDX_execution_entity_stoppedAt | CREATE INDEX "IDX_execution_entity_stoppedAt" ON "execution_entity" ("stoppedAt")  |

## Relations

```mermaid
erDiagram

"chat_hub_messages" }o--o| "execution_entity" : "FOREIGN KEY (executionId) REFERENCES execution_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"execution_annotations" }o--|| "execution_entity" : "FOREIGN KEY (executionId) REFERENCES execution_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"execution_data" |o--|| "execution_entity" : "FOREIGN KEY (executionId) REFERENCES execution_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"execution_metadata" }o--|| "execution_entity" : "FOREIGN KEY (executionId) REFERENCES execution_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"test_case_execution" }o--o| "execution_entity" : "FOREIGN KEY (pastExecutionId) REFERENCES execution_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"test_case_execution" }o--o| "execution_entity" : "FOREIGN KEY (executionId) REFERENCES execution_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"test_case_execution" }o--o| "execution_entity" : "FOREIGN KEY (evaluationExecutionId) REFERENCES execution_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"execution_entity" }o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"

"execution_entity" {
  bigint binaryDataSizeBytes
  datetime_3_ createdAt
  varchar_255_ deduplicationKey
  datetime_3_ deletedAt
  boolean finished
  INTEGER id
  bigint jsonSizeBytes
  varchar mode
  varchar retryOf
  varchar retrySuccessId
  datetime startedAt
  varchar status
  datetime stoppedAt
  varchar_2_ storedAt
  TEXT tracingContext
  BOOLEAN usedPrivateCredentials
  datetime waitTill
  varchar_36_ workflowId FK
  varchar_36_ workflowVersionId
}
"chat_hub_messages" {
  varchar_36_ agentId FK
  TEXT attachments
  TEXT content
  datetime_3_ createdAt
  INTEGER executionId FK
  varchar id PK
  VARCHAR_256_ model
  varchar_128_ name
  varchar previousMessageId FK
  varchar_16_ provider
  varchar retryOfMessageId FK
  varchar revisionOfMessageId FK
  varchar sessionId FK
  varchar_16_ status
  varchar_16_ type
  datetime_3_ updatedAt
  varchar_36_ workflowId FK
}
"execution_annotations" {
  datetime_3_ createdAt
  INTEGER executionId FK
  INTEGER id
  TEXT note
  datetime_3_ updatedAt
  varchar_6_ vote
}
"execution_data" {
  TEXT data
  INT executionId PK
  TEXT workflowData
  VARCHAR_36_ workflowVersionId
}
"execution_metadata" {
  INTEGER executionId FK
  INTEGER id
  varchar_255_ key
  TEXT value
}
"test_case_execution" {
  datetime_3_ completedAt
  datetime_3_ createdAt
  varchar errorCode
  TEXT errorDetails
  INTEGER evaluationExecutionId FK
  INTEGER executionId FK
  varchar_36_ id PK
  TEXT inputs
  TEXT metrics
  TEXT outputs
  INTEGER pastExecutionId FK
  datetime_3_ runAt
  INTEGER runIndex
  varchar status
  varchar_36_ testRunId FK
  datetime_3_ updatedAt
}
"workflow_entity" {
  boolean active
  varchar_36_ activeVersionId FK
  TEXT connections
  datetime_3_ createdAt
  TEXT description
  varchar_36_ id PK
  boolean isArchived
  TEXT meta
  varchar_128_ name
  TEXT nodeGroups
  TEXT nodes
  varchar_36_ parentFolderId FK
  TEXT pinData
  TEXT settings
  varchar sourceWorkflowId
  TEXT staticData
  INTEGER triggerCount
  datetime_3_ updatedAt
  INTEGER versionCounter
  varchar_36_ versionId
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
