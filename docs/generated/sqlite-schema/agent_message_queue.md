# agent_message_queue

## Description

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE "agent_message_queue" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "threadId" varchar(128) NOT NULL, "payload" text NOT NULL, "executionId" varchar(36), "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "messageId" varchar(36) NOT NULL, "steeringExecutionId" varchar(36), "steeringOrder" integer, "position" integer NOT NULL DEFAULT (0), CONSTRAINT "CHK_agent_message_queue_steering_pair" CHECK (("steeringExecutionId" IS NULL) = ("steeringOrder" IS NULL)), CONSTRAINT "FK_eff54787927c2968dc24495c911" FOREIGN KEY ("steeringExecutionId") REFERENCES "agent_execution" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_agent_message_queue_messageId" FOREIGN KEY ("messageId") REFERENCES "agents_messages" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_a74f9154a59430986112d70cb16" FOREIGN KEY ("threadId") REFERENCES "agent_execution_threads" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_2349d84b4f2a660fc264f38fef3" FOREIGN KEY ("executionId") REFERENCES "agent_execution" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)
```

</details>

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| createdAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| executionId | varchar(36) |  | true |  | [agent_execution](agent_execution.md) |  |
| id | INTEGER |  | false |  |  |  |
| messageId | varchar(36) |  | false |  | [agents_messages](agents_messages.md) |  |
| payload | TEXT |  | false |  |  |  |
| position | INTEGER | 0 | false |  |  |  |
| steeringExecutionId | varchar(36) |  | true |  | [agent_execution](agent_execution.md) |  |
| steeringOrder | INTEGER |  | true |  |  |  |
| threadId | varchar(128) |  | false |  | [agent_execution_threads](agent_execution_threads.md) |  |
| updatedAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| - | CHECK | CHECK (("steeringExecutionId" IS NULL) = ("steeringOrder" IS NULL)) |
| - (Foreign key ID: 0) | FOREIGN KEY | FOREIGN KEY (executionId) REFERENCES agent_execution (id) ON UPDATE NO ACTION ON DELETE NO ACTION MATCH NONE |
| - (Foreign key ID: 1) | FOREIGN KEY | FOREIGN KEY (threadId) REFERENCES agent_execution_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| - (Foreign key ID: 2) | FOREIGN KEY | FOREIGN KEY (messageId) REFERENCES agents_messages (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| - (Foreign key ID: 3) | FOREIGN KEY | FOREIGN KEY (steeringExecutionId) REFERENCES agent_execution (id) ON UPDATE NO ACTION ON DELETE NO ACTION MATCH NONE |
| id | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_2349d84b4f2a660fc264f38fef | CREATE INDEX "IDX_2349d84b4f2a660fc264f38fef" ON "agent_message_queue" ("executionId")  |
| IDX_agent_message_queue_messageId | CREATE UNIQUE INDEX "IDX_agent_message_queue_messageId" ON "agent_message_queue" ("messageId")  |
| IDX_agent_message_queue_steeringExecutionId_steeringOrder | CREATE UNIQUE INDEX "IDX_agent_message_queue_steeringExecutionId_steeringOrder" ON "agent_message_queue" ("steeringExecutionId", "steeringOrder") WHERE "steeringExecutionId" IS NOT NULL |
| IDX_agent_message_queue_threadId | CREATE UNIQUE INDEX "IDX_agent_message_queue_threadId" ON "agent_message_queue" ("threadId") WHERE "executionId" IS NOT NULL |
| IDX_agent_message_queue_threadId_position | CREATE INDEX "IDX_agent_message_queue_threadId_position" ON "agent_message_queue" ("threadId", "position")  |

## Relations

```mermaid
erDiagram

"agent_message_queue" }o--o| "agent_execution" : "FOREIGN KEY (executionId) REFERENCES agent_execution (id) ON UPDATE NO ACTION ON DELETE NO ACTION MATCH NONE"
"agent_message_queue" }o--|| "agents_messages" : "FOREIGN KEY (messageId) REFERENCES agents_messages (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agent_message_queue" }o--o| "agent_execution" : "FOREIGN KEY (steeringExecutionId) REFERENCES agent_execution (id) ON UPDATE NO ACTION ON DELETE NO ACTION MATCH NONE"
"agent_message_queue" }o--|| "agent_execution_threads" : "FOREIGN KEY (threadId) REFERENCES agent_execution_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"

"agent_message_queue" {
  datetime_3_ createdAt
  varchar_36_ executionId FK
  INTEGER id
  varchar_36_ messageId FK
  TEXT payload
  INTEGER position
  varchar_36_ steeringExecutionId FK
  INTEGER steeringOrder
  varchar_128_ threadId FK
  datetime_3_ updatedAt
}
"agent_execution" {
  BOOLEAN acceptsSteering
  TEXT attachments
  TEXT author
  INTEGER cacheReadTokens
  INTEGER cacheWriteTokens
  INTEGER completionTokens
  REAL cost
  datetime_3_ createdAt
  INTEGER duration
  TEXT error
  TEXT failureSummary
  varchar_16_ hitlStatus
  varchar_36_ id PK
  varchar_255_ model
  VARCHAR_36_ parentExecutionId FK
  INTEGER promptTokens
  VARCHAR_36_ rootExecutionId FK
  varchar_32_ source
  datetime_3_ startedAt
  varchar_16_ status
  datetime_3_ stoppedAt
  varchar_2_ storedAt
  varchar_128_ threadId FK
  TEXT timeline
  INTEGER totalTokens
  datetime_3_ updatedAt
  TEXT userMessage
}
"agents_messages" {
  TEXT author
  TEXT content
  datetime_3_ createdAt
  varchar_36_ id PK
  TEXT modelContent
  DATETIME modelContextAt
  TEXT origin
  varchar_255_ resourceId
  varchar_36_ role
  varchar_255_ threadId FK
  varchar_36_ type
  datetime_3_ updatedAt
}
"agent_execution_threads" {
  varchar_16_ accessScope
  varchar_36_ agentId FK
  varchar_255_ agentName
  datetime_3_ createdAt
  varchar_8_ emoji
  varchar_128_ id PK
  varchar ownerId FK
  varchar_36_ parentAgentId
  varchar_128_ parentThreadId
  varchar_255_ projectId FK
  INTEGER sessionNumber
  varchar_32_ taskId
  varchar_36_ taskVersionId FK
  varchar_255_ title
  INTEGER totalCompletionTokens
  REAL totalCost
  INTEGER totalDuration
  INTEGER totalPromptTokens
  datetime_3_ updatedAt
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
