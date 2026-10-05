# self_healing_result

## Description

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE "self_healing_result" ("id" varchar(36) PRIMARY KEY NOT NULL, "workflowId" varchar(36) NOT NULL, "projectId" varchar(36) NOT NULL, "backgroundUserId" varchar NOT NULL, "outcome" varchar(16) NOT NULL, "summary" varchar(2000) NOT NULL, "report" text NOT NULL, "completedAt" datetime(3) NOT NULL, "executionId" varchar(255), "suggestionId" varchar(36), "usage" text, "dismissedAt" datetime(3), "dismissedById" varchar, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), CONSTRAINT "CHK_self_healing_result_outcome" CHECK ("outcome" IN ('fix_ready', 'needs_you', 'could_not_fix')), CONSTRAINT "FK_9a3fe8a8f872917949d8de1bb4a" FOREIGN KEY ("workflowId") REFERENCES "workflow_entity" ("id") ON DELETE CASCADE, CONSTRAINT "FK_3cb48b62bf261b7a6da666fee2d" FOREIGN KEY ("projectId") REFERENCES "project" ("id") ON DELETE CASCADE, CONSTRAINT "FK_8366669b58b0f63a07cf2bbffcc" FOREIGN KEY ("backgroundUserId") REFERENCES "user" ("id") ON DELETE CASCADE, CONSTRAINT "FK_738c3c0198c5ad104645a14fdc1" FOREIGN KEY ("suggestionId") REFERENCES "workflow_suggestion" ("id") ON DELETE CASCADE, CONSTRAINT "FK_98095dea3ff814d4ee37a1380e6" FOREIGN KEY ("dismissedById") REFERENCES "user" ("id") ON DELETE SET NULL)
```

</details>

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| backgroundUserId | varchar |  | false |  | [user](user.md) |  |
| completedAt | datetime(3) |  | false |  |  |  |
| createdAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| dismissedAt | datetime(3) |  | true |  |  |  |
| dismissedById | varchar |  | true |  | [user](user.md) |  |
| executionId | varchar(255) |  | true |  |  |  |
| id | varchar(36) |  | false |  |  |  |
| outcome | varchar(16) |  | false |  |  |  |
| projectId | varchar(36) |  | false |  | [project](project.md) |  |
| report | TEXT |  | false |  |  |  |
| suggestionId | varchar(36) |  | true |  | [workflow_suggestion](workflow_suggestion.md) |  |
| summary | varchar(2000) |  | false |  |  |  |
| updatedAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| usage | TEXT |  | true |  |  |  |
| workflowId | varchar(36) |  | false |  | [workflow_entity](workflow_entity.md) |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| - | CHECK | CHECK ("outcome" IN ('fix_ready', 'needs_you', 'could_not_fix')) |
| - (Foreign key ID: 0) | FOREIGN KEY | FOREIGN KEY (dismissedById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| - (Foreign key ID: 1) | FOREIGN KEY | FOREIGN KEY (suggestionId) REFERENCES workflow_suggestion (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| - (Foreign key ID: 2) | FOREIGN KEY | FOREIGN KEY (backgroundUserId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| - (Foreign key ID: 3) | FOREIGN KEY | FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| - (Foreign key ID: 4) | FOREIGN KEY | FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| id | PRIMARY KEY | PRIMARY KEY (id) |
| sqlite_autoindex_self_healing_result_1 | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_3cb48b62bf261b7a6da666fee2 | CREATE INDEX "IDX_3cb48b62bf261b7a6da666fee2" ON "self_healing_result" ("projectId")  |
| IDX_8366669b58b0f63a07cf2bbffc | CREATE INDEX "IDX_8366669b58b0f63a07cf2bbffc" ON "self_healing_result" ("backgroundUserId")  |
| IDX_98095dea3ff814d4ee37a1380e | CREATE INDEX "IDX_98095dea3ff814d4ee37a1380e" ON "self_healing_result" ("dismissedById")  |
| IDX_9a3fe8a8f872917949d8de1bb4 | CREATE INDEX "IDX_9a3fe8a8f872917949d8de1bb4" ON "self_healing_result" ("workflowId")  |
| IDX_self_healing_result_suggestionId | CREATE UNIQUE INDEX "IDX_self_healing_result_suggestionId" ON "self_healing_result" ("suggestionId") WHERE "suggestionId" IS NOT NULL |
| sqlite_autoindex_self_healing_result_1 | PRIMARY KEY (id) |

## Relations

```mermaid
erDiagram

"self_healing_result" }o--|| "user" : "FOREIGN KEY (backgroundUserId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"self_healing_result" }o--o| "user" : "FOREIGN KEY (dismissedById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"self_healing_result" }o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"self_healing_result" }o--o| "workflow_suggestion" : "FOREIGN KEY (suggestionId) REFERENCES workflow_suggestion (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"self_healing_result" }o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"

"self_healing_result" {
  varchar backgroundUserId FK
  datetime_3_ completedAt
  datetime_3_ createdAt
  datetime_3_ dismissedAt
  varchar dismissedById FK
  varchar_255_ executionId
  varchar_36_ id PK
  varchar_16_ outcome
  varchar_36_ projectId FK
  TEXT report
  varchar_36_ suggestionId FK
  varchar_2000_ summary
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
  TEXT appliedVersion
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
