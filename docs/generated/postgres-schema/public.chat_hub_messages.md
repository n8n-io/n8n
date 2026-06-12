# public.chat_hub_messages

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| id | uuid |  | false | [public.chat_hub_messages](public.chat_hub_messages.md) |  |  |
| sessionId | uuid |  | false |  | [public.chat_hub_sessions](public.chat_hub_sessions.md) |  |
| previousMessageId | uuid |  | true |  | [public.chat_hub_messages](public.chat_hub_messages.md) |  |
| revisionOfMessageId | uuid |  | true |  | [public.chat_hub_messages](public.chat_hub_messages.md) |  |
| retryOfMessageId | uuid |  | true |  | [public.chat_hub_messages](public.chat_hub_messages.md) |  |
| type | varchar(16) |  | false |  |  | ChatHubMessageType enum: "human", "ai", "system", "tool", "generic" |
| name | varchar(128) |  | false |  |  |  |
| content | text |  | false |  |  |  |
| provider | varchar(16) |  | true |  |  | ChatHubProvider enum: "openai", "anthropic", "google", "n8n" |
| model | varchar(256) |  | true |  |  | Model name used at the respective Model node, ie. "gpt-4" |
| workflowId | varchar(36) |  | true |  | [public.workflow_entity](public.workflow_entity.md) |  |
| executionId | integer |  | true |  | [public.execution_entity](public.execution_entity.md) |  |
| createdAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |
| updatedAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |
| agentId | uuid |  | true |  | [public.chat_hub_agents](public.chat_hub_agents.md) | ID of the custom agent (if provider is "custom-agent") |
| status | varchar(16) | 'success'::character varying | false |  |  | ChatHubMessageStatus enum, eg. "success", "error", "running", "cancelled" |
| attachments | json |  | true |  |  | File attachments for the message (if any), stored as JSON. Files are stored as base64-encoded data URLs. |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| chat_hub_messages_content_not_null | n | NOT NULL content |
| chat_hub_messages_createdAt_not_null | n | NOT NULL "createdAt" |
| chat_hub_messages_id_not_null | n | NOT NULL id |
| chat_hub_messages_name_not_null | n | NOT NULL name |
| chat_hub_messages_sessionId_not_null | n | NOT NULL "sessionId" |
| chat_hub_messages_status_not_null | n | NOT NULL status |
| chat_hub_messages_type_not_null | n | NOT NULL type |
| chat_hub_messages_updatedAt_not_null | n | NOT NULL "updatedAt" |
| FK_6afb260449dd7a9b85355d4e0c9 | FOREIGN KEY | FOREIGN KEY ("executionId") REFERENCES execution_entity(id) ON DELETE SET NULL |
| FK_acf8926098f063cdbbad8497fd1 | FOREIGN KEY | FOREIGN KEY ("workflowId") REFERENCES workflow_entity(id) ON DELETE SET NULL |
| FK_e22538eb50a71a17954cd7e076c | FOREIGN KEY | FOREIGN KEY ("sessionId") REFERENCES chat_hub_sessions(id) ON DELETE CASCADE |
| FK_1f4998c8a7dec9e00a9ab15550e | FOREIGN KEY | FOREIGN KEY ("revisionOfMessageId") REFERENCES chat_hub_messages(id) ON DELETE CASCADE |
| FK_25c9736e7f769f3a005eef4b372 | FOREIGN KEY | FOREIGN KEY ("retryOfMessageId") REFERENCES chat_hub_messages(id) ON DELETE CASCADE |
| FK_e5d1fa722c5a8d38ac204746662 | FOREIGN KEY | FOREIGN KEY ("previousMessageId") REFERENCES chat_hub_messages(id) ON DELETE CASCADE |
| PK_7704a5add6baed43eef835f0bfb | PRIMARY KEY | PRIMARY KEY (id) |
| FK_chat_hub_messages_agentId | FOREIGN KEY | FOREIGN KEY ("agentId") REFERENCES chat_hub_agents(id) ON DELETE SET NULL |

## Indexes

| Name | Definition |
| ---- | ---------- |
| PK_7704a5add6baed43eef835f0bfb | CREATE UNIQUE INDEX "PK_7704a5add6baed43eef835f0bfb" ON public.chat_hub_messages USING btree (id) |
| IDX_chat_hub_messages_sessionId | CREATE INDEX "IDX_chat_hub_messages_sessionId" ON public.chat_hub_messages USING btree ("sessionId") |

## Relations

```mermaid
erDiagram

"public.chat_hub_messages" }o--o| "public.chat_hub_messages" : "FOREIGN KEY (#quot;revisionOfMessageId#quot;) REFERENCES chat_hub_messages(id) ON DELETE CASCADE"
"public.chat_hub_messages" }o--o| "public.chat_hub_messages" : "FOREIGN KEY (#quot;retryOfMessageId#quot;) REFERENCES chat_hub_messages(id) ON DELETE CASCADE"
"public.chat_hub_messages" }o--o| "public.chat_hub_messages" : "FOREIGN KEY (#quot;previousMessageId#quot;) REFERENCES chat_hub_messages(id) ON DELETE CASCADE"
"public.chat_hub_messages" }o--|| "public.chat_hub_sessions" : "FOREIGN KEY (#quot;sessionId#quot;) REFERENCES chat_hub_sessions(id) ON DELETE CASCADE"
"public.chat_hub_messages" }o--o| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE SET NULL"
"public.chat_hub_messages" }o--o| "public.execution_entity" : "FOREIGN KEY (#quot;executionId#quot;) REFERENCES execution_entity(id) ON DELETE SET NULL"
"public.chat_hub_messages" }o--o| "public.chat_hub_agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES chat_hub_agents(id) ON DELETE SET NULL"

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
"public.chat_hub_sessions" {
  uuid id
  varchar_256_ title
  uuid ownerId FK
  timestamp_3__with_time_zone lastMessageAt
  varchar_36_ credentialId FK
  varchar_16_ provider
  varchar_256_ model
  varchar_36_ workflowId FK
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
  uuid agentId FK
  varchar_128_ agentName
  varchar_16_ type
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
"public.chat_hub_agents" {
  uuid id
  varchar_256_ name
  varchar_512_ description
  text systemPrompt
  uuid ownerId FK
  varchar_36_ credentialId FK
  varchar_16_ provider
  varchar_64_ model
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
  json icon
  json files
  json suggestedPrompts
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
