# public.workflow_review_request

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| approvedAt | timestamp(3) with time zone |  | true |  |  |  |
| closedById | uuid |  | true |  | [public.user](public.user.md) |  |
| createdAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |
| createdById | uuid |  | true |  | [public.user](public.user.md) |  |
| decision | varchar(50) | 'pending'::character varying | false |  |  | Latest review outcome while the request is open |
| description | text |  | true |  |  |  |
| id | varchar(36) |  | false | [public.workflow_review_request_authors](public.workflow_review_request_authors.md) [public.workflow_review_request_reviewers](public.workflow_review_request_reviewers.md) [public.workflow_review_request_workflow](public.workflow_review_request_workflow.md) |  |  |
| projectId | varchar(36) |  | false |  | [public.project](public.project.md) |  |
| state | varchar(16) | 'open'::character varying | false |  |  | Review lifecycle: open reviews accept actions; closed reviews are done |
| title | varchar(255) |  | false |  |  |  |
| updatedAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |
| updatedById | uuid |  | true |  | [public.user](public.user.md) |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| CHK_workflow_review_request_decision | CHECK | CHECK (((decision)::text = ANY ((ARRAY['pending'::character varying, 'changes_requested'::character varying, 'approved'::character varying])::text[]))) |
| CHK_workflow_review_request_state | CHECK | CHECK (((state)::text = ANY ((ARRAY['open'::character varying, 'closed'::character varying])::text[]))) |
| FK_21d5f5a831d2e38960030bb4f60 | FOREIGN KEY | FOREIGN KEY ("createdById") REFERENCES "user"(id) ON DELETE SET NULL |
| FK_2817c3a0245197b498818c447cb | FOREIGN KEY | FOREIGN KEY ("updatedById") REFERENCES "user"(id) ON DELETE SET NULL |
| FK_c218d1df94adc3b169dee3cc06c | FOREIGN KEY | FOREIGN KEY ("projectId") REFERENCES project(id) ON DELETE CASCADE |
| FK_d53ef208e6055f328dd7b897e51 | FOREIGN KEY | FOREIGN KEY ("closedById") REFERENCES "user"(id) ON DELETE SET NULL |
| PK_ae17b90023bcd05e003cd8f64dc | PRIMARY KEY | PRIMARY KEY (id) |
| workflow_review_request_createdAt_not_null | n | NOT NULL "createdAt" |
| workflow_review_request_decision_not_null | n | NOT NULL decision |
| workflow_review_request_id_not_null | n | NOT NULL id |
| workflow_review_request_projectId_not_null | n | NOT NULL "projectId" |
| workflow_review_request_state_not_null | n | NOT NULL state |
| workflow_review_request_title_not_null | n | NOT NULL title |
| workflow_review_request_updatedAt_not_null | n | NOT NULL "updatedAt" |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_workflow_review_request_project_state | CREATE INDEX "IDX_workflow_review_request_project_state" ON public.workflow_review_request USING btree ("projectId", state) |
| PK_ae17b90023bcd05e003cd8f64dc | CREATE UNIQUE INDEX "PK_ae17b90023bcd05e003cd8f64dc" ON public.workflow_review_request USING btree (id) |

## Relations

```mermaid
erDiagram

"public.workflow_review_request" }o--o| "public.user" : "FOREIGN KEY (#quot;closedById#quot;) REFERENCES #quot;user#quot;(id) ON DELETE SET NULL"
"public.workflow_review_request" }o--o| "public.user" : "FOREIGN KEY (#quot;createdById#quot;) REFERENCES #quot;user#quot;(id) ON DELETE SET NULL"
"public.workflow_review_request_authors" }o--|| "public.workflow_review_request" : "FOREIGN KEY (#quot;workflowReviewRequestId#quot;) REFERENCES workflow_review_request(id) ON DELETE CASCADE"
"public.workflow_review_request_reviewers" }o--|| "public.workflow_review_request" : "FOREIGN KEY (#quot;workflowReviewRequestId#quot;) REFERENCES workflow_review_request(id) ON DELETE CASCADE"
"public.workflow_review_request_workflow" }o--|| "public.workflow_review_request" : "FOREIGN KEY (#quot;workflowReviewRequestId#quot;) REFERENCES workflow_review_request(id) ON DELETE CASCADE"
"public.workflow_review_request" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.workflow_review_request" }o--o| "public.user" : "FOREIGN KEY (#quot;updatedById#quot;) REFERENCES #quot;user#quot;(id) ON DELETE SET NULL"

"public.workflow_review_request" {
  timestamp_3__with_time_zone approvedAt
  uuid closedById FK
  timestamp_3__with_time_zone createdAt
  uuid createdById FK
  varchar_50_ decision
  text description
  varchar_36_ id
  varchar_36_ projectId FK
  varchar_16_ state
  varchar_255_ title
  timestamp_3__with_time_zone updatedAt
  uuid updatedById FK
}
"public.user" {
  timestamp_3__with_time_zone createdAt
  boolean disabled
  varchar_255_ email
  varchar_32_ firstName
  uuid id
  date lastActiveAt
  varchar_32_ lastName
  boolean mfaEnabled
  text mfaRecoveryCodes
  text mfaSecret
  varchar_255_ password
  json personalizationAnswers
  varchar_128_ roleSlug FK
  json settings
  timestamp_3__with_time_zone updatedAt
}
"public.workflow_review_request_authors" {
  uuid userId FK
  varchar_36_ workflowReviewRequestId FK
}
"public.workflow_review_request_reviewers" {
  uuid userId FK
  varchar_36_ workflowReviewRequestId FK
}
"public.workflow_review_request_workflow" {
  varchar_36_ id
  varchar_36_ workflowId FK
  varchar_36_ workflowReviewRequestId FK
  varchar_36_ workflowVersionId FK
}
"public.project" {
  timestamp_3__with_time_zone createdAt
  uuid creatorId FK
  json customTelemetryTags
  varchar_512_ description
  json icon
  varchar_36_ id
  varchar_255_ name
  varchar_36_ type
  timestamp_3__with_time_zone updatedAt
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
