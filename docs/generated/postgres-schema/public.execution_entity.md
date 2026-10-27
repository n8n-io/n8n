# public.execution_entity

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| binaryDataSizeBytes | bigint | 0 | false |  |  | Byte size of binary data offloaded to separate storage (db/fs/S3), deduplicated by blob; excludes inline binary counted in jsonSizeBytes. 0 means unknown. |
| createdAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |
| deduplicationKey | varchar(255) |  | true |  |  |  |
| deletedAt | timestamp(3) with time zone |  | true |  |  |  |
| finished | boolean |  | false |  |  |  |
| id | integer | nextval('execution_entity_id_seq'::regclass) | false | [public.chat_hub_messages](public.chat_hub_messages.md) [public.execution_annotations](public.execution_annotations.md) [public.execution_data](public.execution_data.md) [public.execution_metadata](public.execution_metadata.md) [public.test_case_execution](public.test_case_execution.md) |  |  |
| jsonSizeBytes | bigint | 0 | false |  |  | Byte size of the JSON execution data bundle (run data, workflow snapshot, version id); excludes binary data. 0 means unknown. |
| mode | varchar |  | false |  |  |  |
| retryOf | varchar |  | true |  |  |  |
| retrySuccessId | varchar |  | true |  |  |  |
| startedAt | timestamp(3) with time zone |  | true |  |  |  |
| status | varchar |  | false |  |  |  |
| stoppedAt | timestamp(3) with time zone |  | true |  |  |  |
| storedAt | varchar(2) | 'db'::character varying | false |  |  |  |
| tracingContext | json |  | true |  |  |  |
| usedPrivateCredentials | boolean | false | false |  |  | Whether this execution ran with at least one dynamically-resolved private credential. |
| waitTill | timestamp(3) with time zone |  | true |  |  |  |
| workflowId | varchar(36) |  | false |  | [public.workflow_entity](public.workflow_entity.md) |  |
| workflowVersionId | varchar(36) | NULL::character varying | true |  |  | Version id of the workflow run by this execution; denormalized from the data bundle. |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| CHK_execution_entity_storedAt | CHECK | CHECK ((("storedAt")::text = ANY ((ARRAY['db'::character varying, 'fs'::character varying, 's3'::character varying, 'az'::character varying])::text[]))) |
| execution_entity_binaryDataSizeBytes_not_null | n | NOT NULL "binaryDataSizeBytes" |
| execution_entity_createdAt_not_null | n | NOT NULL "createdAt" |
| execution_entity_finished_not_null | n | NOT NULL finished |
| execution_entity_id_not_null | n | NOT NULL id |
| execution_entity_jsonSizeBytes_not_null | n | NOT NULL "jsonSizeBytes" |
| execution_entity_mode_not_null | n | NOT NULL mode |
| execution_entity_status_not_null | n | NOT NULL status |
| execution_entity_storedAt_not_null | n | NOT NULL "storedAt" |
| execution_entity_usedPrivateCredentials_not_null | n | NOT NULL "usedPrivateCredentials" |
| execution_entity_workflowId_not_null | n | NOT NULL "workflowId" |
| fk_execution_entity_workflow_id | FOREIGN KEY | FOREIGN KEY ("workflowId") REFERENCES workflow_entity(id) ON DELETE CASCADE |
| pk_e3e63bbf986767844bbe1166d4e | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_execution_entity_deduplicationKey | CREATE UNIQUE INDEX "IDX_execution_entity_deduplicationKey" ON public.execution_entity USING btree ("deduplicationKey") WHERE ("deduplicationKey" IS NOT NULL) |
| IDX_execution_entity_deletedAt | CREATE INDEX "IDX_execution_entity_deletedAt" ON public.execution_entity USING btree ("deletedAt") |
| IDX_execution_entity_workflowId_status_id | CREATE INDEX "IDX_execution_entity_workflowId_status_id" ON public.execution_entity USING btree ("workflowId", status, id) WHERE ("deletedAt" IS NULL) |
| idx_execution_entity_stopped_at_status_deleted_at | CREATE INDEX idx_execution_entity_stopped_at_status_deleted_at ON public.execution_entity USING btree ("stoppedAt", status, "deletedAt") WHERE (("stoppedAt" IS NOT NULL) AND ("deletedAt" IS NULL)) |
| idx_execution_entity_wait_till_status_deleted_at | CREATE INDEX idx_execution_entity_wait_till_status_deleted_at ON public.execution_entity USING btree ("waitTill", status, "deletedAt") WHERE (("waitTill" IS NOT NULL) AND ("deletedAt" IS NULL)) |
| idx_execution_entity_workflow_id_started_at | CREATE INDEX idx_execution_entity_workflow_id_started_at ON public.execution_entity USING btree ("workflowId", "startedAt") WHERE (("startedAt" IS NOT NULL) AND ("deletedAt" IS NULL)) |
| pk_e3e63bbf986767844bbe1166d4e | CREATE UNIQUE INDEX pk_e3e63bbf986767844bbe1166d4e ON public.execution_entity USING btree (id) |

## Relations

```mermaid
erDiagram

"public.chat_hub_messages" }o--o| "public.execution_entity" : "FOREIGN KEY (#quot;executionId#quot;) REFERENCES execution_entity(id) ON DELETE SET NULL"
"public.execution_annotations" }o--|| "public.execution_entity" : "FOREIGN KEY (#quot;executionId#quot;) REFERENCES execution_entity(id) ON DELETE CASCADE"
"public.execution_data" |o--|| "public.execution_entity" : "FOREIGN KEY (#quot;executionId#quot;) REFERENCES execution_entity(id) ON DELETE CASCADE"
"public.execution_metadata" }o--|| "public.execution_entity" : "FOREIGN KEY (#quot;executionId#quot;) REFERENCES execution_entity(id) ON DELETE CASCADE"
"public.test_case_execution" }o--o| "public.execution_entity" : "FOREIGN KEY (#quot;executionId#quot;) REFERENCES execution_entity(id) ON DELETE SET NULL"
"public.execution_entity" }o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"

"public.execution_entity" {
  bigint binaryDataSizeBytes
  timestamp_3__with_time_zone createdAt
  varchar_255_ deduplicationKey
  timestamp_3__with_time_zone deletedAt
  boolean finished
  integer id
  bigint jsonSizeBytes
  varchar mode
  varchar retryOf
  varchar retrySuccessId
  timestamp_3__with_time_zone startedAt
  varchar status
  timestamp_3__with_time_zone stoppedAt
  varchar_2_ storedAt
  json tracingContext
  boolean usedPrivateCredentials
  timestamp_3__with_time_zone waitTill
  varchar_36_ workflowId FK
  varchar_36_ workflowVersionId
}
"public.chat_hub_messages" {
  uuid agentId FK
  json attachments
  text content
  timestamp_3__with_time_zone createdAt
  integer executionId FK
  uuid id
  varchar_256_ model
  varchar_128_ name
  uuid previousMessageId FK
  varchar_16_ provider
  uuid retryOfMessageId FK
  uuid revisionOfMessageId FK
  uuid sessionId FK
  varchar_16_ status
  varchar_16_ type
  timestamp_3__with_time_zone updatedAt
  varchar_36_ workflowId FK
}
"public.execution_annotations" {
  timestamp_3__with_time_zone createdAt
  integer executionId FK
  integer id
  text note
  timestamp_3__with_time_zone updatedAt
  varchar_6_ vote
}
"public.execution_data" {
  text data
  integer executionId FK
  json workflowData
  varchar_36_ workflowVersionId
}
"public.execution_metadata" {
  integer executionId FK
  integer id
  varchar_255_ key
  text value
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
