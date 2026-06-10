# test_run

## Description

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE "test_run" ("id" varchar(36) PRIMARY KEY NOT NULL, "workflowId" varchar(36) NOT NULL, "status" varchar NOT NULL, "errorCode" varchar, "errorDetails" text, "runAt" datetime(3), "completedAt" datetime(3), "metrics" text, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "runningInstanceId" varchar(255), "cancelRequested" boolean NOT NULL DEFAULT (FALSE), "workflowVersionId" varchar(36), "evaluationConfigId" varchar(36), "evaluationConfigSnapshot" text, "collectionId" varchar(36), CONSTRAINT "FK_test_run_evaluation_config_id" FOREIGN KEY ("evaluationConfigId") REFERENCES "evaluation_config" ("id") ON DELETE SET NULL ON UPDATE NO ACTION, CONSTRAINT "FK_d6870d3b6e4c185d33926f423c8" FOREIGN KEY ("workflowId") REFERENCES "workflow_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_test_run_collection_id" FOREIGN KEY ("collectionId") REFERENCES "evaluation_collection" ("id") ON DELETE SET NULL)
```

</details>

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| id | varchar(36) |  | false | [test_case_execution](test_case_execution.md) |  |  |
| workflowId | varchar(36) |  | false |  | [workflow_entity](workflow_entity.md) |  |
| status | varchar |  | false |  |  |  |
| errorCode | varchar |  | true |  |  |  |
| errorDetails | TEXT |  | true |  |  |  |
| runAt | datetime(3) |  | true |  |  |  |
| completedAt | datetime(3) |  | true |  |  |  |
| metrics | TEXT |  | true |  |  |  |
| createdAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| updatedAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| runningInstanceId | varchar(255) |  | true |  |  |  |
| cancelRequested | boolean | FALSE | false |  |  |  |
| workflowVersionId | varchar(36) |  | true |  |  |  |
| evaluationConfigId | varchar(36) |  | true |  | [evaluation_config](evaluation_config.md) |  |
| evaluationConfigSnapshot | TEXT |  | true |  |  |  |
| collectionId | varchar(36) |  | true |  | [evaluation_collection](evaluation_collection.md) |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| id | PRIMARY KEY | PRIMARY KEY (id) |
| - (Foreign key ID: 0) | FOREIGN KEY | FOREIGN KEY (collectionId) REFERENCES evaluation_collection (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| - (Foreign key ID: 1) | FOREIGN KEY | FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| - (Foreign key ID: 2) | FOREIGN KEY | FOREIGN KEY (evaluationConfigId) REFERENCES evaluation_config (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| sqlite_autoindex_test_run_1 | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_test_run_collectionId | CREATE INDEX "IDX_test_run_collectionId" ON "test_run" ("collectionId")  |
| IDX_d6870d3b6e4c185d33926f423c | CREATE INDEX "IDX_d6870d3b6e4c185d33926f423c" ON "test_run" ("workflowId")  |
| IDX_test_run_evaluationConfigId | CREATE INDEX "IDX_test_run_evaluationConfigId" ON "test_run" ("evaluationConfigId")  |
| sqlite_autoindex_test_run_1 | PRIMARY KEY (id) |

## Relations

```mermaid
erDiagram

"test_case_execution" }o--|| "test_run" : "FOREIGN KEY (testRunId) REFERENCES test_run (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"test_run" }o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"test_run" }o--o| "evaluation_config" : "FOREIGN KEY (evaluationConfigId) REFERENCES evaluation_config (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"test_run" }o--o| "evaluation_collection" : "FOREIGN KEY (collectionId) REFERENCES evaluation_collection (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"

"test_run" {
  varchar_36_ id PK
  varchar_36_ workflowId FK
  varchar status
  varchar errorCode
  TEXT errorDetails
  datetime_3_ runAt
  datetime_3_ completedAt
  TEXT metrics
  datetime_3_ createdAt
  datetime_3_ updatedAt
  varchar_255_ runningInstanceId
  boolean cancelRequested
  varchar_36_ workflowVersionId
  varchar_36_ evaluationConfigId FK
  TEXT evaluationConfigSnapshot
  varchar_36_ collectionId FK
}
"test_case_execution" {
  varchar_36_ id PK
  varchar_36_ testRunId FK
  INTEGER pastExecutionId FK
  INTEGER executionId FK
  INTEGER evaluationExecutionId FK
  varchar status
  datetime_3_ runAt
  datetime_3_ completedAt
  varchar errorCode
  TEXT errorDetails
  TEXT metrics
  datetime_3_ createdAt
  datetime_3_ updatedAt
  TEXT inputs
  TEXT outputs
  INTEGER runIndex
}
"workflow_entity" {
  varchar_36_ id PK
  varchar_128_ name
  boolean active
  TEXT nodes
  TEXT connections
  TEXT settings
  TEXT staticData
  TEXT pinData
  varchar_36_ versionId
  INTEGER triggerCount
  TEXT meta
  varchar_36_ parentFolderId FK
  datetime_3_ createdAt
  datetime_3_ updatedAt
  boolean isArchived
  INTEGER versionCounter
  TEXT description
  varchar_36_ activeVersionId FK
  TEXT nodeGroups
  varchar sourceWorkflowId
}
"evaluation_config" {
  varchar_36_ id PK
  varchar_36_ workflowId FK
  varchar_128_ name
  varchar_16_ status
  varchar_64_ invalidReason
  varchar_32_ datasetSource
  TEXT datasetRef
  varchar_255_ startNodeName
  varchar_255_ endNodeName
  TEXT metrics
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
"evaluation_collection" {
  varchar_36_ id PK
  varchar_128_ name
  TEXT description
  varchar_36_ workflowId FK
  varchar_36_ evaluationConfigId FK
  varchar createdById FK
  TEXT insightsCache
  datetime_3_ createdAt
  datetime_3_ updatedAt
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
