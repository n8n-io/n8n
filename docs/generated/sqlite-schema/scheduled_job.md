# scheduled_job

## Description

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE "scheduled_job" ("id" integer PRIMARY KEY NOT NULL, "name" varchar(255), "workflowId" varchar(36), "nodeId" varchar(36), "taskType" varchar(128) NOT NULL, "payload" text NOT NULL DEFAULT ('{}'), "kind" varchar(16) NOT NULL, "cronExpression" varchar(255), "timezone" varchar(64), "intervalSeconds" integer, "fireAt" datetime(3), "enabled" boolean NOT NULL DEFAULT (true), "nextRunAt" datetime(3), "lastFiredAt" datetime(3), "misfirePolicy" varchar(16) NOT NULL DEFAULT ('coalesce'), "misfireGraceSeconds" integer NOT NULL DEFAULT (60), "maxAttempts" integer NOT NULL DEFAULT (1), "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), CONSTRAINT "CHK_scheduled_job_kind" CHECK ("kind" IN ('cron', 'interval', 'one_off')), CONSTRAINT "CHK_scheduled_job_misfirePolicy" CHECK ("misfirePolicy" IN ('coalesce', 'skip', 'fire_all')), CONSTRAINT "FK_scheduled_job_workflowId" FOREIGN KEY ("workflowId") REFERENCES "workflow_entity" ("id") ON DELETE CASCADE)
```

</details>

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| createdAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| cronExpression | varchar(255) |  | true |  |  |  |
| enabled | boolean | true | false |  |  |  |
| fireAt | datetime(3) |  | true |  |  |  |
| id | INTEGER |  | false | [scheduled_task](scheduled_task.md) |  |  |
| intervalSeconds | INTEGER |  | true |  |  |  |
| kind | varchar(16) |  | false |  |  |  |
| lastFiredAt | datetime(3) |  | true |  |  |  |
| maxAttempts | INTEGER | 1 | false |  |  |  |
| misfireGraceSeconds | INTEGER | 60 | false |  |  |  |
| misfirePolicy | varchar(16) | 'coalesce' | false |  |  |  |
| name | varchar(255) |  | true |  |  |  |
| nextRunAt | datetime(3) |  | true |  |  |  |
| nodeId | varchar(36) |  | true |  |  |  |
| payload | TEXT | '{}' | false |  |  |  |
| taskType | varchar(128) |  | false |  |  |  |
| timezone | varchar(64) |  | true |  |  |  |
| updatedAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| workflowId | varchar(36) |  | true |  | [workflow_entity](workflow_entity.md) |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| - | CHECK | CHECK ("kind" IN ('cron', 'interval', 'one_off')) |
| - | CHECK | CHECK ("misfirePolicy" IN ('coalesce', 'skip', 'fire_all')) |
| - (Foreign key ID: 0) | FOREIGN KEY | FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| id | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_scheduled_job_name | CREATE UNIQUE INDEX "IDX_scheduled_job_name" ON "scheduled_job" ("name") WHERE "name" IS NOT NULL |
| IDX_scheduled_job_nextRunAt | CREATE INDEX "IDX_scheduled_job_nextRunAt" ON "scheduled_job" ("nextRunAt") WHERE "enabled" = true AND "nextRunAt" IS NOT NULL |
| IDX_scheduled_job_workflowId | CREATE INDEX "IDX_scheduled_job_workflowId" ON "scheduled_job" ("workflowId")  |
| IDX_scheduled_job_workflowId_nodeId | CREATE UNIQUE INDEX "IDX_scheduled_job_workflowId_nodeId" ON "scheduled_job" ("workflowId", "nodeId") WHERE "workflowId" IS NOT NULL AND "nodeId" IS NOT NULL |

## Relations

```mermaid
erDiagram

"scheduled_task" }o--|| "scheduled_job" : "FOREIGN KEY (jobId) REFERENCES scheduled_job (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"scheduled_job" }o--o| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"

"scheduled_job" {
  datetime_3_ createdAt
  varchar_255_ cronExpression
  boolean enabled
  datetime_3_ fireAt
  INTEGER id
  INTEGER intervalSeconds
  varchar_16_ kind
  datetime_3_ lastFiredAt
  INTEGER maxAttempts
  INTEGER misfireGraceSeconds
  varchar_16_ misfirePolicy
  varchar_255_ name
  datetime_3_ nextRunAt
  varchar_36_ nodeId
  TEXT payload
  varchar_128_ taskType
  varchar_64_ timezone
  datetime_3_ updatedAt
  varchar_36_ workflowId FK
}
"scheduled_task" {
  INTEGER attempts
  varchar_255_ claimedBy
  datetime_3_ createdAt
  TEXT errorMessage
  datetime_3_ finishedAt
  INTEGER id
  INTEGER jobId FK
  INTEGER leaseEpoch
  datetime_3_ leaseExpiresAt
  INTEGER maxAttempts
  TEXT payload
  datetime_3_ runAt
  datetime_3_ scheduledFor
  datetime_3_ startedAt
  varchar_16_ status
  varchar_128_ taskType
}
"workflow_entity" {
  boolean active
  varchar_36_ activeVersionId FK
  TEXT connections
  datetime_3_ createdAt
  TEXT description
  varchar_36_ id PK
  boolean isArchived
  TEXT meta
  varchar_128_ name
  TEXT nodeGroups
  TEXT nodes
  varchar_36_ parentFolderId FK
  TEXT pinData
  TEXT settings
  varchar sourceWorkflowId
  TEXT staticData
  INTEGER triggerCount
  datetime_3_ updatedAt
  INTEGER versionCounter
  varchar_36_ versionId
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
