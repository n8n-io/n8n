# evaluation_collection

## Description

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE "evaluation_collection" ("id" varchar(36) PRIMARY KEY NOT NULL, "name" varchar(128) NOT NULL, "description" text, "workflowId" varchar(36) NOT NULL, "evaluationConfigId" varchar(36) NOT NULL, "createdById" varchar, "insightsCache" text, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), CONSTRAINT "FK_a48ce930c3bc7604894b8f0eaad" FOREIGN KEY ("workflowId") REFERENCES "workflow_entity" ("id") ON DELETE CASCADE, CONSTRAINT "FK_d634a0c93fd7de68a87eab951b2" FOREIGN KEY ("evaluationConfigId") REFERENCES "evaluation_config" ("id") ON DELETE CASCADE, CONSTRAINT "FK_f4561f38b5a22a4f090d5cd3eae" FOREIGN KEY ("createdById") REFERENCES "user" ("id") ON DELETE SET NULL)
```

</details>

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| createdAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| createdById | varchar |  | true |  | [user](user.md) |  |
| description | TEXT |  | true |  |  |  |
| evaluationConfigId | varchar(36) |  | false |  | [evaluation_config](evaluation_config.md) |  |
| id | varchar(36) |  | false | [test_run](test_run.md) |  |  |
| insightsCache | TEXT |  | true |  |  |  |
| name | varchar(128) |  | false |  |  |  |
| updatedAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| workflowId | varchar(36) |  | false |  | [workflow_entity](workflow_entity.md) |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| - (Foreign key ID: 0) | FOREIGN KEY | FOREIGN KEY (createdById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| - (Foreign key ID: 1) | FOREIGN KEY | FOREIGN KEY (evaluationConfigId) REFERENCES evaluation_config (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| - (Foreign key ID: 2) | FOREIGN KEY | FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| id | PRIMARY KEY | PRIMARY KEY (id) |
| sqlite_autoindex_evaluation_collection_1 | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_a48ce930c3bc7604894b8f0eaa | CREATE INDEX "IDX_a48ce930c3bc7604894b8f0eaa" ON "evaluation_collection" ("workflowId")  |
| IDX_d634a0c93fd7de68a87eab951b | CREATE INDEX "IDX_d634a0c93fd7de68a87eab951b" ON "evaluation_collection" ("evaluationConfigId")  |
| sqlite_autoindex_evaluation_collection_1 | PRIMARY KEY (id) |

## Relations

```mermaid
erDiagram

"evaluation_collection" }o--o| "user" : "FOREIGN KEY (createdById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"evaluation_collection" }o--|| "evaluation_config" : "FOREIGN KEY (evaluationConfigId) REFERENCES evaluation_config (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"test_run" }o--o| "evaluation_collection" : "FOREIGN KEY (collectionId) REFERENCES evaluation_collection (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"evaluation_collection" }o--|| "workflow_entity" : "FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"

"evaluation_collection" {
  datetime_3_ createdAt
  varchar createdById FK
  TEXT description
  varchar_36_ evaluationConfigId FK
  varchar_36_ id PK
  TEXT insightsCache
  varchar_128_ name
  datetime_3_ updatedAt
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
"evaluation_config" {
  datetime_3_ createdAt
  TEXT datasetRef
  varchar_32_ datasetSource
  varchar_255_ endNodeName
  varchar_36_ id PK
  varchar_64_ invalidReason
  TEXT metrics
  varchar_128_ name
  varchar_255_ startNodeName
  varchar_16_ status
  datetime_3_ updatedAt
  varchar_36_ workflowId FK
}
"test_run" {
  boolean cancelRequested
  varchar_36_ collectionId FK
  datetime_3_ completedAt
  datetime_3_ createdAt
  varchar errorCode
  TEXT errorDetails
  varchar_36_ evaluationConfigId FK
  TEXT evaluationConfigSnapshot
  varchar_36_ id PK
  TEXT metrics
  datetime_3_ runAt
  varchar_255_ runningInstanceId
  varchar status
  datetime_3_ updatedAt
  varchar_36_ workflowId FK
  varchar_36_ workflowVersionId
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
