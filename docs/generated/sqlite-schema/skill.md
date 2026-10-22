# skill

## Description

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE "skill" ("id" varchar(36) PRIMARY KEY NOT NULL, "projectId" varchar(36), "agentId" varchar(36), "source" varchar(16) NOT NULL, "createdById" varchar, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "availableToAssistant" boolean NOT NULL DEFAULT false, CONSTRAINT "CHK_skill_single_target" CHECK ("agentId" IS NULL OR "projectId" IS NULL), CONSTRAINT "FK_402ed37bff0d3134f6e782455ed" FOREIGN KEY ("projectId") REFERENCES "project" ("id") ON DELETE CASCADE, CONSTRAINT "FK_7d4fb6af107e507d9a86293cf9d" FOREIGN KEY ("agentId") REFERENCES "agents" ("id") ON DELETE CASCADE, CONSTRAINT "FK_4de4501583cd1fcd6f5ea85f547" FOREIGN KEY ("createdById") REFERENCES "user" ("id") ON DELETE SET NULL)
```

</details>

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| agentId | varchar(36) |  | true |  | [agents](agents.md) |  |
| availableToAssistant | boolean | false | false |  |  |  |
| createdAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| createdById | varchar |  | true |  | [user](user.md) |  |
| id | varchar(36) |  | false | [agent_skill_dependency](agent_skill_dependency.md) [agent_version_skill_dependency](agent_version_skill_dependency.md) [skill_version](skill_version.md) |  |  |
| projectId | varchar(36) |  | true |  | [project](project.md) |  |
| source | varchar(16) |  | false |  |  |  |
| updatedAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| - | CHECK | CHECK ("agentId" IS NULL OR "projectId" IS NULL) |
| - (Foreign key ID: 0) | FOREIGN KEY | FOREIGN KEY (createdById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| - (Foreign key ID: 1) | FOREIGN KEY | FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| - (Foreign key ID: 2) | FOREIGN KEY | FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| id | PRIMARY KEY | PRIMARY KEY (id) |
| sqlite_autoindex_skill_1 | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_402ed37bff0d3134f6e782455e | CREATE INDEX "IDX_402ed37bff0d3134f6e782455e" ON "skill" ("projectId")  |
| IDX_7d4fb6af107e507d9a86293cf9 | CREATE INDEX "IDX_7d4fb6af107e507d9a86293cf9" ON "skill" ("agentId")  |
| sqlite_autoindex_skill_1 | PRIMARY KEY (id) |

## Relations

```mermaid
erDiagram

"skill" }o--o| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"skill" }o--o| "user" : "FOREIGN KEY (createdById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"agent_skill_dependency" |o--|| "skill" : "FOREIGN KEY (skillId) REFERENCES skill (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"agent_version_skill_dependency" |o--|| "skill" : "FOREIGN KEY (skillId) REFERENCES skill (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"skill_version" }o--|| "skill" : "FOREIGN KEY (skillId) REFERENCES skill (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"skill" }o--o| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"

"skill" {
  varchar_36_ agentId FK
  boolean availableToAssistant
  datetime_3_ createdAt
  varchar createdById FK
  varchar_36_ id PK
  varchar_36_ projectId FK
  varchar_16_ source
  datetime_3_ updatedAt
}
"agents" {
  varchar_36_ activeVersionId FK
  boolean availableInMCP
  datetime_3_ createdAt
  varchar_36_ id PK
  TEXT integrations
  varchar_128_ name
  varchar_255_ projectId FK
  INTEGER revision
  TEXT schema
  varchar_16_ scope
  datetime_3_ setupCompletedAt
  TEXT skills
  TEXT tools
  datetime_3_ updatedAt
  varchar_36_ versionId
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
"agent_skill_dependency" {
  varchar_36_ agentId PK
  datetime_3_ createdAt
  varchar_36_ skillId PK
  varchar skillVersionId FK
}
"agent_version_skill_dependency" {
  varchar_36_ agentVersionId PK
  datetime_3_ createdAt
  varchar_36_ skillId PK
  varchar skillVersionId FK
}
"skill_version" {
  varchar_64_ contentHash
  datetime_3_ createdAt
  varchar createdById FK
  varchar_1024_ description
  TEXT frontmatter
  varchar id PK
  TEXT instructions
  varchar_128_ name
  varchar_36_ skillId FK
  datetime_3_ updatedAt
  INTEGER version
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
