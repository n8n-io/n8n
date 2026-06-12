# chat_hub_messages

## Description

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE "chat_hub_messages" ("id" varchar PRIMARY KEY NOT NULL, "sessionId" varchar NOT NULL, "previousMessageId" varchar, "revisionOfMessageId" varchar, "retryOfMessageId" varchar, "type" varchar(16) NOT NULL, "name" varchar(128) NOT NULL, "content" text NOT NULL, "provider" varchar(16), "workflowId" varchar(36), "executionId" integer, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "agentId" varchar(36), "status" varchar(16) NOT NULL DEFAULT ('success'), "attachments" text, "model" VARCHAR(256), CONSTRAINT "FK_e22538eb50a71a17954cd7e076c" FOREIGN KEY ("sessionId") REFERENCES "chat_hub_sessions" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_e5d1fa722c5a8d38ac204746662" FOREIGN KEY ("previousMessageId") REFERENCES "chat_hub_messages" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_acf8926098f063cdbbad8497fd1" FOREIGN KEY ("workflowId") REFERENCES "workflow_entity" ("id") ON DELETE SET NULL ON UPDATE NO ACTION, CONSTRAINT "FK_25c9736e7f769f3a005eef4b372" FOREIGN KEY ("retryOfMessageId") REFERENCES "chat_hub_messages" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_1f4998c8a7dec9e00a9ab15550e" FOREIGN KEY ("revisionOfMessageId") REFERENCES "chat_hub_messages" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_6afb260449dd7a9b85355d4e0c9" FOREIGN KEY ("executionId") REFERENCES "execution_entity" ("id") ON DELETE SET NULL ON UPDATE NO ACTION, CONSTRAINT "FK_chat_hub_messages_agentId" FOREIGN KEY ("agentId") REFERENCES "chat_hub_agents" ("id") ON DELETE SET NULL)
```

</details>

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| id | varchar |  | false | [chat_hub_messages](chat_hub_messages.md) |  |  |
| sessionId | varchar |  | false |  | [chat_hub_sessions](chat_hub_sessions.md) |  |
| previousMessageId | varchar |  | true |  | [chat_hub_messages](chat_hub_messages.md) |  |
| revisionOfMessageId | varchar |  | true |  | [chat_hub_messages](chat_hub_messages.md) |  |
| retryOfMessageId | varchar |  | true |  | [chat_hub_messages](chat_hub_messages.md) |  |
| type | varchar(16) |  | false |  |  |  |
| name | varchar(128) |  | false |  |  |  |
| content | TEXT |  | false |  |  |  |
| provider | varchar(16) |  | true |  |  |  |
| workflowId | varchar(36) |  | true |  | [workflow_entity](workflow_entity.md) |  |
| executionId | INTEGER |  | true |  | [execution_entity](execution_entity.md) |  |
| createdAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| updatedAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| agentId | varchar(36) |  | true |  | [chat_hub_agents](chat_hub_agents.md) |  |
| status | varchar(16) | 'success' | false |  |  |  |
| attachments | TEXT |  | true |  |  |  |
| model | VARCHAR(256) |  | true |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| id | PRIMARY KEY | PRIMARY KEY (id) |
| - (Foreign key ID: 0) | FOREIGN KEY | FOREIGN KEY (agentId) REFERENCES chat_hub_agents (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| - (Foreign key ID: 1) | FOREIGN KEY | FOREIGN KEY (executionId) REFERENCES execution_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| - (Foreign key ID: 2) | FOREIGN KEY | FOREIGN KEY (revisionOfMessageId) REFERENCES chat_hub_messages (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| - (Foreign key ID: 3) | FOREIGN KEY | FOREIGN KEY (retryOfMessageId) REFERENCES chat_hub_messages (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| - (Foreign key ID: 4) | FOREIGN KEY | FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| - (Foreign key ID: 5) | FOREIGN KEY | FOREIGN KEY (previousMessageId) REFERENCES chat_hub_messages (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| - (Foreign key ID: 6) | FOREIGN KEY | FOREIGN KEY (sessionId) REFERENCES chat_hub_sessions (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| sqlite_autoindex_chat_hub_messages_1 | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_chat_hub_messages_sessionId | CREATE INDEX "IDX_chat_hub_messages_sessionId"<br />			ON "chat_hub_messages"("sessionId") |
| sqlite_autoindex_chat_hub_messages_1 | PRIMARY KEY (id) |

## Relations

```mermaid
erDiagram

"chat_hub_messages" }o--o| "chat_hub_messages" : "FOREIGN KEY (revisionOfMessageId) REFERENCES chat_hub_messages (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_messages" }o--o| "chat_hub_messages" : "FOREIGN KEY (retryOfMessageId) REFERENCES chat_hub_messages (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_messages" }o--o| "chat_hub_messages" : "FOREIGN KEY (previousMessageId) REFERENCES chat_hub_messages (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_messages" }o--|| "chat_hub_sessions" : "FOREIGN KEY (sessionId) REFERENCES chat_hub_sessions (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"chat_hub_messages" }o--o| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"chat_hub_messages" }o--o| "execution_entity" : "FOREIGN KEY (executionId) REFERENCES execution_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"chat_hub_messages" }o--o| "chat_hub_agents" : "FOREIGN KEY (agentId) REFERENCES chat_hub_agents (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"

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
"execution_entity" {
  INTEGER id
  varchar_36_ workflowId FK
  boolean finished
  varchar mode
  varchar retryOf
  varchar retrySuccessId
  datetime startedAt
  datetime stoppedAt
  datetime waitTill
  varchar status
  datetime_3_ deletedAt
  datetime_3_ createdAt
  varchar_2_ storedAt
  TEXT tracingContext
  varchar_255_ deduplicationKey
  BIGINT jsonSizeBytes
  VARCHAR_36_ workflowVersionId
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
