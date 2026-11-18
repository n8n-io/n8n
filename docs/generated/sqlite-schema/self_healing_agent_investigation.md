# self_healing_agent_investigation

## Description

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE "self_healing_agent_investigation" ("id" varchar(36) PRIMARY KEY NOT NULL, "configurationId" integer NOT NULL, "projectId" varchar(36) NOT NULL, "agentId" varchar(36) NOT NULL, "backgroundUserId" varchar NOT NULL, "trigger" varchar(16) NOT NULL, "agentVersionId" varchar(36) NOT NULL, "traceWindowStart" datetime(3), "traceWindowEnd" datetime(3) NOT NULL, "traceCount" integer NOT NULL DEFAULT (0), "threadId" varchar NOT NULL, "runId" varchar NOT NULL, "outcome" varchar(16), "failureReason" varchar(64), "usage" text, "resultId" varchar(36), "finishedAt" datetime(3), "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), CONSTRAINT "CHK_self_healing_agent_investigation_trigger" CHECK ("trigger" IN ('schedule', 'traces', 'both', 'manual')), CONSTRAINT "CHK_self_healing_agent_investigation_outcome" CHECK ("outcome" IN ('proposal', 'no_change', 'failed')), CONSTRAINT "FK_f2116e85bbc7264d3bfaa2bdc03" FOREIGN KEY ("configurationId") REFERENCES "self_healing_configuration" ("id") ON DELETE CASCADE, CONSTRAINT "FK_39adf98543c36288a3dd6607023" FOREIGN KEY ("projectId") REFERENCES "project" ("id") ON DELETE CASCADE, CONSTRAINT "FK_482b558ea3a6b55381dd09df0b2" FOREIGN KEY ("agentId") REFERENCES "agents" ("id") ON DELETE CASCADE, CONSTRAINT "FK_35b4b57ac83d3a248b0e5e374d9" FOREIGN KEY ("backgroundUserId") REFERENCES "user" ("id") ON DELETE CASCADE, CONSTRAINT "FK_d77ea2fc50ba1e5a7a9c61f0d8a" FOREIGN KEY ("resultId") REFERENCES "self_healing_agent_result" ("id") ON DELETE SET NULL)
```

</details>

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| agentId | varchar(36) |  | false |  | [agents](agents.md) |  |
| agentVersionId | varchar(36) |  | false |  |  |  |
| backgroundUserId | varchar |  | false |  | [user](user.md) |  |
| configurationId | INTEGER |  | false |  | [self_healing_configuration](self_healing_configuration.md) |  |
| createdAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| failureReason | varchar(64) |  | true |  |  |  |
| finishedAt | datetime(3) |  | true |  |  |  |
| id | varchar(36) |  | false |  |  |  |
| outcome | varchar(16) |  | true |  |  |  |
| projectId | varchar(36) |  | false |  | [project](project.md) |  |
| resultId | varchar(36) |  | true |  | [self_healing_agent_result](self_healing_agent_result.md) |  |
| runId | varchar |  | false |  |  |  |
| threadId | varchar |  | false |  |  |  |
| traceCount | INTEGER | 0 | false |  |  |  |
| traceWindowEnd | datetime(3) |  | false |  |  |  |
| traceWindowStart | datetime(3) |  | true |  |  |  |
| trigger | varchar(16) |  | false |  |  |  |
| updatedAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| usage | TEXT |  | true |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| - | CHECK | CHECK ("trigger" IN ('schedule', 'traces', 'both', 'manual')) |
| - | CHECK | CHECK ("outcome" IN ('proposal', 'no_change', 'failed')) |
| - (Foreign key ID: 0) | FOREIGN KEY | FOREIGN KEY (resultId) REFERENCES self_healing_agent_result (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| - (Foreign key ID: 1) | FOREIGN KEY | FOREIGN KEY (backgroundUserId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| - (Foreign key ID: 2) | FOREIGN KEY | FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| - (Foreign key ID: 3) | FOREIGN KEY | FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| - (Foreign key ID: 4) | FOREIGN KEY | FOREIGN KEY (configurationId) REFERENCES self_healing_configuration (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| id | PRIMARY KEY | PRIMARY KEY (id) |
| sqlite_autoindex_self_healing_agent_investigation_1 | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_0c4e8b5a7ebbe012c5539efb09 | CREATE INDEX "IDX_0c4e8b5a7ebbe012c5539efb09" ON "self_healing_agent_investigation" ("agentId", "createdAt")  |
| IDX_35b4b57ac83d3a248b0e5e374d | CREATE INDEX "IDX_35b4b57ac83d3a248b0e5e374d" ON "self_healing_agent_investigation" ("backgroundUserId")  |
| IDX_39adf98543c36288a3dd660702 | CREATE INDEX "IDX_39adf98543c36288a3dd660702" ON "self_healing_agent_investigation" ("projectId")  |
| IDX_d3669e4317d614069db9b66fe3 | CREATE INDEX "IDX_d3669e4317d614069db9b66fe3" ON "self_healing_agent_investigation" ("configurationId", "createdAt")  |
| IDX_d77ea2fc50ba1e5a7a9c61f0d8 | CREATE INDEX "IDX_d77ea2fc50ba1e5a7a9c61f0d8" ON "self_healing_agent_investigation" ("resultId")  |
| IDX_self_healing_agent_investigation_agentId | CREATE UNIQUE INDEX "IDX_self_healing_agent_investigation_agentId" ON "self_healing_agent_investigation" ("agentId") WHERE "finishedAt" IS NULL |
| sqlite_autoindex_self_healing_agent_investigation_1 | PRIMARY KEY (id) |

## Relations

```mermaid
erDiagram

"self_healing_agent_investigation" }o--|| "agents" : "FOREIGN KEY (agentId) REFERENCES agents (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"self_healing_agent_investigation" }o--|| "user" : "FOREIGN KEY (backgroundUserId) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"self_healing_agent_investigation" }o--|| "self_healing_configuration" : "FOREIGN KEY (configurationId) REFERENCES self_healing_configuration (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"self_healing_agent_investigation" }o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"self_healing_agent_investigation" }o--o| "self_healing_agent_result" : "FOREIGN KEY (resultId) REFERENCES self_healing_agent_result (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"

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
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
