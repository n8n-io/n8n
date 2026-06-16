# public.chat_hub_agents

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| id | uuid |  | false | [public.chat_hub_sessions](public.chat_hub_sessions.md) [public.chat_hub_messages](public.chat_hub_messages.md) [public.chat_hub_agent_tools](public.chat_hub_agent_tools.md) |  |  |
| name | varchar(256) |  | false |  |  |  |
| description | varchar(512) |  | true |  |  |  |
| systemPrompt | text |  | false |  |  |  |
| ownerId | uuid |  | false |  | [public.user](public.user.md) |  |
| credentialId | varchar(36) |  | true |  | [public.credentials_entity](public.credentials_entity.md) |  |
| provider | varchar(16) |  | false |  |  | ChatHubProvider enum: "openai", "anthropic", "google", "n8n" |
| model | varchar(64) |  | false |  |  | Model name used at the respective Model node, ie. "gpt-4" |
| createdAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |
| updatedAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |
| icon | json |  | true |  |  |  |
| files | json | '[]'::json | false |  |  |  |
| suggestedPrompts | json | '[]'::json | false |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| chat_hub_agents_createdAt_not_null | n | NOT NULL "createdAt" |
| chat_hub_agents_files_not_null | n | NOT NULL files |
| chat_hub_agents_id_not_null | n | NOT NULL id |
| chat_hub_agents_model_not_null | n | NOT NULL model |
| chat_hub_agents_name_not_null | n | NOT NULL name |
| chat_hub_agents_ownerId_not_null | n | NOT NULL "ownerId" |
| chat_hub_agents_provider_not_null | n | NOT NULL provider |
| chat_hub_agents_suggestedPrompts_not_null | n | NOT NULL "suggestedPrompts" |
| chat_hub_agents_systemPrompt_not_null | n | NOT NULL "systemPrompt" |
| chat_hub_agents_updatedAt_not_null | n | NOT NULL "updatedAt" |
| FK_441ba2caba11e077ce3fbfa2cd8 | FOREIGN KEY | FOREIGN KEY ("ownerId") REFERENCES "user"(id) ON DELETE CASCADE |
| FK_9c61ad497dcbae499c96a6a78ba | FOREIGN KEY | FOREIGN KEY ("credentialId") REFERENCES credentials_entity(id) ON DELETE SET NULL |
| PK_f39a3b36bbdf0e2979ddb21cf78 | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| PK_f39a3b36bbdf0e2979ddb21cf78 | CREATE UNIQUE INDEX "PK_f39a3b36bbdf0e2979ddb21cf78" ON public.chat_hub_agents USING btree (id) |

## Relations

```mermaid
erDiagram

"public.chat_hub_sessions" }o--o| "public.chat_hub_agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES chat_hub_agents(id) ON DELETE SET NULL"
"public.chat_hub_messages" }o--o| "public.chat_hub_agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES chat_hub_agents(id) ON DELETE SET NULL"
"public.chat_hub_agent_tools" }o--|| "public.chat_hub_agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES chat_hub_agents(id) ON DELETE CASCADE"
"public.chat_hub_agents" }o--|| "public.user" : "FOREIGN KEY (#quot;ownerId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.chat_hub_agents" }o--o| "public.credentials_entity" : "FOREIGN KEY (#quot;credentialId#quot;) REFERENCES credentials_entity(id) ON DELETE SET NULL"

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
"public.chat_hub_agent_tools" {
  uuid agentId FK
  uuid toolId FK
}
"public.user" {
  uuid id
  varchar_255_ email
  varchar_32_ firstName
  varchar_32_ lastName
  varchar_255_ password
  json personalizationAnswers
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
  json settings
  boolean disabled
  boolean mfaEnabled
  text mfaSecret
  text mfaRecoveryCodes
  date lastActiveAt
  varchar_128_ roleSlug FK
}
"public.credentials_entity" {
  varchar_128_ name
  text data
  varchar_128_ type
  timestamp_3__with_time_zone createdAt
  timestamp_3__with_time_zone updatedAt
  varchar_36_ id
  boolean isManaged
  boolean isGlobal
  boolean isResolvable
  boolean resolvableAllowFallback
  varchar_16_ resolverId FK
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
