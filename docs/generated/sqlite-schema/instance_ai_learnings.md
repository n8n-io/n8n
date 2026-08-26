# instance_ai_learnings

## Description

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE "instance_ai_learnings" ("id" varchar(36) PRIMARY KEY NOT NULL, "projectId" varchar(36) NOT NULL, "runId" varchar(36) NOT NULL, "statement" text NOT NULL, "kind" varchar(32) NOT NULL, "appliesWhen" text NOT NULL, "confidence" real NOT NULL, "sensitivity" varchar(16) NOT NULL, "transferability" text NOT NULL, "evidence" text NOT NULL, "reviewStatus" varchar(16) NOT NULL DEFAULT ('pending'), "enabled" boolean NOT NULL DEFAULT (false), "reviewedById" varchar, "reviewedAt" datetime(3), "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), CONSTRAINT "CHK_instance_ai_learnings_kind" CHECK ("kind" IN ('preference', 'environment_fact', 'hypothesis')), CONSTRAINT "CHK_instance_ai_learnings_sensitivity" CHECK ("sensitivity" IN ('internal', 'public', 'sensitive')), CONSTRAINT "CHK_instance_ai_learnings_reviewStatus" CHECK ("reviewStatus" IN ('pending', 'approved', 'rejected')), CONSTRAINT "FK_19832b2ff8867f6ec002fc3f13d" FOREIGN KEY ("projectId") REFERENCES "project" ("id") ON DELETE CASCADE, CONSTRAINT "FK_301e08dddf4e868ed75ddc97e25" FOREIGN KEY ("runId") REFERENCES "instance_ai_learning_runs" ("id") ON DELETE CASCADE, CONSTRAINT "FK_f3e4bbc27d099db5fceb4b47257" FOREIGN KEY ("reviewedById") REFERENCES "user" ("id") ON DELETE SET NULL)
```

</details>

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| appliesWhen | TEXT |  | false |  |  |  |
| confidence | REAL |  | false |  |  |  |
| createdAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| enabled | boolean | false | false |  |  |  |
| evidence | TEXT |  | false |  |  |  |
| id | varchar(36) |  | false |  |  |  |
| kind | varchar(32) |  | false |  |  |  |
| projectId | varchar(36) |  | false |  | [project](project.md) |  |
| reviewStatus | varchar(16) | 'pending' | false |  |  |  |
| reviewedAt | datetime(3) |  | true |  |  |  |
| reviewedById | varchar |  | true |  | [user](user.md) |  |
| runId | varchar(36) |  | false |  | [instance_ai_learning_runs](instance_ai_learning_runs.md) |  |
| sensitivity | varchar(16) |  | false |  |  |  |
| statement | TEXT |  | false |  |  |  |
| transferability | TEXT |  | false |  |  |  |
| updatedAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| - | CHECK | CHECK ("kind" IN ('preference', 'environment_fact', 'hypothesis')) |
| - | CHECK | CHECK ("sensitivity" IN ('internal', 'public', 'sensitive')) |
| - | CHECK | CHECK ("reviewStatus" IN ('pending', 'approved', 'rejected')) |
| - (Foreign key ID: 0) | FOREIGN KEY | FOREIGN KEY (reviewedById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| - (Foreign key ID: 1) | FOREIGN KEY | FOREIGN KEY (runId) REFERENCES instance_ai_learning_runs (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| - (Foreign key ID: 2) | FOREIGN KEY | FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| id | PRIMARY KEY | PRIMARY KEY (id) |
| sqlite_autoindex_instance_ai_learnings_1 | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_301e08dddf4e868ed75ddc97e2 | CREATE INDEX "IDX_301e08dddf4e868ed75ddc97e2" ON "instance_ai_learnings" ("runId")  |
| IDX_89b144b5d4862d30a8e78eaa0d | CREATE INDEX "IDX_89b144b5d4862d30a8e78eaa0d" ON "instance_ai_learnings" ("projectId", "reviewStatus", "enabled")  |
| IDX_f3e4bbc27d099db5fceb4b4725 | CREATE INDEX "IDX_f3e4bbc27d099db5fceb4b4725" ON "instance_ai_learnings" ("reviewedById")  |
| sqlite_autoindex_instance_ai_learnings_1 | PRIMARY KEY (id) |

## Relations

```mermaid
erDiagram

"instance_ai_learnings" }o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"instance_ai_learnings" }o--o| "user" : "FOREIGN KEY (reviewedById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"instance_ai_learnings" }o--|| "instance_ai_learning_runs" : "FOREIGN KEY (runId) REFERENCES instance_ai_learning_runs (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"

"instance_ai_learnings" {
  TEXT appliesWhen
  REAL confidence
  datetime_3_ createdAt
  boolean enabled
  TEXT evidence
  varchar_36_ id PK
  varchar_32_ kind
  varchar_36_ projectId FK
  varchar_16_ reviewStatus
  datetime_3_ reviewedAt
  varchar reviewedById FK
  varchar_36_ runId FK
  varchar_16_ sensitivity
  TEXT statement
  TEXT transferability
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
"instance_ai_learning_runs" {
  INTEGER completedWorkflows
  datetime_3_ createdAt
  varchar createdById FK
  TEXT error
  varchar_36_ id PK
  TEXT observations
  varchar_36_ projectId FK
  varchar_16_ stage
  varchar_16_ status
  INTEGER totalWorkflows
  datetime_3_ updatedAt
  TEXT workflowIds
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
