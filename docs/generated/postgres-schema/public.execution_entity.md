# public.execution_entity

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| id | integer | nextval('execution_entity_id_seq'::regclass) | false | [public.execution_data](public.execution_data.md) [public.execution_metadata](public.execution_metadata.md) [public.execution_annotations](public.execution_annotations.md) [public.test_case_execution](public.test_case_execution.md) [public.chat_hub_messages](public.chat_hub_messages.md) |  |  |
| finished | boolean |  | false |  |  |  |
| mode | varchar |  | false |  |  |  |
| retryOf | varchar |  | true |  |  |  |
| retrySuccessId | varchar |  | true |  |  |  |
| startedAt | timestamp(3) with time zone |  | true |  |  |  |
| stoppedAt | timestamp(3) with time zone |  | true |  |  |  |
| waitTill | timestamp(3) with time zone |  | true |  |  |  |
| status | varchar |  | false |  |  |  |
| workflowId | varchar(36) |  | false |  | [public.workflow_entity](public.workflow_entity.md) |  |
| deletedAt | timestamp(3) with time zone |  | true |  |  |  |
| createdAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |
| storedAt | varchar(2) | 'db'::character varying | false |  |  |  |
| tracingContext | json |  | true |  |  |  |
| deduplicationKey | varchar(255) |  | true |  |  |  |
| jsonSizeBytes | bigint | 0 | false |  |  | Byte size of the JSON execution data bundle (run data, workflow snapshot, version id); excludes binary data. 0 means unknown. |
| workflowVersionId | varchar(36) | NULL::character varying | true |  |  | Version id of the workflow run by this execution; denormalized from the data bundle. |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| execution_entity_createdAt_not_null | n | NOT NULL "createdAt" |
| execution_entity_finished_not_null | n | NOT NULL finished |
| execution_entity_id_not_null | n | NOT NULL id |
| execution_entity_jsonSizeBytes_not_null | n | NOT NULL "jsonSizeBytes" |
| execution_entity_mode_not_null | n | NOT NULL mode |
| execution_entity_status_not_null | n | NOT NULL status |
| execution_entity_storedAt_check | CHECK | CHECK ((("storedAt")::text = ANY ((ARRAY['db'::character varying, 'fs'::character varying, 's3'::character varying])::text[]))) |
| execution_entity_storedAt_not_null | n | NOT NULL "storedAt" |
| execution_entity_workflowId_not_null | n | NOT NULL "workflowId" |
| pk_e3e63bbf986767844bbe1166d4e | PRIMARY KEY | PRIMARY KEY (id) |
| fk_execution_entity_workflow_id | FOREIGN KEY | FOREIGN KEY ("workflowId") REFERENCES workflow_entity(id) ON DELETE CASCADE |

## Indexes

| Name | Definition |
| ---- | ---------- |
| pk_e3e63bbf986767844bbe1166d4e | CREATE UNIQUE INDEX pk_e3e63bbf986767844bbe1166d4e ON public.execution_entity USING btree (id) |
| IDX_execution_entity_deletedAt | CREATE INDEX "IDX_execution_entity_deletedAt" ON public.execution_entity USING btree ("deletedAt") |
| idx_execution_entity_workflow_id_started_at | CREATE INDEX idx_execution_entity_workflow_id_started_at ON public.execution_entity USING btree ("workflowId", "startedAt") WHERE (("startedAt" IS NOT NULL) AND ("deletedAt" IS NULL)) |
| idx_execution_entity_wait_till_status_deleted_at | CREATE INDEX idx_execution_entity_wait_till_status_deleted_at ON public.execution_entity USING btree ("waitTill", status, "deletedAt") WHERE (("waitTill" IS NOT NULL) AND ("deletedAt" IS NULL)) |
| idx_execution_entity_stopped_at_status_deleted_at | CREATE INDEX idx_execution_entity_stopped_at_status_deleted_at ON public.execution_entity USING btree ("stoppedAt", status, "deletedAt") WHERE (("stoppedAt" IS NOT NULL) AND ("deletedAt" IS NULL)) |
| IDX_execution_entity_deduplicationKey | CREATE UNIQUE INDEX "IDX_execution_entity_deduplicationKey" ON public.execution_entity USING btree ("deduplicationKey") WHERE ("deduplicationKey" IS NOT NULL) |
| IDX_execution_entity_workflowId_status_id | CREATE INDEX "IDX_execution_entity_workflowId_status_id" ON public.execution_entity USING btree ("workflowId", status, id) WHERE ("deletedAt" IS NULL) |

## Relations

```mermaid
erDiagram

"public.execution_data" |o--|| "public.execution_entity" : "FOREIGN KEY (#quot;executionId#quot;) REFERENCES execution_entity(id) ON DELETE CASCADE"
"public.execution_metadata" }o--|| "public.execution_entity" : "FOREIGN KEY (#quot;executionId#quot;) REFERENCES execution_entity(id) ON DELETE CASCADE"
"public.execution_annotations" }o--|| "public.execution_entity" : "FOREIGN KEY (#quot;executionId#quot;) REFERENCES execution_entity(id) ON DELETE CASCADE"
"public.test_case_execution" }o--o| "public.execution_entity" : "FOREIGN KEY (#quot;executionId#quot;) REFERENCES execution_entity(id) ON DELETE SET NULL"
"public.chat_hub_messages" }o--o| "public.execution_entity" : "FOREIGN KEY (#quot;executionId#quot;) REFERENCES execution_entity(id) ON DELETE SET NULL"
"public.execution_entity" }o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"

"public.execution_entity" {
  integer id
  boolean finished
  varchar mode
  varchar retryOf
  varchar retrySuccessId
  timestamp_3__with_time_zone startedAt
  timestamp_3__with_time_zone stoppedAt
  timestamp_3__with_time_zone waitTill
  varchar status
  varchar_36_ workflowId FK
  timestamp_3__with_time_zone deletedAt
  timestamp_3__with_time_zone createdAt
  varchar_2_ storedAt
  json tracingContext
  varchar_255_ deduplicationKey
  bigint jsonSizeBytes
  varchar_36_ workflowVersionId
}
"public.execution_data" {
  integer executionId FK
  json workflowData
  text data
  varchar_36_ workflowVersionId
}
"public.execution_metadata" {
  integer id
  integer executionId FK
  varchar_255_ key
  text value
}
"public.execution_annotations" {
  integer id
  integer executionId FK
  varchar_6_ vote
  text note
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
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
"public.chat_hub_messages" {
  uuid id
  uuid sessionId FK
  uuid previousMessageId FK
  uuid revisionOfMessageId FK
  uuid retryOfMessageId FK
  varchar_16_ type
  varchar_128_ name
  text content
  varchar_16_ provider
  varchar_256_ model
  varchar_36_ workflowId FK
  integer executionId FK
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
  uuid agentId FK
  varchar_16_ status
  json attachments
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
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
