# workflow_review_request

## Description

<details>
<summary><strong>Table Definition</strong></summary>

```sql
CREATE TABLE "workflow_review_request" ("id" varchar(36) PRIMARY KEY NOT NULL, "projectId" varchar(36) NOT NULL, "state" varchar(16) NOT NULL DEFAULT ('open'), "decision" varchar(50) NOT NULL DEFAULT ('pending'), "title" varchar(255) NOT NULL, "description" text, "createdById" varchar, "updatedById" varchar, "closedById" varchar, "approvedAt" datetime(3), "createdAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), "updatedAt" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), CONSTRAINT "CHK_workflow_review_request_state" CHECK ("state" IN ('open', 'closed')), CONSTRAINT "CHK_workflow_review_request_decision" CHECK ("decision" IN ('pending', 'changes_requested', 'approved')), CONSTRAINT "FK_c218d1df94adc3b169dee3cc06c" FOREIGN KEY ("projectId") REFERENCES "project" ("id") ON DELETE CASCADE, CONSTRAINT "FK_21d5f5a831d2e38960030bb4f60" FOREIGN KEY ("createdById") REFERENCES "user" ("id") ON DELETE SET NULL, CONSTRAINT "FK_2817c3a0245197b498818c447cb" FOREIGN KEY ("updatedById") REFERENCES "user" ("id") ON DELETE SET NULL, CONSTRAINT "FK_d53ef208e6055f328dd7b897e51" FOREIGN KEY ("closedById") REFERENCES "user" ("id") ON DELETE SET NULL)
```

</details>

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| approvedAt | datetime(3) |  | true |  |  |  |
| closedById | varchar |  | true |  | [user](user.md) |  |
| createdAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| createdById | varchar |  | true |  | [user](user.md) |  |
| decision | varchar(50) | 'pending' | false |  |  |  |
| description | TEXT |  | true |  |  |  |
| id | varchar(36) |  | false | [workflow_review_request_authors](workflow_review_request_authors.md) [workflow_review_request_reviewers](workflow_review_request_reviewers.md) [workflow_review_request_workflow](workflow_review_request_workflow.md) |  |  |
| projectId | varchar(36) |  | false |  | [project](project.md) |  |
| state | varchar(16) | 'open' | false |  |  |  |
| title | varchar(255) |  | false |  |  |  |
| updatedAt | datetime(3) | STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW') | false |  |  |  |
| updatedById | varchar |  | true |  | [user](user.md) |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| - | CHECK | CHECK ("state" IN ('open', 'closed')) |
| - | CHECK | CHECK ("decision" IN ('pending', 'changes_requested', 'approved')) |
| - (Foreign key ID: 0) | FOREIGN KEY | FOREIGN KEY (closedById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| - (Foreign key ID: 1) | FOREIGN KEY | FOREIGN KEY (updatedById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| - (Foreign key ID: 2) | FOREIGN KEY | FOREIGN KEY (createdById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE |
| - (Foreign key ID: 3) | FOREIGN KEY | FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE |
| id | PRIMARY KEY | PRIMARY KEY (id) |
| sqlite_autoindex_workflow_review_request_1 | PRIMARY KEY | PRIMARY KEY (id) |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_workflow_review_request_project_state | CREATE INDEX "IDX_workflow_review_request_project_state"<br />			ON "workflow_review_request"("projectId", "state") |
| sqlite_autoindex_workflow_review_request_1 | PRIMARY KEY (id) |

## Relations

```mermaid
erDiagram

"workflow_review_request" }o--o| "user" : "FOREIGN KEY (closedById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"workflow_review_request" }o--o| "user" : "FOREIGN KEY (createdById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"
"workflow_review_request_authors" |o--|| "workflow_review_request" : "FOREIGN KEY (workflowReviewRequestId) REFERENCES workflow_review_request (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"workflow_review_request_reviewers" |o--|| "workflow_review_request" : "FOREIGN KEY (workflowReviewRequestId) REFERENCES workflow_review_request (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"workflow_review_request_workflow" }o--|| "workflow_review_request" : "FOREIGN KEY (workflowReviewRequestId) REFERENCES workflow_review_request (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"workflow_review_request" }o--|| "project" : "FOREIGN KEY (projectId) REFERENCES project (id) ON UPDATE NO ACTION ON DELETE CASCADE MATCH NONE"
"workflow_review_request" }o--o| "user" : "FOREIGN KEY (updatedById) REFERENCES user (id) ON UPDATE NO ACTION ON DELETE SET NULL MATCH NONE"

"workflow_review_request" {
  datetime_3_ approvedAt
  varchar closedById FK
  datetime_3_ createdAt
  varchar createdById FK
  varchar_50_ decision
  TEXT description
  varchar_36_ id PK
  varchar_36_ projectId FK
  varchar_16_ state
  varchar_255_ title
  datetime_3_ updatedAt
  varchar updatedById FK
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
"workflow_review_request_authors" {
  varchar userId PK
  varchar_36_ workflowReviewRequestId PK
}
"workflow_review_request_reviewers" {
  varchar userId PK
  varchar_36_ workflowReviewRequestId PK
}
"workflow_review_request_workflow" {
  varchar_36_ id PK
  varchar_36_ workflowId FK
  varchar_36_ workflowReviewRequestId FK
  varchar_36_ workflowVersionId FK
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
