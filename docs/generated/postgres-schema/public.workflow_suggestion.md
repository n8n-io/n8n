# public.workflow_suggestion

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| backgroundUserId | uuid |  | false |  | [public.user](public.user.md) | User who enabled the investigation |
| closedAt | timestamp(3) with time zone |  | true |  |  |  |
| closedReason | varchar(16) |  | true |  |  | Reason the suggestion closed |
| createdAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |
| expectedBaseline | json |  | false |  |  | Original saved and published version IDs and checksum |
| id | varchar |  | false | [public.workflow_suggestion_activity](public.workflow_suggestion_activity.md) |  |  |
| payload | json |  | false |  |  | Independent baseline, graph, explanation, validation, and error context |
| projectId | varchar(36) |  | false |  | [public.project](public.project.md) | Original owner project |
| state | varchar(16) |  | false |  |  | Suggestion lifecycle state |
| updatedAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |
| workflowId | varchar(36) |  | false |  | [public.workflow_entity](public.workflow_entity.md) | Target workflow |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| CHK_workflow_suggestion_closedReason | CHECK | CHECK ((("closedReason")::text = ANY ((ARRAY['outdated'::character varying, 'applied'::character varying, 'discarded'::character varying])::text[]))) |
| CHK_workflow_suggestion_state | CHECK | CHECK (((state)::text = ANY ((ARRAY['pending'::character varying, 'closed'::character varying])::text[]))) |
| FK_0f273c2cd9e1a097a8ba044fe9a | FOREIGN KEY | FOREIGN KEY ("projectId") REFERENCES project(id) ON DELETE CASCADE |
| FK_b415d749769e092f51575def2d2 | FOREIGN KEY | FOREIGN KEY ("backgroundUserId") REFERENCES "user"(id) ON DELETE CASCADE |
| FK_f6289858234727cdff168626dc9 | FOREIGN KEY | FOREIGN KEY ("workflowId") REFERENCES workflow_entity(id) ON DELETE CASCADE |
| PK_529f3c424f40b3174e5e77e1cf3 | PRIMARY KEY | PRIMARY KEY (id) |
| workflow_suggestion_backgroundUserId_not_null | n | NOT NULL "backgroundUserId" |
| workflow_suggestion_createdAt_not_null | n | NOT NULL "createdAt" |
| workflow_suggestion_expectedBaseline_not_null | n | NOT NULL "expectedBaseline" |
| workflow_suggestion_id_not_null | n | NOT NULL id |
| workflow_suggestion_payload_not_null | n | NOT NULL payload |
| workflow_suggestion_projectId_not_null | n | NOT NULL "projectId" |
| workflow_suggestion_state_not_null | n | NOT NULL state |
| workflow_suggestion_updatedAt_not_null | n | NOT NULL "updatedAt" |
| workflow_suggestion_workflowId_not_null | n | NOT NULL "workflowId" |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_0494cd7ecbc83cd7935d88b129 | CREATE INDEX "IDX_0494cd7ecbc83cd7935d88b129" ON public.workflow_suggestion USING btree (state, "closedAt") |
| IDX_0f273c2cd9e1a097a8ba044fe9 | CREATE INDEX "IDX_0f273c2cd9e1a097a8ba044fe9" ON public.workflow_suggestion USING btree ("projectId") |
| IDX_b415d749769e092f51575def2d | CREATE INDEX "IDX_b415d749769e092f51575def2d" ON public.workflow_suggestion USING btree ("backgroundUserId") |
| IDX_f6289858234727cdff168626dc | CREATE INDEX "IDX_f6289858234727cdff168626dc" ON public.workflow_suggestion USING btree ("workflowId") |
| IDX_workflow_suggestion_workflowId | CREATE UNIQUE INDEX "IDX_workflow_suggestion_workflowId" ON public.workflow_suggestion USING btree ("workflowId") WHERE ((state)::text = 'pending'::text) |
| PK_529f3c424f40b3174e5e77e1cf3 | CREATE UNIQUE INDEX "PK_529f3c424f40b3174e5e77e1cf3" ON public.workflow_suggestion USING btree (id) |

## Relations

```mermaid
erDiagram

"public.workflow_suggestion" }o--|| "public.user" : "FOREIGN KEY (#quot;backgroundUserId#quot;) REFERENCES #quot;user#quot;(id) ON DELETE CASCADE"
"public.workflow_suggestion_activity" }o--|| "public.workflow_suggestion" : "FOREIGN KEY (#quot;suggestionId#quot;) REFERENCES workflow_suggestion(id) ON DELETE CASCADE"
"public.workflow_suggestion" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"
"public.workflow_suggestion" }o--|| "public.workflow_entity" : "FOREIGN KEY (#quot;workflowId#quot;) REFERENCES workflow_entity(id) ON DELETE CASCADE"

"public.workflow_suggestion" {
  uuid backgroundUserId FK
  timestamp_3__with_time_zone closedAt
  varchar_16_ closedReason
  timestamp_3__with_time_zone createdAt
  json expectedBaseline
  varchar id
  json payload
  varchar_36_ projectId FK
  varchar_16_ state
  timestamp_3__with_time_zone updatedAt
  varchar_36_ workflowId FK
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
"public.workflow_suggestion_activity" {
  varchar_16_ action
  varchar_16_ author
  timestamp_3__with_time_zone createdAt
  varchar id
  varchar suggestionId FK
  timestamp_3__with_time_zone updatedAt
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
"public.workflow_entity" {
  boolean active
  varchar_36_ activeVersionId FK
  json connections
  timestamp_3__with_time_zone createdAt
  text description
  varchar_36_ id
  boolean isArchived
  json meta
  varchar_128_ name
  json nodeGroups
  json nodes
  varchar_36_ parentFolderId FK
  json pinData
  json settings
  varchar sourceWorkflowId
  json staticData
  integer triggerCount
  timestamp_3__with_time_zone updatedAt
  integer versionCounter
  character_36_ versionId
}
```

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
