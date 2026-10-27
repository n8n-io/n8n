# self_healing_configuration

## Description

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE "self_healing_configuration" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "projectId" varchar(36) NOT NULL, "scope" varchar(16) NOT NULL, "enabled" boolean NOT NULL DEFAULT (false), "enabledById" varchar, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), CONSTRAINT "CHK_self_healing_configuration_scope" CHECK ("scope" IN ('all', 'selected')), CONSTRAINT "FK_0a8f9425ffdc01cce5876bc6247" FOREIGN KEY ("projectId") REFERENCES "project" ("id") ON DELETE CASCADE, CONSTRAINT "FK_2b04620d7af4060ba89412123ea" FOREIGN KEY ("enabledById") REFERENCES "user" ("id") ON DELETE SET NULL)
```

</details>

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| createdAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| enabled | boolean | false | false |  |  |  |
| enabledById | varchar |  | true |  | [user](user.md) |  |
| id | INTEGER |  | false | [self_healing_configuration_reviewer](self_healing_configuration_reviewer.md) [self_healing_configuration_workflow](self_healing_configuration_workflow.md) [self_healing_investigation](self_healing_investigation.md) [self_healing_result](self_healing_result.md) |  |  |
| projectId | varchar(36) |  | false |  | [project](project.md) |  |
| scope | varchar(16) |  | false |  |  |  |
| updatedAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| - | CHECK | CHECK ("scope" IN ('all', 'selected')) |
| - (Foreign key ID: 0) | FOREIGN KEY | FOREIGN KEY (enabledById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| - (Foreign key ID: 1) | FOREIGN KEY | FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| id | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_0a8f9425ffdc01cce5876bc624 | CREATE INDEX "IDX_0a8f9425ffdc01cce5876bc624" ON "self_healing_configuration" ("projectId")  |
| IDX_2b04620d7af4060ba89412123e | CREATE INDEX "IDX_2b04620d7af4060ba89412123e" ON "self_healing_configuration" ("enabledById")  |
| IDX_self_healing_configuration_projectId | CREATE UNIQUE INDEX "IDX_self_healing_configuration_projectId" ON "self_healing_configuration" ("projectId") WHERE "scope" = 'all' |

## Relations

```mermaid
erDiagram

"self_healing_configuration" }o--o| "user" : "FOREIGN KEY (enabledById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"self_healing_configuration_reviewer" |o--|| "self_healing_configuration" : "FOREIGN KEY (configurationId) REFERENCES self_healing_configuration (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"self_healing_configuration_workflow" |o--|| "self_healing_configuration" : "FOREIGN KEY (configurationId) REFERENCES self_healing_configuration (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"self_healing_investigation" }o--|| "self_healing_configuration" : "FOREIGN KEY (configurationId) REFERENCES self_healing_configuration (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"self_healing_result" }o--|| "self_healing_configuration" : "FOREIGN KEY (configurationId) REFERENCES self_healing_configuration (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"self_healing_configuration" }o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"

"self_healing_configuration" {
  datetime_3_ createdAt
  boolean enabled
  varchar enabledById FK
  INTEGER id
  varchar_36_ projectId FK
  varchar_16_ scope
  datetime_3_ updatedAt
}
"user" {
  datetime_3_ createdAt
  boolean disabled
  varchar_255_ email
  varchar_32_ firstName
  varchar id PK
  VARCHAR_16_ kind
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
"self_healing_configuration_reviewer" {
  INTEGER configurationId PK
  varchar userId PK
}
"self_healing_configuration_workflow" {
  INTEGER configurationId PK
  varchar_36_ projectId FK
  varchar_36_ workflowId PK
}
"self_healing_investigation" {
  varchar backgroundUserId FK
  INTEGER configurationId FK
  datetime_3_ createdAt
  varchar_36_ executionId
  datetime_3_ finishedAt
  varchar_36_ id PK
  varchar_36_ projectId FK
  varchar_36_ publishedVersionId
  varchar_36_ resultId FK
  varchar runId
  varchar threadId
  datetime_3_ updatedAt
  varchar_36_ workflowId FK
}
"self_healing_result" {
  varchar backgroundUserId FK
  datetime_3_ completedAt
  INTEGER configurationId FK
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
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
