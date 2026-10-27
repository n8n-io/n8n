# skill_source

## Description

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE "skill_source" ("id" varchar PRIMARY KEY NOT NULL, "type" varchar(16) NOT NULL, "locator" text NOT NULL, "identityKey" varchar(255) NOT NULL, "projectId" varchar(36), "credentialId" varchar(36), "status" varchar(32) NOT NULL DEFAULT ('connected'), "probeCursor" text, "lastCheckedAt" datetime(3), "lastErrorReason" varchar(32), "createdById" varchar, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), CONSTRAINT "CHK_skill_source_status" CHECK ("status" IN ('connected', 'credential_expired', 'unreachable', 'delayed')), CONSTRAINT "FK_172d2de74bff36e50fef736a5e8" FOREIGN KEY ("projectId") REFERENCES "project" ("id") ON DELETE CASCADE, CONSTRAINT "FK_b3474e16029bf15a015e3f3a8d6" FOREIGN KEY ("credentialId") REFERENCES "credentials_entity" ("id") ON DELETE SET NULL, CONSTRAINT "FK_1c91a0839e34c1b48610160761e" FOREIGN KEY ("createdById") REFERENCES "user" ("id") ON DELETE SET NULL)
```

</details>

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| createdAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| createdById | varchar |  | true |  | [user](user.md) |  |
| credentialId | varchar(36) |  | true |  | [credentials_entity](credentials_entity.md) |  |
| id | varchar |  | false | [skill_source_link](skill_source_link.md) |  |  |
| identityKey | varchar(255) |  | false |  |  |  |
| lastCheckedAt | datetime(3) |  | true |  |  |  |
| lastErrorReason | varchar(32) |  | true |  |  |  |
| locator | TEXT |  | false |  |  |  |
| probeCursor | TEXT |  | true |  |  |  |
| projectId | varchar(36) |  | true |  | [project](project.md) |  |
| status | varchar(32) | 'connected' | false |  |  |  |
| type | varchar(16) |  | false |  |  |  |
| updatedAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| - | CHECK | CHECK ("status" IN ('connected', 'credential_expired', 'unreachable', 'delayed')) |
| - (Foreign key ID: 0) | FOREIGN KEY | FOREIGN KEY (createdById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| - (Foreign key ID: 1) | FOREIGN KEY | FOREIGN KEY (credentialId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| - (Foreign key ID: 2) | FOREIGN KEY | FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| id | PRIMARY KEY | PRIMARY KEY (id) |
| sqlite_autoindex_skill_source_1 | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_172d2de74bff36e50fef736a5e | CREATE INDEX "IDX_172d2de74bff36e50fef736a5e" ON "skill_source" ("projectId")  |
| IDX_skill_source_identityKey | CREATE UNIQUE INDEX "IDX_skill_source_identityKey" ON "skill_source" ("identityKey") WHERE "projectId" IS NULL |
| IDX_skill_source_identityKey_projectId | CREATE UNIQUE INDEX "IDX_skill_source_identityKey_projectId" ON "skill_source" ("identityKey", "projectId") WHERE "projectId" IS NOT NULL |
| sqlite_autoindex_skill_source_1 | PRIMARY KEY (id) |

## Relations

```mermaid
erDiagram

"skill_source" }o--o| "user" : "FOREIGN KEY (createdById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"skill_source" }o--o| "credentials_entity" : "FOREIGN KEY (credentialId) REFERENCES credentials_entity (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"skill_source_link" }o--|| "skill_source" : "FOREIGN KEY (sourceId) REFERENCES skill_source (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"skill_source" }o--o| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"

"skill_source" {
  datetime_3_ createdAt
  varchar createdById FK
  varchar_36_ credentialId FK
  varchar id PK
  varchar_255_ identityKey
  datetime_3_ lastCheckedAt
  varchar_32_ lastErrorReason
  TEXT locator
  TEXT probeCursor
  varchar_36_ projectId FK
  varchar_32_ status
  varchar_16_ type
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
"credentials_entity" {
  datetime_3_ createdAt
  TEXT data
  TEXT description
  varchar_36_ id PK
  boolean isGlobal
  boolean isManaged
  boolean isResolvable
  varchar_128_ name
  DATETIME pendingAuthorizationExpiresAt
  boolean resolvableAllowFallback
  varchar_16_ resolverId FK
  varchar_32_ type
  datetime_3_ updatedAt
  VARCHAR_16_ usageScope
}
"skill_source_link" {
  varchar_64_ baseContentHash
  varchar_255_ baseRevision
  datetime_3_ createdAt
  TEXT pendingContent
  varchar_64_ pendingContentHash
  varchar_255_ pendingRevision
  TEXT pendingScan
  TEXT remoteRef
  varchar_36_ skillId PK
  varchar_64_ skippedContentHash
  TEXT skippedFiles
  varchar sourceId FK
  varchar_32_ state
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
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
