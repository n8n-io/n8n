# self_healing_result

## Description

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE "self_healing_result" ("id" varchar(36) PRIMARY KEY NOT NULL, "workflowId" varchar(36) NOT NULL, "projectId" varchar(36) NOT NULL, "backgroundUserId" varchar NOT NULL, "outcome" varchar(16) NOT NULL, "summary" text NOT NULL, "report" text NOT NULL, "completedAt" datetime(3) NOT NULL, "executionId" varchar(36) NOT NULL, "suggestionId" varchar(36), "usage" text NOT NULL, "dismissedAt" datetime(3), "dismissedById" varchar, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "continuedAt" datetime(3), "continuedById" varchar, "continuationDestination" varchar(16), "continuationThreadId" varchar, CONSTRAINT "CHK_self_healing_result_outcome" CHECK (("outcome" IN ('fix_ready', 'needs_you', 'could_not_fix'))), CONSTRAINT "CHK_self_healing_result_continuationDestination" CHECK ("continuationDestination" IN ('editor', 'chat')), CONSTRAINT "FK_98095dea3ff814d4ee37a1380e6" FOREIGN KEY ("dismissedById") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE NO ACTION, CONSTRAINT "FK_738c3c0198c5ad104645a14fdc1" FOREIGN KEY ("suggestionId") REFERENCES "workflow_suggestion" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_8366669b58b0f63a07cf2bbffcc" FOREIGN KEY ("backgroundUserId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_3cb48b62bf261b7a6da666fee2d" FOREIGN KEY ("projectId") REFERENCES "project" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_9a3fe8a8f872917949d8de1bb4a" FOREIGN KEY ("workflowId") REFERENCES "workflow_entity" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_self_healing_result_continued_by" FOREIGN KEY ("continuedById") REFERENCES "user" ("id") ON DELETE SET NULL, CONSTRAINT "FK_self_healing_result_continuation_thread" FOREIGN KEY ("continuationThreadId") REFERENCES "instance_ai_threads" ("id") ON DELETE SET NULL)
```

</details>

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| backgroundUserId | varchar |  | false |  | [user](user.md) |  |
| completedAt | datetime(3) |  | false |  |  |  |
| continuationDestination | varchar(16) |  | true |  |  |  |
| continuationThreadId | varchar |  | true |  | [instance_ai_threads](instance_ai_threads.md) |  |
| continuedAt | datetime(3) |  | true |  |  |  |
| continuedById | varchar |  | true |  | [user](user.md) |  |
| createdAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| dismissedAt | datetime(3) |  | true |  |  |  |
| dismissedById | varchar |  | true |  | [user](user.md) |  |
| executionId | varchar(36) |  | false |  |  |  |
| id | varchar(36) |  | false | [instance_ai_threads](instance_ai_threads.md) |  |  |
| outcome | varchar(16) |  | false |  |  |  |
| projectId | varchar(36) |  | false |  | [project](project.md) |  |
| report | TEXT |  | false |  |  |  |
| suggestionId | varchar(36) |  | true |  | [workflow_suggestion](workflow_suggestion.md) |  |
| summary | TEXT |  | false |  |  |  |
| updatedAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| usage | TEXT |  | false |  |  |  |
| workflowId | varchar(36) |  | false |  | [workflow_entity](workflow_entity.md) |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| - | CHECK | CHECK (("outcome" IN ('fix_ready', 'needs_you', 'could_not_fix'))) |
| - | CHECK | CHECK ("continuationDestination" IN ('editor', 'chat')) |
| - (Foreign key ID: 0) | FOREIGN KEY | FOREIGN KEY (continuationThreadId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| - (Foreign key ID: 1) | FOREIGN KEY | FOREIGN KEY (continuedById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| - (Foreign key ID: 2) | FOREIGN KEY | FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| - (Foreign key ID: 3) | FOREIGN KEY | FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| - (Foreign key ID: 4) | FOREIGN KEY | FOREIGN KEY (backgroundUserId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| - (Foreign key ID: 5) | FOREIGN KEY | FOREIGN KEY (suggestionId) REFERENCES workflow_suggestion (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| - (Foreign key ID: 6) | FOREIGN KEY | FOREIGN KEY (dismissedById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| id | PRIMARY KEY | PRIMARY KEY (id) |
| sqlite_autoindex_self_healing_result_1 | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_3cb48b62bf261b7a6da666fee2 | CREATE INDEX "IDX_3cb48b62bf261b7a6da666fee2" ON "self_healing_result" ("projectId")  |
| IDX_8366669b58b0f63a07cf2bbffc | CREATE INDEX "IDX_8366669b58b0f63a07cf2bbffc" ON "self_healing_result" ("backgroundUserId")  |
| IDX_98095dea3ff814d4ee37a1380e | CREATE INDEX "IDX_98095dea3ff814d4ee37a1380e" ON "self_healing_result" ("dismissedById")  |
| IDX_9a3fe8a8f872917949d8de1bb4 | CREATE INDEX "IDX_9a3fe8a8f872917949d8de1bb4" ON "self_healing_result" ("workflowId")  |
| IDX_self_healing_result_continuationThreadId | CREATE INDEX "IDX_self_healing_result_continuationThreadId" ON "self_healing_result" ("continuationThreadId")  |
| IDX_self_healing_result_continuedById | CREATE INDEX "IDX_self_healing_result_continuedById" ON "self_healing_result" ("continuedById")  |
| IDX_self_healing_result_suggestionId | CREATE UNIQUE INDEX "IDX_self_healing_result_suggestionId" ON "self_healing_result" ("suggestionId") WHERE "suggestionId" IS NOT NULL |
| sqlite_autoindex_self_healing_result_1 | PRIMARY KEY (id) |

## Relations

```mermaid
erDiagram

"self_healing_result" }o--|| "user" : "FOREIGN KEY (backgroundUserId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"self_healing_result" }o--o| "instance_ai_threads" : "FOREIGN KEY (continuationThreadId) REFERENCES instance_ai_threads (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"self_healing_result" }o--o| "user" : "FOREIGN KEY (continuedById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"self_healing_result" }o--o| "user" : "FOREIGN KEY (dismissedById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"instance_ai_threads" }o--o| "self_healing_result" : "FOREIGN KEY (selfHealingResultId) REFERENCES self_healing_result (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"self_healing_result" }o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"self_healing_result" }o--o| "workflow_suggestion" : "FOREIGN KEY (suggestionId) REFERENCES workflow_suggestion (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"self_healing_result" }o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"

"self_healing_result" {
  varchar backgroundUserId FK
  datetime_3_ completedAt
  varchar_16_ continuationDestination
  varchar continuationThreadId FK
  datetime_3_ continuedAt
  varchar continuedById FK
  datetime_3_ createdAt
  datetime_3_ dismissedAt
  varchar dismissedById FK
  varchar_36_ executionId
  varchar_36_ id PK
  varchar_16_ outcome
  varchar_36_ projectId FK
  TEXT report
  varchar_36_ suggestionId FK
  TEXT summary
  datetime_3_ updatedAt
  TEXT usage
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
"instance_ai_threads" {
  datetime_3_ createdAt
  varchar id PK
  TEXT metadata
  varchar_36_ projectId FK
  varchar_255_ resourceId
  varchar_36_ selfHealingResultId FK
  TEXT title
  datetime_3_ updatedAt
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
"workflow_suggestion" {
  varchar_32_ appliedAction
  varchar appliedActorId
  varchar_64_ appliedChecksum
  varchar_36_ appliedVersionId
  varchar backgroundUserId FK
  datetime_3_ closedAt
  varchar_16_ closedReason
  datetime_3_ createdAt
  TEXT expectedBaseline
  varchar_36_ id PK
  TEXT payload
  varchar_36_ projectId FK
  varchar_16_ resultKind
  varchar_16_ state
  datetime_3_ updatedAt
  varchar_36_ workflowId FK
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
