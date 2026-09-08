# public.agents

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| activeVersionId | varchar(36) |  | true |  | [public.agent_history](public.agent_history.md) |  |
| availableInMCP | boolean | false | false |  |  | Whether MCP clients granted agent scopes may operate on this agent |
| createdAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |
| id | varchar(36) |  | false | [public.agent_background_job](public.agent_background_job.md) [public.agent_channel_status](public.agent_channel_status.md) [public.agent_chat_attachments](public.agent_chat_attachments.md) [public.agent_chat_subscriptions](public.agent_chat_subscriptions.md) [public.agent_checkpoints](public.agent_checkpoints.md) [public.agent_credential_dependency](public.agent_credential_dependency.md) [public.agent_eval_dataset](public.agent_eval_dataset.md) [public.agent_execution_threads](public.agent_execution_threads.md) [public.agent_files](public.agent_files.md) [public.agent_history](public.agent_history.md) [public.agent_task_definition](public.agent_task_definition.md) [public.agent_task_run_lock](public.agent_task_run_lock.md) [public.agent_workflow_dependency](public.agent_workflow_dependency.md) [public.agents_memory_entries](public.agents_memory_entries.md) [public.agents_memory_entry_cursors](public.agents_memory_entry_cursors.md) [public.agents_memory_entry_locks](public.agents_memory_entry_locks.md) [public.agents_memory_entry_sources](public.agents_memory_entry_sources.md) [public.agents_observation_cursors](public.agents_observation_cursors.md) [public.agents_observation_locks](public.agents_observation_locks.md) [public.agents_observations](public.agents_observations.md) |  |  |
| integrations | json | '[]'::json | false |  |  |  |
| name | varchar(128) |  | false |  |  |  |
| projectId | varchar(255) |  | false |  | [public.project](public.project.md) |  |
| revision | integer | 0 | false |  |  |  |
| schema | json |  | true |  |  |  |
| setupCompletedAt | timestamp(3) with time zone |  | true |  |  | When this agent first reached a complete, publishable setup |
| skills | json | '{}'::json | false |  |  |  |
| tools | json | '{}'::json | false |  |  |  |
| updatedAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |
| versionId | varchar(36) |  | true |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| FK_940597dfe9753375309ce6aeea0 | FOREIGN KEY | FOREIGN KEY ("activeVersionId") REFERENCES agent_history("versionId") ON DELETE SET NULL |
| FK_a30d560207c4071d98aa03c179c | FOREIGN KEY | FOREIGN KEY ("projectId") REFERENCES project(id) ON DELETE CASCADE |
| PK_9c653f28ae19c5884d5baf6a1d9 | PRIMARY KEY | PRIMARY KEY (id) |
| agents_availableInMCP_not_null | n | NOT NULL "availableInMCP" |
| agents_createdAt_not_null | n | NOT NULL "createdAt" |
| agents_id_not_null | n | NOT NULL id |
| agents_integrations_not_null | n | NOT NULL integrations |
| agents_name_not_null | n | NOT NULL name |
| agents_projectId_not_null | n | NOT NULL "projectId" |
| agents_revision_not_null | n | NOT NULL revision |
| agents_skills_not_null | n | NOT NULL skills |
| agents_tools_not_null | n | NOT NULL tools |
| agents_updatedAt_not_null | n | NOT NULL "updatedAt" |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_a30d560207c4071d98aa03c179 | CREATE INDEX "IDX_a30d560207c4071d98aa03c179" ON public.agents USING btree ("projectId") |
| IDX_agents_projectId | CREATE INDEX "IDX_agents_projectId" ON public.agents USING btree ("projectId") |
| PK_9c653f28ae19c5884d5baf6a1d9 | CREATE UNIQUE INDEX "PK_9c653f28ae19c5884d5baf6a1d9" ON public.agents USING btree (id) |

## Relations

```mermaid
erDiagram

"public.agents" }o--o| "public.agent_history" : "FOREIGN KEY (#quot;activeVersionId#quot;) REFERENCES agent_history(#quot;versionId#quot;) ON DELETE SET NULL"
"public.agent_background_job" }o--|| "public.agents" : "FOREIGN KEY (#quot;parentAgentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agent_channel_status" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agent_chat_attachments" }o--o| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agent_chat_subscriptions" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agent_checkpoints" }o--o| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agent_credential_dependency" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agent_eval_dataset" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agent_execution_threads" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agent_files" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agent_history" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agent_task_definition" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agent_task_run_lock" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agent_workflow_dependency" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agents_memory_entries" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agents_memory_entry_cursors" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agents_memory_entry_locks" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agents_memory_entry_sources" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agents_observation_cursors" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agents_observation_locks" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agents_observations" }o--|| "public.agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agents" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"

"public.agents" {
  varchar_36_ activeVersionId FK
  boolean availableInMCP
  timestamp_3__with_time_zone createdAt
  varchar_36_ id
  json integrations
  varchar_128_ name
  varchar_255_ projectId FK
  integer revision
  json schema
  timestamp_3__with_time_zone setupCompletedAt
  json skills
  json tools
  timestamp_3__with_time_zone updatedAt
  varchar_36_ versionId
}
"public.agent_history" {
  varchar_36_ agentId FK
  varchar_255_ author
  timestamp_3__with_time_zone createdAt
  uuid publishedById FK
  json schema
  json skills
  json tools
  timestamp_3__with_time_zone updatedAt
  varchar_36_ versionId
}
"public.agent_background_job" {
  varchar_36_ childExecutionId
  varchar_128_ childThreadId
  timestamp_3__with_time_zone createdAt
  text error
  varchar_36_ id
  varchar_16_ kind
  varchar_36_ parentAgentId FK
  varchar_128_ parentThreadId
  text result
  timestamp_3__with_time_zone settledAt
  varchar_16_ status
  varchar_36_ subAgentId
  timestamp_3__with_time_zone timeoutAt
  varchar_255_ title
  timestamp_3__with_time_zone updatedAt
  varchar_36_ workflowId
}
"public.agent_channel_status" {
  varchar_36_ agentId FK
  integer attempts
  timestamp_3__with_time_zone backoffUntil
  timestamp_3__with_time_zone createdAt
  varchar_36_ credentialId
  text errorMessage
  timestamp_3__with_time_zone expiresAt
  varchar_128_ hostId
  varchar_64_ integrationType
  varchar_16_ status
  timestamp_3__with_time_zone updatedAt
}
"public.agent_chat_attachments" {
  varchar_36_ agentId FK
  text binaryDataId
  timestamp_3__with_time_zone createdAt
  varchar_255_ fileName
  integer fileSizeBytes
  varchar_16_ id
  varchar_255_ mimeType
  varchar_36_ projectId FK
  varchar_255_ resourceId
  varchar_32_ source
  varchar_128_ threadId
  timestamp_3__with_time_zone updatedAt
}
"public.agent_chat_subscriptions" {
  varchar_36_ agentId FK
  timestamp_3__with_time_zone createdAt
  varchar_255_ credentialId
  varchar_64_ integrationType
  varchar_255_ threadId
  timestamp_3__with_time_zone updatedAt
}
"public.agent_checkpoints" {
  varchar_255_ agentId FK
  timestamp_3__with_time_zone createdAt
  boolean expired
  varchar_255_ runId
  text state
  timestamp_3__with_time_zone updatedAt
}
"public.agent_credential_dependency" {
  varchar_36_ agentId FK
  timestamp_3__with_time_zone createdAt
  varchar_36_ credentialId FK
}
"public.agent_eval_dataset" {
  varchar_36_ agentId FK
  json columnMapping
  timestamp_3__with_time_zone createdAt
  uuid createdById FK
  json datasetRef
  varchar_32_ datasetSource
  text description
  varchar_36_ id
  varchar_128_ name
  timestamp_3__with_time_zone updatedAt
}
"public.agent_execution_threads" {
  varchar_36_ agentId FK
  varchar_255_ agentName
  timestamp_3__with_time_zone createdAt
  varchar_8_ emoji
  varchar_128_ id
  varchar_36_ parentAgentId
  varchar_128_ parentThreadId
  varchar_255_ projectId FK
  integer sessionNumber
  varchar_32_ taskId
  varchar_36_ taskVersionId FK
  varchar_255_ title
  integer totalCompletionTokens
  double_precision totalCost
  integer totalDuration
  integer totalPromptTokens
  timestamp_3__with_time_zone updatedAt
}
"public.agent_files" {
  varchar_36_ agentId FK
  text binaryDataId
  timestamp_3__with_time_zone createdAt
  varchar_255_ fileName
  integer fileSizeBytes
  varchar_16_ id
  varchar_255_ mimeType
  text storageKey
  varchar_2_ storedAt
  timestamp_3__with_time_zone updatedAt
}
"public.agent_task_definition" {
  varchar_36_ agentId FK
  timestamp_3__with_time_zone createdAt
  varchar_128_ cronExpression
  varchar_32_ id
  varchar_128_ name
  text objective
  varchar_64_ timezone
  timestamp_3__with_time_zone updatedAt
}
"public.agent_task_run_lock" {
  varchar_36_ agentId FK
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone heldUntil
  uuid holderId
  varchar_32_ taskId
  timestamp_3__with_time_zone updatedAt
}
"public.agent_workflow_dependency" {
  varchar_36_ agentId FK
  timestamp_3__with_time_zone createdAt
  varchar_36_ workflowId FK
}
"public.agents_memory_entries" {
  varchar_36_ agentId FK
  text content
  varchar_64_ contentHash
  timestamp_3__with_time_zone createdAt
  json embedding
  varchar_128_ embeddingModel
  varchar_36_ id
  timestamp_3__with_time_zone lastSeenAt
  json metadata
  varchar_255_ resourceId FK
  varchar_16_ status
  varchar_36_ supersededBy FK
  timestamp_3__with_time_zone updatedAt
}
"public.agents_memory_entry_cursors" {
  varchar_36_ agentId FK
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone lastIndexedObservationCreatedAt
  varchar_36_ lastIndexedObservationId
  varchar_255_ observationScopeId FK
  timestamp_3__with_time_zone updatedAt
}
"public.agents_memory_entry_locks" {
  varchar_36_ agentId FK
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone heldUntil
  varchar_64_ holderId
  varchar_255_ resourceId FK
  timestamp_3__with_time_zone updatedAt
}
"public.agents_memory_entry_sources" {
  varchar_36_ agentId FK
  timestamp_3__with_time_zone createdAt
  varchar_64_ evidenceHash
  text evidenceText
  varchar_36_ id
  varchar_36_ memoryEntryId FK
  varchar_36_ observationId FK
  varchar_255_ threadId FK
  timestamp_3__with_time_zone updatedAt
}
"public.agents_observation_cursors" {
  varchar_36_ agentId FK
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone lastObservedAt
  varchar_36_ lastObservedMessageId
  varchar_255_ observationScopeId FK
  timestamp_3__with_time_zone updatedAt
}
"public.agents_observation_locks" {
  varchar_36_ agentId FK
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone heldUntil
  varchar_64_ holderId
  varchar_255_ observationScopeId FK
  varchar_20_ taskKind
  timestamp_3__with_time_zone updatedAt
}
"public.agents_observations" {
  varchar_36_ agentId FK
  timestamp_3__with_time_zone createdAt
  varchar_36_ id
  varchar_16_ marker
  varchar_255_ observationScopeId FK
  varchar_36_ parentId FK
  varchar_16_ status
  varchar_36_ supersededBy FK
  text text
  integer tokenCount
  timestamp_3__with_time_zone updatedAt
}
"public.project" {
  timestamp_3__with_time_zone createdAt
  uuid creatorId FK
  json customTelemetryTags
  varchar_512_ description
  json icon
  varchar_36_ id
  varchar_255_ name
  varchar_36_ type
  timestamp_3__with_time_zone updatedAt
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
