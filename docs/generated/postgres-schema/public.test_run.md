# public.test_run

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| id | varchar(36) |  | false | [public.test_case_execution](public.test_case_execution.md) |  |  |
| workflowId | varchar(36) |  | false |  | [public.workflow_entity](public.workflow_entity.md) |  |
| status | varchar |  | false |  |  |  |
| errorCode | varchar |  | true |  |  |  |
| errorDetails | json |  | true |  |  |  |
| runAt | timestamp(3) with time zone |  | true |  |  |  |
| completedAt | timestamp(3) with time zone |  | true |  |  |  |
| metrics | json |  | true |  |  |  |
| createdAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |
| updatedAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |
| runningInstanceId | varchar(255) |  | true |  |  |  |
| cancelRequested | boolean | false | false |  |  |  |
| workflowVersionId | varchar(36) |  | true |  |  |  |
| evaluationConfigId | varchar(36) |  | true |  | [public.evaluation_config](public.evaluation_config.md) |  |
| evaluationConfigSnapshot | jsonb |  | true |  |  |  |
| collectionId | varchar(36) |  | true |  | [public.evaluation_collection](public.evaluation_collection.md) |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| test_run_cancelRequested_not_null | n | NOT NULL "cancelRequested" |
| test_run_createdAt_not_null | n | NOT NULL "createdAt" |
| test_run_id_not_null | n | NOT NULL id |
| test_run_status_not_null | n | NOT NULL status |
| test_run_updatedAt_not_null | n | NOT NULL "updatedAt" |
| test_run_workflowId_not_null | n | NOT NULL "workflowId" |
| FK_d6870d3b6e4c185d33926f423c8 | FOREIGN KEY | FOREIGN KEY ("workflowId") REFERENCES workflow_entity(id) ON DELETE CASCADE |
| PK_011c050f566e9db509a0fadb9b9 | PRIMARY KEY | PRIMARY KEY (id) |
| FK_test_run_evaluation_config_id | FOREIGN KEY | FOREIGN KEY ("evaluationConfigId") REFERENCES evaluation_config(id) ON DELETE SET NULL |
| FK_test_run_collection_id | FOREIGN KEY | FOREIGN KEY ("collectionId") REFERENCES evaluation_collection(id) ON DELETE SET NULL |

## Indexes

| Name | Definition |
| ---- | ---------- |
| PK_011c050f566e9db509a0fadb9b9 | CREATE UNIQUE INDEX "PK_011c050f566e9db509a0fadb9b9" ON public.test_run USING btree (id) |
| IDX_d6870d3b6e4c185d33926f423c | CREATE INDEX "IDX_d6870d3b6e4c185d33926f423c" ON public.test_run USING btree ("workflowId") |
| IDX_test_run_evaluationConfigId | CREATE INDEX "IDX_test_run_evaluationConfigId" ON public.test_run USING btree ("evaluationConfigId") |
| IDX_test_run_collectionId | CREATE INDEX "IDX_test_run_collectionId" ON public.test_run USING btree ("collectionId") |

## Relations

```mermaid
erDiagram

"public.test_case_execution" }o--|| "public.test_run" : "FOREIGN KEY (#quot;testRunId#quot;) REFERENCES test_run(id) ON DELETE CASCADE"
"public.test_run" }o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"
"public.test_run" }o--o| "public.evaluation_config" : "FOREIGN KEY (#quot;evaluationConfigId#quot;) REFERENCES evaluation_config(id) ON DELETE SET NULL"
"public.test_run" }o--o| "public.evaluation_collection" : "FOREIGN KEY (#quot;collectionId#quot;) REFERENCES evaluation_collection(id) ON DELETE SET NULL"

"public.test_run" {
  varchar_36_ id
  varchar_36_ workflowId FK
  varchar status
  varchar errorCode
  json errorDetails
  timestamp_3__with_time_zone runAt
  timestamp_3__with_time_zone completedAt
  json metrics
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
  varchar_255_ runningInstanceId
  boolean cancelRequested
  varchar_36_ workflowVersionId
  varchar_36_ evaluationConfigId FK
  jsonb evaluationConfigSnapshot
  varchar_36_ collectionId FK
}
"public.test_case_execution" {
  varchar_36_ id
  varchar_36_ testRunId FK
  integer executionId FK
  varchar status
  timestamp_3__with_time_zone runAt
  timestamp_3__with_time_zone completedAt
  varchar errorCode
  json errorDetails
  json metrics
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
  json inputs
  json outputs
  integer runIndex
}
"public.workflow_entity" {
  varchar_128_ name
  boolean active
  json nodes
  json connections
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
  json settings
  json staticData
  json pinData
  character_36_ versionId
  integer triggerCount
  varchar_36_ id
  json meta
  varchar_36_ parentFolderId FK
  boolean isArchived
  integer versionCounter
  text description
  varchar_36_ activeVersionId FK
  json nodeGroups
  varchar sourceWorkflowId
}
"public.evaluation_config" {
  varchar_36_ id
  varchar_36_ workflowId FK
  varchar_128_ name
  varchar_16_ status
  varchar_64_ invalidReason
  varchar_32_ datasetSource
  json datasetRef
  varchar_255_ startNodeName
  varchar_255_ endNodeName
  json metrics
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
"public.evaluation_collection" {
  varchar_36_ id
  varchar_128_ name
  text description
  varchar_36_ workflowId FK
  varchar_36_ evaluationConfigId FK
  uuid createdById FK
  json insightsCache
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
