# public.test_run

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| cancelRequested | boolean | false | false |  |  |  |
| collectionId | varchar(36) |  | true |  | [public.evaluation_collection](public.evaluation_collection.md) |  |
| completedAt | timestamp(3) with time zone |  | true |  |  |  |
| createdAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |
| errorCode | varchar |  | true |  |  |  |
| errorDetails | json |  | true |  |  |  |
| evaluationConfigId | varchar(36) |  | true |  | [public.evaluation_config](public.evaluation_config.md) |  |
| evaluationConfigSnapshot | jsonb |  | true |  |  |  |
| id | varchar(36) |  | false | [public.test_case_execution](public.test_case_execution.md) |  |  |
| metrics | json |  | true |  |  |  |
| runAt | timestamp(3) with time zone |  | true |  |  |  |
| runningInstanceId | varchar(255) |  | true |  |  |  |
| status | varchar |  | false |  |  |  |
| updatedAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |
| workflowId | varchar(36) |  | false |  | [public.workflow_entity](public.workflow_entity.md) |  |
| workflowVersionId | varchar(36) |  | true |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| FK_d6870d3b6e4c185d33926f423c8 | FOREIGN KEY | FOREIGN KEY ("workflowId") REFERENCES workflow_entity(id) ON DELETE CASCADE |
| FK_test_run_collection_id | FOREIGN KEY | FOREIGN KEY ("collectionId") REFERENCES evaluation_collection(id) ON DELETE SET NULL |
| FK_test_run_evaluation_config_id | FOREIGN KEY | FOREIGN KEY ("evaluationConfigId") REFERENCES evaluation_config(id) ON DELETE SET NULL |
| PK_011c050f566e9db509a0fadb9b9 | PRIMARY KEY | PRIMARY KEY (id) |
| test_run_cancelRequested_not_null | n | NOT NULL "cancelRequested" |
| test_run_createdAt_not_null | n | NOT NULL "createdAt" |
| test_run_id_not_null | n | NOT NULL id |
| test_run_status_not_null | n | NOT NULL status |
| test_run_updatedAt_not_null | n | NOT NULL "updatedAt" |
| test_run_workflowId_not_null | n | NOT NULL "workflowId" |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_d6870d3b6e4c185d33926f423c | CREATE INDEX "IDX_d6870d3b6e4c185d33926f423c" ON public.test_run USING btree ("workflowId") |
| IDX_test_run_collectionId | CREATE INDEX "IDX_test_run_collectionId" ON public.test_run USING btree ("collectionId") |
| IDX_test_run_evaluationConfigId | CREATE INDEX "IDX_test_run_evaluationConfigId" ON public.test_run USING btree ("evaluationConfigId") |
| PK_011c050f566e9db509a0fadb9b9 | CREATE UNIQUE INDEX "PK_011c050f566e9db509a0fadb9b9" ON public.test_run USING btree (id) |

## Relations

```mermaid
erDiagram

"public.test_run" }o--o| "public.evaluation_collection" : "FOREIGN KEY (#quot;collectionId#quot;) REFERENCES evaluation_collection(id) ON DELETE SET NULL"
"public.test_run" }o--o| "public.evaluation_config" : "FOREIGN KEY (#quot;evaluationConfigId#quot;) REFERENCES evaluation_config(id) ON DELETE SET NULL"
"public.test_case_execution" }o--|| "public.test_run" : "FOREIGN KEY (#quot;testRunId#quot;) REFERENCES test_run(id) ON DELETE CASCADE"
"public.test_run" }o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"

"public.test_run" {
  boolean cancelRequested
  varchar_36_ collectionId FK
  timestamp_3__with_time_zone completedAt
  timestamp_3__with_time_zone createdAt
  varchar errorCode
  json errorDetails
  varchar_36_ evaluationConfigId FK
  jsonb evaluationConfigSnapshot
  varchar_36_ id
  json metrics
  timestamp_3__with_time_zone runAt
  varchar_255_ runningInstanceId
  varchar status
  timestamp_3__with_time_zone updatedAt
  varchar_36_ workflowId FK
  varchar_36_ workflowVersionId
}
"public.evaluation_collection" {
  timestamp_3__with_time_zone createdAt
  uuid createdById FK
  text description
  varchar_36_ evaluationConfigId FK
  varchar_36_ id
  json insightsCache
  varchar_128_ name
  timestamp_3__with_time_zone updatedAt
  varchar_36_ workflowId FK
}
"public.evaluation_config" {
  timestamp_3__with_time_zone createdAt
  json datasetRef
  varchar_32_ datasetSource
  varchar_255_ endNodeName
  varchar_36_ id
  varchar_64_ invalidReason
  json metrics
  varchar_128_ name
  varchar_255_ startNodeName
  varchar_16_ status
  timestamp_3__with_time_zone updatedAt
  varchar_36_ workflowId FK
}
"public.test_case_execution" {
  timestamp_3__with_time_zone completedAt
  timestamp_3__with_time_zone createdAt
  varchar errorCode
  json errorDetails
  integer executionId FK
  varchar_36_ id
  json inputs
  json metrics
  json outputs
  timestamp_3__with_time_zone runAt
  integer runIndex
  varchar status
  varchar_36_ testRunId FK
  timestamp_3__with_time_zone updatedAt
}
"public.workflow_entity" {
  boolean active
  varchar_36_ activeVersionId FK
  json connections
  timestamp_3__with_time_zone createdAt
  text description
  varchar_36_ id
  boolean isArchived
  json meta
  varchar_128_ name
  json nodeGroups
  json nodes
  varchar_36_ parentFolderId FK
  json pinData
  json settings
  varchar sourceWorkflowId
  json staticData
  integer triggerCount
  timestamp_3__with_time_zone updatedAt
  integer versionCounter
  character_36_ versionId
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
