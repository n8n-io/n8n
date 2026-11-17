# promotion_owner_request

## Description

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE "promotion_owner_request" ("id" varchar PRIMARY KEY NOT NULL, "environmentId" varchar NOT NULL, "direction" varchar(16) NOT NULL, "resourceKind" varchar(16) NOT NULL, "resourceId" varchar(36) NOT NULL, "resourceName" varchar(255) NOT NULL, "credentialType" varchar(255), "ownerProjectId" varchar(36), "requesterId" varchar NOT NULL, "consumerWorkflowId" varchar(36) NOT NULL, "state" varchar(16) NOT NULL DEFAULT ('open'), "closeReason" varchar(16), "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), CONSTRAINT "CHK_promotion_owner_request_direction" CHECK ("direction" IN ('promote', 'apply')), CONSTRAINT "CHK_promotion_owner_request_resourceKind" CHECK ("resourceKind" IN ('credential', 'workflow')), CONSTRAINT "CHK_promotion_owner_request_state" CHECK ("state" IN ('open', 'closed')), CONSTRAINT "CHK_promotion_owner_request_closeReason" CHECK ("closeReason" IN ('dismissed', 'satisfied')), CONSTRAINT "FK_promotion_owner_request_environmentId" FOREIGN KEY ("environmentId") REFERENCES "promotion_environment" ("id") ON DELETE CASCADE, CONSTRAINT "FK_promotion_owner_request_ownerProjectId" FOREIGN KEY ("ownerProjectId") REFERENCES "project" ("id") ON DELETE CASCADE, CONSTRAINT "FK_promotion_owner_request_requesterId" FOREIGN KEY ("requesterId") REFERENCES "user" ("id") ON DELETE CASCADE)
```

</details>

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| closeReason | varchar(16) |  | true |  |  |  |
| consumerWorkflowId | varchar(36) |  | false |  |  |  |
| createdAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| credentialType | varchar(255) |  | true |  |  |  |
| direction | varchar(16) |  | false |  |  |  |
| environmentId | varchar |  | false |  | [promotion_environment](promotion_environment.md) |  |
| id | varchar |  | false |  |  |  |
| ownerProjectId | varchar(36) |  | true |  | [project](project.md) |  |
| requesterId | varchar |  | false |  | [user](user.md) |  |
| resourceId | varchar(36) |  | false |  |  |  |
| resourceKind | varchar(16) |  | false |  |  |  |
| resourceName | varchar(255) |  | false |  |  |  |
| state | varchar(16) | 'open' | false |  |  |  |
| updatedAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| - | CHECK | CHECK ("direction" IN ('promote', 'apply')) |
| - | CHECK | CHECK ("resourceKind" IN ('credential', 'workflow')) |
| - | CHECK | CHECK ("state" IN ('open', 'closed')) |
| - | CHECK | CHECK ("closeReason" IN ('dismissed', 'satisfied')) |
| - (Foreign key ID: 0) | FOREIGN KEY | FOREIGN KEY (requesterId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| - (Foreign key ID: 1) | FOREIGN KEY | FOREIGN KEY (ownerProjectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| - (Foreign key ID: 2) | FOREIGN KEY | FOREIGN KEY (environmentId) REFERENCES promotion_environment (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| id | PRIMARY KEY | PRIMARY KEY (id) |
| sqlite_autoindex_promotion_owner_request_1 | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_4b92d3c927d91c510ebf2daff4 | CREATE INDEX "IDX_4b92d3c927d91c510ebf2daff4" ON "promotion_owner_request" ("ownerProjectId")  |
| IDX_56bec58607289a17a053099bd1 | CREATE INDEX "IDX_56bec58607289a17a053099bd1" ON "promotion_owner_request" ("state", "updatedAt")  |
| IDX_8ce2788e640422dd0751517c42 | CREATE INDEX "IDX_8ce2788e640422dd0751517c42" ON "promotion_owner_request" ("environmentId")  |
| IDX_promotion_owner_request_requesterId_environmentId_direction_resourceKind_resourceId | CREATE UNIQUE INDEX "IDX_promotion_owner_request_requesterId_environmentId_direction_resourceKind_resourceId" ON "promotion_owner_request" ("requesterId", "environmentId", "direction", "resourceKind", "resourceId") WHERE "state" = 'open' |
| sqlite_autoindex_promotion_owner_request_1 | PRIMARY KEY (id) |

## Relations

```mermaid
erDiagram

"promotion_owner_request" }o--|| "promotion_environment" : "FOREIGN KEY (environmentId) REFERENCES promotion_environment (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"promotion_owner_request" }o--o| "project" : "FOREIGN KEY (ownerProjectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"promotion_owner_request" }o--|| "user" : "FOREIGN KEY (requesterId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"

"promotion_owner_request" {
  varchar_16_ closeReason
  varchar_36_ consumerWorkflowId
  datetime_3_ createdAt
  varchar_255_ credentialType
  varchar_16_ direction
  varchar environmentId FK
  varchar id PK
  varchar_36_ ownerProjectId FK
  varchar requesterId FK
  varchar_36_ resourceId
  varchar_16_ resourceKind
  varchar_255_ resourceName
  varchar_16_ state
  datetime_3_ updatedAt
}
"promotion_environment" {
  datetime_3_ createdAt
  varchar_16_ direction
  varchar id PK
  varchar_128_ name
  varchar_36_ providerId FK
  TEXT remote
  varchar_16_ scope
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
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
