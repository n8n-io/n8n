# public.chat_hub_sessions

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| agentId | uuid |  | true |  | [public.chat_hub_agents](public.chat_hub_agents.md) | ID of the custom agent (if provider is "custom-agent") |
| agentName | varchar(128) |  | true |  |  | Cached name of the custom agent (if provider is "custom-agent") |
| createdAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |
| credentialId | varchar(36) |  | true |  | [public.credentials_entity](public.credentials_entity.md) |  |
| id | uuid |  | false | [public.chat_hub_messages](public.chat_hub_messages.md) [public.chat_hub_session_tools](public.chat_hub_session_tools.md) |  |  |
| lastMessageAt | timestamp(3) with time zone |  | false |  |  |  |
| model | varchar(256) |  | true |  |  | Model name used at the respective Model node, ie. "gpt-4" |
| ownerId | uuid |  | false |  | [public.user](public.user.md) |  |
| provider | varchar(16) |  | true |  |  | ChatHubProvider enum: "openai", "anthropic", "google", "n8n" |
| title | varchar(256) |  | false |  |  |  |
| type | varchar(16) | 'production'::character varying | false |  |  |  |
| updatedAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |
| workflowId | varchar(36) |  | true |  | [public.workflow_entity](public.workflow_entity.md) |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| CHK_chat_hub_sessions_type | CHECK | CHECK (((type)::text = ANY ((ARRAY['production'::character varying, 'manual'::character varying])::text[]))) |
| FK_7bc13b4c7e6afbfaf9be326c189 | FOREIGN KEY | FOREIGN KEY ("credentialId") REFERENCES credentials_entity(id) ON DELETE SET NULL |
| FK_9f9293d9f552496c40e0d1a8f80 | FOREIGN KEY | FOREIGN KEY ("workflowId") REFERENCES workflow_entity(id) ON DELETE SET NULL |
| FK_chat_hub_sessions_agentId | FOREIGN KEY | FOREIGN KEY ("agentId") REFERENCES chat_hub_agents(id) ON DELETE SET NULL |
| FK_e9ecf8ede7d989fcd18790fe36a | FOREIGN KEY | FOREIGN KEY ("ownerId") REFERENCES "user"(id) ON DELETE CASCADE |
| PK_1eafef1273c70e4464fec703412 | PRIMARY KEY | PRIMARY KEY (id) |
| chat_hub_sessions_createdAt_not_null | n | NOT NULL "createdAt" |
| chat_hub_sessions_id_not_null | n | NOT NULL id |
| chat_hub_sessions_lastMessageAt_not_null | n | NOT NULL "lastMessageAt" |
| chat_hub_sessions_ownerId_not_null | n | NOT NULL "ownerId" |
| chat_hub_sessions_title_not_null | n | NOT NULL title |
| chat_hub_sessions_type_not_null | n | NOT NULL type |
| chat_hub_sessions_updatedAt_not_null | n | NOT NULL "updatedAt" |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_chat_hub_sessions_owner_lastmsg_id | CREATE INDEX "IDX_chat_hub_sessions_owner_lastmsg_id" ON public.chat_hub_sessions USING btree ("ownerId", "lastMessageAt" DESC, id) |
| PK_1eafef1273c70e4464fec703412 | CREATE UNIQUE INDEX "PK_1eafef1273c70e4464fec703412" ON public.chat_hub_sessions USING btree (id) |

## Relations

```mermaid
erDiagram

"public.chat_hub_sessions" }o--o| "public.chat_hub_agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES chat_hub_agents(id) ON DELETE SET NULL"
"public.chat_hub_sessions" }o--o| "public.credentials_entity" : "FOREIGN KEY (#quot;credentialId#quot;) REFERENCES credentials_entity(id) ON DELETE SET NULL"
"public.chat_hub_messages" }o--|| "public.chat_hub_sessions" : "FOREIGN KEY (#quot;sessionId#quot;) REFERENCES chat_hub_sessions(id) ON DELETE CASCADE"
"public.chat_hub_session_tools" }o--|| "public.chat_hub_sessions" : "FOREIGN KEY (#quot;sessionId#quot;) REFERENCES chat_hub_sessions(id) ON DELETE CASCADE"
"public.chat_hub_sessions" }o--|| "public.user" : "FOREIGN KEY (#quot;ownerId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.chat_hub_sessions" }o--o| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE SET NULL"

"public.chat_hub_sessions" {
  uuid agentId FK
  varchar_128_ agentName
  timestamp_3__with_time_zone createdAt
  varchar_36_ credentialId FK
  uuid id
  timestamp_3__with_time_zone lastMessageAt
  varchar_256_ model
  uuid ownerId FK
  varchar_16_ provider
  varchar_256_ title
  varchar_16_ type
  timestamp_3__with_time_zone updatedAt
  varchar_36_ workflowId FK
}
"public.chat_hub_agents" {
  timestamp_3__with_time_zone createdAt
  varchar_36_ credentialId FK
  varchar_512_ description
  json files
  json icon
  uuid id
  varchar_64_ model
  varchar_256_ name
  uuid ownerId FK
  varchar_16_ provider
  json suggestedPrompts
  text systemPrompt
  timestamp_3__with_time_zone updatedAt
}
"public.credentials_entity" {
  timestamp_3__with_time_zone createdAt
  text data
  varchar_36_ id
  boolean isGlobal
  boolean isManaged
  boolean isResolvable
  varchar_128_ name
  boolean resolvableAllowFallback
  varchar_16_ resolverId FK
  varchar_128_ type
  timestamp_3__with_time_zone updatedAt
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
"public.chat_hub_session_tools" {
  uuid sessionId FK
  uuid toolId FK
}
"public.user" {
  timestamp_3__with_time_zone createdAt
  boolean disabled
  varchar_255_ email
  varchar_32_ firstName
  uuid id
  date lastActiveAt
  varchar_32_ lastName
  boolean mfaEnabled
  text mfaRecoveryCodes
  text mfaSecret
  varchar_255_ password
  json personalizationAnswers
  varchar_128_ roleSlug FK
  json settings
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
