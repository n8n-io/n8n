# project

## Description

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE "project" ("id" varchar(36) PRIMARY KEY NOT NULL, "name" varchar(255) NOT NULL, "type" varchar(36) NOT NULL, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "icon" text, "description" varchar(512), "creatorId" varchar, "customTelemetryTags" text NOT NULL DEFAULT ('[]'), CONSTRAINT "projects_creatorId_foreign" FOREIGN KEY ("creatorId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE NO ACTION)
```

</details>

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| createdAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| creatorId | varchar |  | true |  | [user](user.md) |  |
| customTelemetryTags | TEXT | '[]' | false |  |  |  |
| description | varchar(512) |  | true |  |  |  |
| icon | TEXT |  | true |  |  |  |
| id | varchar(36) |  | false | [agent_execution_threads](agent_execution_threads.md) [agents](agents.md) [data_table](data_table.md) [folder](folder.md) [insights_metadata](insights_metadata.md) [instance_ai_threads](instance_ai_threads.md) [project_relation](project_relation.md) [project_secrets_provider_access](project_secrets_provider_access.md) [role_mapping_rule_project](role_mapping_rule_project.md) [shared_credentials](shared_credentials.md) [shared_workflow](shared_workflow.md) [variables](variables.md) |  |  |
| name | varchar(255) |  | false |  |  |  |
| type | varchar(36) |  | false |  |  |  |
| updatedAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| - (Foreign key ID: 0) | FOREIGN KEY | FOREIGN KEY (creatorId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| id | PRIMARY KEY | PRIMARY KEY (id) |
| sqlite_autoindex_project_1 | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| sqlite_autoindex_project_1 | PRIMARY KEY (id) |

## Relations

```mermaid
erDiagram

"project" }o--o| "user" : "FOREIGN KEY (creatorId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"agent_execution_threads" }o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agents" }o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"data_table" }o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"folder" }o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"insights_metadata" }o--o| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"instance_ai_threads" }o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"project_relation" |o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"project_secrets_provider_access" |o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"role_mapping_rule_project" |o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"shared_credentials" |o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"shared_workflow" |o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"variables" }o--o| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"

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
"data_table" {
  datetime_3_ createdAt
  varchar_36_ id PK
  varchar_128_ name
  varchar_36_ projectId FK
  datetime_3_ updatedAt
}
"folder" {
  datetime_3_ createdAt
  varchar_36_ id PK
  varchar_128_ name
  varchar_36_ parentFolderId FK
  varchar_36_ projectId FK
  datetime_3_ updatedAt
}
"insights_metadata" {
  INTEGER metaId
  varchar_36_ projectId FK
  varchar_255_ projectName
  varchar_16_ workflowId FK
  varchar_128_ workflowName
}
"instance_ai_threads" {
  datetime_3_ createdAt
  varchar id PK
  TEXT metadata
  varchar_36_ projectId FK
  varchar_255_ resourceId
  TEXT title
  datetime_3_ updatedAt
}
"project_relation" {
  datetime_3_ createdAt
  varchar_36_ projectId PK
  varchar role FK
  datetime_3_ updatedAt
  varchar userId PK
}
"project_secrets_provider_access" {
  datetime_3_ createdAt
  varchar_36_ projectId PK
  varchar_128_ role
  INTEGER secretsProviderConnectionId PK
  datetime_3_ updatedAt
}
"role_mapping_rule_project" {
  varchar_36_ projectId PK
  varchar_16_ roleMappingRuleId PK
}
"shared_credentials" {
  datetime_3_ createdAt
  varchar_36_ credentialsId PK
  varchar_36_ projectId PK
  TEXT role
  datetime_3_ updatedAt
}
"shared_workflow" {
  datetime_3_ createdAt
  varchar_36_ projectId PK
  TEXT role
  datetime_3_ updatedAt
  varchar_36_ workflowId PK
}
"variables" {
  varchar_36_ id PK
  TEXT key
  varchar_36_ projectId FK
  TEXT type
  TEXT value
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
