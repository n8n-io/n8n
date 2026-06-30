# agent_execution_threads

## Description

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE "agent_execution_threads" ("id" varchar(128) PRIMARY KEY NOT NULL, "agentId" varchar(36) NOT NULL, "agentName" varchar(255) NOT NULL, "projectId" varchar(255) NOT NULL, "sessionNumber" integer NOT NULL DEFAULT (0), "totalPromptTokens" integer NOT NULL DEFAULT (0), "totalCompletionTokens" integer NOT NULL DEFAULT (0), "totalCost" real NOT NULL DEFAULT (0), "totalDuration" integer NOT NULL DEFAULT (0), "title" varchar(255), "emoji" varchar(8), "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "taskId" varchar(32), "taskVersionId" varchar(36), "parentThreadId" varchar(128), "parentAgentId" varchar(36), CONSTRAINT "FK_0e2f8bf92a7a9c88b89670f701c" FOREIGN KEY ("projectId") REFERENCES "project" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_0468a9dc35597314e641d4722aa" FOREIGN KEY ("agentId") REFERENCES "agents" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_f00b52d74fe11838e1fe086deea" FOREIGN KEY ("taskVersionId") REFERENCES "agent_history" ("versionId") ON DELETE SET NULL)
```

</details>

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| agentId | varchar(36) |  | false |  | [agents](agents.md) |  |
| agentName | varchar(255) |  | false |  |  |  |
| createdAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| emoji | varchar(8) |  | true |  |  |  |
| id | varchar(128) |  | false | [agent_execution](agent_execution.md) |  |  |
| parentAgentId | varchar(36) |  | true |  |  |  |
| parentThreadId | varchar(128) |  | true |  |  |  |
| projectId | varchar(255) |  | false |  | [project](project.md) |  |
| sessionNumber | INTEGER | 0 | false |  |  |  |
| taskId | varchar(32) |  | true |  |  |  |
| taskVersionId | varchar(36) |  | true |  | [agent_history](agent_history.md) |  |
| title | varchar(255) |  | true |  |  |  |
| totalCompletionTokens | INTEGER | 0 | false |  |  |  |
| totalCost | REAL | 0 | false |  |  |  |
| totalDuration | INTEGER | 0 | false |  |  |  |
| totalPromptTokens | INTEGER | 0 | false |  |  |  |
| updatedAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| - (Foreign key ID: 0) | FOREIGN KEY | FOREIGN KEY (taskVersionId) REFERENCES agent_history (versionId) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| - (Foreign key ID: 1) | FOREIGN KEY | FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| - (Foreign key ID: 2) | FOREIGN KEY | FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| id | PRIMARY KEY | PRIMARY KEY (id) |
| sqlite_autoindex_agent_execution_threads_1 | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_0468a9dc35597314e641d4722a | CREATE INDEX "IDX_0468a9dc35597314e641d4722a" ON "agent_execution_threads" ("agentId")  |
| IDX_0e2f8bf92a7a9c88b89670f701 | CREATE INDEX "IDX_0e2f8bf92a7a9c88b89670f701" ON "agent_execution_threads" ("projectId")  |
| IDX_agent_execution_threads_taskVersionId | CREATE INDEX "IDX_agent_execution_threads_taskVersionId" ON "agent_execution_threads" ("taskVersionId")  |
| sqlite_autoindex_agent_execution_threads_1 | PRIMARY KEY (id) |

## Relations

```mermaid
erDiagram

"agent_execution_threads" }o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agent_execution" }o--|| "agent_execution_threads" : "FOREIGN KEY (threadId) REFERENCES agent_execution_threads (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agent_execution_threads" }o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agent_execution_threads" }o--o| "agent_history" : "FOREIGN KEY (taskVersionId) REFERENCES agent_history (versionId) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"

"agent_execution_threads" {
  varchar_36_ agentId FK
  varchar_255_ agentName
  datetime_3_ createdAt
  varchar_8_ emoji
  varchar_128_ id PK
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
"agents" {
  varchar_36_ activeVersionId FK
  datetime_3_ createdAt
  varchar_36_ id PK
  TEXT integrations
  varchar_128_ name
  varchar_255_ projectId FK
  TEXT schema
  TEXT skills
  TEXT tools
  datetime_3_ updatedAt
  varchar_36_ versionId
}
"agent_execution" {
  INTEGER completionTokens
  REAL cost
  datetime_3_ createdAt
  INTEGER duration
  TEXT error
  varchar_16_ hitlStatus
  varchar_36_ id PK
  varchar_255_ model
  INTEGER promptTokens
  varchar_32_ source
  datetime_3_ startedAt
  varchar_16_ status
  datetime_3_ stoppedAt
  varchar_128_ threadId FK
  TEXT timeline
  INTEGER totalTokens
  datetime_3_ updatedAt
  TEXT userMessage
}
"project" {
  datetime_3_ createdAt
  varchar creatorId FK
  TEXT customTelemetryTags
  varchar_512_ description
  TEXT icon
  varchar_36_ id PK
  varchar_255_ name
  varchar_36_ type
  datetime_3_ updatedAt
}
"agent_history" {
  varchar_36_ agentId FK
  varchar_255_ author
  datetime_3_ createdAt
  varchar publishedById FK
  TEXT schema
  TEXT skills
  TEXT tools
  datetime_3_ updatedAt
  varchar_36_ versionId PK
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
