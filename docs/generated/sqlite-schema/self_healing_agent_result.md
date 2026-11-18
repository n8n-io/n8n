# self_healing_agent_result

## Description

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE "self_healing_agent_result" ("id" varchar(36) PRIMARY KEY NOT NULL, "configurationId" integer NOT NULL, "projectId" varchar(36) NOT NULL, "agentId" varchar(36) NOT NULL, "agentName" varchar(255) NOT NULL, "backgroundUserId" varchar NOT NULL, "baseVersionId" varchar(36) NOT NULL, "goals" text NOT NULL, "trigger" varchar(16) NOT NULL, "traceWindowStart" datetime(3), "traceWindowEnd" datetime(3) NOT NULL, "traceCount" integer NOT NULL DEFAULT (0), "summary" varchar(255) NOT NULL, "report" text NOT NULL, "edits" text NOT NULL, "evalCases" text NOT NULL, "evidence" text, "usage" text NOT NULL, "reviewState" varchar(16) NOT NULL DEFAULT ('open'), "appliedAutomatically" boolean NOT NULL DEFAULT (false), "publishedVersionId" varchar(36), "applyProgress" text NOT NULL, "applyError" text, "applyStartedAt" datetime(3), "closedAt" datetime(3), "closedById" varchar, "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), CONSTRAINT "CHK_self_healing_agent_result_trigger" CHECK ("trigger" IN ('schedule', 'traces', 'both', 'manual')), CONSTRAINT "CHK_self_healing_agent_result_reviewState" CHECK ("reviewState" IN ('open', 'applied', 'outdated', 'dismissed')), CONSTRAINT "FK_53b5e9151f953021e746f4e5d91" FOREIGN KEY ("configurationId") REFERENCES "self_healing_configuration" ("id") ON DELETE CASCADE, CONSTRAINT "FK_1548a1c44ceaf9cc2b1e1ccd5af" FOREIGN KEY ("projectId") REFERENCES "project" ("id") ON DELETE CASCADE, CONSTRAINT "FK_8d89ad7268d4383f5ae0cba8f2c" FOREIGN KEY ("agentId") REFERENCES "agents" ("id") ON DELETE CASCADE, CONSTRAINT "FK_fd2e9d187a0a5656c275757f5b8" FOREIGN KEY ("backgroundUserId") REFERENCES "user" ("id") ON DELETE CASCADE, CONSTRAINT "FK_64ded86a7cdfd7b86b6ba4c62c6" FOREIGN KEY ("closedById") REFERENCES "user" ("id") ON DELETE SET NULL)
```

</details>

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| agentId | varchar(36) |  | false |  | [agents](agents.md) |  |
| agentName | varchar(255) |  | false |  |  |  |
| appliedAutomatically | boolean | false | false |  |  |  |
| applyError | TEXT |  | true |  |  |  |
| applyProgress | TEXT |  | false |  |  |  |
| applyStartedAt | datetime(3) |  | true |  |  |  |
| backgroundUserId | varchar |  | false |  | [user](user.md) |  |
| baseVersionId | varchar(36) |  | false |  |  |  |
| closedAt | datetime(3) |  | true |  |  |  |
| closedById | varchar |  | true |  | [user](user.md) |  |
| configurationId | INTEGER |  | false |  | [self_healing_configuration](self_healing_configuration.md) |  |
| createdAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| edits | TEXT |  | false |  |  |  |
| evalCases | TEXT |  | false |  |  |  |
| evidence | TEXT |  | true |  |  |  |
| goals | TEXT |  | false |  |  |  |
| id | varchar(36) |  | false | [self_healing_agent_investigation](self_healing_agent_investigation.md) |  |  |
| projectId | varchar(36) |  | false |  | [project](project.md) |  |
| publishedVersionId | varchar(36) |  | true |  |  |  |
| report | TEXT |  | false |  |  |  |
| reviewState | varchar(16) | 'open' | false |  |  |  |
| summary | varchar(255) |  | false |  |  |  |
| traceCount | INTEGER | 0 | false |  |  |  |
| traceWindowEnd | datetime(3) |  | false |  |  |  |
| traceWindowStart | datetime(3) |  | true |  |  |  |
| trigger | varchar(16) |  | false |  |  |  |
| updatedAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| usage | TEXT |  | false |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| - | CHECK | CHECK ("trigger" IN ('schedule', 'traces', 'both', 'manual')) |
| - | CHECK | CHECK ("reviewState" IN ('open', 'applied', 'outdated', 'dismissed')) |
| - (Foreign key ID: 0) | FOREIGN KEY | FOREIGN KEY (closedById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| - (Foreign key ID: 1) | FOREIGN KEY | FOREIGN KEY (backgroundUserId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| - (Foreign key ID: 2) | FOREIGN KEY | FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| - (Foreign key ID: 3) | FOREIGN KEY | FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| - (Foreign key ID: 4) | FOREIGN KEY | FOREIGN KEY (configurationId) REFERENCES self_healing_configuration (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| id | PRIMARY KEY | PRIMARY KEY (id) |
| sqlite_autoindex_self_healing_agent_result_1 | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_123f0219a77a572fbf899ed189 | CREATE INDEX "IDX_123f0219a77a572fbf899ed189" ON "self_healing_agent_result" ("configurationId", "updatedAt")  |
| IDX_64ded86a7cdfd7b86b6ba4c62c | CREATE INDEX "IDX_64ded86a7cdfd7b86b6ba4c62c" ON "self_healing_agent_result" ("closedById")  |
| IDX_75e15c67d53fd37fbd4148b3e3 | CREATE INDEX "IDX_75e15c67d53fd37fbd4148b3e3" ON "self_healing_agent_result" ("agentId", "reviewState")  |
| IDX_ea8248e3f1c5237fc641737150 | CREATE INDEX "IDX_ea8248e3f1c5237fc641737150" ON "self_healing_agent_result" ("projectId", "reviewState")  |
| IDX_fd2e9d187a0a5656c275757f5b | CREATE INDEX "IDX_fd2e9d187a0a5656c275757f5b" ON "self_healing_agent_result" ("backgroundUserId")  |
| sqlite_autoindex_self_healing_agent_result_1 | PRIMARY KEY (id) |

## Relations

```mermaid
erDiagram

"self_healing_agent_result" }o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"self_healing_agent_result" }o--|| "user" : "FOREIGN KEY (backgroundUserId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"self_healing_agent_result" }o--o| "user" : "FOREIGN KEY (closedById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"self_healing_agent_result" }o--|| "self_healing_configuration" : "FOREIGN KEY (configurationId) REFERENCES self_healing_configuration (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"self_healing_agent_investigation" }o--o| "self_healing_agent_result" : "FOREIGN KEY (resultId) REFERENCES self_healing_agent_result (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"self_healing_agent_result" }o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"

"self_healing_agent_result" {
  varchar_36_ agentId FK
  varchar_255_ agentName
  boolean appliedAutomatically
  TEXT applyError
  TEXT applyProgress
  datetime_3_ applyStartedAt
  varchar backgroundUserId FK
  varchar_36_ baseVersionId
  datetime_3_ closedAt
  varchar closedById FK
  INTEGER configurationId FK
  datetime_3_ createdAt
  TEXT edits
  TEXT evalCases
  TEXT evidence
  TEXT goals
  varchar_36_ id PK
  varchar_36_ projectId FK
  varchar_36_ publishedVersionId
  TEXT report
  varchar_16_ reviewState
  varchar_255_ summary
  INTEGER traceCount
  datetime_3_ traceWindowEnd
  datetime_3_ traceWindowStart
  varchar_16_ trigger
  datetime_3_ updatedAt
  TEXT usage
}
"agents" {
  varchar_36_ activeVersionId FK
  boolean availableInMCP
  datetime_3_ createdAt
  varchar_36_ id PK
  varchar identityId FK
  TEXT integrations
  boolean isArchived
  varchar_128_ name
  varchar_36_ parentFolderId FK
  varchar_255_ projectId FK
  INTEGER publicationRevision
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
"self_healing_configuration" {
  TEXT agentGoals
  VARCHAR_16_ agentPublicationMode
  INTEGER agentScheduleIntervalHours
  VARCHAR_16_ agentScope
  INTEGER agentTraceThreshold
  datetime_3_ createdAt
  boolean enabled
  varchar enabledById FK
  INTEGER id
  BOOLEAN includeAllProjectMembers
  BOOLEAN includeSubWorkflows
  varchar_36_ projectId FK
  varchar_16_ scope
  datetime_3_ updatedAt
}
"self_healing_agent_investigation" {
  varchar_36_ agentId FK
  varchar_36_ agentVersionId
  varchar backgroundUserId FK
  INTEGER configurationId FK
  datetime_3_ createdAt
  varchar_64_ failureReason
  datetime_3_ finishedAt
  varchar_36_ id PK
  varchar_16_ outcome
  varchar_36_ projectId FK
  varchar_36_ resultId FK
  varchar runId
  varchar threadId
  INTEGER traceCount
  datetime_3_ traceWindowEnd
  datetime_3_ traceWindowStart
  varchar_16_ trigger
  datetime_3_ updatedAt
  TEXT usage
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
