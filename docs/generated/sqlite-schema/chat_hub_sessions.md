# chat_hub_sessions

## Description

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE "chat_hub_sessions" ("id" varchar PRIMARY KEY NOT NULL, "title" varchar(256) NOT NULL, "ownerId" varchar NOT NULL, "lastMessageAt" datetime(3) NOT NULL, "credentialId" varchar(36), "provider" varchar(16), "model" varchar(64), "workflowId" varchar(36), "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "agentId" varchar(36), "agentName" varchar(128), "type" varchar(16) NOT NULL DEFAULT ('production'), CONSTRAINT "CHK_chat_hub_sessions_type" CHECK ("type" IN ('production', 'manual')), CONSTRAINT "FK_chat_hub_sessions_agentId" FOREIGN KEY ("agentId") REFERENCES "chat_hub_agents" ("id") ON DELETE SET NULL ON UPDATE NO ACTION, CONSTRAINT "FK_9f9293d9f552496c40e0d1a8f80" FOREIGN KEY ("workflowId") REFERENCES "workflow_entity" ("id") ON DELETE SET NULL ON UPDATE NO ACTION, CONSTRAINT "FK_7bc13b4c7e6afbfaf9be326c189" FOREIGN KEY ("credentialId") REFERENCES "credentials_entity" ("id") ON DELETE SET NULL ON UPDATE NO ACTION, CONSTRAINT "FK_e9ecf8ede7d989fcd18790fe36a" FOREIGN KEY ("ownerId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)
```

</details>

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| id | varchar |  | false | [chat_hub_messages](chat_hub_messages.md) [chat_hub_session_tools](chat_hub_session_tools.md) |  |  |
| title | varchar(256) |  | false |  |  |  |
| ownerId | varchar |  | false |  | [user](user.md) |  |
| lastMessageAt | datetime(3) |  | false |  |  |  |
| credentialId | varchar(36) |  | true |  | [credentials_entity](credentials_entity.md) |  |
| provider | varchar(16) |  | true |  |  |  |
| model | varchar(64) |  | true |  |  |  |
| workflowId | varchar(36) |  | true |  | [workflow_entity](workflow_entity.md) |  |
| createdAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| updatedAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| agentId | varchar(36) |  | true |  | [chat_hub_agents](chat_hub_agents.md) |  |
| agentName | varchar(128) |  | true |  |  |  |
| type | varchar(16) | 'production' | false |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| id | PRIMARY KEY | PRIMARY KEY (id) |
| - (Foreign key ID: 0) | FOREIGN KEY | FOREIGN KEY (ownerId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| - (Foreign key ID: 1) | FOREIGN KEY | FOREIGN KEY (credentialId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| - (Foreign key ID: 2) | FOREIGN KEY | FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| - (Foreign key ID: 3) | FOREIGN KEY | FOREIGN KEY (agentId) REFERENCES chat_hub_agents (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| sqlite_autoindex_chat_hub_sessions_1 | PRIMARY KEY | PRIMARY KEY (id) |
| - | CHECK | CHECK ("type" IN ('production', 'manual')) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| sqlite_autoindex_chat_hub_sessions_1 | PRIMARY KEY (id) |

## Relations

```mermaid
erDiagram

"chat_hub_messages" }o--|| "chat_hub_sessions" : "FOREIGN KEY (sessionId) REFERENCES chat_hub_sessions (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_session_tools" |o--|| "chat_hub_sessions" : "FOREIGN KEY (sessionId) REFERENCES chat_hub_sessions (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_sessions" }o--|| "user" : "FOREIGN KEY (ownerId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_sessions" }o--o| "credentials_entity" : "FOREIGN KEY (credentialId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"chat_hub_sessions" }o--o| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"chat_hub_sessions" }o--o| "chat_hub_agents" : "FOREIGN KEY (agentId) REFERENCES chat_hub_agents (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"

"chat_hub_sessions" {
  varchar id PK
  varchar_256_ title
  varchar ownerId FK
  datetime_3_ lastMessageAt
  varchar_36_ credentialId FK
  varchar_16_ provider
  varchar_64_ model
  varchar_36_ workflowId FK
  datetime_3_ createdAt
  datetime_3_ updatedAt
  varchar_36_ agentId FK
  varchar_128_ agentName
  varchar_16_ type
}
"chat_hub_messages" {
  varchar id PK
  varchar sessionId FK
  varchar previousMessageId FK
  varchar revisionOfMessageId FK
  varchar retryOfMessageId FK
  varchar_16_ type
  varchar_128_ name
  TEXT content
  varchar_16_ provider
  varchar_36_ workflowId FK
  INTEGER executionId FK
  datetime_3_ createdAt
  datetime_3_ updatedAt
  varchar_36_ agentId FK
  varchar_16_ status
  TEXT attachments
  VARCHAR_256_ model
}
"chat_hub_session_tools" {
  varchar sessionId PK
  varchar toolId PK
}
"user" {
  varchar id PK
  varchar_255_ email
  varchar_32_ firstName
  varchar_32_ lastName
  varchar password
  TEXT personalizationAnswers
  datetime_3_ createdAt
  datetime_3_ updatedAt
  TEXT settings
  boolean disabled
  boolean mfaEnabled
  TEXT mfaSecret
  TEXT mfaRecoveryCodes
  date lastActiveAt
  varchar_128_ roleSlug FK
}
"credentials_entity" {
  varchar_36_ id PK
  varchar_128_ name
  TEXT data
  varchar_32_ type
  datetime_3_ createdAt
  datetime_3_ updatedAt
  boolean isManaged
  boolean isGlobal
  boolean isResolvable
  boolean resolvableAllowFallback
  varchar_16_ resolverId FK
}
"workflow_entity" {
  varchar_36_ id PK
  varchar_128_ name
  boolean active
  TEXT nodes
  TEXT connections
  TEXT settings
  TEXT staticData
  TEXT pinData
  varchar_36_ versionId
  INTEGER triggerCount
  TEXT meta
  varchar_36_ parentFolderId FK
  datetime_3_ createdAt
  datetime_3_ updatedAt
  boolean isArchived
  INTEGER versionCounter
  TEXT description
  varchar_36_ activeVersionId FK
  TEXT nodeGroups
  varchar sourceWorkflowId
}
"chat_hub_agents" {
  varchar id PK
  varchar_256_ name
  varchar_512_ description
  TEXT systemPrompt
  varchar ownerId FK
  varchar_36_ credentialId FK
  varchar_16_ provider
  varchar_64_ model
  datetime_3_ createdAt
  datetime_3_ updatedAt
  TEXT icon
  TEXT files
  TEXT suggestedPrompts
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
