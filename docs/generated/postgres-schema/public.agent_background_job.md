# public.agent_background_job

## Columns

| Name | Type | Default | Nullable | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | -------- | ------- | ------- |
| childExecutionId | varchar(36) |  | true |  |  | Workflow jobs only |
| childThreadId | varchar(128) |  | true |  |  | Sub-agent jobs only; minted at dispatch, links to agent_execution_threads |
| createdAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |
| dedupeKey | varchar(255) |  | true |  |  | Single-flight key, unique per parent thread while running; cleared at settle |
| error | text |  | true |  |  |  |
| id | varchar(36) |  | false |  |  |  |
| kind | varchar(16) |  | false |  |  | What the job tracks: a detached sub-agent run or a workflow execution |
| parentAgentId | varchar(36) |  | false |  | [public.agents](public.agents.md) |  |
| parentThreadId | varchar(128) |  | false |  |  |  |
| projectId | varchar(36) |  | false |  | [public.project](public.project.md) |  |
| result | text |  | true |  |  | Final answer of a settled sub-agent job |
| settledAt | timestamp(3) with time zone |  | true |  |  |  |
| status | varchar(16) |  | false |  |  |  |
| subAgentId | varchar(36) |  | true |  |  | Sub-agent jobs only |
| timeoutAt | timestamp(3) with time zone |  | true |  |  | When reconciliation fails the job as timed out; NULL means no timeout |
| title | varchar(255) |  | false |  |  | Task name or workflow name, echoed in status-check listings |
| updatedAt | timestamp(3) with time zone | CURRENT_TIMESTAMP(3) | false |  |  |  |
| workflowId | varchar(36) |  | true |  |  | Workflow jobs only; scopes cancellation |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| CHK_agent_background_job_kind | CHECK | CHECK (((kind)::text = ANY ((ARRAY['subagent'::character varying, 'workflow'::character varying])::text[]))) |
| CHK_agent_background_job_status | CHECK | CHECK (((status)::text = ANY ((ARRAY['running'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[]))) |
| FK_4c5abc8e465208c985f089e055e | FOREIGN KEY | FOREIGN KEY ("projectId") REFERENCES project(id) ON DELETE CASCADE |
| FK_d46c6f00730c2ef8bcb6ee24b67 | FOREIGN KEY | FOREIGN KEY ("parentAgentId") REFERENCES agents(id) ON DELETE CASCADE |
| PK_6e0db58281aa2b4c956dc0d58e9 | PRIMARY KEY | PRIMARY KEY (id) |
| agent_background_job_createdAt_not_null | n | NOT NULL "createdAt" |
| agent_background_job_id_not_null | n | NOT NULL id |
| agent_background_job_kind_not_null | n | NOT NULL kind |
| agent_background_job_parentAgentId_not_null | n | NOT NULL "parentAgentId" |
| agent_background_job_parentThreadId_not_null | n | NOT NULL "parentThreadId" |
| agent_background_job_projectId_not_null | n | NOT NULL "projectId" |
| agent_background_job_status_not_null | n | NOT NULL status |
| agent_background_job_title_not_null | n | NOT NULL title |
| agent_background_job_updatedAt_not_null | n | NOT NULL "updatedAt" |

## Indexes

| Name | Definition |
| ---- | ---------- |
| IDX_3c78976c9ddd0e61d87c862642 | CREATE INDEX "IDX_3c78976c9ddd0e61d87c862642" ON public.agent_background_job USING btree ("childExecutionId") |
| IDX_adfb96f4e2e8f163da2615cd57 | CREATE INDEX "IDX_adfb96f4e2e8f163da2615cd57" ON public.agent_background_job USING btree ("parentThreadId") |
| IDX_agent_background_job_parentThreadId_dedupeKey | CREATE UNIQUE INDEX "IDX_agent_background_job_parentThreadId_dedupeKey" ON public.agent_background_job USING btree ("parentThreadId", "dedupeKey") WHERE ("dedupeKey" IS NOT NULL) |
| PK_6e0db58281aa2b4c956dc0d58e9 | CREATE UNIQUE INDEX "PK_6e0db58281aa2b4c956dc0d58e9" ON public.agent_background_job USING btree (id) |

## Relations

```mermaid
erDiagram

"public.agent_background_job" }o--|| "public.agents" : "FOREIGN KEY (#quot;parentAgentId#quot;) REFERENCES agents(id) ON DELETE CASCADE"
"public.agent_background_job" }o--|| "public.project" : "FOREIGN KEY (#quot;projectId#quot;) REFERENCES project(id) ON DELETE CASCADE"

"public.agent_background_job" {
  varchar_36_ childExecutionId
  varchar_128_ childThreadId
  timestamp_3__with_time_zone createdAt
  varchar_255_ dedupeKey
  text error
  varchar_36_ id
  varchar_16_ kind
  varchar_36_ parentAgentId FK
  varchar_128_ parentThreadId
  varchar_36_ projectId FK
  text result
  timestamp_3__with_time_zone settledAt
  varchar_16_ status
  varchar_36_ subAgentId
  timestamp_3__with_time_zone timeoutAt
  varchar_255_ title
  timestamp_3__with_time_zone updatedAt
  varchar_36_ workflowId
}
"public.agents" {
  varchar_36_ activeVersionId FK
  boolean availableInMCP
  timestamp_3__with_time_zone createdAt
  varchar_36_ id
  json integrations
  varchar_128_ name
  varchar_255_ projectId FK
  integer revision
  json schema
  timestamp_3__with_time_zone setupCompletedAt
  json skills
  json tools
  timestamp_3__with_time_zone updatedAt
  varchar_36_ versionId
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
