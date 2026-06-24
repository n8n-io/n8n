# public.chat_hub_agents

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| createdAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |
| credentialId | varchar(36) |  | true |  | [public.credentials_entity](public.credentials_entity.md) |  |
| description | varchar(512) |  | true |  |  |  |
| files | json | '[]'::json | false |  |  |  |
| icon | json |  | true |  |  |  |
| id | uuid |  | false | [public.chat_hub_agent_tools](public.chat_hub_agent_tools.md) [public.chat_hub_messages](public.chat_hub_messages.md) [public.chat_hub_sessions](public.chat_hub_sessions.md) |  |  |
| model | varchar(64) |  | false |  |  | Model name used at the respective Model node, ie. "gpt-4" |
| name | varchar(256) |  | false |  |  |  |
| ownerId | uuid |  | false |  | [public.user](public.user.md) |  |
| provider | varchar(16) |  | false |  |  | ChatHubProvider enum: "openai", "anthropic", "google", "n8n" |
| suggestedPrompts | json | '[]'::json | false |  |  |  |
| systemPrompt | text |  | false |  |  |  |
| updatedAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| FK_441ba2caba11e077ce3fbfa2cd8 | FOREIGN KEY | FOREIGN KEY ("ownerId") REFERENCES "user"(id) ON DELETE CASCADE |
| FK_9c61ad497dcbae499c96a6a78ba | FOREIGN KEY | FOREIGN KEY ("credentialId") REFERENCES credentials_entity(id) ON DELETE SET NULL |
| PK_f39a3b36bbdf0e2979ddb21cf78 | PRIMARY KEY | PRIMARY KEY (id) |
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

## Indexes

| Name | Definition |
| ---- | ---------- |
| PK_f39a3b36bbdf0e2979ddb21cf78 | CREATE UNIQUE INDEX "PK_f39a3b36bbdf0e2979ddb21cf78" ON public.chat_hub_agents USING btree (id) |

## Relations

```mermaid
erDiagram

"public.chat_hub_agents" }o--o| "public.credentials_entity" : "FOREIGN KEY (#quot;credentialId#quot;) REFERENCES credentials_entity(id) ON DELETE SET NULL"
"public.chat_hub_agent_tools" }o--|| "public.chat_hub_agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES chat_hub_agents(id) ON DELETE CASCADE"
"public.chat_hub_messages" }o--o| "public.chat_hub_agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES chat_hub_agents(id) ON DELETE SET NULL"
"public.chat_hub_sessions" }o--o| "public.chat_hub_agents" : "FOREIGN KEY (#quot;agentId#quot;) REFERENCES chat_hub_agents(id) ON DELETE SET NULL"
"public.chat_hub_agents" }o--|| "public.user" : "FOREIGN KEY (#quot;ownerId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"

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
"public.chat_hub_agent_tools" {
  uuid agentId FK
  uuid toolId FK
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
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
