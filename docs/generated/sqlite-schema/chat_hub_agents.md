# chat_hub_agents

## Description

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE "chat_hub_agents" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar(256) NOT NULL, "description" varchar(512), "systemPrompt" text NOT NULL, "ownerId" varchar NOT NULL, "credentialId" varchar(36), "provider" varchar(16) NOT NULL, "model" varchar(64) NOT NULL, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "icon" text, "files" text NOT NULL DEFAULT ('[]'), "suggestedPrompts" text NOT NULL DEFAULT ('[]'), CONSTRAINT "FK_9c61ad497dcbae499c96a6a78ba" FOREIGN KEY ("credentialId") REFERENCES "credentials_entity" ("id") ON DELETE SET NULL ON UPDATE NO ACTION, CONSTRAINT "FK_441ba2caba11e077ce3fbfa2cd8" FOREIGN KEY ("ownerId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)
```

</details>

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| createdAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| credentialId | varchar(36) |  | true |  | [credentials_entity](credentials_entity.md) |  |
| description | varchar(512) |  | true |  |  |  |
| files | TEXT | '[]' | false |  |  |  |
| icon | TEXT |  | true |  |  |  |
| id | varchar |  | false | [chat_hub_agent_tools](chat_hub_agent_tools.md) [chat_hub_messages](chat_hub_messages.md) [chat_hub_sessions](chat_hub_sessions.md) |  |  |
| model | varchar(64) |  | false |  |  |  |
| name | varchar(256) |  | false |  |  |  |
| ownerId | varchar |  | false |  | [user](user.md) |  |
| provider | varchar(16) |  | false |  |  |  |
| suggestedPrompts | TEXT | '[]' | false |  |  |  |
| systemPrompt | TEXT |  | false |  |  |  |
| updatedAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| - (Foreign key ID: 0) | FOREIGN KEY | FOREIGN KEY (ownerId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| - (Foreign key ID: 1) | FOREIGN KEY | FOREIGN KEY (credentialId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| id | PRIMARY KEY | PRIMARY KEY (id) |
| sqlite_autoindex_chat_hub_agents_1 | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| sqlite_autoindex_chat_hub_agents_1 | PRIMARY KEY (id) |

## Relations

```mermaid
erDiagram

"chat_hub_agents" }o--o| "credentials_entity" : "FOREIGN KEY (credentialId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"chat_hub_agent_tools" |o--|| "chat_hub_agents" : "FOREIGN KEY (agentId) REFERENCES chat_hub_agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_messages" }o--o| "chat_hub_agents" : "FOREIGN KEY (agentId) REFERENCES chat_hub_agents (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"chat_hub_sessions" }o--o| "chat_hub_agents" : "FOREIGN KEY (agentId) REFERENCES chat_hub_agents (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"chat_hub_agents" }o--|| "user" : "FOREIGN KEY (ownerId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"

"chat_hub_agents" {
  datetime_3_ createdAt
  varchar_36_ credentialId FK
  varchar_512_ description
  TEXT files
  TEXT icon
  varchar id PK
  varchar_64_ model
  varchar_256_ name
  varchar ownerId FK
  varchar_16_ provider
  TEXT suggestedPrompts
  TEXT systemPrompt
  datetime_3_ updatedAt
}
"credentials_entity" {
  datetime_3_ createdAt
  TEXT data
  varchar_36_ id PK
  boolean isGlobal
  boolean isManaged
  boolean isResolvable
  varchar_128_ name
  boolean resolvableAllowFallback
  varchar_16_ resolverId FK
  varchar_32_ type
  datetime_3_ updatedAt
}
"chat_hub_agent_tools" {
  varchar agentId PK
  varchar toolId PK
}
"chat_hub_messages" {
  varchar_36_ agentId FK
  TEXT attachments
  TEXT content
  datetime_3_ createdAt
  INTEGER executionId FK
  varchar id PK
  VARCHAR_256_ model
  varchar_128_ name
  varchar previousMessageId FK
  varchar_16_ provider
  varchar retryOfMessageId FK
  varchar revisionOfMessageId FK
  varchar sessionId FK
  varchar_16_ status
  varchar_16_ type
  datetime_3_ updatedAt
  varchar_36_ workflowId FK
}
"chat_hub_sessions" {
  varchar_36_ agentId FK
  varchar_128_ agentName
  datetime_3_ createdAt
  varchar_36_ credentialId FK
  varchar id PK
  datetime_3_ lastMessageAt
  varchar_64_ model
  varchar ownerId FK
  varchar_16_ provider
  varchar_256_ title
  varchar_16_ type
  datetime_3_ updatedAt
  varchar_36_ workflowId FK
}
"user" {
  datetime_3_ createdAt
  boolean disabled
  varchar_255_ email
  varchar_32_ firstName
  varchar id PK
  date lastActiveAt
  varchar_32_ lastName
  boolean mfaEnabled
  TEXT mfaRecoveryCodes
  TEXT mfaSecret
  varchar password
  TEXT personalizationAnswers
  varchar_128_ roleSlug FK
  TEXT settings
  datetime_3_ updatedAt
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
